import SwiftUI

// MARK: - Color Palette

/// Design-system colors ported from the web app CSS custom properties.
/// Use these everywhere instead of raw Color literals to keep the UI consistent.
extension Color {

    // Backgrounds (abyss palette from site)
    static let bgPrimary   = Color(hex: 0x080C18)  // abyss-950
    static let bgSecondary = Color(hex: 0x0F172A)  // abyss-900
    static let bgCard      = Color(hex: 0x1A1A2E)  // abyss-800
    static let bgCardHover = Color(hex: 0x252547)  // abyss-700

    // Accents (dino + jungle palette from site)
    static let accentCyan      = Color(hex: 0x00D9FF)  // dino-500
    static let accentCyanDim   = Color(hex: 0x00D9FF).opacity(0.15)
    static let accentCyanLight = Color(hex: 0x33E1FF)  // dino-400
    static let accentCyanDark  = Color(hex: 0x00B8D9)  // dino-600
    static let accentGreen     = Color(hex: 0x22C55E)  // jungle-500
    static let accentGreenLight = Color(hex: 0x4ADE80) // jungle-400
    static let accentRed       = Color(hex: 0xEF4444)
    static let accentPurple    = Color(hex: 0x8B5CF6)
    static let accentAmber     = Color(hex: 0xF59E0B)
    static let accentAmberLight = Color(hex: 0xFBBF24) // amber-400

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
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.05), lineWidth: 1)
            )
    }

    /// Applies a subtle cyan glow used for selected/active elements.
    func cyanGlow(radius: CGFloat = 10) -> some View {
        self.shadow(color: Color.accentCyan.opacity(0.4), radius: radius, x: 0, y: 0)
    }
}
