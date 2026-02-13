import SwiftUI

/// Therapy tab hosting notched noise and notched music therapy sections.
/// Non-premium users see a lock overlay prompting upgrade.
struct TherapyView: View {

    @Environment(SubscriptionManager.self) private var subscriptionManager
    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            ZStack {
                ScrollView {
                    VStack(spacing: 24) {
                        NotchedNoiseSection()
                            .padding(.horizontal)

                        NotchedMusicSection()
                            .padding(.horizontal)

                        Spacer(minLength: 40)
                    }
                    .padding(.top, 8)
                }
                .background(Color.bgPrimary)

                // MARK: - Premium Gate
                if !subscriptionManager.isPremium {
                    Color.black.opacity(0.7)
                        .ignoresSafeArea()
                        .overlay {
                            VStack(spacing: 16) {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 48))
                                    .foregroundStyle(Color.accentAmber)

                                Text("Premium Feature")
                                    .font(.title2.bold())
                                    .foregroundStyle(Color.textPrimary)

                                Text("Unlock advanced sound therapies\nwith a Premium subscription.")
                                    .font(.subheadline)
                                    .foregroundStyle(Color.textSecondary)
                                    .multilineTextAlignment(.center)

                                Button {
                                    showPaywall = true
                                } label: {
                                    Text("Unlock Premium")
                                        .font(.headline)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(Color.accentCyan)
                                .padding(.horizontal, 40)
                            }
                        }
                }
            }
            .navigationTitle("Sound Therapy")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showPaywall) {
                PaywallView()
            }
        }
    }
}

#Preview {
    TherapyView()
        .environment(AudioEngineManager())
        .environment(SubscriptionManager())
        .preferredColorScheme(.dark)
}
