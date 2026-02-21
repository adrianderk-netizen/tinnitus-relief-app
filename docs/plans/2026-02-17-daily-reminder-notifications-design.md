# Wire Daily Reminder Notifications

## Problem

`NotificationManager` is fully implemented (permission requests, scheduling, cancellation) but nothing calls it. `AppSettings` persists reminder preferences and `SettingsView` displays the UI, but changes to the toggle and time picker have no effect — no notifications are ever scheduled.

Additionally, reminders need to be re-scheduled on app launch because iOS clears local notifications on app update/reinstall.

## Files to Modify

| File | Change |
|------|--------|
| `TinnitussaurusApp.swift` | Create and inject `NotificationManager`, re-schedule on launch |
| `SettingsView.swift` | React to reminder toggle and time changes via `NotificationManager` |

No changes to `NotificationManager.swift` or `AppSettings.swift` — their APIs are already correct.

**Base path:** `.../ios/Tinnitussaurus/Tinnitussaurus/`

## Design

### App Entry Point

- Add `@State private var notificationManager = NotificationManager()` alongside existing managers
- Inject via `.environment(notificationManager)`
- In `.onAppear`, check `appSettings.reminderEnabled` — if true, call `notificationManager.scheduleDailyReminder(hour:minute:)` to re-establish the reminder on every launch

### SettingsView

- Inject `NotificationManager` from environment
- `.onChange(of: settings.reminderEnabled)`: if ON → request permission, then schedule if granted (turn toggle back OFF if denied); if OFF → cancel
- `.onChange(of: settings.reminderHour)` and `.onChange(of: settings.reminderMinute)`: if reminders enabled, reschedule with new time

### Permission Flow

1. User toggles "Enable Reminder" ON
2. `requestPermission()` called (async)
3. If granted → schedule reminder at configured time
4. If denied → set `settings.reminderEnabled = false` to flip toggle back OFF

## Out of Scope

- Notification tap handling / deep linking to Session tab
- Notification delegate setup
- Custom notification categories or actions
