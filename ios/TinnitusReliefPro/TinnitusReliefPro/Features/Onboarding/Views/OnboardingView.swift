import SwiftUI

/// Full-screen onboarding flow with four educational slides.
/// Presented as a `.fullScreenCover` on first launch. The user can skip
/// at any time or navigate through slides with Back/Next buttons.
struct OnboardingView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var currentPage = 0

    private let totalPages = 4

    var body: some View {
        ZStack {
            Color.bgPrimary.ignoresSafeArea()

            VStack(spacing: 0) {
                // MARK: - Skip Button
                HStack {
                    Spacer()
                    if currentPage < totalPages - 1 {
                        Button("Skip") {
                            dismiss()
                        }
                        .font(.subheadline)
                        .foregroundStyle(Color.textMuted)
                        .padding(.trailing, 20)
                        .padding(.top, 12)
                    }
                }

                // MARK: - Page Content
                TabView(selection: $currentPage) {
                    WelcomeSlide()
                        .tag(0)
                    FrequencySlide()
                        .tag(1)
                    TherapySlide()
                        .tag(2)
                    PremiumSlide(onDismiss: { dismiss() })
                        .tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
                .animation(.easeInOut(duration: 0.3), value: currentPage)

                // MARK: - Navigation Buttons
                HStack(spacing: 16) {
                    if currentPage > 0 {
                        Button {
                            withAnimation { currentPage -= 1 }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                Text("Back")
                            }
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 20)
                        }
                    } else {
                        Spacer()
                    }

                    Spacer()

                    if currentPage < totalPages - 1 {
                        Button {
                            withAnimation { currentPage += 1 }
                        } label: {
                            HStack(spacing: 4) {
                                Text("Next")
                                Image(systemName: "chevron.right")
                            }
                            .font(.headline)
                            .foregroundStyle(.white)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 24)
                            .background(Color.accentCyan, in: Capsule())
                        }
                    } else {
                        Button {
                            dismiss()
                        } label: {
                            Text("Get Started!")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .padding(.vertical, 12)
                                .padding(.horizontal, 24)
                                .background(Color.accentCyan, in: Capsule())
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
        }
    }
}

// MARK: - Slide 1: Welcome

private struct WelcomeSlide: View {
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 24) {
                Spacer(minLength: 20)

                Image(systemName: "headphones")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.accentCyan)
                    .padding(.bottom, 8)

                Text("Welcome to\nTinnitus Relief Pro")
                    .font(.title.bold())
                    .foregroundStyle(Color.textPrimary)
                    .multilineTextAlignment(.center)

                Text("Sound Therapy for Tinnitus Management")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)

                VStack(alignment: .leading, spacing: 16) {
                    BenefitRow(icon: "waveform.path.ecg", text: "Personalized frequency matching")
                    BenefitRow(icon: "clock.arrow.circlepath", text: "Guided daily therapy sessions")
                    BenefitRow(icon: "chart.line.uptrend.xyaxis", text: "Track your progress over time")
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)

                // Medical Disclaimer
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(Color.accentAmber)
                    Text("This app is not a medical device and does not diagnose or treat tinnitus. Consult a healthcare professional for medical advice.")
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .background(Color.accentAmber.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)

                Spacer(minLength: 60)
            }
        }
    }
}

// MARK: - Slide 2: Find Your Frequency

private struct FrequencySlide: View {
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 24) {
                Spacer(minLength: 20)

                Image(systemName: "waveform")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.accentCyan)
                    .padding(.bottom, 8)

                Text("Find Your Frequency")
                    .font(.title.bold())
                    .foregroundStyle(Color.textPrimary)

                VStack(alignment: .leading, spacing: 20) {
                    StepRow(number: 1, text: "Put on headphones for accurate calibration")
                    StepRow(number: 2, text: "Use auto-sweep or manual slider to match your tinnitus pitch")
                    StepRow(number: 3, text: "Tap \"That's My Tinnitus!\" when you find it")
                }
                .padding(.horizontal, 24)

                HStack(spacing: 8) {
                    Image(systemName: "lightbulb.fill")
                        .foregroundStyle(Color.accentAmber)
                    Text("Tip: Most tinnitus frequencies fall between 4,000 - 8,000 Hz")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
                .padding()
                .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)

                Spacer(minLength: 60)
            }
        }
    }
}

// MARK: - Slide 3: Daily Therapy

private struct TherapySlide: View {
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 24) {
                Spacer(minLength: 20)

                Image(systemName: "speaker.wave.3")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.accentCyan)
                    .padding(.bottom, 8)

                Text("Daily Therapy")
                    .font(.title.bold())
                    .foregroundStyle(Color.textPrimary)

                VStack(alignment: .leading, spacing: 20) {
                    StepRow(number: 1, text: "Switch to the Therapy tab")
                    StepRow(number: 2, text: "Your matched frequency is automatically applied as a notch filter")
                    StepRow(number: 3, text: "Start a timed session with calming background noise")
                }
                .padding(.horizontal, 24)

                HStack(spacing: 8) {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundStyle(Color.accentCyan)
                    Text("Most users see improvement in 4-8 weeks of consistent daily use")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
                .padding()
                .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)

                Spacer(minLength: 60)
            }
        }
    }
}

// MARK: - Slide 4: Premium Trial

private struct PremiumSlide: View {

    @Environment(SubscriptionManager.self) private var subscriptionManager
    var onDismiss: () -> Void

    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 24) {
                Spacer(minLength: 20)

                Image(systemName: "star.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(Color.accentAmber)
                    .padding(.bottom, 8)

                Text("Unlock Premium")
                    .font(.title.bold())
                    .foregroundStyle(Color.textPrimary)

                // Feature checklist
                VStack(alignment: .leading, spacing: 12) {
                    FeatureCheckRow(text: "Notched noise therapy")
                    FeatureCheckRow(text: "Notched music therapy")
                    FeatureCheckRow(text: "Unlimited session durations")
                    FeatureCheckRow(text: "Detailed analytics & export")
                    FeatureCheckRow(text: "Multiple profiles")
                }
                .padding(.horizontal, 24)

                // Pricing Cards
                HStack(spacing: 12) {
                    PricingCard(
                        title: "Monthly",
                        price: "$7.99",
                        period: "/month",
                        badge: nil,
                        isSelected: false
                    )
                    PricingCard(
                        title: "Annual",
                        price: "$59.99",
                        period: "/year",
                        badge: "Save 37%",
                        isSelected: true
                    )
                }
                .padding(.horizontal, 24)

                // CTA
                Button {
                    Task { await handleSubscribe() }
                } label: {
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                    } else {
                        Text("Start 7-Day Free Trial")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.accentCyan)
                .padding(.horizontal, 24)
                .disabled(isLoading)

                Text("Cancel anytime. No charge during trial.")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)

                Button("Restore Purchases") {
                    Task { await handleRestore() }
                }
                .font(.caption)
                .foregroundStyle(Color.textSecondary)
                .disabled(isLoading)

                Button("Continue without trial") {
                    onDismiss()
                }
                .font(.caption)
                .foregroundStyle(Color.textMuted)
                .padding(.top, 4)
                .disabled(isLoading)

                Spacer(minLength: 60)
            }
        }
        .alert("Purchase Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "Something went wrong. Please try again.")
        }
    }

    private func handleSubscribe() async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await subscriptionManager.subscribe(plan: .annual)
            if subscriptionManager.isPremium {
                onDismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    private func handleRestore() async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await subscriptionManager.restorePurchases()
            if subscriptionManager.isPremium {
                onDismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}

// MARK: - Reusable Row Components

private struct BenefitRow: View {
    let icon: String
    let text: String
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(Color.accentCyan)
                .frame(width: 28)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
    }
}

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

private struct FeatureCheckRow: View {
    let text: String
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color.accentGreen)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.textPrimary)
        }
    }
}

private struct PricingCard: View {
    let title: String
    let price: String
    let period: String
    let badge: String?
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 8) {
            if let badge {
                Text(badge)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.accentGreen, in: Capsule())
            }
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(Color.textSecondary)
            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(price)
                    .font(.system(.title3, design: .monospaced, weight: .bold))
                    .foregroundStyle(Color.textPrimary)
                Text(period)
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.bgCard)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(
                            isSelected ? Color.accentCyan : Color.textMuted.opacity(0.2),
                            lineWidth: isSelected ? 2 : 1
                        )
                )
        )
    }
}

#Preview {
    OnboardingView()
        .preferredColorScheme(.dark)
}
