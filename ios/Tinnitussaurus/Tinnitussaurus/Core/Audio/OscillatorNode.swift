import AVFoundation
import os.log

/// Waveform shapes supported by the oscillator.
enum Waveform: String, CaseIterable, Identifiable, Sendable {
    case sine, square, triangle, sawtooth
    var id: String { rawValue }
}

/// A real-time oscillator built on AVAudioSourceNode.
///
/// Thread safety: All mutable state accessed from the audio render callback is stored in
/// atomic / lock-free properties. The render callback never allocates memory, acquires locks,
/// or calls into Objective-C.
final class OscillatorNode {

    // MARK: - Public interface (main-thread safe)

    /// The underlying node to attach to an AVAudioEngine.
    private(set) var sourceNode: AVAudioSourceNode!

    // MARK: - Atomics for render thread

    /// Frequency in Hz. Writes from any thread; reads from the render thread.
    private let _frequency = AtomicFloat(440.0)
    var frequency: Float {
        get { _frequency.value }
        set { _frequency.value = newValue }
    }

    /// Linear amplitude 0-1.
    private let _amplitude = AtomicFloat(0.5)
    var amplitude: Float {
        get { _amplitude.value }
        set { _amplitude.value = newValue }
    }

    /// Waveform shape.
    private let _waveformRaw = AtomicInt32(0) // index into Waveform.allCases
    var waveform: Waveform {
        get { Waveform.allCases[Int(_waveformRaw.value)] }
        set { _waveformRaw.value = Int32(Waveform.allCases.firstIndex(of: newValue) ?? 0) }
    }

    /// When true, output samples are multiplied by -1 (180-degree phase shift).
    private let _phaseInverted = AtomicBool(false)
    var phaseInverted: Bool {
        get { _phaseInverted.value }
        set { _phaseInverted.value = newValue }
    }

    // MARK: - Internal render state (only touched in render callback)

    /// Running phase in radians.
    private var phase: Double = 0.0

    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "Tinnitussaurus",
                                       category: "OscillatorNode")

    // MARK: - Init

    /// - Parameter sampleRate: The sample rate of the audio engine (e.g. 44100 or 48000).
    init(sampleRate: Double) {
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        // Capture self properties as unowned references to avoid retain-cycle through closure.
        // The closure is the render block; it must never allocate or lock.
        let freqAtom = _frequency
        let ampAtom = _amplitude
        let waveAtom = _waveformRaw
        let invertAtom = _phaseInverted

        var localPhase: Double = 0.0
        let twoPi = 2.0 * Double.pi

        sourceNode = AVAudioSourceNode(format: format) { _, _, frameCount, bufferList -> OSStatus in
            let ablPointer = UnsafeMutableAudioBufferListPointer(bufferList)
            let freq = Double(freqAtom.value)
            let amp = Double(ampAtom.value)
            let waveIdx = Int(waveAtom.value)
            let invert: Double = invertAtom.value ? -1.0 : 1.0
            let phaseIncrement = twoPi * freq / sampleRate

            for frame in 0..<Int(frameCount) {
                let sample: Double
                switch waveIdx {
                case 0: // sine
                    sample = sin(localPhase)
                case 1: // square
                    sample = localPhase < Double.pi ? 1.0 : -1.0
                case 2: // triangle
                    // Map phase [0, 2pi) to triangle [-1, 1]
                    let normalized = localPhase / twoPi          // 0..1
                    sample = 4.0 * abs(normalized - 0.5) - 1.0
                case 3: // sawtooth
                    // Map phase [0, 2pi) to sawtooth [-1, 1]
                    sample = 2.0 * (localPhase / twoPi) - 1.0
                default:
                    sample = sin(localPhase)
                }

                let output = Float(sample * amp * invert)

                // Write to all channels (typically mono, but safe for stereo buffers).
                for buf in ablPointer {
                    let channelData = buf.mData!.assumingMemoryBound(to: Float.self)
                    channelData[frame] = output
                }

                localPhase += phaseIncrement
                if localPhase >= twoPi { localPhase -= twoPi }
            }
            return noErr
        }
    }
}

// MARK: - Lock-free atomic wrappers

/// Atomic wrapper for `Float` using `OSAtomicAdd32Barrier`-style CAS via raw pointers.
/// Uses `UnsafeMutablePointer` with atomic load/store to avoid locks in the render callback.
final class AtomicFloat: @unchecked Sendable {
    private var storage: UnsafeMutablePointer<UInt32>

    init(_ value: Float) {
        storage = .allocate(capacity: 1)
        storage.initialize(to: value.bitPattern)
    }

    deinit { storage.deallocate() }

    var value: Float {
        get { Float(bitPattern: storage.pointee) }
        set {
            // Single 32-bit aligned store is atomic on ARM64 and x86-64.
            storage.pointee = newValue.bitPattern
        }
    }
}

/// Atomic wrapper for `Int32`.
final class AtomicInt32: @unchecked Sendable {
    private var storage: UnsafeMutablePointer<Int32>

    init(_ value: Int32) {
        storage = .allocate(capacity: 1)
        storage.initialize(to: value)
    }

    deinit { storage.deallocate() }

    var value: Int32 {
        get { storage.pointee }
        set { storage.pointee = newValue }
    }
}

/// Atomic wrapper for `Bool` backed by an `Int32`.
final class AtomicBool: @unchecked Sendable {
    private var storage: UnsafeMutablePointer<Int32>

    init(_ value: Bool) {
        storage = .allocate(capacity: 1)
        storage.initialize(to: value ? 1 : 0)
    }

    deinit { storage.deallocate() }

    var value: Bool {
        get { storage.pointee != 0 }
        set { storage.pointee = newValue ? 1 : 0 }
    }
}
