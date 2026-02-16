import SwiftUI

/// Grid of common tinnitus frequency preset buttons.
/// Tapping a preset immediately sets the audio engine frequency.
struct FrequencyPresetsView: View {

    @Environment(AudioEngineManager.self) private var audioEngine

    private let presets: [Int] = [1000, 2000, 4000, 6000, 8000]

    private let columns = [
        GridItem(.adaptive(minimum: 80, maximum: 120), spacing: 12)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Common Frequencies")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)

            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(presets, id: \.self) { freq in
                    Button {
                        let impact = UIImpactFeedbackGenerator(style: .light)
                        impact.impactOccurred()
                        audioEngine.frequency = Float(freq)
                    } label: {
                        Text("\(freq) Hz")
                            .font(.system(.callout, design: .monospaced, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                Int(audioEngine.frequency) == freq
                                    ? Color.accentCyan.opacity(0.2)
                                    : Color.bgCard
                            )
                            .foregroundStyle(
                                Int(audioEngine.frequency) == freq
                                    ? Color.accentCyan
                                    : Color.textSecondary
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(
                                        Int(audioEngine.frequency) == freq
                                            ? Color.accentCyan
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
