import SwiftUI
import SwiftData

@main
struct TinnitusReliefProApp: App {

    // MARK: - SwiftData

    private let modelContainer: ModelContainer

    // MARK: - Managers (injected into the environment)

    @State private var audioEngine = AudioEngineManager()
    @State private var sessionManager = SessionManager()
    @State private var subscriptionManager = SubscriptionManager()
    @State private var appSettings = AppSettings()
    @State private var notificationManager = NotificationManager()
    @State private var showOnboarding = false

    // MARK: - Init

    init() {
        let schema = Schema([
            TinnitusSession.self,
            UserProfile.self,
            JournalEntry.self
        ])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            modelContainer = try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("Failed to create ModelContainer: \(error.localizedDescription)")
        }

        // Configure audio session once at launch.
        try? AudioSessionConfig.configure()
    }

    // MARK: - Scene

    var body: some Scene {
        WindowGroup {
            ContentView()
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
                if appSettings.reminderEnabled {
                    notificationManager.scheduleDailyReminder(
                        hour: appSettings.reminderHour,
                        minute: appSettings.reminderMinute
                    )
                }
            }
        }
    }
}

