import AVFoundation
import Observation
import os.log

// MARK: - Ear Selection

/// Which ear(s) to route audio to.
enum EarSelection: String, CaseIterable, Identifiable, Sendable {
    case both, left, right
    var id: String { rawValue }

    /// Stereo pan value: -1 = left, 0 = center, +1 = right.
    var panValue: Float {
        switch self {
        case .left:  return -1.0
        case .right: return  1.0
        case .both:  return  0.0
        }
    }
}

// MARK: - AudioEngineManager

/// Central coordinator for all audio components in the tinnitus relief app.
///
/// - Tone generation (oscillator with waveform selection)
/// - Noise generation (white / pink / brown with optional notch filter)
/// - Music playback (loaded audio files)
/// - Real-time FFT analysis
///
/// UI-bound published properties are updated on `@MainActor`. Audio processing runs
/// on AVAudioEngine's real-time thread.
@available(iOS 17.0, *)
@Observable
@MainActor
final class AudioEngineManager {

    // MARK: - Published state

    // Tone
    var frequency: Float = 440     { didSet { applyToneParameters() } }
    var volume: Float = 0.5        { didSet { applyToneParameters() } }
    var waveform: Waveform = .sine { didSet { applyToneParameters() } }
    var fineTune: Float = 0        { didSet { applyToneParameters() } }
    var phaseInverted: Bool = false { didSet { applyToneParameters() } }
    private(set) var isTonePlaying: Bool = false

    // Noise
    var noiseType: NoiseType = .white
    var noiseVolume: Float = 0.5 { didSet { noiseGain.outputVolume = noiseVolume } }
    var notchFrequency: Float = 1000     { didSet { applyNotchParameters() } }
    var notchWidth: NotchWidth = .octave(1.0) { didSet { applyNotchParameters() } }
    var notchDepth: Float = 1.0          { didSet { applyNotchParameters() } }
    private(set) var isNoisePlaying: Bool = false

    // Music
    var musicVolume: Float = 0.7 { didSet { musicGain.outputVolume = musicVolume } }
    private(set) var isMusicPlaying: Bool = false

    // Master
    var masterVolume: Float = 0.8 {
        didSet { engine.mainMixerNode.outputVolume = masterVolume }
    }

    // Analysis
    var frequencyData: [Float] = []

    // Ear routing
    var earSelection: EarSelection = .both {
        didSet { applyPanning() }
    }

    // Matched frequency storage
    var matchedFrequency: Float?

    // MARK: - Private audio graph components

    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TinnitusReliefPro",
                                       category: "AudioEngineManager")

    private let engine = AVAudioEngine()

    // Tone chain: oscillator -> toneGain -> tonePan -> mainMixer
    private var oscillator: OscillatorNode?
    private let toneGain = AVAudioMixerNode()
    private let tonePan = AVAudioMixerNode()

    // Noise chain: noisePlayer -> notchProcessor -> noiseGain -> noisePan -> mainMixer
    private let noisePlayer = AVAudioPlayerNode()
    private let noiseGain = AVAudioMixerNode()
    private let noisePan = AVAudioMixerNode()
    private var noiseBuffer: AVAudioPCMBuffer?
    nonisolated(unsafe) private let notchFilterBank: NotchFilterBank

    // Music chain: musicPlayer -> musicGain -> musicPan -> mainMixer
    private let musicPlayer = AVAudioPlayerNode()
    private let musicGain = AVAudioMixerNode()
    private let musicPan = AVAudioMixerNode()
    private var musicFile: AVAudioFile?

    // Analysis
    private let analyzer = FrequencyAnalyzer()
    nonisolated(unsafe) private var analysisTimer: Timer?

    // Interruption handling
    private var wasPlayingBeforeInterruption = false

    // MARK: - Init

    nonisolated init() {
        let sr = Float(AVAudioSession.sharedInstance().sampleRate.isZero
                       ? 44_100
                       : AVAudioSession.sharedInstance().sampleRate)
        self.notchFilterBank = NotchFilterBank(sampleRate: sr)

        Task { @MainActor in
            self.setupAudioGraph()
            self.observeInterruptions()
        }
    }

    deinit {
        analysisTimer?.invalidate()
    }

    // MARK: - Audio graph setup

    private func setupAudioGraph() {
        let sampleRate = engine.outputNode.outputFormat(forBus: 0).sampleRate

        // Attach nodes
        engine.attach(toneGain)
        engine.attach(tonePan)
        engine.attach(noisePlayer)
        engine.attach(noiseGain)
        engine.attach(noisePan)
        engine.attach(musicPlayer)
        engine.attach(musicGain)
        engine.attach(musicPan)

        let monoFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        let stereoFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2)!

        // Tone chain
        engine.connect(toneGain, to: tonePan, format: monoFormat)
        engine.connect(tonePan, to: engine.mainMixerNode, format: stereoFormat)

        // Noise chain
        engine.connect(noisePlayer, to: noiseGain, format: stereoFormat)
        engine.connect(noiseGain, to: noisePan, format: stereoFormat)
        engine.connect(noisePan, to: engine.mainMixerNode, format: stereoFormat)

        // Music chain
        engine.connect(musicPlayer, to: musicGain, format: stereoFormat)
        engine.connect(musicGain, to: musicPan, format: stereoFormat)
        engine.connect(musicPan, to: engine.mainMixerNode, format: stereoFormat)

        // Set initial volumes
        engine.mainMixerNode.outputVolume = masterVolume

        Self.logger.info("Audio graph assembled, sampleRate=\(sampleRate)")
    }

    /// Ensures the engine is running. Safe to call repeatedly.
    private func ensureEngineRunning() throws {
        guard !engine.isRunning else { return }
        try AudioSessionConfig.configure()
        try engine.start()
        Self.logger.info("AVAudioEngine started")
    }

    // MARK: - Tone control

    func startTone() {
        do {
            try ensureEngineRunning()
        } catch {
            Self.logger.error("Failed to start engine: \(error.localizedDescription)")
            return
        }

        let sampleRate = engine.outputNode.outputFormat(forBus: 0).sampleRate

        // Create oscillator if needed (or recreate if sample rate changed)
        if oscillator == nil {
            let osc = OscillatorNode(sampleRate: sampleRate)
            oscillator = osc
            engine.attach(osc.sourceNode)
            let monoFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
            engine.connect(osc.sourceNode, to: toneGain, format: monoFormat)
        }

        applyToneParameters()
        applyPanning()
        isTonePlaying = true
        startAnalysis()
        Self.logger.info("Tone started: \(self.frequency + self.fineTune) Hz, waveform=\(self.waveform.rawValue)")
    }

    func stopTone() {
        guard isTonePlaying else { return }

        // Ramp gain to zero, then disconnect
        if let osc = oscillator {
            engine.detach(osc.sourceNode)
            oscillator = nil
        }

        isTonePlaying = false
        stopAnalysisIfIdle()
        Self.logger.info("Tone stopped")
    }

    private func applyToneParameters() {
        guard let osc = oscillator else { return }
        osc.frequency = frequency + fineTune
        osc.amplitude = volume
        osc.waveform = waveform
        osc.phaseInverted = phaseInverted
    }

    // MARK: - Noise control

    func startNoise() {
        do {
            try ensureEngineRunning()
        } catch {
            Self.logger.error("Failed to start engine for noise: \(error.localizedDescription)")
            return
        }

        let sampleRate = engine.outputNode.outputFormat(forBus: 0).sampleRate

        // Generate buffer on a background queue to avoid blocking the main thread
        let type = noiseType
        let buffer = NoiseGenerator.generateBuffer(type: type, duration: 2.0, sampleRate: sampleRate)

        // Install a tap on the noise player output to apply notch filtering in real-time
        noiseBuffer = buffer
        applyNotchParameters()
        applyPanning()

        // Schedule looping buffer
        noisePlayer.stop()
        noisePlayer.scheduleBuffer(buffer, at: nil, options: .loops)
        noisePlayer.play()

        // Install notch filter via a processing tap
        installNotchTap(sampleRate: sampleRate)

        isNoisePlaying = true
        startAnalysis()
        Self.logger.info("Noise started: type=\(type.rawValue)")
    }

    func stopNoise() {
        guard isNoisePlaying else { return }
        noisePlayer.stop()
        removeNotchTap()
        notchFilterBank.reset()
        isNoisePlaying = false
        stopAnalysisIfIdle()
        Self.logger.info("Noise stopped")
    }

    private func applyNotchParameters() {
        notchFilterBank.update(centerFreq: notchFrequency, width: notchWidth, depth: notchDepth)
    }

    /// Install a tap on the noise gain node to apply the notch filter bank in real-time.
    private func installNotchTap(sampleRate: Double) {
        removeNotchTap()
        let filterBank = notchFilterBank
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2)!
        noiseGain.installTap(onBus: 0, bufferSize: 512, format: format) { buffer, _ in
            guard let channelData = buffer.floatChannelData else { return }
            let frameCount = Int(buffer.frameLength)
            let channelCount = Int(buffer.format.channelCount)
            for ch in 0..<channelCount {
                filterBank.process(channelData[ch], frameCount: frameCount)
            }
        }
    }

    private func removeNotchTap() {
        noiseGain.removeTap(onBus: 0)
    }

    // MARK: - Music control

    func loadAudioFile(_ url: URL) throws {
        musicFile = try AVAudioFile(forReading: url)
        Self.logger.info("Audio file loaded: \(url.lastPathComponent)")
    }

    func playMusic() {
        guard let file = musicFile else {
            Self.logger.warning("No audio file loaded")
            return
        }

        do {
            try ensureEngineRunning()
        } catch {
            Self.logger.error("Failed to start engine for music: \(error.localizedDescription)")
            return
        }

        applyPanning()
        musicPlayer.stop()
        musicPlayer.scheduleFile(file, at: nil) { [weak self] in
            Task { @MainActor in
                self?.isMusicPlaying = false
            }
        }
        musicPlayer.play()
        isMusicPlaying = true
        startAnalysis()
        Self.logger.info("Music playback started")
    }

    func pauseMusic() {
        musicPlayer.pause()
        isMusicPlaying = false
        stopAnalysisIfIdle()
        Self.logger.info("Music paused")
    }

    // MARK: - Panning (ear selection)

    private func applyPanning() {
        let pan = earSelection.panValue
        tonePan.pan = pan
        noisePan.pan = pan
        musicPan.pan = pan
    }

    // MARK: - Analysis

    private func startAnalysis() {
        guard analysisTimer == nil else { return }
        analyzer.attachToNode(engine.mainMixerNode)

        // Poll the analyzer ~30 times/sec and push to the observable property
        analysisTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.frequencyData = self?.analyzer.magnitudeSpectrum ?? []
            }
        }
    }

    private func stopAnalysisIfIdle() {
        guard !isTonePlaying, !isNoisePlaying, !isMusicPlaying else { return }
        analysisTimer?.invalidate()
        analysisTimer = nil
        analyzer.detach()
        frequencyData = []
    }

    // MARK: - Interruption handling

    private func observeInterruptions() {
        NotificationCenter.default.addObserver(forName: .audioSessionInterrupted,
                                               object: nil, queue: .main) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in
                self.wasPlayingBeforeInterruption = self.isTonePlaying || self.isNoisePlaying || self.isMusicPlaying
                if self.isTonePlaying { self.stopTone() }
                if self.isNoisePlaying { self.stopNoise() }
                if self.isMusicPlaying { self.pauseMusic() }
                Self.logger.info("Playback paused due to interruption")
            }
        }

        NotificationCenter.default.addObserver(forName: .audioSessionInterruptionEnded,
                                               object: nil, queue: .main) { [weak self] notification in
            guard let self else { return }
            let shouldResume = (notification.userInfo?["shouldResume"] as? Bool) ?? false
            Task { @MainActor in
                if shouldResume && self.wasPlayingBeforeInterruption {
                    do {
                        try self.ensureEngineRunning()
                        Self.logger.info("Engine restarted after interruption")
                    } catch {
                        Self.logger.error("Failed to restart after interruption: \(error.localizedDescription)")
                    }
                }
            }
        }
    }

    // MARK: - Matched frequency

    /// Stores the user's identified tinnitus frequency.
    func setMatchedFrequency(_ freq: Float) {
        matchedFrequency = freq
        frequency = freq
        Self.logger.info("Matched frequency set: \(freq) Hz")
    }
}
