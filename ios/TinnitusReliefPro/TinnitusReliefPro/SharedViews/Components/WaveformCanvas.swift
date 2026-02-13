import SwiftUI

/// Real-time animated waveform visualization using SwiftUI Canvas.
/// Renders sine, square, triangle, or sawtooth waveforms with a cyan
/// (or red when phase-inverted) glow stroke over a dark grid background.
struct WaveformCanvas: View {

    /// Current frequency in Hz (affects visible cycle count).
    var frequency: Float = 440
    /// Active waveform shape.
    var waveform: Waveform = .sine
    /// Whether the output is phase-inverted (changes color to red).
    var phaseInverted: Bool = false
    /// Amplitude 0...1.
    var amplitude: Float = 0.5

    /// Number of visible waveform cycles, adapting to frequency.
    private var cycleCount: Int {
        let base = Double(frequency) / 500.0
        return max(2, min(8, Int(base.rounded())))
    }

    /// Primary stroke color.
    private var strokeColor: Color {
        phaseInverted ? Color.accentRed : Color.accentCyan
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 60.0)) { timeline in
            let elapsed = timeline.date.timeIntervalSinceReferenceDate

            Canvas { context, size in
                let w = size.width
                let h = size.height
                let midY = h / 2.0
                let amp = CGFloat(amplitude) * midY * 0.85

                // MARK: - Background Grid
                drawGrid(context: context, size: size)

                // MARK: - Waveform Path
                let phaseOffset = elapsed * 2.0 * .pi * 0.5 // slow scroll
                var path = Path()

                let steps = Int(w)
                for i in 0...steps {
                    let x = CGFloat(i)
                    let t = Double(i) / Double(steps)
                    let theta = t * Double(cycleCount) * 2.0 * .pi + phaseOffset
                    let sample = waveformSample(theta: theta)
                    let invertMultiplier: Double = phaseInverted ? -1.0 : 1.0
                    let y = midY - CGFloat(sample * invertMultiplier) * amp

                    if i == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }

                // Glow layer (wider, faded)
                context.stroke(
                    path,
                    with: .color(strokeColor.opacity(0.3)),
                    style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round)
                )

                // Primary stroke
                context.stroke(
                    path,
                    with: .color(strokeColor),
                    style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)
                )
            }
        }
        .background(Color.bgPrimary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Grid

    private func drawGrid(context: GraphicsContext, size: CGSize) {
        let gridColor = Color.textMuted.opacity(0.1)
        let w = size.width
        let h = size.height

        // Horizontal lines
        for i in 1...4 {
            let y = h * CGFloat(i) / 5.0
            var line = Path()
            line.move(to: CGPoint(x: 0, y: y))
            line.addLine(to: CGPoint(x: w, y: y))
            context.stroke(line, with: .color(gridColor), style: StrokeStyle(lineWidth: 0.5, dash: [4, 4]))
        }

        // Vertical lines
        for i in 1...7 {
            let x = w * CGFloat(i) / 8.0
            var line = Path()
            line.move(to: CGPoint(x: x, y: 0))
            line.addLine(to: CGPoint(x: x, y: h))
            context.stroke(line, with: .color(gridColor), style: StrokeStyle(lineWidth: 0.5, dash: [4, 4]))
        }

        // Center line (stronger)
        var center = Path()
        center.move(to: CGPoint(x: 0, y: h / 2))
        center.addLine(to: CGPoint(x: w, y: h / 2))
        context.stroke(center, with: .color(Color.textMuted.opacity(0.25)), style: StrokeStyle(lineWidth: 0.5))
    }

    // MARK: - Waveform Math

    private func waveformSample(theta: Double) -> Double {
        let twoPi = 2.0 * Double.pi
        let normalizedPhase = theta.truncatingRemainder(dividingBy: twoPi)
        let phase = normalizedPhase < 0 ? normalizedPhase + twoPi : normalizedPhase

        switch waveform {
        case .sine:
            return sin(theta)
        case .square:
            return phase < .pi ? 1.0 : -1.0
        case .triangle:
            let normalized = phase / twoPi
            return 4.0 * abs(normalized - 0.5) - 1.0
        case .sawtooth:
            return 2.0 * (phase / twoPi) - 1.0
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        WaveformCanvas(frequency: 440, waveform: .sine, phaseInverted: false, amplitude: 0.7)
            .frame(height: 120)
        WaveformCanvas(frequency: 2000, waveform: .square, phaseInverted: true, amplitude: 0.5)
            .frame(height: 120)
        WaveformCanvas(frequency: 1000, waveform: .triangle, phaseInverted: false, amplitude: 0.6)
            .frame(height: 120)
    }
    .padding()
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
