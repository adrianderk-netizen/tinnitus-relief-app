import Foundation
import SwiftData

/// A daily journal entry that tracks perceived tinnitus severity and user notes.
/// Used to visualise trends over time and correlate with therapy sessions.
@Model
final class JournalEntry {

    /// Stable unique identifier.
    @Attribute(.unique) var id: UUID

    /// The date/time this entry was created.
    var date: Date

    /// Perceived severity on a 1-10 integer scale (1 = barely noticeable, 10 = unbearable).
    var severity: Int

    /// Free-text notes describing how the tinnitus felt, environmental context, etc.
    var notes: String

    /// User-defined tags for filtering (e.g. "morning", "after-therapy", "stressful-day").
    var tags: [String]

    // MARK: - Initializer

    init(
        id: UUID = UUID(),
        date: Date = .now,
        severity: Int,
        notes: String = "",
        tags: [String] = []
    ) {
        precondition((1...10).contains(severity), "Severity must be between 1 and 10")
        self.id = id
        self.date = date
        self.severity = severity
        self.notes = notes
        self.tags = tags
    }
}
