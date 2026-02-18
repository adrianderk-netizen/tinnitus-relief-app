import SwiftUI
import SwiftData

/// Journal tab for daily tinnitus severity check-ins, trend visualization,
/// and historical entry browsing.
struct JournalView: View {

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \JournalEntry.date, order: .reverse) private var journalEntries: [JournalEntry]

    @State private var showCheckIn = false
    @State private var showExportSheet = false
    @State private var exportURL: URL?

    private var hasCheckedInToday: Bool {
        guard let latest = journalEntries.first else { return false }
        return Calendar.current.isDateInToday(latest.date)
    }

    /// Maps SwiftData models to display structs for chart and row subviews.
    private var entries: [JournalEntrySample] {
        journalEntries.map {
            JournalEntrySample(date: $0.date, severity: $0.severity, notes: $0.notes, tags: $0.tags)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // MARK: - Daily Check-In
                    if !hasCheckedInToday {
                        Button {
                            showCheckIn = true
                        } label: {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title3)
                                Text("Daily Check-In")
                                    .font(.headline)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(Color.textMuted)
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.accentCyan.opacity(0.15), in: RoundedRectangle(cornerRadius: 14))
                            .foregroundStyle(Color.accentCyan)
                        }
                        .padding(.horizontal)
                    }

                    if entries.isEmpty {
                        // MARK: - Empty State
                        VStack(spacing: 14) {
                            Image(systemName: "book.closed")
                                .font(.system(size: 40))
                                .foregroundStyle(Color.accentCyan.opacity(0.5))
                            Text("No entries yet")
                                .font(.headline)
                                .foregroundStyle(Color.textPrimary)
                            Text("Daily check-ins help you track how your tinnitus changes over time and see the impact of therapy sessions.")
                                .font(.subheadline)
                                .foregroundStyle(Color.textMuted)
                                .multilineTextAlignment(.center)
                        }
                        .padding(24)
                        .frame(maxWidth: .infinity)
                        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 14))
                        .padding(.horizontal)
                    } else {
                        // MARK: - Severity Chart
                        SeverityChartView(entries: entries)
                            .frame(height: 200)
                            .padding(.horizontal)

                        // MARK: - Recent Entries
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Recent Entries")
                                .font(.headline)
                                .foregroundStyle(Color.textPrimary)
                                .padding(.horizontal)

                            LazyVStack(spacing: 0) {
                                ForEach(entries) { entry in
                                    JournalEntryRow(entry: entry)
                                    if entry.id != entries.last?.id {
                                        Divider()
                                            .background(Color.textMuted.opacity(0.2))
                                            .padding(.horizontal)
                                    }
                                }
                            }
                        }
                    }

                    Spacer(minLength: 40)
                }
                .padding(.top, 8)
            }
            .background(Color.bgPrimary)
            .navigationTitle("Journal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        exportReport()
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .tint(Color.accentCyan)
                }
            }
            .sheet(isPresented: $showExportSheet) {
                if let url = exportURL {
                    ShareSheet(activityItems: [url])
                }
            }
            .sheet(isPresented: $showCheckIn) {
                CheckInSheet { severity, notes, tags in
                    let entry = JournalEntry(
                        date: .now,
                        severity: severity,
                        notes: notes,
                        tags: tags
                    )
                    modelContext.insert(entry)
                }
            }
        }
    }

    private func exportReport() {
        let exportEntries = journalEntries.map {
            JournalExportEntry(date: $0.date, severity: $0.severity, notes: $0.notes, tags: $0.tags)
        }
        do {
            let url = try ExportManager.generatePDF(entries: exportEntries)
            exportURL = url
            showExportSheet = true
        } catch {
            // In production, show an alert
        }
    }
}

// MARK: - Share Sheet (UIKit bridge)

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Sample Data Model (bridges to JournalEntry @Model for UI)

/// Lightweight value type used by views. In production, project from JournalEntry @Model.
struct JournalEntrySample: Identifiable {
    let id = UUID()
    let date: Date
    let severity: Int
    let notes: String
    let tags: [String]

    static let samples: [JournalEntrySample] = {
        let cal = Calendar.current
        return (0..<30).map { offset in
            let day = cal.date(byAdding: .day, value: -offset, to: .now)!
            return JournalEntrySample(
                date: day,
                severity: Int.random(in: 2...8),
                notes: offset == 0 ? "Felt better after session" : "",
                tags: offset % 3 == 0 ? ["Post-therapy"] : ["Morning"]
            )
        }
    }()
}

#Preview {
    JournalView()
        .modelContainer(for: JournalEntry.self, inMemory: true)
        .preferredColorScheme(.dark)
}
