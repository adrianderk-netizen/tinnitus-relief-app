import Foundation
import SwiftUI

/// Centralized UserDefaults wrapper for lightweight app-wide preferences.
/// Properties are stored values that sync to UserDefaults, ensuring
/// @Observable tracking fires correctly for SwiftUI bindings.
@Observable
final class AppSettings {

    // MARK: - Keys

    private enum Keys {
        static let masterVolume          = "masterVolume"
        static let hasCompletedOnboarding = "hasCompletedOnboarding"
        static let hasCompletedWizard    = "hasCompletedWizard"
        static let lastProfileName       = "lastProfileName"
        static let lastLeftFrequency     = "lastLeftFrequency"
        static let lastRightFrequency    = "lastRightFrequency"
        static let reminderEnabled       = "reminderEnabled"
        static let reminderHour          = "reminderHour"
        static let reminderMinute        = "reminderMinute"
    }

    @ObservationIgnored private let defaults: UserDefaults

    // MARK: - Stored observable properties (synced to UserDefaults in didSet)

    var masterVolume: Float {
        didSet { defaults.set(masterVolume, forKey: Keys.masterVolume) }
    }

    var hasCompletedOnboarding: Bool {
        didSet { defaults.set(hasCompletedOnboarding, forKey: Keys.hasCompletedOnboarding) }
    }

    var hasCompletedWizard: Bool {
        didSet { defaults.set(hasCompletedWizard, forKey: Keys.hasCompletedWizard) }
    }

    var lastProfileName: String? {
        didSet { defaults.set(lastProfileName, forKey: Keys.lastProfileName) }
    }

    var lastLeftFrequency: Float {
        didSet { defaults.set(lastLeftFrequency, forKey: Keys.lastLeftFrequency) }
    }

    var lastRightFrequency: Float {
        didSet { defaults.set(lastRightFrequency, forKey: Keys.lastRightFrequency) }
    }

    var reminderEnabled: Bool {
        didSet { defaults.set(reminderEnabled, forKey: Keys.reminderEnabled) }
    }

    var reminderHour: Int {
        didSet { defaults.set(reminderHour, forKey: Keys.reminderHour) }
    }

    var reminderMinute: Int {
        didSet { defaults.set(reminderMinute, forKey: Keys.reminderMinute) }
    }

    // MARK: - Init

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults

        // Register defaults first
        defaults.register(defaults: [
            Keys.masterVolume: Float(0.5),
            Keys.hasCompletedOnboarding: false,
            Keys.hasCompletedWizard: false,
            Keys.lastLeftFrequency: Float(4000),
            Keys.lastRightFrequency: Float(4000),
            Keys.reminderEnabled: false,
            Keys.reminderHour: 20,
            Keys.reminderMinute: 0
        ])

        // Load from UserDefaults into stored properties
        self.masterVolume = defaults.float(forKey: Keys.masterVolume)
        self.hasCompletedOnboarding = defaults.bool(forKey: Keys.hasCompletedOnboarding)
        self.hasCompletedWizard = defaults.bool(forKey: Keys.hasCompletedWizard)
        self.lastProfileName = defaults.string(forKey: Keys.lastProfileName)
        self.lastLeftFrequency = defaults.float(forKey: Keys.lastLeftFrequency)
        self.lastRightFrequency = defaults.float(forKey: Keys.lastRightFrequency)
        self.reminderEnabled = defaults.bool(forKey: Keys.reminderEnabled)
        self.reminderHour = defaults.integer(forKey: Keys.reminderHour)
        self.reminderMinute = defaults.integer(forKey: Keys.reminderMinute)
    }
}
