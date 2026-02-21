import UIKit
import os.log

/// Generates exportable reports (PDF and plain text) from journal entries and session data.
///
/// Usage:
/// ```swift
/// let url = try ExportManager.generatePDF(entries: entries, sessions: sessions)
/// // Present UIActivityViewController with url
/// ```
enum ExportManager {

    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "Tinnitussaurus",
                                       category: "ExportManager")

    // MARK: - PDF Export

    /// Generates a PDF report containing journal entries and session summary.
    /// - Parameters:
    ///   - entries: Journal entries sorted by date (newest first).
    ///   - sessions: Optional therapy sessions for the summary section.
    /// - Returns: File URL of the generated PDF in the temporary directory.
    static func generatePDF(entries: [JournalExportEntry],
                            sessions: [SessionExportEntry] = []) throws -> URL {
        let pageWidth: CGFloat = 612  // US Letter
        let pageHeight: CGFloat = 792
        let margin: CGFloat = 50
        let contentWidth = pageWidth - margin * 2

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("TinnitusRelief-Report-\(dateStamp()).pdf")

        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight))

        let data = renderer.pdfData { context in
            var y: CGFloat = 0

            func newPage() {
                context.beginPage()
                y = margin
            }

            func checkPageBreak(_ needed: CGFloat) {
                if y + needed > pageHeight - margin {
                    newPage()
                }
            }

            // MARK: Title page
            newPage()

            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 24, weight: .bold),
                .foregroundColor: UIColor.label
            ]
            let title = "Tinnitus Relief Report"
            title.draw(at: CGPoint(x: margin, y: y), withAttributes: titleAttrs)
            y += 36

            let subtitleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14, weight: .regular),
                .foregroundColor: UIColor.secondaryLabel
            ]
            let subtitle = "Generated \(formattedDate(.now))"
            subtitle.draw(at: CGPoint(x: margin, y: y), withAttributes: subtitleAttrs)
            y += 30

            // Divider
            drawDivider(context: context.cgContext, x: margin, y: y, width: contentWidth)
            y += 16

            // MARK: Session Summary
            if !sessions.isEmpty {
                let sectionAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 18, weight: .semibold),
                    .foregroundColor: UIColor.label
                ]
                "Session Summary".draw(at: CGPoint(x: margin, y: y), withAttributes: sectionAttrs)
                y += 28

                let bodyAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 12, weight: .regular),
                    .foregroundColor: UIColor.label
                ]

                let totalSessions = sessions.count
                let totalMinutes = sessions.reduce(0) { $0 + $1.durationMinutes }
                let avgFreq = sessions.compactMap(\.frequency).reduce(0, +) / max(1, Float(sessions.compactMap(\.frequency).count))

                let summaryLines = [
                    "Total sessions: \(totalSessions)",
                    "Total therapy time: \(totalMinutes) minutes",
                    "Average matched frequency: \(Int(avgFreq)) Hz"
                ]

                for line in summaryLines {
                    checkPageBreak(18)
                    line.draw(at: CGPoint(x: margin + 8, y: y), withAttributes: bodyAttrs)
                    y += 18
                }
                y += 12
            }

            // MARK: Journal Entries
            let sectionAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 18, weight: .semibold),
                .foregroundColor: UIColor.label
            ]
            checkPageBreak(40)
            "Journal Entries".draw(at: CGPoint(x: margin, y: y), withAttributes: sectionAttrs)
            y += 28

            if entries.isEmpty {
                let emptyAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.italicSystemFont(ofSize: 12),
                    .foregroundColor: UIColor.secondaryLabel
                ]
                "No journal entries recorded.".draw(at: CGPoint(x: margin + 8, y: y), withAttributes: emptyAttrs)
                y += 18
            } else {
                let dateAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 12, weight: .semibold),
                    .foregroundColor: UIColor.label
                ]
                let bodyAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 11, weight: .regular),
                    .foregroundColor: UIColor.label
                ]
                let tagAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 10, weight: .medium),
                    .foregroundColor: UIColor.systemCyan
                ]

                for entry in entries {
                    checkPageBreak(60)

                    // Date + severity
                    let header = "\(formattedDate(entry.date)) — Severity: \(entry.severity)/10"
                    header.draw(at: CGPoint(x: margin + 8, y: y), withAttributes: dateAttrs)
                    y += 18

                    // Notes
                    if !entry.notes.isEmpty {
                        let rect = CGRect(x: margin + 16, y: y, width: contentWidth - 16, height: 40)
                        let nsNotes = entry.notes as NSString
                        nsNotes.draw(in: rect, withAttributes: bodyAttrs)
                        y += 24
                    }

                    // Tags
                    if !entry.tags.isEmpty {
                        let tagStr = entry.tags.joined(separator: ", ")
                        tagStr.draw(at: CGPoint(x: margin + 16, y: y), withAttributes: tagAttrs)
                        y += 16
                    }

                    y += 8
                }
            }
        }

        try data.write(to: url)
        logger.info("PDF report generated at \(url.path)")
        return url
    }

    // MARK: - Plain Text Export

    /// Generates a plain text report.
    static func generateText(entries: [JournalExportEntry],
                             sessions: [SessionExportEntry] = []) throws -> URL {
        var text = "TINNITUS RELIEF REPORT\n"
        text += "Generated: \(formattedDate(.now))\n"
        text += String(repeating: "=", count: 40) + "\n\n"

        if !sessions.isEmpty {
            text += "SESSION SUMMARY\n"
            text += String(repeating: "-", count: 20) + "\n"
            text += "Total sessions: \(sessions.count)\n"
            let totalMin = sessions.reduce(0) { $0 + $1.durationMinutes }
            text += "Total therapy time: \(totalMin) minutes\n"
            let avgFreq = sessions.compactMap(\.frequency).reduce(0, +) / max(1, Float(sessions.compactMap(\.frequency).count))
            text += "Average frequency: \(Int(avgFreq)) Hz\n\n"
        }

        text += "JOURNAL ENTRIES\n"
        text += String(repeating: "-", count: 20) + "\n"

        if entries.isEmpty {
            text += "No entries recorded.\n"
        } else {
            for entry in entries {
                text += "\n\(formattedDate(entry.date)) | Severity: \(entry.severity)/10\n"
                if !entry.notes.isEmpty {
                    text += "  \(entry.notes)\n"
                }
                if !entry.tags.isEmpty {
                    text += "  Tags: \(entry.tags.joined(separator: ", "))\n"
                }
            }
        }

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("TinnitusRelief-Report-\(dateStamp()).txt")
        try text.write(to: url, atomically: true, encoding: .utf8)
        logger.info("Text report generated at \(url.path)")
        return url
    }

    // MARK: - Helpers

    private static func formattedDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        return f.string(from: date)
    }

    private static func dateStamp() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: .now)
    }

    private static func drawDivider(context: CGContext, x: CGFloat, y: CGFloat, width: CGFloat) {
        context.setStrokeColor(UIColor.separator.cgColor)
        context.setLineWidth(0.5)
        context.move(to: CGPoint(x: x, y: y))
        context.addLine(to: CGPoint(x: x + width, y: y))
        context.strokePath()
    }
}

// MARK: - Export Data Types

/// Lightweight value type for exporting journal entries (decoupled from SwiftData @Model).
struct JournalExportEntry {
    let date: Date
    let severity: Int
    let notes: String
    let tags: [String]
}

/// Lightweight value type for exporting session data.
struct SessionExportEntry {
    let date: Date
    let durationMinutes: Int
    let mode: String
    let frequency: Float?
}
