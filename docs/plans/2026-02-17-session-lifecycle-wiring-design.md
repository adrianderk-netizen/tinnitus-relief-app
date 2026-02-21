# Full Session Lifecycle Wiring

## Problem

The Session tab has four disconnected pieces:

1. **SessionStatsGrid** displays hardcoded placeholder values (30m today, 145m this week, 7-day streak, 42h all time) instead of real data
2. **SessionView** never passes the user's selected duration to `SessionManager`
3. **SessionManager.stop()** never persists completed sessions to the database
4. **SessionManager.onComplete** is never wired for auto-completion

The `SessionRepository` already has all the aggregation methods needed (`getTotalTimeToday()`, `getTotalTimeThisWeek()`, `getStreak()`, `getTotalTimeAllTime()`), and the `TinnitusSession` SwiftData model is complete. The pieces exist but are not connected.

## Files to Modify

| File | Change |
|------|--------|
| `SessionView.swift` | Pass duration to manager, persist sessions on stop/complete, inject repository |
| `SessionStatsGrid.swift` | Accept repository, load real stats on appear and after session save |

No changes needed to `SessionManager.swift` or `SessionRepository.swift` — their APIs are already correct.

**Base path:** `.../ios/Tinnitussaurus/Tinnitussaurus/`

## Design

### SessionView Changes

- Inject `ModelContext` from SwiftUI environment to create a `SessionRepository`
- Before calling `sessionManager.start()`, set `sessionManager.durationSeconds = selectedDuration * 60`
- After `sessionManager.stop()` returns elapsed seconds, create a `TinnitusSession` and persist via `SessionRepository.addSession()`
- Wire `sessionManager.onComplete` to persist the auto-completed session the same way
- Session `mode` defaults to `"tone-matcher"`; `frequency` captured from `AudioEngineManager` at start time
- Use a `@State` counter/flag to trigger stats grid refresh after saving

### SessionStatsGrid Changes

- Replace hardcoded `@State` properties with a `loadStats()` method
- Accept a `SessionRepository` parameter
- `loadStats()` calls the repository's existing aggregation methods and converts seconds to minutes/hours
- Call `loadStats()` on `.onAppear` and when a refresh binding changes

### Data Flow

```
User taps Start -> SessionView sets durationSeconds -> SessionManager.start()
                                                          |
User taps Stop (or auto-complete fires) -> SessionView captures elapsed time
                                                          |
                                     SessionView creates TinnitusSession
                                                          |
                                     SessionRepository.addSession() persists it
                                                          |
                                     SessionStatsGrid.loadStats() refreshes
```

## Out of Scope

- Therapy mode selection UI (always "tone-matcher" for now)
- Session history list view
- Session notes input
- Profile association
