# Mood Light Glow During Therapy Sessions

## Problem

Users spend 1-2 hours daily in therapy sessions staring at a timer. There's no ambient visual feedback that creates a calming, immersive atmosphere. A glowing animated border (similar to the Siri edge glow) would enhance the therapy experience.

## Design

An animated glowing border overlay that activates during active therapy sessions. The glow is a slowly rotating angular gradient stroke around the screen edge with a soft blur.

### Color Presets

Users choose from preset palettes or a shifting rainbow mode:

| Preset | Colors |
|--------|--------|
| Purple | purple + indigo |
| Cyan | cyan + teal |
| Pink | pink + magenta |
| Green | green + mint |
| Amber | amber + orange |
| Rainbow | cycles through all palettes |

Preference stored in `AppSettings` as a string (default: `"cyan"`).

### Rendering Approach

`RoundedRectangle` stroke filled with an `AngularGradient`, animated rotation via `withAnimation(.linear.repeatForever)`, and `.blur()` for soft glow. Overlaid on `ContentView` in the app entry point. Fades in/out based on `sessionManager.isRunning`.

### Files

| File | Change |
|------|--------|
| **Create:** `SharedViews/Components/MoodLightOverlay.swift` | Animated glow border view |
| `AppSettings.swift` | Add `moodLightColor: String` preference |
| `TinnitusReliefProApp.swift` | Overlay on ContentView, gated on session state |
| `SettingsView.swift` | Add "Mood Light" color picker section |

## Out of Scope

- Manual on/off toggle independent of sessions
- Custom user-defined colors (beyond presets)
- Brightness/speed controls
