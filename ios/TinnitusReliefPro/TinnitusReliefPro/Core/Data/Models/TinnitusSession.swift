import Foundation
import SwiftData

/// Represents a single tinnitus therapy session persisted to disk via SwiftData.
@Model
final class TinnitusSession {

    /// Stable unique identifier for deduplication and Identifiable conformance.
    @Attribute(.unique) var id: UUID

    /// When the session started.
    var date: Date

    /// Therapy mode used: "tone-matcher", "notched-noise", or "notched-music".
    var mode: String

    /// The primary frequency (Hz) targeted during this session, if applicable.
    var frequency: Float?

    /// Total active seconds the user spent in therapy (pause time excluded).
    var durationSeconds: Int

    /// Whether the user completed the full session duration without stopping early.
    var completed: Bool

    /// Optional free-text notes the user may attach after a session.
    var notes: String?

    // MARK: - Relationships

    /// Inverse relationship back to the owning profile.
    var profile: UserProfile?

    // MARK: - Initializer

    init(
        id: UUID = UUID(),
        date: Date = .now,
        mode: String,
        frequency: Float? = nil,
        durationSeconds: Int,
        completed: Bool = false,
        notes: String? = nil
    ) {
        self.id = id
        self.date = date
        self.mode = mode
        self.frequency = frequency
        self.durationSeconds = durationSeconds
        self.completed = completed
        self.notes = notes
    }

    // MARK: - Computed Properties

    /// Human-readable duration string in MM:SS or HH:MM:SS format.
    var durationFormatted: String {
        let hours = durationSeconds / 3600
        let minutes = (durationSeconds % 3600) / 60
        let seconds = durationSeconds % 60

        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
