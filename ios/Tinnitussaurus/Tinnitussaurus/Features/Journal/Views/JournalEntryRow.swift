import SwiftUI

/// A single row displaying a journal entry with date, severity indicator,
/// notes preview, and tags.
struct JournalEntryRow: View {

    let entry: JournalEntrySample

    private var severityColor: Color {
        switch entry.severity {
        case 1...3: return Color.accentGreen
        case 4...6: return Color.accentAmber
        default: return Color.accentRed
        }
    }

    private var formattedDate: String {
        entry.date.formatted(.dateTime.month(.abbreviated).day().year())
    }

    var body: some View {
        HStack(spacing: 12) {
            // MARK: - Severity Indicator
            ZStack {
                Circle()
                    .fill(severityColor.opacity(0.2))
                    .frame(width: 40, height: 40)
                Text("\(entry.severity)")
                    .font(.system(.callout, design: .monospaced, weight: .bold))
                    .foregroundStyle(severityColor)
            }

            // MARK: - Content
            VStack(alignment: .leading, spacing: 4) {
                Text(formattedDate)
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.textPrimary)

                if !entry.notes.isEmpty {
                    Text(entry.notes)
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                        .lineLimit(1)
                }

                // Tags
                if !entry.tags.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(entry.tags, id: \.self) { tag in
                            Text(tag)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(Color.accentCyan)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(
                                    Color.accentCyan.opacity(0.12),
                                    in: Capsule()
                                )
                        }
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundStyle(Color.textMuted)
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
    }
}

#Preview {
    VStack(spacing: 0) {
        JournalEntryRow(entry: JournalEntrySample(
            date: .now,
            severity: 3,
            notes: "Felt much better after morning session",
            tags: ["Post-therapy", "Morning"]
        ))
        Divider()
        JournalEntryRow(entry: JournalEntrySample(
            date: .now.addingTimeInterval(-86400),
            severity: 7,
            notes: "Stressful day at work",
            tags: ["Stress"]
        ))
    }
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
