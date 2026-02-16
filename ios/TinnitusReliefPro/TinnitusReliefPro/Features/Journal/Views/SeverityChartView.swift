import SwiftUI
import Charts

/// Line chart showing tinnitus severity trend over the last 30 days.
/// Uses Swift Charts with an area gradient fill and an average reference line.
struct SeverityChartView: View {

    let entries: [JournalEntrySample]

    private var sortedEntries: [JournalEntrySample] {
        entries.sorted { $0.date < $1.date }
    }

    private var averageSeverity: Double {
        guard !entries.isEmpty else { return 0 }
        return Double(entries.reduce(0) { $0 + $1.severity }) / Double(entries.count)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Severity Trend")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                Spacer()
                Text("30 Days")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
            }

            Chart {
                // Area fill
                ForEach(sortedEntries) { entry in
                    AreaMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Severity", entry.severity)
                    )
                    .foregroundStyle(
                        .linearGradient(
                            colors: [
                                Color.accentCyan.opacity(0.3),
                                Color.accentCyan.opacity(0.02)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .interpolationMethod(.catmullRom)
                }

                // Line
                ForEach(sortedEntries) { entry in
                    LineMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Severity", entry.severity)
                    )
                    .foregroundStyle(Color.accentCyan)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                    .interpolationMethod(.catmullRom)
                }

                // Average line
                RuleMark(y: .value("Average", averageSeverity))
                    .foregroundStyle(Color.accentAmber.opacity(0.6))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 3]))
                    .annotation(position: .top, alignment: .trailing) {
                        Text("avg \(String(format: "%.1f", averageSeverity))")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(Color.accentAmber)
                    }
            }
            .chartYScale(domain: 1...10)
            .chartYAxis {
                AxisMarks(values: [1, 5, 10]) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 4]))
                        .foregroundStyle(Color.textMuted.opacity(0.3))
                    AxisValueLabel()
                        .foregroundStyle(Color.textMuted)
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: 7)) { _ in
                    AxisGridLine()
                        .foregroundStyle(Color.textMuted.opacity(0.2))
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        .foregroundStyle(Color.textMuted)
                }
            }
        }
        .padding()
        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    SeverityChartView(entries: JournalEntrySample.samples)
        .frame(height: 220)
        .padding()
        .background(Color.bgPrimary)
        .preferredColorScheme(.dark)
}
