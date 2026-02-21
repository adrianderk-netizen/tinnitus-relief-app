import SwiftUI

/// Animated glowing border overlay that activates during therapy sessions.
/// Renders a rotating angular gradient stroke with blur around the screen edge.
struct MoodLightOverlay: View {

    let colorPreset: String
    let isActive: Bool

    @State private var rotation: Double = 0
    @State private var hueShift: Double = 0

    var body: some View {
        if isActive {
            RoundedRectangle(cornerRadius: 0)
                .strokeBorder(
                    AngularGradient(
                        colors: gradientColors,
                        center: .center,
                        startAngle: .degrees(rotation),
                        endAngle: .degrees(rotation + 360)
                    ),
                    lineWidth: 8
                )
                .blur(radius: 20)
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .transition(.opacity)
                .onAppear {
                    withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                        rotation = 360
                    }
                    if colorPreset == "rainbow" {
                        withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                            hueShift = 1.0
                        }
                    }
                }
                .hueRotation(.degrees(hueShift * 360))
        }
    }

    private var gradientColors: [Color] {
        switch colorPreset {
        case "purple":
            return [.purple, .indigo, .purple, .indigo, .purple]
        case "cyan":
            return [Color.accentCyan, .teal, Color.accentCyan, .teal, Color.accentCyan]
        case "pink":
            return [.pink, Color(hex: 0xFF00FF), .pink, Color(hex: 0xFF00FF), .pink]
        case "green":
            return [Color.accentGreen, .mint, Color.accentGreen, .mint, Color.accentGreen]
        case "amber":
            return [Color.accentAmber, .orange, Color.accentAmber, .orange, Color.accentAmber]
        case "rainbow":
            return [.purple, Color.accentCyan, Color.accentGreen, .pink, Color.accentAmber, .purple]
        default:
            return [Color.accentCyan, .teal, Color.accentCyan, .teal, Color.accentCyan]
        }
    }
}

#Preview("Purple") {
    ZStack {
        Color.bgPrimary.ignoresSafeArea()
        Text("Therapy Session")
            .foregroundStyle(.white)
        MoodLightOverlay(colorPreset: "purple", isActive: true)
    }
}

#Preview("Rainbow") {
    ZStack {
        Color.bgPrimary.ignoresSafeArea()
        Text("Therapy Session")
            .foregroundStyle(.white)
        MoodLightOverlay(colorPreset: "rainbow", isActive: true)
    }
}
