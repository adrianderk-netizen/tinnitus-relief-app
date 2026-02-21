import Foundation
import SwiftData
import os.log

/// Thread-safe repository for journal entries that track perceived tinnitus severity over time.
@MainActor
final class JournalRepository {

    private let modelContext: ModelContext
    private let calendar = Calendar.current
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "Tinnitussaurus",
                                category: "JournalRepository")

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - CRUD

    /// Inserts a new journal entry and persists immediately.
    func addEntry(_ entry: JournalEntry) throws {
        modelContext.insert(entry)
        try modelContext.save()
        logger.info("Journal entry saved: severity=\(entry.severity)")
    }

    /// Returns journal entries from the past 30 days, newest first.
    func fetchEntriesLast30Days() throws -> [JournalEntry] {
        guard let cutoff = calendar.date(byAdding: .day, value: -30, to: .now) else { return [] }
        let predicate = #Predicate<JournalEntry> { entry in
            entry.date >= cutoff
        }
        let descriptor = FetchDescriptor<JournalEntry>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Returns every journal entry, newest first.
    func fetchAllEntries() throws -> [JournalEntry] {
        let descriptor = FetchDescriptor<JournalEntry>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    // MARK: - Analytics

    /// Average severity over the specified number of trailing days.
    /// Returns 0 if there are no entries in the window.
    func getAverageSeverity(days: Int) throws -> Double {
        guard let cutoff = calendar.date(byAdding: .day, value: -days, to: .now) else { return 0 }
        let predicate = #Predicate<JournalEntry> { entry in
            entry.date >= cutoff
        }
        let descriptor = FetchDescriptor<JournalEntry>(predicate: predicate)
        let entries = try modelContext.fetch(descriptor)
        guard !entries.isEmpty else { return 0 }
        let total = entries.reduce(0) { $0 + $1.severity }
        return Double(total) / Double(entries.count)
    }

    /// Compares the average severity of the most recent 15 days against the prior 15 days.
    /// Useful for showing a "getting better / getting worse" indicator on the dashboard.
    ///
    /// - Returns: A tuple of `(current: averageLast15Days, previous: averagePrior15Days)`.
    ///   Either value is 0 if no entries exist in that window.
    func getTrend() throws -> (current: Double, previous: Double) {
        let now = Date.now
        guard let midpoint = calendar.date(byAdding: .day, value: -15, to: now),
              let cutoff  = calendar.date(byAdding: .day, value: -30, to: now) else {
            return (0, 0)
        }

        let recentPredicate = #Predicate<JournalEntry> { entry in
            entry.date >= midpoint
        }
        let recentDescriptor = FetchDescriptor<JournalEntry>(predicate: recentPredicate)
        let recentEntries = try modelContext.fetch(recentDescriptor)

        let previousPredicate = #Predicate<JournalEntry> { entry in
            entry.date >= cutoff && entry.date < midpoint
        }
        let previousDescriptor = FetchDescriptor<JournalEntry>(predicate: previousPredicate)
        let previousEntries = try modelContext.fetch(previousDescriptor)

        let currentAvg = recentEntries.isEmpty ? 0 :
            Double(recentEntries.reduce(0) { $0 + $1.severity }) / Double(recentEntries.count)
        let previousAvg = previousEntries.isEmpty ? 0 :
            Double(previousEntries.reduce(0) { $0 + $1.severity }) / Double(previousEntries.count)

        return (current: currentAvg, previous: previousAvg)
    }

    /// Permanently removes a journal entry.
    func deleteEntry(_ entry: JournalEntry) throws {
        modelContext.delete(entry)
        try modelContext.save()
        logger.info("Journal entry deleted: \(entry.id)")
    }
}
