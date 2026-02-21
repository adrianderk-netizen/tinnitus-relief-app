import SwiftUI

/// In-app terms of service view replacing the external GitHub link.
struct TermsOfServiceView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text("Tinnitus Relief Pro")
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.textPrimary)
                    Text("Last updated: February 17, 2026")
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                }

                // Acceptance
                sectionHeader("Acceptance of Terms")
                bodyText("By downloading or using Tinnitus Relief Pro, you agree to these Terms of Service.")

                // Description
                sectionHeader("Description of Service")
                bodyText("Tinnitus Relief Pro is a sound therapy application that provides customizable audio tones and notched sound therapy to help manage tinnitus symptoms.")

                // Medical Disclaimer
                sectionHeader("Medical Disclaimer")
                bodyText("Tinnitus Relief Pro is not a medical device and is not intended to diagnose, treat, cure, or prevent any medical condition. It is a wellness tool that provides sound therapy techniques based on published research.")
                bodyText("Consult a healthcare professional if your tinnitus:")
                bulletList([
                    "Is sudden or worsening",
                    "Affects only one ear",
                    "Pulses with your heartbeat",
                    "Is accompanied by hearing loss, dizziness, or pain"
                ])
                bodyText("Do not use this app as a substitute for professional medical advice, diagnosis, or treatment.")

                // Volume Safety
                sectionHeader("Volume Safety")
                bodyText("You are responsible for maintaining safe listening volumes. Prolonged exposure to loud sounds can cause hearing damage. Keep therapy volume at a comfortable level \u{2014} never attempt to mask your tinnitus by increasing volume to painful levels.")

                // Subscriptions
                sectionHeader("Subscriptions")
                bodyText("Premium features are available through auto-renewable subscriptions managed by Apple. Subscription terms, pricing, and cancellation are governed by Apple\u{2019}s terms. See Apple\u{2019}s Subscription Terms for details.")

                // IP
                sectionHeader("Intellectual Property")
                bodyText("All content, design, and code in Tinnitus Relief Pro are the property of the developer. You may not copy, modify, or redistribute the app.")

                // Liability
                sectionHeader("Limitation of Liability")
                bodyText("Tinnitus Relief Pro is provided \u{201C}as is\u{201D} without warranties of any kind. The developer is not liable for any damages arising from your use of the app.")

                // Changes
                sectionHeader("Changes to Terms")
                bodyText("We may update these Terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.")

                // Contact
                sectionHeader("Contact")
                bodyText("If you have questions about these Terms, please open an issue on our GitHub repository.")

                Spacer(minLength: 40)
            }
            .padding(.horizontal, 24)
            .padding(.top, 8)
        }
        .background(Color.bgPrimary)
        .navigationTitle("Terms of Service")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Helpers

    private func sectionHeader(_ text: String) -> some View {
        Text(text)
            .font(.headline)
            .foregroundStyle(Color.textPrimary)
    }

    private func bodyText(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(Color.textSecondary)
    }

    private func bulletList(_ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: 8) {
                    Circle()
                        .fill(Color.accentCyan)
                        .frame(width: 6, height: 6)
                        .padding(.top, 6)
                    Text(item)
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        TermsOfServiceView()
    }
    .preferredColorScheme(.dark)
}
