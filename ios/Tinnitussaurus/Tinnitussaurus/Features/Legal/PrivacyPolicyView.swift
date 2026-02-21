import SwiftUI

/// In-app privacy policy view replacing the external GitHub link.
struct PrivacyPolicyView: View {
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

                // Information We Collect
                sectionHeader("Information We Collect")
                bodyText("Tinnitus Relief Pro stores all data locally on your device. We do not collect, transmit, or store any personal information on external servers.")

                sectionHeader("Data Stored on Your Device")
                bulletList([
                    "Therapy session history (duration, frequency settings, timestamps)",
                    "Journal entries you create",
                    "App preferences (volume, reminder settings, color preferences)",
                    "Tinnitus frequency profiles you configure"
                ])

                sectionHeader("Data We Do Not Collect")
                bulletList([
                    "Personal identification information",
                    "Location data",
                    "Contacts or address book data",
                    "Microphone or camera data",
                    "Analytics or usage tracking data"
                ])

                // Third-Party Services
                sectionHeader("Third-Party Services")
                sectionHeader("Apple StoreKit", level: .sub)
                bodyText("If you purchase a premium subscription, the transaction is processed entirely by Apple. We do not receive or store your payment information. See Apple\u{2019}s Privacy Policy for details.")

                // Data Retention
                sectionHeader("Data Retention")
                bodyText("All app data is stored locally on your device using Apple\u{2019}s SwiftData framework. You can delete all data at any time by uninstalling the app.")

                // Children's Privacy
                sectionHeader("Children\u{2019}s Privacy")
                bodyText("This app is not directed at children under 13. We do not knowingly collect information from children.")

                // Changes
                sectionHeader("Changes to This Policy")
                bodyText("We may update this Privacy Policy from time to time. Changes will be reflected in the \u{201C}Last updated\u{201D} date above.")

                // Contact
                sectionHeader("Contact")
                bodyText("If you have questions about this Privacy Policy, please open an issue on our GitHub repository.")

                Spacer(minLength: 40)
            }
            .padding(.horizontal, 24)
            .padding(.top, 8)
        }
        .background(Color.bgPrimary)
        .navigationTitle("Privacy Policy")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Helpers

    private enum HeaderLevel { case main, sub }

    private func sectionHeader(_ text: String, level: HeaderLevel = .main) -> some View {
        Text(text)
            .font(level == .main ? .headline : .subheadline.bold())
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
        PrivacyPolicyView()
    }
    .preferredColorScheme(.dark)
}
