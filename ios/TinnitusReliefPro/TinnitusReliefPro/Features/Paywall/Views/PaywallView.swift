import SwiftUI

/// Premium subscription paywall presented as a sheet.
/// Shows feature list, pricing options, and purchase/restore actions.
struct PaywallView: View {

    @Environment(\.dismiss) private var dismiss
    @Environment(SubscriptionManager.self) private var subscriptionManager

    @State private var selectedPlan: PlanType = .annual
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false

    enum PlanType {
        case monthly, annual
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // MARK: - Icon
                    Image(systemName: "lock.open.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.accentCyan)
                        .padding(.top, 24)

                    // MARK: - Header
                    VStack(spacing: 8) {
                        Text("Unlock Premium Features")
                            .font(.title2.bold())
                            .foregroundStyle(Color.textPrimary)
                        Text("Get full access to all therapy tools")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                    }

                    // MARK: - Feature List
                    VStack(alignment: .leading, spacing: 14) {
                        PaywallFeatureRow(text: "Notched noise therapy (white, pink, brown)")
                        PaywallFeatureRow(text: "Import and notch your own music")
                        PaywallFeatureRow(text: "Unlimited session durations")
                        PaywallFeatureRow(text: "Advanced analytics & CSV export")
                        PaywallFeatureRow(text: "Multiple user profiles")
                        PaywallFeatureRow(text: "Priority support")
                    }
                    .padding(.horizontal, 24)

                    // MARK: - Pricing Cards
                    HStack(spacing: 12) {
                        // Monthly
                        PaywallPricingCard(
                            title: "Monthly",
                            price: "$7.99",
                            period: "per month",
                            badge: nil,
                            isSelected: selectedPlan == .monthly
                        )
                        .onTapGesture { selectedPlan = .monthly }

                        // Annual
                        PaywallPricingCard(
                            title: "Annual",
                            price: "$59.99",
                            period: "per year",
                            badge: "Best Value",
                            isSelected: selectedPlan == .annual
                        )
                        .onTapGesture { selectedPlan = .annual }
                    }
                    .padding(.horizontal, 24)

                    // Save note
                    if selectedPlan == .annual {
                        Text("Save 37% compared to monthly")
                            .font(.caption)
                            .foregroundStyle(Color.accentGreen)
                    }

                    // MARK: - Free Trial Note
                    HStack(spacing: 6) {
                        Image(systemName: "gift")
                            .foregroundStyle(Color.accentAmber)
                        Text("Includes 7-day free trial")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .padding()
                    .background(Color.accentAmber.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                    .padding(.horizontal, 24)

                    // MARK: - Subscribe Button
                    Button {
                        Task { await handleSubscribe() }
                    } label: {
                        if isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                        } else {
                            Text("Subscribe Now")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.accentCyan)
                    .padding(.horizontal, 24)
                    .disabled(isLoading)

                    // MARK: - Restore
                    Button("Restore Purchases") {
                        Task { await handleRestore() }
                    }
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                    .padding(.bottom, 8)
                    .disabled(isLoading)

                    // Legal
                    Text("Payment charged to your Apple ID. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.")
                        .font(.caption2)
                        .foregroundStyle(Color.textMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                        .padding(.bottom, 24)
                }
            }
            .background(Color.bgPrimary)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color.textMuted)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .alert("Purchase Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "Something went wrong. Please try again.")
        }
    }

    private func handleSubscribe() async {
        isLoading = true
        defer { isLoading = false }
        let plan: SubscriptionPlan = selectedPlan == .annual ? .annual : .monthly
        do {
            try await subscriptionManager.subscribe(plan: plan)
            if subscriptionManager.isPremium {
                dismiss()
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
                dismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}

// MARK: - Feature Row

private struct PaywallFeatureRow: View {
    let text: String
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color.accentGreen)
                .font(.callout)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.textPrimary)
        }
    }
}

// MARK: - Pricing Card

private struct PaywallPricingCard: View {
    let title: String
    let price: String
    let period: String
    let badge: String?
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 10) {
            if let badge {
                Text(badge)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 3)
                    .background(Color.accentCyan, in: Capsule())
            }

            Text(title)
                .font(.subheadline.bold())
                .foregroundStyle(Color.textSecondary)

            Text(price)
                .font(.system(.title2, design: .monospaced, weight: .bold))
                .foregroundStyle(Color.textPrimary)

            Text(period)
                .font(.caption)
                .foregroundStyle(Color.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(isSelected ? Color.accentCyan.opacity(0.08) : Color.bgCard)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(
                            isSelected ? Color.accentCyan : Color.textMuted.opacity(0.2),
                            lineWidth: isSelected ? 2 : 1
                        )
                )
        )
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}

#Preview {
    PaywallView()
        .environment(SubscriptionManager())
        .preferredColorScheme(.dark)
}
