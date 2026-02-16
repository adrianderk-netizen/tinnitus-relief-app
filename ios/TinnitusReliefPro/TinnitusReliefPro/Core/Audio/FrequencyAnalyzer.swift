import AVFoundation
import Accelerate
import os.log

/// Performs real-time FFT analysis on audio flowing through an AVAudioEngine node.
///
/// Usage:
/// 1. Call `attachToNode(_:bus:)` to install a tap.
/// 2. Read `magnitudeSpectrum` whenever you need the latest frequency data (thread-safe snapshot).
/// 3. Call `detach()` when done.
final class FrequencyAnalyzer {

    // MARK: - Configuration

    /// FFT length (must be power of two).
    static let fftLength = 2048
    /// Number of magnitude bins (fftLength / 2).
    static let binCount = fftLength / 2

    // MARK: - Private state

    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TinnitusReliefPro",
                                       category: "FrequencyAnalyzer")

    /// vDSP FFT setup object.
    private let fftSetup: vDSP.FFT<DSPSplitComplex>

    /// Hanning window, precomputed once.
    private let window: [Float]

    /// Latest magnitude spectrum, normalized to 0-1. Protected by a lock for thread safety.
    private let lock = NSLock()
    private var _magnitudeSpectrum = [Float](repeating: 0, count: binCount)

    /// The node we installed a tap on (kept for removal).
    private weak var tappedNode: AVAudioNode?
    private var tappedBus: AVAudioNodeBus = 0

    // MARK: - Public

    /// Thread-safe snapshot of the latest magnitude spectrum (0-1 normalized), `binCount` elements.
    var magnitudeSpectrum: [Float] {
        lock.lock()
        defer { lock.unlock() }
        return _magnitudeSpectrum
    }

    // MARK: - Init

    init() {
        let log2n = vDSP_Length(log2(Double(Self.fftLength)))
        guard let setup = vDSP.FFT(log2n: log2n,
                                   radix: .radix2,
                                   ofType: DSPSplitComplex.self) else {
            fatalError("Failed to create FFT setup for length \(Self.fftLength)")
        }
        self.fftSetup = setup
        self.window = vDSP.window(ofType: Float.self, usingSequence: .hanningNormalized,
                                  count: Self.fftLength, isHalfWindow: false)
    }

    // MARK: - Tap management

    /// Install a tap on the given node to capture audio for analysis.
    /// - Parameters:
    ///   - node: An AVAudioEngine node (e.g. the main mixer).
    ///   - bus: Output bus (default 0).
    func attachToNode(_ node: AVAudioNode, bus: AVAudioNodeBus = 0) {
        detach() // remove any existing tap
        tappedNode = node
        tappedBus = bus

        let bufferSize = AVAudioFrameCount(Self.fftLength)
        node.installTap(onBus: bus, bufferSize: bufferSize, format: nil) { [weak self] buffer, _ in
            self?.analyzeBuffer(buffer)
        }
        Self.logger.info("FFT tap installed on bus \(bus)")
    }

    /// Remove the tap.
    func detach() {
        if let node = tappedNode {
            node.removeTap(onBus: tappedBus)
            tappedNode = nil
            Self.logger.info("FFT tap removed")
        }
    }

    // MARK: - FFT analysis

    private func analyzeBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frameCount = Int(buffer.frameLength)
        let n = Self.fftLength
        guard frameCount >= n else { return }

        // Copy and apply Hanning window
        var windowed = [Float](repeating: 0, count: n)
        vDSP.multiply(UnsafeBufferPointer(start: channelData, count: n), window, result: &windowed)

        // Prepare split complex buffers
        var realPart = [Float](repeating: 0, count: Self.binCount)
        var imagPart = [Float](repeating: 0, count: Self.binCount)

        realPart.withUnsafeMutableBufferPointer { realBuf in
            imagPart.withUnsafeMutableBufferPointer { imagBuf in
                var splitComplex = DSPSplitComplex(realp: realBuf.baseAddress!,
                                                   imagp: imagBuf.baseAddress!)
                // Convert interleaved to split complex
                windowed.withUnsafeBytes { rawBuf in
                    let typedPtr = rawBuf.bindMemory(to: DSPComplex.self)
                    vDSP_ctoz(typedPtr.baseAddress!, 2, &splitComplex, 1, vDSP_Length(Self.binCount))
                }

                // Forward FFT (in-place)
                fftSetup.forward(input: splitComplex, output: &splitComplex)

                // Compute magnitudes
                var magnitudes = [Float](repeating: 0, count: Self.binCount)
                vDSP.squareMagnitudes(splitComplex, result: &magnitudes)
                // Convert to amplitude (sqrt) and scale
                var halfN = Float(n / 2)
                vDSP_vsdiv(magnitudes, 1, &halfN, &magnitudes, 1, vDSP_Length(Self.binCount))
                vvsqrtf(&magnitudes, magnitudes, [Int32(Self.binCount)])

                // Normalize to 0-1 by dividing by the max value
                var maxVal: Float = 0
                vDSP_maxv(magnitudes, 1, &maxVal, vDSP_Length(Self.binCount))
                if maxVal > 0 {
                    var scale = 1.0 / maxVal
                    vDSP_vsmul(magnitudes, 1, &scale, &magnitudes, 1, vDSP_Length(Self.binCount))
                }

                self.lock.lock()
                self._magnitudeSpectrum = magnitudes
                self.lock.unlock()
            }
        }
    }
}
