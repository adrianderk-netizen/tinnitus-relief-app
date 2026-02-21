import SwiftUI
import SwiftData

@main
struct TinnitussaurusApp: App {

    // MARK: - SwiftData

    private let modelContainer: ModelContainer

    // MARK: - Managers (injected into the environment)

    @State private var audioEngine = AudioEngineManager()
    @State private var sessionManager = SessionManager()
    @State private var subscriptionManager = SubscriptionManager()
    @State private var appSettings = AppSettings()
    @State private var notificationManager = NotificationManager()
    @State private var showOnboarding = false
    @State private var showStorageError = false

    // MARK: - Init

    init() {
        let schema = Schema([
            TinnitusSession.self,
            UserProfile.self,
            JournalEntry.self,
            Playlist.self,
            PlaylistTrack.self
        ])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            modelContainer = try ModelContainer(for: schema, configurations: [config])
        } catch {
            // Fall back to in-memory storage so the app still launches
            let fallbackConfig = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            do {
                modelContainer = try ModelContainer(for: schema, configurations: [fallbackConfig])
            } catch {
                // Last resort: minimal container
                modelContainer = try! ModelContainer(for: schema)
            }
            // Defer the alert flag — will be set in onAppear
            _showStorageError = State(initialValue: true)
        }

        // Configure audio session once at launch.
        try? AudioSessionConfig.configure()
    }

    // MARK: - Scene

    var body: some Scene {
        WindowGroup {
            ContentView()
                .overlay {
                    MoodLightOverlay(
                        colorPreset: "cyan",
                        isActive: appSettings.moodLightEnabled && sessionManager.isRunning
                    )
                }
                .animation(.easeInOut(duration: 0.8), value: sessionManager.isRunning)
                .fullScreenCover(isPresented: $showOnboarding) {
                    OnboardingView(onComplete: {
                        appSettings.hasCompletedOnboarding = true
                        showOnboarding = false
                    })
                }
            .environment(audioEngine)
            .environment(sessionManager)
            .environment(subscriptionManager)
            .environment(appSettings)
            .environment(notificationManager)
            .modelContainer(modelContainer)
            .onAppear {
                subscriptionManager.configure()
                showOnboarding = !appSettings.hasCompletedOnboarding
                // Restore matched frequencies from previous session
                audioEngine.leftFrequency = appSettings.lastLeftFrequency
                audioEngine.rightFrequency = appSettings.lastRightFrequency
                audioEngine.leftMatchedFrequency = appSettings.lastLeftFrequency
                audioEngine.rightMatchedFrequency = appSettings.lastRightFrequency
                if appSettings.reminderEnabled {
                    notificationManager.scheduleDailyReminder(
                        hour: appSettings.reminderHour,
                        minute: appSettings.reminderMinute
                    )
                }
            }
            .alert("Storage Issue", isPresented: $showStorageError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Unable to access persistent storage. Your data will not be saved between sessions. Please restart the app or check your device storage.")
            }
        }
    }
}

