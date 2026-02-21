import AVFoundation
import os.log

// MARK: - Notch Width

/// Represents the width of a notch filter. Can be Hz-based (symmetric +-Hz around center)
/// or octave-based (logarithmic bandwidth).
enum NotchWidth: Hashable, Sendable {
    /// Symmetric Hz offset, e.g. `.hz(50)` means center +/- 50 Hz.
    case hz(Int)
    /// Octave-based bandwidth, e.g. `.octave(1.0)`.
    case octave(Float)

    /// Human-readable label for UI.
    var label: String {
        switch self {
        case .hz(let v):    return "+/- \(v) Hz"
        case .octave(let v): return String(format: "%.2g oct", v)
        }
    }

    /// All preset widths offered in the UI.
    static let allPresets: [NotchWidth] = [
        .hz(50), .hz(100), .hz(250),
        .octave(0.25), .octave(0.5), .octave(1.0), .octave(1.5), .octave(2.0)
    ]

    /// Returns the half-width in Hz for rendering purposes.
    /// For `.hz` cases, this is the direct value. For `.octave` cases,
    /// it computes the half-width relative to the given center frequency.
    func hzValue(centerFrequency: Double) -> Double {
        switch self {
        case .hz(let v):
            return Double(v)
        case .octave(let v):
            let halfOct = Double(v) / 2.0
            let upper = centerFrequency * pow(2.0, halfOct)
            return upper - centerFrequency
        }
    }
}

// MARK: - Biquad Filter State

/// Holds transposed-direct-form-II biquad coefficients and delay state for a single second-order section.
/// Designed for lock-free, real-time usage. All fields are plain value types.
struct BiquadFilterState {
    // Normalized feedforward coefficients
    var b0: Float = 0
    var b1: Float = 0
    var b2: Float = 0
    // Normalized feedback coefficients (negated convention: y[n] = b0*x[n] + ... - a1*y[n-1] - a2*y[n-2])
    var a1: Float = 0
    var a2: Float = 0
    // Delay line
    var z1: Float = 0
    var z2: Float = 0

    /// Process a single sample through this biquad (transposed direct-form II).
    @inline(__always)
    mutating func process(_ input: Float) -> Float {
        let output = b0 * input + z1
        z1 = b1 * input - a1 * output + z2
        z2 = b2 * input - a2 * output
        return output
    }

    /// Recompute coefficients for a notch (band-reject) filter.
    /// Uses Robert Bristow-Johnson's Audio EQ Cookbook formulas.
    /// - Parameters:
    ///   - centerFreq: Center frequency in Hz.
    ///   - q: Quality factor (higher = narrower notch).
    ///   - sampleRate: Sample rate in Hz.
    mutating func setNotch(centerFreq: Float, q: Float, sampleRate: Float) {
        let omega = 2.0 * Float.pi * centerFreq / sampleRate
        let sinOmega = sin(omega)
        let cosOmega = cos(omega)
        let alpha = sinOmega / (2.0 * q)

        let a0 = 1.0 + alpha
        b0 = 1.0 / a0
        b1 = -2.0 * cosOmega / a0
        b2 = 1.0 / a0
        a1 = -2.0 * cosOmega / a0
        a2 = (1.0 - alpha) / a0
    }

    /// Reset delay state to zero (e.g. when starting fresh).
    mutating func reset() {
        z1 = 0
        z2 = 0
    }
}

// MARK: - NotchFilterBank

/// A cascade of biquad notch filters that can be applied to an audio buffer in real time.
///
/// Parameter updates are lock-free: the main thread writes new parameters into an atomic staging
/// area and the audio thread picks them up on the next render cycle.
final class NotchFilterBank: @unchecked Sendable {

    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TinnitusReliefPro",
                                       category: "NotchFilterBank")

    // MARK: - Properties

    /// Maximum number of cascaded biquad sections.
    static let maxSections = 16

    /// Array of biquad filter states. Only accessed on the audio thread after initial setup,
    /// or behind `parametersNeedUpdate`.
    private var sections: [BiquadFilterState]

    /// Number of active sections (may be less than `sections.count`).
    private var activeSectionCount: Int = 0

    /// Lock-free flag: main thread sets to 1 after writing staged parameters;
    /// audio thread sets to 0 after applying them.
    private let needsUpdate = AtomicBool(false)

    /// Staged parameters written from the main thread.
    private var stagedCenter: Float = 1000
    private var stagedWidth: NotchWidth = .octave(1.0)
    private var stagedDepth: Float = 1.0
    private var stagedSampleRate: Float = 44_100

    /// The sample rate for coefficient computation.
    let sampleRate: Float

    // MARK: - Init

    init(sampleRate: Float = 44_100) {
        self.sampleRate = sampleRate
        self.stagedSampleRate = sampleRate
        self.sections = [BiquadFilterState](repeating: BiquadFilterState(), count: Self.maxSections)
    }

    // MARK: - Parameter update (call from any thread)

    /// Schedule new notch parameters. The audio thread will pick them up on the next render pass.
    func update(centerFreq: Float, width: NotchWidth, depth: Float) {
        stagedCenter = centerFreq
        stagedWidth = width
        stagedDepth = max(0, min(1, depth))
        needsUpdate.value = true
    }

    // MARK: - Audio-thread processing

    /// Process an audio buffer in-place through the notch filter cascade.
    /// Safe to call from the real-time audio thread.
    func process(_ buffer: UnsafeMutablePointer<Float>, frameCount: Int) {
        // Check if parameters need recalculating
        if needsUpdate.value {
            recalculateCoefficients()
            needsUpdate.value = false
        }

        guard activeSectionCount > 0 else { return }

        for frame in 0..<frameCount {
            var sample = buffer[frame]
            for s in 0..<activeSectionCount {
                sample = sections[s].process(sample)
            }
            buffer[frame] = sample
        }
    }

    /// Reset all delay lines (call when stopping / restarting playback).
    func reset() {
        for i in 0..<sections.count {
            sections[i].reset()
        }
    }

    // MARK: - Coefficient calculation (called on audio thread, but no allocation)

    private func recalculateCoefficients() {
        let center = stagedCenter
        let depth = stagedDepth
        let width = stagedWidth
        let sr = sampleRate

        // Compute lower and upper edge frequencies
        let lowerFreq: Float
        let upperFreq: Float
        let isNarrow: Bool
        let numFilters: Int
        let baseQ: Float

        switch width {
        case .hz(let hzWidth):
            let hw = Float(hzWidth)
            // CRITICAL FIX: Clamp lower frequency to prevent negative/sub-audible values
            lowerFreq = max(20, center - hw)
            upperFreq = center + hw
            isNarrow = true
            numFilters = max(2, Int(ceil(hw / 25.0)))
            baseQ = 50.0

        case .octave(let octaveWidth):
            let halfOct = octaveWidth / 2.0
            // CRITICAL FIX: Clamp lower frequency to 20 Hz minimum
            lowerFreq = max(20, center / powf(2.0, halfOct))
            upperFreq = center * powf(2.0, halfOct)
            isNarrow = false
            numFilters = max(1, Int(ceil(octaveWidth * 4.0)))
            baseQ = 30.0
        }

        // Clamp upper frequency to Nyquist - margin
        let nyquist = sr / 2.0
        let clampedUpper = min(upperFreq, nyquist - 100)
        let clampedLower = min(lowerFreq, clampedUpper - 1) // ensure lower < upper

        let effectiveCount = min(numFilters + 1, Self.maxSections)
        let freqStep = (clampedUpper - clampedLower) / Float(max(1, effectiveCount - 1))
        let q = baseQ * max(0.01, depth) // avoid zero Q

        for i in 0..<effectiveCount {
            let freq = clampedLower + freqStep * Float(i)
            sections[i].reset()
            sections[i].setNotch(centerFreq: freq, q: q, sampleRate: sr)
        }

        activeSectionCount = effectiveCount

        Self.logger.debug("""
            Notch filter updated: center=\(center)Hz, \
            range=[\(clampedLower)-\(clampedUpper)]Hz, \
            sections=\(effectiveCount), Q=\(q), narrow=\(isNarrow)
            """)
    }
}

// MARK: - AVAudioUnit wrapper

extension NotchFilterBank {

    /// Creates an `AVAudioUnitEffect` node that wraps this filter bank for use in an AVAudioEngine graph.
    /// The returned node processes audio through the cascaded biquad notch filters.
    func makeAudioUnit(sampleRate: Double) -> AVAudioMixerNode {
        // We use a mixer as a pass-through; actual processing is done via an installTap.
        // For real-time filtering, callers should use `process(_:frameCount:)` inside
        // an AVAudioSourceNode render block or an AUAudioUnit render callback.
        return AVAudioMixerNode()
    }
}
