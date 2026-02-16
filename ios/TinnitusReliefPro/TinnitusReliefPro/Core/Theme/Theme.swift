import SwiftUI

// MARK: - Color Palette

/// Design-system colors ported from the web app CSS custom properties.
/// Use these everywhere instead of raw Color literals to keep the UI consistent.
extension Color {

    // Backgrounds
    static let bgPrimary   = Color(hex: 0x0A0E1A)
    static let bgCard      = Color(hex: 0x111827)
    static let bgCardHover = Color(hex: 0x1F2937)

    // Accents
    static let accentCyan    = Color(hex: 0x00D9FF)
    static let accentCyanDim = Color(hex: 0x00D9FF).opacity(0.15)
    static let accentGreen   = Color(hex: 0x10B981)
    static let accentRed     = Color(hex: 0xEF4444)
    static let accentPurple  = Color(hex: 0x8B5CF6)
    static let accentAmber   = Color(hex: 0xF59E0B)

    // Typography
    static let textPrimary   = Color(hex: 0xF9FAFB)
    static let textSecondary = Color(hex: 0x9CA3AF)
    static let textMuted     = Color(hex: 0x6B7280)

    // MARK: - Hex Initializer

    /// Creates a Color from a 24-bit RGB hex integer, e.g. `Color(hex: 0x0A0E1A)`.
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >>  8) & 0xFF) / 255.0
        let b = Double( hex        & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Font Helpers

/// Semantic font styles that map to the app's visual hierarchy.
extension Font {

    /// Large display text for hero headings (e.g., dashboard session count).
    static let displayLarge: Font = .system(size: 34, weight: .bold, design: .rounded)

    /// Medium display text for section titles.
    static let displayMedium: Font = .system(size: 24, weight: .semibold, design: .rounded)

    /// Large monospaced text for timers and frequency readouts.
    static let monoLarge: Font = .system(size: 48, weight: .bold, design: .monospaced)

    /// Medium monospaced text for secondary numeric displays.
    static let monoMedium: Font = .system(size: 24, weight: .medium, design: .monospaced)
}

// MARK: - Shape Helpers

/// Common corner radii and shadow styles used throughout the app.
extension View {

    /// Applies the standard card background and rounded corners.
    func cardStyle() -> some View {
        self
            .background(Color.bgCard)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    /// Applies a subtle cyan glow used for selected/active elements.
    func cyanGlow(radius: CGFloat = 8) -> some View {
        self.shadow(color: Color.accentCyan.opacity(0.3), radius: radius, x: 0, y: 0)
    }
}
