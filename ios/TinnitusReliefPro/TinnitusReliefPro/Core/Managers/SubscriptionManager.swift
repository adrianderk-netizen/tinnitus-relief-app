import Foundation
import RevenueCat
import os.log

// MARK: - Supporting Types

/// In-app subscription plans available for purchase.
enum SubscriptionPlan: String, CaseIterable {
    case monthly = "pro_monthly"
    case annual  = "pro_annual"
}

/// Features gated behind the premium subscription.
enum SubscriptionError: LocalizedError {
    case noOfferingsAvailable

    var errorDescription: String? {
        switch self {
        case .noOfferingsAvailable:
            return "No subscription offerings are currently available. Please try again later."
        }
    }
}

enum PremiumFeature: String, CaseIterable {
    case notchedNoise
    case notchedMusic
    case unlimitedSessions
    case exportReports
    case multipleProfiles
}

/// Manages subscription state using RevenueCat. Surfaces premium status
/// and feature gating to the rest of the app via observable properties.
@Observable
@MainActor
final class SubscriptionManager {

    // MARK: - Observable State

    #if DEBUG
    var isPremium: Bool = false
    #else
    private(set) var isPremium: Bool = false
    #endif
    private(set) var isTrialActive: Bool = false
    private(set) var trialDaysRemaining: Int = 0

    // MARK: - Private

    private static let apiKey = "test_XoSzeDdocAQjUQNXJvJxhmEmDdq"
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TinnitusReliefPro",
                                category: "SubscriptionManager")

    // MARK: - Initialization

    /// Configures RevenueCat and performs an initial entitlement check.
    func configure() {
        Purchases.configure(withAPIKey: Self.apiKey)
        Purchases.shared.delegate = RevenueCatDelegate.shared
        logger.info("RevenueCat configured")

        NotificationCenter.default.addObserver(forName: .subscriptionStatusDidChange,
                                               object: nil, queue: .main) { [weak self] notification in
            guard let self, let customerInfo = notification.object as? CustomerInfo else { return }
            Task { @MainActor in
                self.updateState(from: customerInfo)
            }
        }

        Task {
            await checkSubscriptionStatus()
        }
    }

    // MARK: - Status

    /// Queries RevenueCat for current entitlement status and updates observable state.
    func checkSubscriptionStatus() async {
        do {
            let customerInfo = try await Purchases.shared.customerInfo()
            updateState(from: customerInfo)
        } catch {
            logger.error("Failed to fetch customer info: \(error.localizedDescription)")
        }
    }

    // MARK: - Purchases

    /// Initiates a purchase flow for the given plan.
    func subscribe(plan: SubscriptionPlan) async throws {
        let offerings = try await Purchases.shared.offerings()
        guard let current = offerings.current,
              let package = current.availablePackages.first(where: { $0.storeProduct.productIdentifier.contains(plan.rawValue) }) else {
            logger.warning("No package found for plan: \(plan.rawValue)")
            #if DEBUG
            logger.info("DEBUG: Simulating successful trial activation for plan: \(plan.rawValue)")
            isPremium = true
            isTrialActive = true
            trialDaysRemaining = 7
            return
            #else
            throw SubscriptionError.noOfferingsAvailable
            #endif
        }

        let result = try await Purchases.shared.purchase(package: package)
        updateState(from: result.customerInfo)
        logger.info("Purchase completed for plan: \(plan.rawValue)")
    }

    /// Restores previously purchased subscriptions (e.g., after reinstalling the app).
    func restorePurchases() async throws {
        let customerInfo = try await Purchases.shared.restorePurchases()
        updateState(from: customerInfo)
        logger.info("Purchases restored, premium=\(self.isPremium)")
    }

    // MARK: - Feature Gating

    /// Returns whether the current subscription tier grants access to the given feature.
    /// Free-tier users can only access tone-matcher with limited sessions.
    func canAccess(feature: PremiumFeature) -> Bool {
        return isPremium
    }

    #if DEBUG
    /// Toggles premium status for development testing.
    func debugTogglePremium() {
        isPremium.toggle()
        logger.info("Debug premium toggled: \(self.isPremium)")
    }
    #endif

    // MARK: - Private Helpers

    private func updateState(from customerInfo: CustomerInfo) {
        let entitlement = customerInfo.entitlements["premium"]
        isPremium = entitlement?.isActive == true

        if let expirationDate = entitlement?.expirationDate, isPremium {
            let calendar = Calendar.current
            let now = Date.now
            if entitlement?.periodType == .trial {
                isTrialActive = true
                trialDaysRemaining = max(0, calendar.dateComponents([.day], from: now, to: expirationDate).day ?? 0)
            } else {
                isTrialActive = false
                trialDaysRemaining = 0
            }
        } else {
            isTrialActive = false
            trialDaysRemaining = 0
        }

        logger.info("Subscription state updated: premium=\(self.isPremium), trial=\(self.isTrialActive), trialDays=\(self.trialDaysRemaining)")
    }
}

// MARK: - RevenueCat Delegate

/// Singleton delegate that listens for customer info changes pushed by RevenueCat
/// and forwards them to the SubscriptionManager.
private final class RevenueCatDelegate: NSObject, PurchasesDelegate, Sendable {
    static let shared = RevenueCatDelegate()

    nonisolated func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        Task { @MainActor in
            // Re-check status when RevenueCat pushes an update (e.g., renewal, expiration).
            // This will be picked up by any SubscriptionManager instance that is observing.
            NotificationCenter.default.post(name: .subscriptionStatusDidChange, object: customerInfo)
        }
    }
}

extension Notification.Name {
    static let subscriptionStatusDidChange = Notification.Name("subscriptionStatusDidChange")
}
