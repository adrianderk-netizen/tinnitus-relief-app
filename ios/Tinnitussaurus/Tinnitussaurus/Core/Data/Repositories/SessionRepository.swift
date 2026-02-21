import Foundation
import SwiftData
import os.log

/// Thread-safe repository for persisting and querying therapy sessions.
/// All methods must be called from the main actor because SwiftData ModelContext is not Sendable.
@MainActor
final class SessionRepository {

    private let modelContext: ModelContext
    private let calendar = Calendar.current
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "Tinnitussaurus",
                                category: "SessionRepository")

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - CRUD

    /// Inserts a new session and persists immediately.
    func addSession(_ session: TinnitusSession) throws {
        modelContext.insert(session)
        try modelContext.save()
        logger.info("Session saved: \(session.id), mode=\(session.mode), duration=\(session.durationSeconds)s")
    }

    /// Returns every session, most recent first.
    func fetchAllSessions() throws -> [TinnitusSession] {
        let descriptor = FetchDescriptor<TinnitusSession>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Returns sessions whose `date` falls within the calendar day of the given date.
    func fetchSessionsForDate(_ date: Date) throws -> [TinnitusSession] {
        let start = calendar.startOfDay(for: date)
        guard let end = calendar.date(byAdding: .day, value: 1, to: start) else { return [] }

        let predicate = #Predicate<TinnitusSession> { session in
            session.date >= start && session.date < end
        }
        var descriptor = FetchDescriptor<TinnitusSession>(predicate: predicate,
                                                          sortBy: [SortDescriptor(\.date, order: .reverse)])
        return try modelContext.fetch(descriptor)
    }

    // MARK: - Aggregations

    /// Total therapy seconds logged today.
    func getTotalTimeToday() throws -> Int {
        let sessions = try fetchSessionsForDate(.now)
        return sessions.reduce(0) { $0 + $1.durationSeconds }
    }

    /// Total therapy seconds logged in the current calendar week (locale-aware).
    func getTotalTimeThisWeek() throws -> Int {
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: .now) else { return 0 }
        let start = weekInterval.start
        let end = weekInterval.end

        let predicate = #Predicate<TinnitusSession> { session in
            session.date >= start && session.date < end
        }
        let descriptor = FetchDescriptor<TinnitusSession>(predicate: predicate)
        let sessions = try modelContext.fetch(descriptor)
        return sessions.reduce(0) { $0 + $1.durationSeconds }
    }

    /// Total therapy seconds across all recorded sessions.
    func getTotalTimeAllTime() throws -> Int {
        let descriptor = FetchDescriptor<TinnitusSession>()
        let sessions = try modelContext.fetch(descriptor)
        return sessions.reduce(0) { $0 + $1.durationSeconds }
    }

    /// Calculates the current consecutive-day streak.
    ///
    /// **Critical fix vs. web version:** Uses `Calendar.startOfDay(for:)` so that sessions
    /// recorded at 23:55 and 00:05 are correctly attributed to separate calendar days
    /// rather than being double-counted or creating a false gap.
    func getStreak() throws -> Int {
        let descriptor = FetchDescriptor<TinnitusSession>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        let sessions = try modelContext.fetch(descriptor)
        guard !sessions.isEmpty else { return 0 }

        // Build a sorted set of unique calendar days that have at least one session.
        var uniqueDays = Set<Date>()
        for session in sessions {
            uniqueDays.insert(calendar.startOfDay(for: session.date))
        }
        let sortedDays = uniqueDays.sorted(by: >)  // newest first

        let today = calendar.startOfDay(for: .now)
        guard let mostRecent = sortedDays.first else { return 0 }

        // Streak only counts if the most recent session day is today or yesterday.
        let daysSinceLast = calendar.dateComponents([.day], from: mostRecent, to: today).day ?? 0
        guard daysSinceLast <= 1 else { return 0 }

        var streak = 1
        for i in 1..<sortedDays.count {
            let expected = calendar.date(byAdding: .day, value: -1, to: sortedDays[i - 1])!
            let actual = sortedDays[i]
            if calendar.isDate(actual, inSameDayAs: expected) {
                streak += 1
            } else {
                break
            }
        }
        return streak
    }

    /// Returns (completed, total) session counts for the current calendar week.
    func getWeeklyCompletionCounts() throws -> (completed: Int, total: Int) {
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: .now) else { return (0, 0) }
        let start = weekInterval.start
        let end = weekInterval.end

        let predicate = #Predicate<TinnitusSession> { session in
            session.date >= start && session.date < end
        }
        let descriptor = FetchDescriptor<TinnitusSession>(predicate: predicate)
        let sessions = try modelContext.fetch(descriptor)
        let completed = sessions.filter(\.completed).count
        return (completed, sessions.count)
    }

    /// Permanently removes a session from the store.
    func deleteSession(_ session: TinnitusSession) throws {
        modelContext.delete(session)
        try modelContext.save()
        logger.info("Session deleted: \(session.id)")
    }
}
