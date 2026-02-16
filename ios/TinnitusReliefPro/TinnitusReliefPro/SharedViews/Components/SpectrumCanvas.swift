import SwiftUI

/// FFT spectrum visualization drawn as vertical bars on a logarithmic frequency axis.
/// Overlays the active notch region in a semi-transparent red to show the filtered band.
struct SpectrumCanvas: View {

    /// FFT magnitude data (linear, 0...1 range expected).
    var frequencyData: [Float]
    /// Center frequency of the notch in Hz.
    var notchFrequency: Double
    /// Notch half-width in Hz (or octave fraction; caller resolves to Hz).
    var notchWidth: Double

    /// Frequency range rendered.
    private let minFreq: Double = 20
    private let maxFreq: Double = 20000

    /// Frequency axis labels.
    private let freqLabels: [(String, Double)] = [
        ("100", 100),
        ("500", 500),
        ("1k", 1000),
        ("5k", 5000),
        ("10k", 10000),
        ("20k", 20000)
    ]

    /// Map a frequency to a 0...1 position on a log scale.
    private func logPosition(for freq: Double) -> Double {
        guard freq > 0 else { return 0 }
        let logMin = log10(minFreq)
        let logMax = log10(maxFreq)
        let logF = log10(max(freq, minFreq))
        return (logF - logMin) / (logMax - logMin)
    }

    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            let labelHeight: CGFloat = 18
            let plotHeight = h - labelHeight

            drawBackground(context: context, size: size)
            drawBars(context: context, w: w, plotHeight: plotHeight)
            drawNotchOverlay(context: context, w: w, plotHeight: plotHeight)
            drawFrequencyLabels(context: context, w: w, plotHeight: plotHeight, labelHeight: labelHeight)
        }
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Drawing helpers

    private func drawBackground(context: GraphicsContext, size: CGSize) {
        context.fill(
            Path(CGRect(origin: .zero, size: size)),
            with: .color(Color.bgPrimary)
        )
    }

    private func drawBars(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat) {
        let barCount = frequencyData.count
        if barCount > 0 {
            drawSpectrumBars(context: context, w: w, plotHeight: plotHeight, barCount: barCount)
        } else {
            drawPlaceholderBars(context: context, w: w, plotHeight: plotHeight)
        }
    }

    private func drawSpectrumBars(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat, barCount: Int) {
        let barWidth: CGFloat = max(w / CGFloat(barCount), 1.5)
        let freqRatio = maxFreq / minFreq

        for i in 0..<barCount {
            let freqForBin = minFreq * pow(freqRatio, Double(i) / Double(barCount))
            let xPos: CGFloat = logPosition(for: freqForBin) * Double(w)
            let magnitude: CGFloat = CGFloat(min(max(frequencyData[i], 0), 1))
            let barH: CGFloat = magnitude * plotHeight

            let barRect = CGRect(
                x: xPos - barWidth / 2.0,
                y: plotHeight - barH,
                width: barWidth,
                height: barH
            )

            let gradient = Gradient(colors: [
                Color.accentCyan,
                Color(red: 0.55, green: 0.36, blue: 0.96)
            ])
            context.fill(
                Path(barRect),
                with: .linearGradient(
                    gradient,
                    startPoint: CGPoint(x: xPos, y: plotHeight),
                    endPoint: CGPoint(x: xPos, y: 0)
                )
            )
        }
    }

    private func drawPlaceholderBars(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat) {
        let placeholderCount = 64
        let barWidth: CGFloat = max(w / CGFloat(placeholderCount), 1.5)
        let freqRatio = maxFreq / minFreq

        for i in 0..<placeholderCount {
            let freqForBin = minFreq * pow(freqRatio, Double(i) / Double(placeholderCount))
            let xPos: CGFloat = logPosition(for: freqForBin) * Double(w)

            let t = Double(i) / Double(placeholderCount)
            let sinVal = sin(.pi * t) * (1.0 - t * 0.5)
            let magnitude: CGFloat = CGFloat(0.2 + 0.5 * sinVal)
            let barH: CGFloat = magnitude * plotHeight * 0.4

            let barRect = CGRect(
                x: xPos - barWidth / 2.0,
                y: plotHeight - barH,
                width: barWidth,
                height: barH
            )

            context.fill(
                Path(barRect),
                with: .color(Color.accentCyan.opacity(0.15))
            )
        }
    }

    private func drawNotchOverlay(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat) {
        let notchLow = notchFrequency - notchWidth
        let notchHigh = notchFrequency + notchWidth
        let notchX1: CGFloat = logPosition(for: max(notchLow, minFreq)) * Double(w)
        let notchX2: CGFloat = logPosition(for: min(notchHigh, maxFreq)) * Double(w)

        let notchRect = CGRect(x: notchX1, y: 0, width: notchX2 - notchX1, height: plotHeight)
        context.fill(Path(notchRect), with: .color(Color.accentRed.opacity(0.2)))

        for x in [notchX1, notchX2] {
            var line = Path()
            line.move(to: CGPoint(x: x, y: 0))
            line.addLine(to: CGPoint(x: x, y: plotHeight))
            context.stroke(
                line,
                with: .color(Color.accentRed.opacity(0.5)),
                style: StrokeStyle(lineWidth: 1, dash: [4, 3])
            )
        }
    }

    private func drawFrequencyLabels(context: GraphicsContext, w: CGFloat, plotHeight: CGFloat, labelHeight: CGFloat) {
        for (label, freq) in freqLabels {
            let x: CGFloat = logPosition(for: freq) * Double(w)

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

#Preview {
    VStack(spacing: 16) {
        SpectrumCanvas(
            frequencyData: (0..<64).map { _ in Float.random(in: 0.1...0.8) },
            notchFrequency: 4000,
            notchWidth: 500
        )
        .frame(height: 140)

        SpectrumCanvas(
            frequencyData: [],
            notchFrequency: 6000,
            notchWidth: 200
        )
        .frame(height: 140)
    }
    .padding()
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
