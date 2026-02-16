import SwiftUI

/// 2x2 grid of session statistics showing today, this week, streak, and all-time totals.
struct SessionStatsGrid: View {

    // In production these would come from SessionRepository.
    // Placeholder values shown for layout purposes.
    @State private var todayMinutes: Int = 30
    @State private var weekMinutes: Int = 145
    @State private var streakDays: Int = 7
    @State private var allTimeHours: Int = 42

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
    SessionStatsGrid()
        .padding()
        .background(Color.bgPrimary)
        .preferredColorScheme(.dark)
}
