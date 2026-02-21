import SwiftUI

/// The Tinnitussaurus dinosaur logo from the brand assets.
///
/// Uses the SVG asset from the asset catalog with template rendering,
/// so it can be tinted with any color via ``SwiftUI/View/foregroundStyle(_:)``.
/// Defaults to the brand cyan accent color at 28pt.
struct DinoLogo: View {
    var size: CGFloat = 28

    var body: some View {
        Image("DinoLogo")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: size, height: size)
            .foregroundStyle(Color.accentCyan)
    }
}

#Preview {
    VStack(spacing: 20) {
        DinoLogo(size: 64)
        DinoLogo(size: 32)
        DinoLogo()
    }
    .padding()
    .background(Color.bgPrimary)
}
