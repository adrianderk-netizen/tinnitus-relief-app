import SwiftUI
import SwiftData

/// 2x2 grid of session statistics showing today, this week, streak, and all-time totals.
struct SessionStatsGrid: View {

    let repository: SessionRepository
    var refreshTrigger: Int = 0

    @State private var todayMinutes: Int = 0
    @State private var weekMinutes: Int = 0
    @State private var streakDays: Int = 0
    @State private var allTimeHours: Int = 0

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            StatCard(value: "\(todayMinutes)m", label: "Today")
            StatCard(value: "\(weekMinutes)m", label: "This Week")
            StatCard(value: "\(streakDays)", label: "Day Streak")
            StatCard(value: "\(allTimeHours)h", label: "All Time")
        }
        .onAppear { loadStats() }
        .onChange(of: refreshTrigger) { _, _ in loadStats() }
    }

    private func loadStats() {
        do {
            todayMinutes = try repository.getTotalTimeToday() / 60
            weekMinutes = try repository.getTotalTimeThisWeek() / 60
            streakDays = try repository.getStreak()
            let totalSeconds = try repository.getTotalTimeAllTime()
            allTimeHours = totalSeconds / 3600
        } catch {
            // Keep current values on error — non-critical UI
        }
    }
}

// MARK: - Stat Card

private struct StatCard: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 8) {
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .foregroundStyle(Color.accentCyan)

            Text(label)
                .font(.caption)
                .foregroundStyle(Color.textMuted)
                .textCase(.uppercase)
                .tracking(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    SessionStatsGrid(
        repository: SessionRepository(
            modelContext: try! ModelContainer(
                for: TinnitusSession.self
            ).mainContext
        )
    )
    .padding()
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
