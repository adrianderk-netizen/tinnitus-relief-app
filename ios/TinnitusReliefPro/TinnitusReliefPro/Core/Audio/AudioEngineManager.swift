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
    var noiseType: NoiseType = .white {
        didSet {
            guard isNoisePlaying else { return }
            let sampleRate = engine.outputNode.outputFormat(forBus: 0).sampleRate
            let buffer = NoiseGenerator.generateBuffer(type: noiseType, duration: 2.0, sampleRate: sampleRate)
            noiseBuffer = buffer
            noisePlayer.stop()
            noisePlayer.scheduleBuffer(buffer, at: nil, options: .loops)
            noisePlayer.play()
        }
    }
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

    // Sweep
    private(set) var isSweeping: Bool = false
    private(set) var sweepProgress: Double = 0.0
    nonisolated(unsafe) private var sweepTimer: Timer?

    // Analysis
    var frequencyData: [Float] = []

    // Ear routing
    var earSelection: EarSelection = .both {
        didSet { applyPanning() }
    }

    // Matched frequency storage
    var matchedFrequency: Float?

    /// Current playback position in seconds for the loaded music file.
    var musicCurrentTime: Double {
        guard isMusicPlaying,
              let nodeTime = musicPlayer.lastRenderTime,
              nodeTime.isSampleTimeValid,
              let playerTime = musicPlayer.playerTime(forNodeTime: nodeTime) else { return 0 }
        return Double(playerTime.sampleTime) / playerTime.sampleRate
    }

    /// Total duration in seconds of the loaded music file.
    var musicDuration: Double {
        guard let file = musicFile else { return 0 }
        return Double(file.length) / file.processingFormat.sampleRate
    }

    // MARK: - Private audio graph components

    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TinnitusReliefPro",
                                       category: "AudioEngineManager")

    private let engine = AVAudioEngine()

    // Tone chain: oscillator -> toneGain -> tonePan -> mainMixer
    private var oscillator: OscillatorNode?
    private let toneGain = AVAudioMixerNode()
    private let tonePan = AVAudioMixerNode()

    // Noise chain: noisePlayer -> notchEQ -> noiseGain -> noisePan -> mainMixer
    private let noisePlayer = AVAudioPlayerNode()
    private let notchEQ = AVAudioUnitEQ(numberOfBands: 10)
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
        sweepTimer?.invalidate()
        analysisTimer?.invalidate()
    }

    // MARK: - Audio graph setup

    private func setupAudioGraph() {
        let sampleRate = engine.outputNode.outputFormat(forBus: 0).sampleRate

        // Attach nodes
        engine.attach(toneGain)
        engine.attach(tonePan)
        engine.attach(noisePlayer)
        engine.attach(notchEQ)
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
        engine.connect(noisePlayer, to: notchEQ, format: stereoFormat)
        engine.connect(notchEQ, to: noiseGain, format: stereoFormat)
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

    // MARK: - Sweep control

    /// Starts a frequency sweep from `startFreq` to `endFreq` at `speedHzPerSec`.
    func startSweep(startFreq: Float, endFreq: Float, speedHzPerSec: Float) {
        frequency = startFreq
        sweepProgress = 0.0
        startTone()

        let tickInterval: TimeInterval = 1.0 / 30.0
        let totalRange = endFreq - startFreq
        isSweeping = true

        sweepTimer = Timer.scheduledTimer(withTimeInterval: tickInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.isSweeping else {
                    self?.sweepTimer?.invalidate()
                    self?.sweepTimer = nil
                    return
                }
                let increment = speedHzPerSec * Float(tickInterval)
                self.frequency += increment
                self.sweepProgress = Double((self.frequency - startFreq) / totalRange)

                if self.frequency >= endFreq {
                    self.frequency = endFreq
                    self.sweepProgress = 1.0
                    self.stopSweep()
                }
            }
        }
    }

    /// Stops the current frequency sweep and tone playback.
    func stopSweep() {
        sweepTimer?.invalidate()
        sweepTimer = nil
        isSweeping = false
        stopTone()
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

        noiseBuffer = buffer
        applyNotchParameters()
        applyPanning()

        // Schedule looping buffer
        noisePlayer.stop()
        noisePlayer.scheduleBuffer(buffer, at: nil, options: .loops)
        noisePlayer.play()

        isNoisePlaying = true
        startAnalysis()
        Self.logger.info("Noise started: type=\(type.rawValue)")
    }

    func stopNoise() {
        guard isNoisePlaying else { return }
        noisePlayer.stop()
        isNoisePlaying = false
        stopAnalysisIfIdle()
        Self.logger.info("Noise stopped")
    }

    private func applyNotchParameters() {
        let center = notchFrequency
        let depth = notchDepth
        let sr = Float(engine.outputNode.outputFormat(forBus: 0).sampleRate)
        let nyquist = sr / 2.0

        let lowerFreq: Float
        let upperFreq: Float
        let bandCount: Int

        switch notchWidth {
        case .hz(let hw):
            lowerFreq = max(20, center - Float(hw))
            upperFreq = min(center + Float(hw), nyquist - 100)
            bandCount = min(10, max(2, hw / 25))
        case .octave(let oct):
            let halfOct = oct / 2.0
            lowerFreq = max(20, center / powf(2.0, halfOct))
            upperFreq = min(center * powf(2.0, halfOct), nyquist - 100)
            bandCount = min(10, max(2, Int(ceil(oct * 4))))
        }

        let gainDB: Float = -96.0 * depth

        for i in 0..<notchEQ.bands.count {
            let band = notchEQ.bands[i]
            if i < bandCount {
                let t = bandCount > 1 ? Float(i) / Float(bandCount - 1) : 0.5
                band.filterType = .parametric
                band.frequency = lowerFreq + (upperFreq - lowerFreq) * t
                band.bandwidth = max(0.05, (upperFreq - lowerFreq) / (Float(bandCount) * band.frequency) * 1.5)
                band.gain = gainDB
                band.bypass = false
            } else {
                band.bypass = true
            }
        }
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
