import SwiftUI

/// Large animated frequency display serving as the visual centerpiece of the Tune tab.
/// Displays the current frequency with a pulsing cyan glow when a tone is active,
/// matched left/right frequencies, and a playing/stopped status badge.
struct FrequencyHeroView: View {

    @Environment(AudioEngineManager.self) private var audioEngine
    @State private var glowIntensity: CGFloat = 0.3

    private var formattedFrequency: String {
        let freq = Int(audioEngine.frequency)
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = ","
        return formatter.string(from: NSNumber(value: freq)) ?? "\(freq)"
    }

    var body: some View {
        VStack(spacing: 8) {
            // MARK: - Frequency Number
            Text("\(formattedFrequency) Hz")
                .font(.system(size: 36, weight: .bold, design: .monospaced))
                .foregroundStyle(Color.accentCyan)
                .shadow(
                    color: audioEngine.isTonePlaying
                        ? Color.accentCyan.opacity(glowIntensity)
                        : .clear,
                    radius: 20
                )
                .animation(
                    audioEngine.isTonePlaying
                        ? .easeInOut(duration: 1.5).repeatForever(autoreverses: true)
                        : .default,
                    value: audioEngine.isTonePlaying
                )
                .onChange(of: audioEngine.isTonePlaying) { _, playing in
                    glowIntensity = playing ? 0.8 : 0.3
                }

            // MARK: - Status Badge
            HStack(spacing: 6) {
                Circle()
                    .fill(audioEngine.isTonePlaying ? Color.accentGreen : Color.textMuted)
                    .frame(width: 8, height: 8)
                Text(audioEngine.isTonePlaying ? "Playing" : "Stopped")
                    .font(.caption)
                    .foregroundStyle(
                        audioEngine.isTonePlaying ? Color.accentGreen : Color.textMuted
                    )
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Color.bgCard)
            )
        }
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal)
    }
}

#Preview {
    FrequencyHeroView()
        .environment(AudioEngineManager())
        .preferredColorScheme(.dark)
        .background(Color.bgPrimary)
}
