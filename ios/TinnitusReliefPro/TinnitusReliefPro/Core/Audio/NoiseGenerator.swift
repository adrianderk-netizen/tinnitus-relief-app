import AVFoundation
import os.log

/// Types of background noise for therapy.
enum NoiseType: String, CaseIterable, Identifiable, Sendable {
    case white, pink, brown
    var id: String { rawValue }
}

/// Generates noise buffers suitable for looping playback through an AVAudioPlayerNode.
///
/// Algorithms:
/// - White: uniform random in [-1, 1].
/// - Pink: Paul Kellett's 7-tap Voss-McCartney algorithm.
/// - Brown(ian): integrated white noise, peak-limited to [-1, 1].
enum NoiseGenerator {

    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TinnitusReliefPro",
                                       category: "NoiseGenerator")

    /// Generates a stereo PCM buffer of the requested noise type.
    /// - Parameters:
    ///   - type: The noise color.
    ///   - duration: Buffer length in seconds (default 2 s). Longer buffers reduce looping artifacts.
    ///   - sampleRate: The audio engine sample rate.
    /// - Returns: A stereo `AVAudioPCMBuffer` ready for `scheduleBuffer(_:at:options:.loops)`.
    static func generateBuffer(type: NoiseType,
                                duration: TimeInterval = 2.0,
                                sampleRate: Double = 44_100) -> AVAudioPCMBuffer {
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2)!
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            fatalError("Failed to allocate PCM buffer")
        }
        buffer.frameLength = frameCount

        guard let leftChannel = buffer.floatChannelData?[0],
              let rightChannel = buffer.floatChannelData?[1] else {
            fatalError("Buffer has no float channel data")
        }

        switch type {
        case .white:
            fillWhite(leftChannel, count: Int(frameCount))
            fillWhite(rightChannel, count: Int(frameCount))
        case .pink:
            fillPink(leftChannel, count: Int(frameCount))
            fillPink(rightChannel, count: Int(frameCount))
        case .brown:
            fillBrown(leftChannel, count: Int(frameCount))
            fillBrown(rightChannel, count: Int(frameCount))
        }

        logger.debug("Generated \(type.rawValue) noise buffer: \(frameCount) frames @ \(sampleRate) Hz")
        return buffer
    }

    // MARK: - White noise

    private static func fillWhite(_ buffer: UnsafeMutablePointer<Float>, count: Int) {
        for i in 0..<count {
            buffer[i] = Float.random(in: -1.0...1.0)
        }
    }

    // MARK: - Pink noise (Paul Kellett 7-tap approximation)

    private static func fillPink(_ buffer: UnsafeMutablePointer<Float>, count: Int) {
        var b0: Float = 0, b1: Float = 0, b2: Float = 0
        var b3: Float = 0, b4: Float = 0, b5: Float = 0, b6: Float = 0

        for i in 0..<count {
            let white = Float.random(in: -1.0...1.0)
            b0 = 0.99886 * b0 + white * 0.0555179
            b1 = 0.99332 * b1 + white * 0.0750759
            b2 = 0.96900 * b2 + white * 0.1538520
            b3 = 0.86650 * b3 + white * 0.3104856
            b4 = 0.55000 * b4 + white * 0.5329522
            b5 = -0.7616 * b5 - white * 0.0168980
            let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
            b6 = white * 0.115926
            buffer[i] = pink * 0.11
        }
    }

    // MARK: - Brown noise (integrated white, peak-limited)

    /// Brown noise via leaky integration of white noise.
    /// CRITICAL FIX: The web version multiplies by 3.5 which can exceed [-1, 1] and cause spikes.
    /// We clamp the final output to [-1, 1].
    private static func fillBrown(_ buffer: UnsafeMutablePointer<Float>, count: Int) {
        var lastOut: Float = 0.0

        for i in 0..<count {
            let white = Float.random(in: -1.0...1.0)
            // Leaky integrator: same formula as the JS version
            lastOut = (lastOut + 0.02 * white) / 1.02
            // Apply gain, then clamp to prevent the spike bug from JS
            let amplified = lastOut * 3.5
            buffer[i] = min(1.0, max(-1.0, amplified))
        }
    }
}
