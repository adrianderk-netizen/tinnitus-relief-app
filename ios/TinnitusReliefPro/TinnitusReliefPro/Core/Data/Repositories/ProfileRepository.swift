import Foundation
import SwiftData
import os.log

/// Thread-safe repository for managing user profiles and their settings.
@MainActor
final class ProfileRepository {

    private let modelContext: ModelContext
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TinnitusReliefPro",
                                category: "ProfileRepository")

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Queries

    /// Returns all profiles sorted alphabetically by name.
    func fetchAllProfiles() throws -> [UserProfile] {
        let descriptor = FetchDescriptor<UserProfile>(
            sortBy: [SortDescriptor(\.name)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Looks up a single profile by its unique name.
    func fetchProfile(named name: String) throws -> UserProfile? {
        let predicate = #Predicate<UserProfile> { profile in
            profile.name == name
        }
        var descriptor = FetchDescriptor<UserProfile>(predicate: predicate)
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }

    // MARK: - Mutations

    /// Creates and persists a new profile with sensible defaults.
    @discardableResult
    func createProfile(name: String) throws -> UserProfile {
        let profile = UserProfile(name: name)
        modelContext.insert(profile)
        try modelContext.save()
        logger.info("Profile created: \(name)")
        return profile
    }

    /// Persists any in-memory changes to the given profile.
    func updateProfile(_ profile: UserProfile) throws {
        profile.lastModified = .now
        try modelContext.save()
        logger.info("Profile updated: \(profile.name)")
    }

    /// Permanently removes a profile and its cascaded sessions.
    func deleteProfile(_ profile: UserProfile) throws {
        let name = profile.name
        modelContext.delete(profile)
        try modelContext.save()
        logger.info("Profile deleted: \(name)")
    }
}
