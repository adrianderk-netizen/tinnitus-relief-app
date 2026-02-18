import SwiftUI

/// Settings tab providing access to audio preferences, daily reminders,
/// subscription status, and about/legal information.
struct SettingsView: View {

    @Environment(AppSettings.self) private var settings
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(AudioEngineManager.self) private var audioEngine
    @Environment(NotificationManager.self) private var notificationManager

    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            List {
                // MARK: - Audio
                Section("Audio") {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Master Volume")
                            Spacer()
                            Text("\(Int(settings.masterVolume * 100))%")
                                .font(.system(.body, design: .monospaced))
                                .foregroundStyle(Color.accentCyan)
                        }
                        Slider(
                            value: Binding(
                                get: { Double(settings.masterVolume) },
                                set: {
                                    settings.masterVolume = Float($0)
                                    audioEngine.masterVolume = Float($0)
                                }
                            ),
                            in: 0...1,
                            step: 0.01
                        )
                        .tint(Color.accentCyan)
                    }
                }

                // MARK: - Reminders
                Section("Daily Reminder") {
                    Toggle("Enable Reminder", isOn: Binding(
                        get: { settings.reminderEnabled },
                        set: { settings.reminderEnabled = $0 }
                    ))
                    .tint(Color.accentCyan)

                    if settings.reminderEnabled {
                        DatePicker(
                            "Reminder Time",
                            selection: reminderDateBinding,
                            displayedComponents: .hourAndMinute
                        )
                        .tint(Color.accentCyan)
                    }
                }

                // MARK: - Mood Light
                Section("Mood Light") {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Session Glow Color")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)

                        HStack(spacing: 12) {
                            MoodLightColorButton(color: .purple, label: "purple", selection: moodLightBinding)
                            MoodLightColorButton(color: Color.accentCyan, label: "cyan", selection: moodLightBinding)
                            MoodLightColorButton(color: .pink, label: "pink", selection: moodLightBinding)
                            MoodLightColorButton(color: Color.accentGreen, label: "green", selection: moodLightBinding)
                            MoodLightColorButton(color: Color.accentAmber, label: "amber", selection: moodLightBinding)
                            RainbowButton(selection: moodLightBinding)
                        }
                    }

                    Text("Glow activates during therapy sessions")
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                }

                // MARK: - Subscription
                Section("Subscription") {
                    HStack {
                        Text("Status")
                        Spacer()
                        if subscriptionManager.isPremium {
                            Label("Premium", systemImage: "star.fill")
                                .font(.subheadline.bold())
                                .foregroundStyle(Color.accentAmber)
                        } else {
                            Text("Free")
                                .foregroundStyle(Color.textSecondary)
                        }
                    }

                    if subscriptionManager.isTrialActive {
                        HStack {
                            Text("Trial")
                            Spacer()
                            Text("\(subscriptionManager.trialDaysRemaining) days remaining")
                                .foregroundStyle(Color.accentGreen)
                        }
                    }

                    if !subscriptionManager.isPremium {
                        Button {
                            showPaywall = true
                        } label: {
                            Label("Upgrade to Premium", systemImage: "crown")
                                .frame(maxWidth: .infinity)
                        }
                        .tint(Color.accentCyan)
                    }
                }

                #if DEBUG
                // MARK: - Debug
                Section("Debug") {
                    Toggle("Premium Override", isOn: Binding(
                        get: { subscriptionManager.isPremium },
                        set: { _ in subscriptionManager.debugTogglePremium() }
                    ))
                    .tint(Color.accentAmber)
                }
                #endif

                // MARK: - About
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                            .foregroundStyle(Color.textSecondary)
                    }

                    Link(destination: URL(string: "https://github.com/adrianderk-netizen/tinnitus-relief-app/blob/main/docs/legal/privacy-policy.md")!) {
                        Label("Privacy Policy", systemImage: "hand.raised")
                    }

                    Link(destination: URL(string: "https://github.com/adrianderk-netizen/tinnitus-relief-app/blob/main/docs/legal/terms-of-service.md")!) {
                        Label("Terms of Service", systemImage: "doc.text")
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.bgPrimary)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showPaywall) {
                PaywallView()
            }
            .onChange(of: settings.reminderEnabled) { _, enabled in
                if enabled {
                    Task {
                        let granted = await notificationManager.requestPermission()
                        if granted {
                            notificationManager.scheduleDailyReminder(
                                hour: settings.reminderHour,
                                minute: settings.reminderMinute
                            )
                        } else {
                            settings.reminderEnabled = false
                        }
                    }
                } else {
                    notificationManager.cancelReminders()
                }
            }
            .onChange(of: settings.reminderHour) { _, _ in
                guard settings.reminderEnabled else { return }
                notificationManager.scheduleDailyReminder(
                    hour: settings.reminderHour,
                    minute: settings.reminderMinute
                )
            }
            .onChange(of: settings.reminderMinute) { _, _ in
                guard settings.reminderEnabled else { return }
                notificationManager.scheduleDailyReminder(
                    hour: settings.reminderHour,
                    minute: settings.reminderMinute
                )
            }
        }
    }

    private var reminderDateBinding: Binding<Date> {
        Binding(
            get: {
                var components = DateComponents()
                components.hour = settings.reminderHour
                components.minute = settings.reminderMinute
                return Calendar.current.date(from: components) ?? .now
            },
            set: { newDate in
                let components = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                settings.reminderHour = components.hour ?? 9
                settings.reminderMinute = components.minute ?? 0
            }
        )
    }

    private var moodLightBinding: Binding<String> {
        Binding(
            get: { settings.moodLightColor },
            set: { settings.moodLightColor = $0 }
        )
    }
}

// MARK: - Mood Light Color Buttons

private struct MoodLightColorButton: View {
    let color: Color
    let label: String
    @Binding var selection: String

    var body: some View {
        Button {
            selection = label
        } label: {
            Circle()
                .fill(color)
                .frame(width: 32, height: 32)
                .overlay {
                    if selection == label {
                        Circle()
                            .stroke(.white, lineWidth: 2)
                    }
                }
        }
    }
}

private struct RainbowButton: View {
    @Binding var selection: String

    var body: some View {
        Button {
            selection = "rainbow"
        } label: {
            Circle()
                .fill(
                    AngularGradient(
                        colors: [.purple, .blue, .cyan, .green, .yellow, .orange, .pink, .purple],
                        center: .center
                    )
                )
                .frame(width: 32, height: 32)
                .overlay {
                    if selection == "rainbow" {
                        Circle()
                            .stroke(.white, lineWidth: 2)
                    }
                }
        }
    }
}

#Preview {
    SettingsView()
        .environment(AppSettings())
        .environment(SubscriptionManager())
        .environment(AudioEngineManager())
        .environment(NotificationManager())
        .preferredColorScheme(.dark)
}
