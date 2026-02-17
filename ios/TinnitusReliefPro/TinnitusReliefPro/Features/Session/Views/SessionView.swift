import SwiftUI
import SwiftData

/// Session tab displaying a circular timer, duration picker, and session statistics.
/// Users start, pause, and stop therapy sessions from here.
struct SessionView: View {

    @Environment(SessionManager.self) private var sessionManager
    @Environment(AudioEngineManager.self) private var audioEngine
    @Environment(\.modelContext) private var modelContext

    @State private var selectedDuration: Int = 30 // minutes
    @State private var statsRefreshTrigger: Int = 0
    @State private var startFrequency: Float?

    private let durations = [15, 30, 60, 120]

    private func durationLabel(_ minutes: Int) -> String {
        switch minutes {
        case 60: return "1h"
        case 120: return "2h"
        default: return "\(minutes)m"
        }
    }

    private func saveSession(elapsedSeconds: Int, completed: Bool) {
        guard elapsedSeconds > 0 else { return }
        let session = TinnitusSession(
            mode: "tone-matcher",
            frequency: startFrequency,
            durationSeconds: elapsedSeconds,
            completed: completed
        )
        let repository = SessionRepository(modelContext: modelContext)
        do {
            try repository.addSession(session)
            statsRefreshTrigger += 1
        } catch {
            // Session save failed — non-critical, stats will catch up next load
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    // MARK: - Timer Ring
                    CircularTimerView(
                        progress: sessionManager.progress,
                        timeRemaining: sessionManager.timeRemainingFormatted
                    )
                    .frame(width: 260, height: 260)
                    .padding(.top, 16)

                    // MARK: - Duration Picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Duration")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                        Picker("Duration", selection: $selectedDuration) {
                            ForEach(durations, id: \.self) { d in
                                Text(durationLabel(d)).tag(d)
                            }
                        }
                        .pickerStyle(.segmented)
                        .disabled(sessionManager.isRunning)
                    }
                    .padding(.horizontal)

                    // MARK: - Session Controls
                    HStack(spacing: 16) {
                        if !sessionManager.isRunning {
                            Button {
                                sessionManager.durationSeconds = selectedDuration * 60
                                startFrequency = audioEngine.frequency
                                sessionManager.start()
                            } label: {
                                Label("Start", systemImage: "play.fill")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Color.accentGreen)
                        } else {
                            Button {
                                if sessionManager.isPaused {
                                    sessionManager.resume()
                                } else {
                                    sessionManager.pause()
                                }
                            } label: {
                                Label(
                                    sessionManager.isPaused ? "Resume" : "Pause",
                                    systemImage: sessionManager.isPaused ? "play.fill" : "pause.fill"
                                )
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Color.accentAmber)

                            Button {
                                let elapsed = sessionManager.stop()
                                saveSession(elapsedSeconds: elapsed, completed: false)
                            } label: {
                                Label("Stop", systemImage: "stop.fill")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Color.accentRed)
                        }
                    }
                    .padding(.horizontal)

                    // MARK: - Stats
                    SessionStatsGrid(
                        repository: SessionRepository(modelContext: modelContext),
                        refreshTrigger: statsRefreshTrigger
                    )
                    .padding(.horizontal)

                    Spacer(minLength: 40)
                }
            }
            .background(Color.bgPrimary)
            .navigationTitle("Session Timer")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                sessionManager.onComplete = {
                    let elapsed = sessionManager.elapsedSeconds
                    saveSession(elapsedSeconds: elapsed, completed: true)
                }
            }
        }
    }
}

#Preview {
    SessionView()
        .environment(SessionManager())
        .environment(AudioEngineManager())
        .modelContainer(try! ModelContainer(for: TinnitusSession.self))
        .preferredColorScheme(.dark)
}
