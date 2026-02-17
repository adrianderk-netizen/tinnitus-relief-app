# Session Lifecycle Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up the full session lifecycle so sessions are timed correctly, persisted to the database, and stats display real data.

**Architecture:** `SessionView` orchestrates the flow — it sets the duration on `SessionManager`, creates a `SessionRepository` from the SwiftUI `ModelContext`, persists `TinnitusSession` records on stop/complete, and passes a refresh trigger to `SessionStatsGrid` so it reloads from the repository.

**Tech Stack:** SwiftUI, SwiftData, Observable pattern (iOS 17+)

---

### Task 1: Wire SessionStatsGrid to SessionRepository

**Files:**
- Modify: `ios/TinnitusReliefPro/TinnitusReliefPro/Features/Session/Views/SessionStatsGrid.swift`

**Step 1: Replace hardcoded state with repository-backed loading**

Replace the entire `SessionStatsGrid` struct (lines 1-26) with:

```swift
import SwiftUI

/// 2x2 grid of session statistics showing today, this week, streak, and all-time totals.
struct SessionStatsGrid: View {

    let repository: SessionRepository
    var refreshTrigger: Int = 0

    @State private var todayMinutes: Int = 0
    @State private var weekMinutes: Int = 0
    @State private var streakDays: Int = 0
    @State private var allTimeHours: Int = 0

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            StatCard(value: "\(todayMinutes)m", label: "Today")
            StatCard(value: "\(weekMinutes)m", label: "This Week")
            StatCard(value: "\(streakDays)", label: "Day Streak")
            StatCard(value: "\(allTimeHours)h", label: "All Time")
        }
        .onAppear { loadStats() }
        .onChange(of: refreshTrigger) { _, _ in loadStats() }
    }

    private func loadStats() {
        do {
            todayMinutes = try repository.getTotalTimeToday() / 60
            weekMinutes = try repository.getTotalTimeThisWeek() / 60
            streakDays = try repository.getStreak()
            let totalSeconds = try repository.getTotalTimeAllTime()
            allTimeHours = totalSeconds / 3600
        } catch {
            // Keep current values on error — non-critical UI
        }
    }
}
```

**Step 2: Update the preview**

Replace the preview (lines 52-57) with:

```swift
#Preview {
    SessionStatsGrid(
        repository: SessionRepository(
            modelContext: try! ModelContainer(
                for: TinnitusSession.self
            ).mainContext
        )
    )
    .padding()
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
```

Add `import SwiftData` at the top of the file.

**Step 3: Build and verify**

Run: `xcodebuild -scheme TinnitusReliefPro -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: Build will fail because `SessionView` still calls `SessionStatsGrid()` with no arguments. That's expected — we fix it in Task 2.

**Step 4: Commit**

```
git add ios/TinnitusReliefPro/TinnitusReliefPro/Features/Session/Views/SessionStatsGrid.swift
git commit -m "Wire SessionStatsGrid to load real stats from SessionRepository"
```

---

### Task 2: Wire SessionView — Duration, Persistence, and Stats Refresh

**Files:**
- Modify: `ios/TinnitusReliefPro/TinnitusReliefPro/Features/Session/Views/SessionView.swift`

**Step 1: Add environment dependencies and state**

Replace lines 1-9 with:

```swift
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
```

**Step 2: Add the session persistence helper**

Add this method inside `SessionView`, after the `durationLabel` function (after line 19):

```swift
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
```

**Step 3: Wire the Start button**

Replace the Start button action (lines 51-52):

```swift
                            Button {
                                sessionManager.durationSeconds = selectedDuration * 60
                                startFrequency = audioEngine.frequency
                                sessionManager.start()
                            } label: {
```

**Step 4: Wire the Stop button**

Replace the Stop button action (lines 80-81):

```swift
                            Button {
                                let elapsed = sessionManager.stop()
                                saveSession(elapsedSeconds: elapsed, completed: false)
                            } label: {
```

**Step 5: Wire onComplete for auto-completion and pass repository to stats grid**

Add `.onAppear` to the `NavigationStack` to wire the completion callback. Replace the stats grid call (line 95) and add the onAppear. The section from `// MARK: - Stats` through the end of the `ScrollView` content should become:

```swift
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
```

**Step 6: Update the preview**

Replace the preview with:

```swift
#Preview {
    SessionView()
        .environment(SessionManager())
        .environment(AudioEngineManager())
        .modelContainer(try! ModelContainer(for: TinnitusSession.self))
        .preferredColorScheme(.dark)
}
```

**Step 7: Build and verify**

Run: `xcodebuild -scheme TinnitusReliefPro -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 8: Commit**

```
git add ios/TinnitusReliefPro/TinnitusReliefPro/Features/Session/Views/SessionView.swift
git commit -m "Wire SessionView to pass duration, persist sessions, and refresh stats"
```

---

### Task 3: End-to-End Verification

**Step 1: Build the full project**

Run: `xcodebuild -scheme TinnitusReliefPro -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 2: Manual verification checklist**

In the simulator:
- [ ] Open Session tab — stats show 0m / 0m / 0 / 0h (no sessions yet)
- [ ] Select 15m duration, tap Start — timer counts up, duration picker disabled
- [ ] Tap Pause, then Resume — timer continues correctly
- [ ] Tap Stop — session is saved, stats refresh to show today's minutes
- [ ] Start another session, let it run briefly, stop — stats accumulate
- [ ] Kill and relaunch app — stats persist across launches
- [ ] Select 15m, start session, wait for auto-complete — session saved as completed

**Step 3: Commit (if any fixes were needed)**

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Wire `SessionStatsGrid` to load from `SessionRepository` | `SessionStatsGrid.swift` |
| 2 | Wire `SessionView` — duration, persistence, stats refresh | `SessionView.swift` |
| 3 | End-to-end build + manual verification | — |
