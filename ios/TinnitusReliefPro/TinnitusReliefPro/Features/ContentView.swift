import SwiftUI

/// Root view hosting the four-tab navigation interface.
/// Uses the "Clinical Noir" dark aesthetic with cyan accent throughout.
struct ContentView: View {

    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            TuneView()
                .tabItem {
                    Label("Tune", systemImage: "waveform")
                }
                .tag(0)

            TherapyView()
                .tabItem {
                    Label("Therapy", systemImage: "speaker.wave.3")
                }
                .tag(1)

            SessionView()
                .tabItem {
                    Label("Session", systemImage: "timer")
                }
                .tag(2)

            JournalView()
                .tabItem {
                    Label("Journal", systemImage: "book")
                }
                .tag(3)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
                .tag(4)
        }
        .tint(Color.accentCyan)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
        .environment(AudioEngineManager())
        .environment(SessionManager())
        .environment(SubscriptionManager())
        .environment(AppSettings())
}
