import SwiftUI

/// Notch filter frequency response diagram drawn on a Canvas.
/// Shows the filter's magnitude response curve — a flat line with a clear "dip"
/// at the tinnitus frequency — so users can visualise the effect of their settings.
struct NotchShapeCanvas: View, @preconcurrency Animatable {

    // MARK: - Properties

    var notchCenterFreq: Float
    var notchLowerEdgeHz: Float
    var notchUpperEdgeHz: Float
    var notchDepth: Float           // 0.0–1.0
    var isActive: Bool

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

    /// Create from a `NotchWidth` enum, resolving lower/upper edges automatically.
    init(notchFrequency: Float, notchWidth: NotchWidth, notchDepth: Float, isActive: Bool) {
        self.notchCenterFreq = notchFrequency
        self.notchDepth = notchDepth
        self.isActive = isActive

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
    private let sampleCount = 200

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
            let labelHeight: CGFloat = 18
            let plotHeight = size.height - labelHeight
            let w = size.width

            let response = computeFrequencyResponse()

            drawBackground(context: context, size: size)
            drawGridLines(context: context, w: w, plotHeight: plotHeight)
            drawFilledArea(context: context, w: w, plotHeight: plotHeight, response: response)
            drawResponseCurve(context: context, w: w, plotHeight: plotHeight, response: response)
            drawNotchBandHighlight(context: context, w: w, plotHeight: plotHeight)
            drawCenterFrequencyMarker(context: context, w: w, plotHeight: plotHeight)
            drawFrequencyLabels(context: context, w: w, plotHeight: plotHeight, labelHeight: labelHeight)
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

    /// Build biquad sections matching `NotchFilterBank.recalculateCoefficients` logic.
    private func buildSections() -> [NotchSection] {
        let bandwidthHz = notchUpperEdgeHz - notchLowerEdgeHz
        let halfBandwidth = bandwidthHz / 2.0

        let numFilters: Int
        let baseQ: Float
        let isNarrow = halfBandwidth < (notchCenterFreq * 0.1)

        if isNarrow {
            numFilters = max(2, Int(ceil(halfBandwidth / 25.0)))
            baseQ = 50.0
        } else {
            let octaveWidth = log2(max(notchUpperEdgeHz, 1) / max(notchLowerEdgeHz, 1))
            numFilters = max(1, Int(ceil(octaveWidth * 4.0)))
            baseQ = 30.0
        }

        let nyquist = sampleRate / 2.0
        let clampedUpper = min(notchUpperEdgeHz, nyquist - 100)
        let clampedLower = min(notchLowerEdgeHz, clampedUpper - 1)

        let effectiveCount = min(numFilters + 1, 16)
        let freqStep = (clampedUpper - clampedLower) / Float(max(1, effectiveCount - 1))
        let q = baseQ * max(0.01, notchDepth)

        var sections: [NotchSection] = []
        for i in 0..<effectiveCount {
            let freq = clampedLower + freqStep * Float(i)
            sections.append(NotchSection(centerFreq: freq, q: q, sampleRate: sampleRate))
        }
        return sections
    }

    /// Compute dB response at logarithmically-spaced sample points.
    private func computeFrequencyResponse() -> [(freq: Float, db: Float)] {
        let sections = buildSections()
        let logMin = log10(minFreq)
        let logMax = log10(maxFreq)

        return (0..<sampleCount).map { i in
            let t = Float(i) / Float(sampleCount - 1)
            let freq = powf(10, logMin + t * (logMax - logMin))

            var magnitude: Float = 1.0
            for section in sections {
                magnitude *= section.magnitudeAt(freq, sampleRate: sampleRate)
            }

            let db = 20.0 * log10(max(magnitude, 1e-6))
            let clampedDB = max(-60, min(0, db))
            return (freq: freq, db: clampedDB)
        }
    }

    // MARK: - Drawing helpers

    private func drawBackground(context: GraphicsContext, size: CGSize) {
        context.fill(
            Path(CGRect(origin: .zero, size: size)),
            with: .color(Color.bgPrimary)
        )
    }

    private func drawGridLines(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat) {
        for db: Float in [-20, -40] {
            let y = yForDB(db, plotHeight: plotHeight)
            var line = Path()
            line.move(to: CGPoint(x: 0, y: y))
            line.addLine(to: CGPoint(x: w, y: y))
            context.stroke(
                line,
                with: .color(Color.textMuted.opacity(0.1)),
                style: StrokeStyle(lineWidth: 0.5, dash: [4, 4])
            )
        }
    }

    private func drawFilledArea(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat, response: [(freq: Float, db: Float)]) {
        guard !response.isEmpty else { return }

        var fillPath = Path()
        fillPath.move(to: CGPoint(x: logPosition(for: response[0].freq) * w, y: plotHeight))

        for point in response {
            let x = logPosition(for: point.freq) * w
            let y = yForDB(point.db, plotHeight: plotHeight)
            fillPath.addLine(to: CGPoint(x: x, y: y))
        }

        fillPath.addLine(to: CGPoint(x: logPosition(for: response.last!.freq) * w, y: plotHeight))
        fillPath.closeSubpath()

        let opacity: CGFloat = isActive ? 1.0 : 0.2
        let gradient = Gradient(colors: [
            Color.accentCyan.opacity(0.15 * opacity),
            Color.accentCyan.opacity(0.03 * opacity)
        ])
        context.fill(
            fillPath,
            with: .linearGradient(gradient, startPoint: .zero, endPoint: CGPoint(x: 0, y: plotHeight))
        )
    }

    private func drawResponseCurve(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat, response: [(freq: Float, db: Float)]) {
        guard !response.isEmpty else { return }

        var curvePath = Path()
        let firstX = logPosition(for: response[0].freq) * w
        let firstY = yForDB(response[0].db, plotHeight: plotHeight)
        curvePath.move(to: CGPoint(x: firstX, y: firstY))

        for i in 1..<response.count {
            let x = logPosition(for: response[i].freq) * w
            let y = yForDB(response[i].db, plotHeight: plotHeight)
            curvePath.addLine(to: CGPoint(x: x, y: y))
        }

        let curveOpacity: CGFloat = isActive ? 1.0 : 0.2

        // Glow layer (only when active)
        if isActive {
            context.stroke(
                curvePath,
                with: .color(Color.accentCyan.opacity(0.3)),
                style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round)
            )
        }

        // Primary stroke
        context.stroke(
            curvePath,
            with: .color(Color.accentCyan.opacity(curveOpacity)),
            style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)
        )
    }

    private func drawNotchBandHighlight(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat) {
        let leftX = logPosition(for: notchLowerEdgeHz) * w
        let rightX = logPosition(for: notchUpperEdgeHz) * w

        // Subtle vertical band
        let bandRect = CGRect(x: leftX, y: 0, width: rightX - leftX, height: plotHeight)
        context.fill(Path(bandRect), with: .color(Color.accentRed.opacity(0.08)))

        // Dashed edge lines
        for x in [leftX, rightX] {
            var line = Path()
            line.move(to: CGPoint(x: x, y: 0))
            line.addLine(to: CGPoint(x: x, y: plotHeight))
            context.stroke(
                line,
                with: .color(Color.accentRed.opacity(0.3)),
                style: StrokeStyle(lineWidth: 0.5, dash: [3, 3])
            )
        }
    }

    private func drawCenterFrequencyMarker(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat) {
        let centerX = logPosition(for: notchCenterFreq) * w

        // Vertical dashed line
        var line = Path()
        line.move(to: CGPoint(x: centerX, y: 0))
        line.addLine(to: CGPoint(x: centerX, y: plotHeight))
        context.stroke(
            line,
            with: .color(Color.accentRed.opacity(0.6)),
            style: StrokeStyle(lineWidth: 1, dash: [4, 3])
        )

        // Label pill
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
            with: .color(Color.accentRed)
        )

        let labelText = Text(label)
            .font(.system(size: 9, weight: .medium, design: .monospaced))
            .foregroundStyle(Color.white)
        context.draw(labelText, at: CGPoint(x: centerX, y: pillY), anchor: .center)
    }

    private func drawFrequencyLabels(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat, labelHeight: CGFloat) {
        for (label, freq) in freqLabels {
            let x = logPosition(for: freq) * w

            var tick = Path()
            tick.move(to: CGPoint(x: x, y: plotHeight))
            tick.addLine(to: CGPoint(x: x, y: plotHeight + 4))
            context.stroke(tick, with: .color(Color.textMuted.opacity(0.4)), style: StrokeStyle(lineWidth: 0.5))

            let labelText = Text(label)
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(Color.textMuted)
            context.draw(labelText, at: CGPoint(x: x, y: plotHeight + labelHeight / 2 + 3), anchor: .center)
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        NotchShapeCanvas(
            notchFrequency: 4000,
            notchWidth: .octave(1.0),
            notchDepth: 1.0,
            isActive: true
        )
        .frame(height: 140)
        .clipShape(RoundedRectangle(cornerRadius: 10))

        NotchShapeCanvas(
            notchFrequency: 6000,
            notchWidth: .hz(250),
            notchDepth: 0.75,
            isActive: false
        )
        .frame(height: 140)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
    .padding()
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
