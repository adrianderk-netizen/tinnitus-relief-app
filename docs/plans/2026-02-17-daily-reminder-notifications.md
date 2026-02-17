# Daily Reminder Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire `NotificationManager` so daily therapy reminders actually schedule, cancel, and survive app restarts.

**Architecture:** `NotificationManager` is injected into the SwiftUI environment from the app entry point. On launch, if reminders are enabled, it re-schedules them. `SettingsView` reacts to toggle and time changes via `.onChange` modifiers, calling `NotificationManager` methods. Permission is requested when the user first enables reminders.

**Tech Stack:** SwiftUI, UserNotifications, iOS 17+ Observable pattern

---

### Task 1: Inject NotificationManager and re-schedule on launch

**Files:**
- Modify: `ios/TinnitusReliefPro/TinnitusReliefPro/App/TinnitusReliefProApp.swift`

**Step 1: Add NotificationManager as a state property**

Add after line 16 (`@State private var appSettings = AppSettings()`):

```swift
    @State private var notificationManager = NotificationManager()
```

**Step 2: Inject into the environment**

Add after line 52 (`.environment(appSettings)`):

```swift
            .environment(notificationManager)
```

**Step 3: Re-schedule reminders on launch**

Add at the end of the `.onAppear` block (after line 56, `showOnboarding = !appSettings.hasCompletedOnboarding`):

```swift
                if appSettings.reminderEnabled {
                    notificationManager.scheduleDailyReminder(
                        hour: appSettings.reminderHour,
                        minute: appSettings.reminderMinute
                    )
                }
```

**Step 4: Build and verify**

Run: `cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/ios/TinnitusReliefPro && xcodebuild -scheme TinnitusReliefPro -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

Note: `NotificationManager` is `@MainActor` but NOT `@Observable`. SwiftUI's `.environment()` requires the type to conform to `Observable`. If the build fails with a conformance error, add `@Observable` to the `NotificationManager` class declaration in `NotificationManager.swift` (line 5, before `final class NotificationManager`).

**Step 5: Commit**

```
git add ios/TinnitusReliefPro/TinnitusReliefPro/App/TinnitusReliefProApp.swift
git commit -m "Inject NotificationManager and re-schedule reminders on launch"
```

If `NotificationManager.swift` was also modified, include it in the commit.

IMPORTANT: Do NOT add any Co-Authored-By lines to the commit message.

---

### Task 2: Wire SettingsView to NotificationManager

**Files:**
- Modify: `ios/TinnitusReliefPro/TinnitusReliefPro/Features/Settings/SettingsView.swift`

**Step 1: Add NotificationManager environment injection**

Add after line 9 (`@Environment(AudioEngineManager.self) private var audioEngine`):

```swift
    @Environment(NotificationManager.self) private var notificationManager
```

**Step 2: Add onChange modifiers for reminder settings**

Add `.onChange` modifiers to the `NavigationStack`. Insert after line 129 (`.sheet(isPresented: $showPaywall) { PaywallView() }`), before the closing brace of `NavigationStack`:

```swift
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
```

**Step 3: Update the preview**

Add `NotificationManager` to the preview. Replace the preview (lines 150-156):

```swift
#Preview {
    SettingsView()
        .environment(AppSettings())
        .environment(SubscriptionManager())
        .environment(AudioEngineManager())
        .environment(NotificationManager())
        .preferredColorScheme(.dark)
}
```

**Step 4: Build and verify**

Run: `cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/ios/TinnitusReliefPro && xcodebuild -scheme TinnitusReliefPro -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 5: Commit**

```
git add ios/TinnitusReliefPro/TinnitusReliefPro/Features/Settings/SettingsView.swift
git commit -m "Wire SettingsView to schedule and cancel reminders via NotificationManager"
```

IMPORTANT: Do NOT add any Co-Authored-By lines to the commit message.

---

### Task 3: End-to-End Verification

**Step 1: Build the full project**

Run: `cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/ios/TinnitusReliefPro && xcodebuild -scheme TinnitusReliefPro -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 2: Manual verification checklist**

In the simulator:
- [ ] Open Settings tab — "Enable Reminder" toggle is OFF
- [ ] Toggle ON — system permission prompt appears, grant it
- [ ] Time picker appears — change the time
- [ ] Toggle OFF — time picker disappears
- [ ] Toggle ON again — no permission prompt (already granted), reminder scheduled
- [ ] Kill and relaunch app — toggle still ON, reminder re-scheduled on launch

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Inject `NotificationManager`, re-schedule on launch | `TinnitusReliefProApp.swift` (+ possibly `NotificationManager.swift`) |
| 2 | Wire `SettingsView` to schedule/cancel on toggle and time changes | `SettingsView.swift` |
| 3 | End-to-end build + manual verification | — |
