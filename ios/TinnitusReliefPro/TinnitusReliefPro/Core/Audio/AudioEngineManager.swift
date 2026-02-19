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

    // Tone (per-ear frequencies are the source of truth)
    private var _suppressApply = false
    var leftFrequency: Float = 440  { didSet { if !_suppressApply { applyToneParameters() } } }
    var rightFrequency: Float = 440 { didSet { if !_suppressApply { applyToneParameters() } } }

    // Computed facade — routes to active ear(s) based on earSelection
    var frequency: Float {
        get {
            switch earSelection {
            case .both, .left: return leftFrequency
            case .right: return rightFrequency
            }
        }
        set {
            switch earSelection {
            case .both:
                _suppressApply = true
                leftFrequency = newValue
                _suppressApply = false
                rightFrequency = newValue
            case .left:  leftFrequency = newValue
            case .right: rightFrequency = newValue
            }
        }
    }
    var volume: Float = 0.5        { didSet { applyToneParameters() } }
    var waveform: Waveform = .sine { didSet { applyToneParameters() } }
    var fineTune: Float = 0        { didSet { applyToneParameters() } }
    var phaseInverted: Bool = false { didSet { applyToneParameters() } }
    private(set) var isTonePlaying: Bool = false

    // Noise
    var noiseType: NoiseType = .white {
        didSet {
            guard isNoisePlaying else { return }
            let type = self.noiseType
            let sampleRate = engine.outputNode.outputFormat(forBus: 0).sampleRate
            guard let buffer = NoiseGenerator.generateBuffer(type: type, duration: 2.0, sampleRate: sampleRate) else {
                Self.logger.warning("Failed to generate \(type.rawValue) noise buffer")
                return
            }
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

    // Playlist queue
    private(set) var playlistQueue: [URL] = []
    private(set) var currentTrackIndex: Int = 0
    private(set) var currentTrackName: String?

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
    var waveformSamples: [Float] = Array(repeating: 0, count: 200)
    private let waveformSampleCount = 200

    // Ear routing
    var earSelection: EarSelection = .both {
        didSet { applyPanning() }
    }
    var leftEarEnabled: Bool = true  { didSet { applyPanning() } }
    var rightEarEnabled: Bool = true { didSet { applyPanning() } }

    // Matched frequency storage (per-ear)
    var leftMatchedFrequency: Float?
    var rightMatchedFrequency: Float?

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

    // Tone chain: per-ear oscillators -> per-ear mixers -> mainMixer
    private var leftOscillator: OscillatorNode?
    private var rightOscillator: OscillatorNode?
    private let leftToneMixer = AVAudioMixerNode()
    private let rightToneMixer = AVAudioMixerNode()

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
    private(set) var isInterrupted = false
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
        engine.attach(leftToneMixer)
        engine.attach(rightToneMixer)
        engine.attach(noisePlayer)
        engine.attach(notchEQ)
        engine.attach(noiseGain)
        engine.attach(noisePan)
        engine.attach(musicPlayer)
        engine.attach(musicGain)
        engine.attach(musicPan)

        let monoFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        let stereoFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2)!

        // Tone chain (per-ear, hard-panned)
        engine.connect(leftToneMixer, to: engine.mainMixerNode, format: stereoFormat)
        engine.connect(rightToneMixer, to: engine.mainMixerNode, format: stereoFormat)
        leftToneMixer.pan = -1.0
        rightToneMixer.pan = 1.0

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
        let monoFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!

        // Create left oscillator if needed
        if leftOscillator == nil {
            let osc = OscillatorNode(sampleRate: sampleRate)
            leftOscillator = osc
            engine.attach(osc.sourceNode)
            engine.connect(osc.sourceNode, to: leftToneMixer, format: monoFormat)
        }
        // Create right oscillator if needed
        if rightOscillator == nil {
            let osc = OscillatorNode(sampleRate: sampleRate)
            rightOscillator = osc
            engine.attach(osc.sourceNode)
            engine.connect(osc.sourceNode, to: rightToneMixer, format: monoFormat)
        }

        applyToneParameters()
        applyPanning()
        isTonePlaying = true
        startAnalysis()
        Self.logger.info("Tone started: L=\(self.leftFrequency + self.fineTune) Hz, R=\(self.rightFrequency + self.fineTune) Hz, waveform=\(self.waveform.rawValue)")
    }

    func stopTone() {
        guard isTonePlaying else { return }

        // Detach both oscillators
        if let osc = leftOscillator {
            engine.detach(osc.sourceNode)
            leftOscillator = nil
        }
        if let osc = rightOscillator {
            engine.detach(osc.sourceNode)
            rightOscillator = nil
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
        if let osc = leftOscillator {
            osc.frequency = leftFrequency + fineTune
            osc.amplitude = volume
            osc.waveform = waveform
            osc.phaseInverted = phaseInverted
        }
        if let osc = rightOscillator {
            osc.frequency = rightFrequency + fineTune
            osc.amplitude = volume
            osc.waveform = waveform
            osc.phaseInverted = phaseInverted
        }
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

        let type = noiseType
        guard let buffer = NoiseGenerator.generateBuffer(type: type, duration: 2.0, sampleRate: sampleRate) else {
            Self.logger.warning("Failed to generate \(type.rawValue) noise buffer — skipping playback")
            return
        }

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
        currentTrackName = url.lastPathComponent
        playlistQueue = []
        currentTrackIndex = 0
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
                guard let self else { return }
                if !self.playlistQueue.isEmpty {
                    self.playNextTrack()
                } else {
                    self.isMusicPlaying = false
                    self.stopAnalysisIfIdle()
                }
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

    func stopMusic() {
        musicPlayer.stop()
        isMusicPlaying = false
        musicFile?.framePosition = 0
        stopAnalysisIfIdle()
        Self.logger.info("Music stopped")
    }

    /// Seeks music playback to the given time in seconds.
    func seekMusic(to time: Double) {
        guard let file = musicFile else { return }
        let sampleRate = file.processingFormat.sampleRate
        let targetFrame = AVAudioFramePosition(time * sampleRate)
        let totalFrames = AVAudioFrameCount(file.length - targetFrame)
        guard targetFrame >= 0, targetFrame < file.length else { return }

        musicPlayer.stop()
        file.framePosition = targetFrame
        musicPlayer.scheduleSegment(file, startingFrame: targetFrame, frameCount: totalFrames, at: nil) { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                if !self.playlistQueue.isEmpty {
                    self.playNextTrack()
                } else {
                    self.isMusicPlaying = false
                    self.stopAnalysisIfIdle()
                }
            }
        }
        musicPlayer.play()
        Self.logger.info("Music seeked to \(time)s")
    }

    /// Loads a playlist queue and starts playback from the first track.
    func loadPlaylist(_ urls: [URL]) {
        guard !urls.isEmpty else { return }
        playlistQueue = urls
        currentTrackIndex = 0
        loadTrackAt(index: 0)
        playMusic()
    }

    /// Advances to the next track in the playlist queue.
    func playNextTrack() {
        guard !playlistQueue.isEmpty else { return }
        let nextIndex = currentTrackIndex + 1
        if nextIndex < playlistQueue.count {
            currentTrackIndex = nextIndex
            loadTrackAt(index: nextIndex)
            playMusic()
        } else {
            // End of playlist
            playlistQueue = []
            currentTrackIndex = 0
            currentTrackName = nil
            isMusicPlaying = false
            stopAnalysisIfIdle()
            Self.logger.info("Playlist finished")
        }
    }

    private func loadTrackAt(index: Int) {
        let url = playlistQueue[index]
        do {
            musicFile = try AVAudioFile(forReading: url)
            currentTrackName = url.lastPathComponent
        } catch {
            Self.logger.error("Failed to load track: \(url.lastPathComponent) - \(error.localizedDescription)")
            musicFile = nil
            currentTrackName = url.lastPathComponent
        }
    }

    // MARK: - Panning (ear selection)

    private func applyPanning() {
        switch earSelection {
        case .both:
            leftToneMixer.outputVolume = leftEarEnabled ? 1.0 : 0.0
            rightToneMixer.outputVolume = rightEarEnabled ? 1.0 : 0.0
        case .left:
            leftToneMixer.outputVolume = leftEarEnabled ? 1.0 : 0.0
            rightToneMixer.outputVolume = 0.0
        case .right:
            leftToneMixer.outputVolume = 0.0
            rightToneMixer.outputVolume = rightEarEnabled ? 1.0 : 0.0
        }
        noisePan.pan = earSelection.panValue
        musicPan.pan = earSelection.panValue
    }

    // MARK: - Analysis

    private func startAnalysis() {
        guard analysisTimer == nil else { return }
        analyzer.attachToNode(engine.mainMixerNode)

        // Poll the analyzer ~30 times/sec and push to observable properties
        analysisTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.frequencyData = self?.analyzer.magnitudeSpectrum ?? []
                self?.waveformSamples = self?.analyzer.waveformSamples ?? Array(repeating: 0, count: 200)
            }
        }
    }

    private func stopAnalysisIfIdle() {
        guard !isTonePlaying, !isNoisePlaying, !isMusicPlaying else { return }
        analysisTimer?.invalidate()
        analysisTimer = nil
        analyzer.detach()
        frequencyData = []
        waveformSamples = Array(repeating: 0, count: waveformSampleCount)
    }

    // MARK: - Interruption handling

    private func observeInterruptions() {
        NotificationCenter.default.addObserver(forName: .audioSessionInterrupted,
                                               object: nil, queue: .main) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in
                self.wasPlayingBeforeInterruption = self.isTonePlaying || self.isNoisePlaying || self.isMusicPlaying
                self.isInterrupted = true
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
                self.isInterrupted = false
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
        switch earSelection {
        case .both:
            leftMatchedFrequency = freq
            rightMatchedFrequency = freq
        case .left:
            leftMatchedFrequency = freq
        case .right:
            rightMatchedFrequency = freq
        }
        frequency = freq
        Self.logger.info("Matched frequency set: \(freq) Hz for \(self.earSelection.rawValue)")
    }
}
