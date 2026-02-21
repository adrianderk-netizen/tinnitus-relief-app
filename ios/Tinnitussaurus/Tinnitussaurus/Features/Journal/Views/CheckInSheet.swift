import SwiftUI

/// Modal sheet for recording a daily tinnitus severity check-in with
/// a severity scale, notes, and tag selection.
struct CheckInSheet: View {

    @Environment(\.dismiss) private var dismiss

    @State private var selectedSeverity: Int? = nil
    @State private var notes: String = ""
    @State private var selectedTags: Set<String> = []

    /// Called when the user saves the entry.
    var onSave: (Int, String, [String]) -> Void

    private let availableTags = [
        "Post-therapy", "Morning", "Evening", "Stress", "Quiet environment"
    ]

    private func severityColor(for value: Int) -> Color {
        switch value {
        case 1...3: return Color.accentGreen
        case 4...6: return Color.accentAmber
        default: return Color.accentRed
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    // MARK: - Header
                    VStack(spacing: 8) {
                        Image(systemName: "ear.badge.waveform")
                            .font(.system(size: 40))
                            .foregroundStyle(Color.accentCyan)

                        Text("How is your tinnitus today?")
                            .font(.title3.bold())
                            .foregroundStyle(Color.textPrimary)
                    }
                    .padding(.top, 16)

                    // MARK: - Severity Scale
                    VStack(spacing: 12) {
                        HStack(spacing: 8) {
                            ForEach(1...10, id: \.self) { value in
                                Button {
                                    let impact = UIImpactFeedbackGenerator(style: .light)
                                    impact.impactOccurred()
                                    selectedSeverity = value
                                } label: {
                                    ZStack {
                                        Circle()
                                            .fill(
                                                selectedSeverity == value
                                                    ? severityColor(for: value)
                                                    : Color.bgCard
                                            )
                                            .frame(width: 32, height: 32)
                                            .overlay(
                                                Circle()
                                                    .stroke(
                                                        selectedSeverity == value
                                                            ? severityColor(for: value)
                                                            : Color.textMuted.opacity(0.3),
                                                        lineWidth: 1.5
                                                    )
                                            )

                                        Text("\(value)")
                                            .font(.system(.caption, design: .monospaced, weight: .bold))
                                            .foregroundStyle(
                                                selectedSeverity == value
                                                    ? .white
                                                    : Color.textSecondary
                                            )
                                    }
                                }
                            }
                        }

                        HStack {
                            Text("Mild")
                                .font(.caption2)
                                .foregroundStyle(Color.accentGreen)
                            Spacer()
                            Text("Severe")
                                .font(.caption2)
                                .foregroundStyle(Color.accentRed)
                        }
                        .padding(.horizontal, 4)
                    }
                    .padding(.horizontal)

                    // MARK: - Notes
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Notes")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)

                        TextField(
                            "How are you feeling? Any observations...",
                            text: $notes,
                            axis: .vertical
                        )
                        .lineLimit(3...6)
                        .textFieldStyle(.roundedBorder)
                    }
                    .padding(.horizontal)

                    // MARK: - Tags
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tags")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)

                        FlowLayout(spacing: 8) {
                            ForEach(availableTags, id: \.self) { tag in
                                Button {
                                    if selectedTags.contains(tag) {
                                        selectedTags.remove(tag)
                                    } else {
                                        selectedTags.insert(tag)
                                    }
                                } label: {
                                    Text(tag)
                                        .font(.subheadline)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(
                                            selectedTags.contains(tag)
                                                ? Color.accentCyan.opacity(0.2)
                                                : Color.bgCard
                                        )
                                        .foregroundStyle(
                                            selectedTags.contains(tag)
                                                ? Color.accentCyan
                                                : Color.textSecondary
                                        )
                                        .clipShape(Capsule())
                                        .overlay(
                                            Capsule()
                                                .stroke(
                                                    selectedTags.contains(tag)
                                                        ? Color.accentCyan
                                                        : Color.textMuted.opacity(0.3),
                                                    lineWidth: 1
                                                )
                                        )
                                }
                            }
                        }
                    }
                    .padding(.horizontal)

                    // MARK: - Save
                    Button {
                        guard let severity = selectedSeverity else { return }
                        onSave(severity, notes, Array(selectedTags))
                        dismiss()
                    } label: {
                        Text("Save Check-In")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.accentCyan)
                    .disabled(selectedSeverity == nil)
                    .padding(.horizontal)

                    Spacer(minLength: 20)
                }
            }
            .background(Color.bgPrimary)
            .navigationTitle("Check-In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Color.textMuted)
                    }
                }
            }
        }
        .presentationDetents([.large])
    }
}

// MARK: - Flow Layout (wrapping HStack)

/// Simple wrapping layout for tag chips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                                  proposal: .unspecified)
        }
    }

    private struct LayoutResult {
        var size: CGSize
        var positions: [CGPoint]
    }

    private func computeLayout(proposal: ProposedViewSize, subviews: Subviews) -> LayoutResult {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth, currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            totalWidth = max(totalWidth, currentX)
        }

        return LayoutResult(
            size: CGSize(width: totalWidth, height: currentY + lineHeight),
            positions: positions
        )
    }
}

#Preview {
    CheckInSheet { severity, notes, tags in
        print("Saved: \(severity), \(notes), \(tags)")
    }
    .preferredColorScheme(.dark)
}
