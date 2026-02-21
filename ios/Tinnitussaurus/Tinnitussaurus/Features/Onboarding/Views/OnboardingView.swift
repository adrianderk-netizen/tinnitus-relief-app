import SwiftUI

/// Full-screen onboarding flow with four educational slides.
/// Presented as a `.fullScreenCover` on first launch. The user can skip
/// at any time or navigate through slides with Back/Next buttons.
struct OnboardingView: View {

    var onComplete: () -> Void

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
                            onComplete()
                        }
                        .font(.subheadline)
                        .foregroundStyle(Color.textMuted)
                        .padding(.trailing, 20)
                        .padding(.top, 12)
                        .accessibilityLabel("Skip onboarding")
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
                    PremiumSlide(onDismiss: { onComplete() })
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
                        .accessibilityLabel("Go to previous page")
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
                        .accessibilityLabel("Go to next page")
                    } else {
                        Button {
                            onComplete()
                        } label: {
                            Text("Get Started!")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .padding(.vertical, 12)
                                .padding(.horizontal, 24)
                                .background(Color.accentCyan, in: Capsule())
                        }
                        .accessibilityLabel("Finish onboarding and get started")
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

                Image(systemName: "ear.and.waveform")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.accentCyan)
                    .padding(.bottom, 8)

                Text("Welcome to\nTinnitussaurus")
                    .font(.title.bold())
                    .foregroundStyle(Color.textPrimary)
                    .multilineTextAlignment(.center)

                Text("Science-Based Sound Therapy")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)

                VStack(alignment: .leading, spacing: 16) {
                    BenefitRow(icon: "waveform.path.ecg", text: "Match your tinnitus frequency in each ear independently")
                    BenefitRow(icon: "waveform.badge.minus", text: "Notched sound therapy may help your brain gradually reduce tinnitus perception")
                    BenefitRow(icon: "calendar.badge.clock", text: "Regular daily sessions support long-term benefits")
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)

                // What to expect
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "lightbulb.fill")
                        .foregroundStyle(Color.accentAmber)
                        .font(.title3)
                    Text("Sound therapy doesn\u{2019}t silence tinnitus overnight \u{2014} it may gradually reduce how loud and bothersome it feels. Many users report improvement within several weeks of consistent daily use. Individual results may vary.")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
                .padding()
                .background(Color.accentAmber.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)

                // Medical Disclaimer
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(Color.accentAmber)
                    Text("This app is not a medical device. See a doctor if your tinnitus is sudden, one-sided only, pulsing with your heartbeat, or accompanied by hearing loss, dizziness, or pain.")
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
                    StepRow(number: 1, text: "Put on headphones in a quiet room \u{2014} accuracy depends on it")
                    StepRow(number: 2, text: "Use auto-sweep or the manual slider to search for your tinnitus pitch")
                    StepRow(number: 3, text: "Listen for the tone to merge with your tinnitus \u{2014} they should blend into one sound")
                    StepRow(number: 4, text: "Tune each ear separately if your tinnitus sounds different on each side")
                }
                .padding(.horizontal, 24)

                VStack(spacing: 12) {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "lightbulb.fill")
                            .foregroundStyle(Color.accentAmber)
                        Text("Most tinnitus falls between 4,000\u{2013}8,000 Hz. An approximate match works well \u{2014} you don\u{2019}t need to be exact.")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .padding()
                    .background(Color.accentAmber.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))

                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "ear")
                            .foregroundStyle(Color.accentCyan)
                        Text("Tinnitus often differs between ears. Use the Left/Right ear selector to match each ear independently.")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .padding()
                    .background(Color.accentCyan.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
                }
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

                Image(systemName: "brain.head.profile")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.accentCyan)
                    .padding(.bottom, 8)

                Text("How Therapy Works")
                    .font(.title.bold())
                    .foregroundStyle(Color.textPrimary)

                VStack(spacing: 16) {
                    InfoCard(
                        icon: "waveform.badge.minus",
                        title: "The Science",
                        description: "Notched therapy removes your tinnitus frequency from background sound. This activates surrounding neurons that gradually quiet the overactive ones causing your tinnitus \u{2014} a process called lateral inhibition."
                    )
                    InfoCard(
                        icon: "clock.arrow.circlepath",
                        title: "Your Daily Practice",
                        description: "Listen for 1\u{2013}2 hours daily with headphones. Sessions can be split up \u{2014} during work, commute, or relaxation. Consistency matters more than duration."
                    )
                    InfoCard(
                        icon: "speaker.wave.2",
                        title: "Volume Safety",
                        description: "Keep volume just below your tinnitus level \u{2014} you should still faintly hear your tinnitus over the therapy sound. Never try to drown it out, as this can make it worse."
                    )
                }
                .padding(.horizontal, 24)

                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundStyle(Color.accentCyan)
                    Text("Track your progress in the Journal tab. Brief moments of quiet after sessions (residual inhibition) are a great sign the therapy is working.")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
                .padding()
                .background(Color.accentCyan.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
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

private struct InfoCard: View {
    let icon: String
    let title: String
    let description: String
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(Color.accentCyan)
                .font(.title3)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.textPrimary)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 12))
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
    OnboardingView(onComplete: {})
        .preferredColorScheme(.dark)
}
