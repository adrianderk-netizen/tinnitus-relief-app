import SwiftUI

/// In-app getting started guide accessible from Settings.
/// Provides step-by-step instructions for new and returning users.
struct GettingStartedView: View {
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 28) {
                // MARK: - Header
                VStack(spacing: 8) {
                    Image(systemName: "book.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.accentCyan)

                    Text("Getting Started")
                        .font(.title.bold())
                        .foregroundStyle(Color.textPrimary)

                    Text("Your guide to tinnitus relief therapy")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
                .padding(.top, 8)

                // MARK: - How It Works
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "brain.head.profile")
                        .foregroundStyle(Color.accentCyan)
                        .font(.title3)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("How It Works")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color.textPrimary)
                        Text("Notched therapy removes your tinnitus frequency from background sound. This activates surrounding neurons that gradually quiet the overactive ones causing your tinnitus \u{2014} a process called lateral inhibition.")
                            .font(.caption)
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 12))

                // MARK: - Step 1: Find Your Frequency
                StepSection(
                    number: 1,
                    title: "Find Your Frequency",
                    icon: "waveform"
                ) {
                    StepRow(number: 1, text: "Put on headphones in a quiet room")
                    StepRow(number: 2, text: "Select your ear (Left / Right / Both) on the Tune tab")
                    StepRow(number: 3, text: "Use auto-sweep or the manual slider to match your tinnitus pitch")
                    StepRow(number: 4, text: "Save the matched frequency")
                }

                // MARK: - Step 2: Start Notched Noise Therapy
                StepSection(
                    number: 2,
                    title: "Start Notched Noise Therapy",
                    icon: "waveform.badge.minus"
                ) {
                    StepRow(number: 1, text: "Go to the Therapy tab")
                    StepRow(number: 2, text: "Tap \u{201C}Use Matched Frequency\u{201D} to set the notch center")
                    StepRow(number: 3, text: "Choose a noise color (white, pink, or brown)")
                    StepRow(number: 4, text: "Tap Start")
                }

                // MARK: - Step 3: Set the Right Volume
                StepSection(
                    number: 3,
                    title: "Set the Right Volume",
                    icon: "speaker.wave.2"
                ) {
                    StepRow(number: 1, text: "Keep volume just below your tinnitus level")
                    StepRow(number: 2, text: "You should still faintly hear your tinnitus over the noise")
                }

                // MARK: - Step 4: Build a Daily Routine
                StepSection(
                    number: 4,
                    title: "Build a Daily Routine",
                    icon: "calendar.badge.clock"
                ) {
                    StepRow(number: 1, text: "Aim for 1\u{2013}2 hours daily with headphones")
                    StepRow(number: 2, text: "Split sessions however you like")
                    StepRow(number: 3, text: "Set a daily reminder in Settings")
                }

                // MARK: - Step 5: Track Your Progress
                StepSection(
                    number: 5,
                    title: "Track Your Progress",
                    icon: "chart.line.uptrend.xyaxis"
                ) {
                    StepRow(number: 1, text: "Use the Journal tab to log how you feel after sessions")
                    StepRow(number: 2, text: "Brief quiet moments after sessions are a good sign")
                }

                // MARK: - Tip: Single-Ear Tinnitus
                TipBox(
                    icon: "ear",
                    tint: Color.accentAmber,
                    text: "If your tinnitus is in one ear only, select that ear on the Tune tab before matching. The therapy will target that ear specifically."
                )

                // MARK: - Tip: General
                TipBox(
                    icon: "lightbulb.fill",
                    tint: Color.accentAmber,
                    text: "Individual results may vary. Consistency matters more than session length."
                )

                Spacer(minLength: 40)
            }
            .padding(.horizontal, 24)
        }
        .background(Color.bgPrimary)
        .navigationTitle("Getting Started")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Step Section Card

private struct StepSection<Content: View>: View {
    let number: Int
    let title: String
    let icon: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Text("\(number)")
                    .font(.system(.callout, design: .monospaced, weight: .bold))
                    .foregroundStyle(Color.accentCyan)
                    .frame(width: 28, height: 28)
                    .background(Color.accentCyan.opacity(0.15), in: Circle())

                Image(systemName: icon)
                    .foregroundStyle(Color.accentCyan)
                    .font(.title3)

                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.textPrimary)
            }

            VStack(alignment: .leading, spacing: 12) {
                content()
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Step Row

private struct StepRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Text("\(number)")
                .font(.system(.callout, design: .monospaced, weight: .bold))
                .foregroundStyle(Color.accentCyan)
                .frame(width: 28, height: 28)
                .background(Color.accentCyan.opacity(0.15), in: Circle())
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
    }
}

// MARK: - Tip Box

private struct TipBox: View {
    let icon: String
    let tint: Color
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(tint)
                .font(.title3)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    NavigationStack {
        GettingStartedView()
    }
    .preferredColorScheme(.dark)
}
