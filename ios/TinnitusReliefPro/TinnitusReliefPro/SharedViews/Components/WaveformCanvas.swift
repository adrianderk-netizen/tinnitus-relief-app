import SwiftUI

/// Real-time audio waveform drawn on a Canvas.
/// Displays a rolling oscilloscope-style visualization of the audio output.
struct WaveformCanvas: View {

    var samples: [Float]
    var isActive: Bool

    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            let midY = h / 2

            // Background
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color.bgPrimary))

            // Center line
            var centerLine = Path()
            centerLine.move(to: CGPoint(x: 0, y: midY))
            centerLine.addLine(to: CGPoint(x: w, y: midY))
            context.stroke(centerLine, with: .color(Color.textMuted.opacity(0.15)), style: StrokeStyle(lineWidth: 0.5))

            // Waveform path
            guard !samples.isEmpty else { return }

            var wavePath = Path()
            let pointCount = samples.count
            let xStep = w / CGFloat(max(pointCount - 1, 1))
            let amplitude = midY * 0.85  // leave some padding

            for i in 0..<pointCount {
                let x = CGFloat(i) * xStep
                let sample = CGFloat(samples[i]).clamped(to: -1...1)
                let y = midY - sample * amplitude

                if i == 0 {
                    wavePath.move(to: CGPoint(x: x, y: y))
                } else {
                    wavePath.addLine(to: CGPoint(x: x, y: y))
                }
            }

            let opacity: CGFloat = isActive ? 1.0 : 0.5

            // Glow layer (active only)
            if isActive {
                context.stroke(
                    wavePath,
                    with: .color(Color.accentCyan.opacity(0.3)),
                    style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round)
                )
            }

            // Primary stroke
            context.stroke(
                wavePath,
                with: .color(Color.accentCyan.opacity(opacity)),
                style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)
            )
        }
    }
}

private extension CGFloat {
    func clamped(to range: ClosedRange<CGFloat>) -> CGFloat {
        Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
    }
}

#Preview {
    VStack {
        WaveformCanvas(
            samples: (0..<200).map { Float(sin(Double($0) * 0.1) * 0.5) },
            isActive: true
        )
        .frame(height: 80)
        .clipShape(RoundedRectangle(cornerRadius: 10))

        WaveformCanvas(samples: Array(repeating: 0, count: 200), isActive: false)
        .frame(height: 80)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
    .padding()
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
