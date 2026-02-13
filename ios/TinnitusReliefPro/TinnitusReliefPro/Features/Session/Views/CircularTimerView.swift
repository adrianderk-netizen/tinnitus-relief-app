import SwiftUI

/// Apple Fitness-inspired circular progress ring displaying session time remaining.
/// Features a cyan gradient stroke with a glowing endpoint and animated progress.
struct CircularTimerView: View {

    /// Progress from 0.0 (not started) to 1.0 (complete).
    var progress: Double
    /// Pre-formatted time remaining string, e.g. "14:32".
    var timeRemaining: String

    @State private var animatedProgress: Double = 0

    private let lineWidth: CGFloat = 14
    private let backgroundOpacity: CGFloat = 0.15

    private var gradient: AngularGradient {
        AngularGradient(
            gradient: Gradient(colors: [
                Color.accentCyan,
                Color.accentCyan.opacity(0.7),
                Color(red: 0.55, green: 0.36, blue: 0.96), // purple tint
                Color.accentCyan
            ]),
            center: .center,
            startAngle: .degrees(-90),
            endAngle: .degrees(270)
        )
    }

    var body: some View {
        ZStack {
            // MARK: - Background Ring
            Circle()
                .stroke(
                    Color.textMuted.opacity(backgroundOpacity),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )

            // MARK: - Progress Ring
            Circle()
                .trim(from: 0, to: animatedProgress)
                .stroke(
                    gradient,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .shadow(color: Color.accentCyan.opacity(0.5), radius: 8, x: 0, y: 0)

            // MARK: - Glow Endpoint
            if animatedProgress > 0.01 {
                Circle()
                    .fill(Color.accentCyan)
                    .frame(width: lineWidth, height: lineWidth)
                    .shadow(color: Color.accentCyan.opacity(0.8), radius: 10)
                    .offset(y: -UIScreen.main.bounds.width * 0.32) // approximate radius
                    .rotationEffect(.degrees(360 * animatedProgress - 90))
            }

            // MARK: - Center Text
            VStack(spacing: 4) {
                Text(timeRemaining)
                    .font(.system(size: 40, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.textPrimary)

                Text("remaining")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
                    .textCase(.uppercase)
                    .tracking(1.5)
            }
        }
        .padding(lineWidth / 2)
        .onChange(of: progress) { _, newValue in
            withAnimation(.easeInOut(duration: 0.5)) {
                animatedProgress = newValue
            }
        }
        .onAppear {
            animatedProgress = progress
        }
    }
}

#Preview {
    ZStack {
        Color.bgPrimary.ignoresSafeArea()
        CircularTimerView(progress: 0.65, timeRemaining: "14:32")
            .frame(width: 260, height: 260)
    }
    .preferredColorScheme(.dark)
}
