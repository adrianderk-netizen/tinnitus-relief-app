import SwiftUI

/// Unified therapy visualization combining a real-time waveform oscilloscope
/// with a notch filter frequency response diagram and amplitude labels.
///
/// When `showNotch` is `true`, the notch response curve, grid lines, frequency
/// labels, and dB amplitude labels are drawn beneath the waveform overlay.
/// When `false`, only the waveform with simple +1/0/-1 labels is shown.
struct TherapyVisualizationCanvas: View, @preconcurrency Animatable {

    // MARK: - Properties

    var samples: [Float]
    var isActive: Bool
    var showNotch: Bool

    var notchCenterFreq: Float
    var notchLowerEdgeHz: Float
    var notchUpperEdgeHz: Float
    var notchDepth: Float

    // MARK: - Animatable

    var animatableData: AnimatablePair<AnimatablePair<Float, Float>, AnimatablePair<Float, Float>> {
        get {
            AnimatablePair(
                AnimatablePair(notchCenterFreq, notchLowerEdgeHz),
                AnimatablePair(notchUpperEdgeHz, notchDepth)
            )
        }
        set {
            notchCenterFreq = newValue.first.first
            notchLowerEdgeHz = newValue.first.second
            notchUpperEdgeHz = newValue.second.first
            notchDepth = newValue.second.second
        }
    }

    // MARK: - Convenience init

    init(samples: [Float], isActive: Bool, showNotch: Bool,
         notchFrequency: Float, notchWidth: NotchWidth, notchDepth: Float) {
        self.samples = samples
        self.isActive = isActive
        self.showNotch = showNotch
        self.notchCenterFreq = notchFrequency
        self.notchDepth = notchDepth

        switch notchWidth {
        case .hz(let v):
            self.notchLowerEdgeHz = max(20, notchFrequency - Float(v))
            self.notchUpperEdgeHz = notchFrequency + Float(v)
        case .octave(let v):
            let halfOct = v / 2.0
            self.notchLowerEdgeHz = max(20, notchFrequency / powf(2.0, halfOct))
            self.notchUpperEdgeHz = notchFrequency * powf(2.0, halfOct)
        }
    }

    // MARK: - Constants

    private let minFreq: Float = 20
    private let maxFreq: Float = 20_000
    private let sampleRate: Float = 44_100
    private let responseSampleCount = 200

    private let leftMargin: CGFloat = 32
    private let bottomLabelHeight: CGFloat = 18

    private let freqLabels: [(String, Float)] = [
        ("100", 100),
        ("500", 500),
        ("1k", 1000),
        ("5k", 5000),
        ("10k", 10000),
        ("20k", 20000)
    ]

    // MARK: - Body

    var body: some View {
        Canvas { context, size in
            let labelH = showNotch ? bottomLabelHeight : 0
            let plotX = leftMargin
            let plotW = size.width - leftMargin
            let plotH = size.height - labelH

            // 1. Background
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color.bgPrimary))

            if showNotch {
                let notchOpacity: CGFloat = isActive ? 1.0 : 0.2
                let response = computeFrequencyResponse()

                // 2. Grid lines
                drawGridLines(context: context, plotX: plotX, plotW: plotW, plotH: plotH, opacity: notchOpacity)

                // 3. Filled area under response curve
                drawFilledArea(context: context, plotX: plotX, plotW: plotW, plotH: plotH, response: response, opacity: notchOpacity)

                // 4. Notch response curve
                drawResponseCurve(context: context, plotX: plotX, plotW: plotW, plotH: plotH, response: response, opacity: notchOpacity)

                // 5. Notch band highlight
                drawNotchBandHighlight(context: context, plotX: plotX, plotW: plotW, plotH: plotH, opacity: notchOpacity)

                // 6. Center frequency marker
                drawCenterFrequencyMarker(context: context, plotX: plotX, plotW: plotW, plotH: plotH, opacity: notchOpacity)
            }

            // 7. Waveform center line
            let midY = plotH / 2
            var centerLine = Path()
            centerLine.move(to: CGPoint(x: leftMargin, y: midY))
            centerLine.addLine(to: CGPoint(x: size.width, y: midY))
            context.stroke(centerLine, with: .color(Color.textMuted.opacity(0.15)), style: StrokeStyle(lineWidth: 0.5))

            // 8. Waveform path
            drawWaveform(context: context, plotX: plotX, plotW: plotW, plotH: plotH)

            // 9. Amplitude labels (left margin)
            if showNotch {
                drawDBLabels(context: context, plotH: plotH)
            } else {
                drawWaveformLabels(context: context, plotH: plotH)
            }

            // 10. Frequency labels (bottom)
            if showNotch {
                drawFrequencyLabels(context: context, plotX: plotX, plotW: plotW, plotH: plotH, labelH: labelH)
            }
        }
    }

    // MARK: - Frequency helpers

    private func logPosition(for freq: Float) -> CGFloat {
        guard freq > 0 else { return 0 }
        let logMin = log10(minFreq)
        let logMax = log10(maxFreq)
        let logF = log10(max(freq, minFreq))
        return CGFloat((logF - logMin) / (logMax - logMin))
    }

    private func yForDB(_ db: Float, plotHeight: CGFloat) -> CGFloat {
        let clamped = max(-60, min(0, db))
        return CGFloat(-clamped / 60.0) * plotHeight
    }

    private func formatFrequency(_ freq: Float) -> String {
        if freq >= 1000 {
            let kHz = freq / 1000.0
            if kHz == floor(kHz) {
                return String(format: "%.0f kHz", kHz)
            } else {
                return String(format: "%.1f kHz", kHz)
            }
        } else {
            return String(format: "%.0f Hz", freq)
        }
    }

    // MARK: - Biquad response computation

    private struct NotchSection {
        let b0: Float
        let b1: Float
        let b2: Float
        let a1: Float
        let a2: Float

        init(centerFreq: Float, q: Float, sampleRate: Float) {
            let omega = 2.0 * Float.pi * centerFreq / sampleRate
            let sinOmega = sin(omega)
            let cosOmega = cos(omega)
            let alpha = sinOmega / (2.0 * q)

            let a0 = 1.0 + alpha
            self.b0 = 1.0 / a0
            self.b1 = -2.0 * cosOmega / a0
            self.b2 = 1.0 / a0
            self.a1 = -2.0 * cosOmega / a0
            self.a2 = (1.0 - alpha) / a0
        }

        func magnitudeAt(_ frequency: Float, sampleRate: Float) -> Float {
            let omega = 2.0 * Float.pi * frequency / sampleRate
            let cosW = cos(omega)
            let cos2W = cos(2.0 * omega)
            let sinW = sin(omega)
            let sin2W = sin(2.0 * omega)

            let numReal = b0 + b1 * cosW + b2 * cos2W
            let numImag = -(b1 * sinW + b2 * sin2W)
            let denReal = 1.0 + a1 * cosW + a2 * cos2W
            let denImag = -(a1 * sinW + a2 * sin2W)

            let numMagSq = numReal * numReal + numImag * numImag
            let denMagSq = denReal * denReal + denImag * denImag

            return sqrt(numMagSq / max(denMagSq, 1e-10))
        }
    }

    private func buildSections() -> [NotchSection] {
        let bandwidthHz = notchUpperEdgeHz - notchLowerEdgeHz
        guard bandwidthHz > 0, notchCenterFreq > 0 else { return [] }

        let nyquist = sampleRate / 2.0
        let clampedUpper = min(notchUpperEdgeHz, nyquist - 100)
        let clampedLower = max(notchLowerEdgeHz, 20)
        guard clampedLower < clampedUpper else { return [] }

        let q = max(0.5, notchCenterFreq / bandwidthHz)
        return [NotchSection(centerFreq: notchCenterFreq, q: q, sampleRate: sampleRate)]
    }

    private func computeFrequencyResponse() -> [(freq: Float, db: Float)] {
        let sections = buildSections()
        let logMin = log10(minFreq)
        let logMax = log10(maxFreq)
        let depth = max(0.01, notchDepth)

        return (0..<responseSampleCount).map { i in
            let t = Float(i) / Float(responseSampleCount - 1)
            let freq = powf(10, logMin + t * (logMax - logMin))

            var magnitude: Float = 1.0
            for section in sections {
                magnitude *= section.magnitudeAt(freq, sampleRate: sampleRate)
            }

            let db = 20.0 * log10(max(magnitude, 1e-6)) * depth
            let clampedDB = max(-60, min(0, db))
            return (freq: freq, db: clampedDB)
        }
    }

    // MARK: - Notch drawing helpers

    private func drawGridLines(context: GraphicsContext, plotX: CGFloat, plotW: CGFloat, plotH: CGFloat, opacity: CGFloat) {
        for db: Float in [-20, -40] {
            let y = yForDB(db, plotHeight: plotH)
            var line = Path()
            line.move(to: CGPoint(x: plotX, y: y))
            line.addLine(to: CGPoint(x: plotX + plotW, y: y))
            context.stroke(
                line,
                with: .color(Color.textMuted.opacity(0.1 * opacity)),
                style: StrokeStyle(lineWidth: 0.5, dash: [4, 4])
            )
        }
    }

    private func drawFilledArea(context: GraphicsContext, plotX: CGFloat, plotW: CGFloat, plotH: CGFloat, response: [(freq: Float, db: Float)], opacity: CGFloat) {
        guard !response.isEmpty else { return }

        var fillPath = Path()
        fillPath.move(to: CGPoint(x: plotX + logPosition(for: response[0].freq) * plotW, y: plotH))

        for point in response {
            let x = plotX + logPosition(for: point.freq) * plotW
            let y = yForDB(point.db, plotHeight: plotH)
            fillPath.addLine(to: CGPoint(x: x, y: y))
        }

        fillPath.addLine(to: CGPoint(x: plotX + logPosition(for: response.last!.freq) * plotW, y: plotH))
        fillPath.closeSubpath()

        let gradient = Gradient(colors: [
            Color.accentCyan.opacity(0.15 * opacity),
            Color.accentCyan.opacity(0.03 * opacity)
        ])
        context.fill(
            fillPath,
            with: .linearGradient(gradient, startPoint: .zero, endPoint: CGPoint(x: 0, y: plotH))
        )
    }

    private func drawResponseCurve(context: GraphicsContext, plotX: CGFloat, plotW: CGFloat, plotH: CGFloat, response: [(freq: Float, db: Float)], opacity: CGFloat) {
        guard !response.isEmpty else { return }

        var curvePath = Path()
        let firstX = plotX + logPosition(for: response[0].freq) * plotW
        let firstY = yForDB(response[0].db, plotHeight: plotH)
        curvePath.move(to: CGPoint(x: firstX, y: firstY))

        for i in 1..<response.count {
            let x = plotX + logPosition(for: response[i].freq) * plotW
            let y = yForDB(response[i].db, plotHeight: plotH)
            curvePath.addLine(to: CGPoint(x: x, y: y))
        }

        // Glow layer (only when active)
        if isActive {
            context.stroke(
                curvePath,
                with: .color(Color.accentCyan.opacity(0.3)),
                style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round)
            )
        }

        context.stroke(
            curvePath,
            with: .color(Color.accentCyan.opacity(opacity)),
            style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)
        )
    }

    private func drawNotchBandHighlight(context: GraphicsContext, plotX: CGFloat, plotW: CGFloat, plotH: CGFloat, opacity: CGFloat) {
        let leftX = plotX + logPosition(for: notchLowerEdgeHz) * plotW
        let rightX = plotX + logPosition(for: notchUpperEdgeHz) * plotW

        let bandRect = CGRect(x: leftX, y: 0, width: rightX - leftX, height: plotH)
        context.fill(Path(bandRect), with: .color(Color.accentRed.opacity(0.08 * opacity)))

        for x in [leftX, rightX] {
            var line = Path()
            line.move(to: CGPoint(x: x, y: 0))
            line.addLine(to: CGPoint(x: x, y: plotH))
            context.stroke(
                line,
                with: .color(Color.accentRed.opacity(0.3 * opacity)),
                style: StrokeStyle(lineWidth: 0.5, dash: [3, 3])
            )
        }
    }

    private func drawCenterFrequencyMarker(context: GraphicsContext, plotX: CGFloat, plotW: CGFloat, plotH: CGFloat, opacity: CGFloat) {
        let centerX = plotX + logPosition(for: notchCenterFreq) * plotW

        var line = Path()
        line.move(to: CGPoint(x: centerX, y: 0))
        line.addLine(to: CGPoint(x: centerX, y: plotH))
        context.stroke(
            line,
            with: .color(Color.accentRed.opacity(0.6 * opacity)),
            style: StrokeStyle(lineWidth: 1, dash: [4, 3])
        )

        let label = formatFrequency(notchCenterFreq)
        let pillWidth: CGFloat = CGFloat(label.count) * 7 + 12
        let pillHeight: CGFloat = 18
        let pillY: CGFloat = 10
        let pillRect = CGRect(
            x: centerX - pillWidth / 2,
            y: pillY - pillHeight / 2,
            width: pillWidth,
            height: pillHeight
        )

        context.fill(
            Path(roundedRect: pillRect, cornerRadius: 4),
            with: .color(Color.accentRed.opacity(opacity))
        )

        let labelText = Text(label)
            .font(.system(size: 9, weight: .medium, design: .monospaced))
            .foregroundStyle(Color.white)
        context.draw(labelText, at: CGPoint(x: centerX, y: pillY), anchor: .center)
    }

    // MARK: - Waveform drawing

    private func drawWaveform(context: GraphicsContext, plotX: CGFloat, plotW: CGFloat, plotH: CGFloat) {
        guard !samples.isEmpty else { return }

        let midY = plotH / 2
        var wavePath = Path()
        let pointCount = samples.count
        let xStep = plotW / CGFloat(max(pointCount - 1, 1))
        let amplitude = midY * 0.85

        for i in 0..<pointCount {
            let x = plotX + CGFloat(i) * xStep
            let sample = CGFloat(samples[i]).clamped(to: -1...1)
            let y = midY - sample * amplitude

            if i == 0 {
                wavePath.move(to: CGPoint(x: x, y: y))
            } else {
                wavePath.addLine(to: CGPoint(x: x, y: y))
            }
        }

        let waveOpacity: CGFloat = isActive ? 0.85 : 0.35

        // White glow layer (active only)
        if isActive {
            context.stroke(
                wavePath,
                with: .color(Color.white.opacity(0.25)),
                style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round)
            )
        }

        // Primary waveform stroke
        context.stroke(
            wavePath,
            with: .color(Color.accentCyan.opacity(waveOpacity)),
            style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)
        )
    }

    // MARK: - Label drawing

    private func drawDBLabels(context: GraphicsContext, plotH: CGFloat) {
        let labels: [(String, Float)] = [("0 dB", 0), ("-20", -20), ("-40", -40), ("-60", -60)]
        for (text, db) in labels {
            let y = yForDB(db, plotHeight: plotH)
            let label = Text(text)
                .font(.system(size: 8, design: .monospaced))
                .foregroundStyle(Color.textMuted)
            context.draw(label, at: CGPoint(x: leftMargin - 4, y: y), anchor: .trailing)
        }
    }

    private func drawWaveformLabels(context: GraphicsContext, plotH: CGFloat) {
        let midY = plotH / 2
        let amplitude = midY * 0.85
        let labels: [(String, CGFloat)] = [("+1", midY - amplitude), ("0", midY), ("-1", midY + amplitude)]
        for (text, y) in labels {
            let label = Text(text)
                .font(.system(size: 8, design: .monospaced))
                .foregroundStyle(Color.textMuted)
            context.draw(label, at: CGPoint(x: leftMargin - 4, y: y), anchor: .trailing)
        }
    }

    private func drawFrequencyLabels(context: GraphicsContext, plotX: CGFloat, plotW: CGFloat, plotH: CGFloat, labelH: CGFloat) {
        for (label, freq) in freqLabels {
            let x = plotX + logPosition(for: freq) * plotW

            var tick = Path()
            tick.move(to: CGPoint(x: x, y: plotH))
            tick.addLine(to: CGPoint(x: x, y: plotH + 4))
            context.stroke(tick, with: .color(Color.textMuted.opacity(0.4)), style: StrokeStyle(lineWidth: 0.5))

            let labelText = Text(label)
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(Color.textMuted)
            context.draw(labelText, at: CGPoint(x: x, y: plotH + labelH / 2 + 3), anchor: .center)
        }
    }
}

// MARK: - CGFloat extension

private extension CGFloat {
    func clamped(to range: ClosedRange<CGFloat>) -> CGFloat {
        Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        TherapyVisualizationCanvas(
            samples: (0..<200).map { Float(sin(Double($0) * 0.1) * 0.5) },
            isActive: true,
            showNotch: true,
            notchFrequency: 4000,
            notchWidth: .octave(1.0),
            notchDepth: 1.0
        )
        .frame(height: 170)
        .clipShape(RoundedRectangle(cornerRadius: 10))

        TherapyVisualizationCanvas(
            samples: Array(repeating: 0, count: 200),
            isActive: false,
            showNotch: false,
            notchFrequency: 4000,
            notchWidth: .octave(1.0),
            notchDepth: 1.0
        )
        .frame(height: 170)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
    .padding()
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
