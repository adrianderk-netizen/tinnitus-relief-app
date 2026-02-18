import SwiftUI

/// Grid of common tinnitus frequency preset buttons.
/// Tapping a preset immediately sets the audio engine frequency.
struct FrequencyPresetsView: View {

    @Environment(AudioEngineManager.self) private var audioEngine

    private let presets: [Int] = [1000, 2000, 4000, 6000, 8000]

    private let columns = [
        GridItem(.adaptive(minimum: 80, maximum: 120), spacing: 12)
    ]

    private var isActiveFreq: (Int) -> Bool {
        { freq in Int(audioEngine.frequency) == freq }
    }

    private func earBadges(for freq: Int) -> (left: Bool, right: Bool) {
        (Int(audioEngine.leftFrequency) == freq, Int(audioEngine.rightFrequency) == freq)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Common Frequencies")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)

            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(presets, id: \.self) { freq in
                    let active = isActiveFreq(freq)
                    let badges = earBadges(for: freq)

                    Button {
                        let impact = UIImpactFeedbackGenerator(style: .light)
                        impact.impactOccurred()
                        audioEngine.frequency = Float(freq)
                    } label: {
                        VStack(spacing: 4) {
                            Text("\(freq) Hz")
                                .font(.system(.callout, design: .monospaced, weight: .semibold))
                            if badges.left || badges.right {
                                HStack(spacing: 4) {
                                    if badges.left {
                                        Text("L")
                                            .font(.system(.caption2, design: .monospaced, weight: .bold))
                                            .foregroundStyle(active ? Color.accentCyan : Color.textMuted)
                                    }
                                    if badges.right {
                                        Text("R")
                                            .font(.system(.caption2, design: .monospaced, weight: .bold))
                                            .foregroundStyle(active ? Color.accentCyan : Color.textMuted)
                                    }
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            active
                                ? Color.accentCyan.opacity(0.2)
                                : (badges.left || badges.right)
                                    ? Color.accentCyan.opacity(0.07)
                                    : Color.bgCard
                        )
                        .foregroundStyle(
                            active ? Color.accentCyan : Color.textSecondary
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(
                                    active
                                        ? Color.accentCyan
                                        : (badges.left || badges.right)
                                            ? Color.accentCyan.opacity(0.3)
                                            : Color.clear,
                                    lineWidth: 1.5
                                )
                        )
                    }
                }
            }
        }
        .padding()
        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    FrequencyPresetsView()
        .padding()
        .background(Color.bgPrimary)
        .environment(AudioEngineManager())
        .preferredColorScheme(.dark)
}
