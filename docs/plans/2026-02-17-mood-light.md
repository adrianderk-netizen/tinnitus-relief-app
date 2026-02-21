# Mood Light Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an animated glowing border overlay that activates during therapy sessions, with user-selectable color presets and a rainbow shift mode.

**Architecture:** A new `MoodLightOverlay` SwiftUI view renders a rotating angular gradient stroke with blur around the screen edge. It is overlaid on `ContentView` in the app entry point, gated on `sessionManager.isRunning`. Color preference is stored in `AppSettings` and configurable from a new section in `SettingsView`.

**Tech Stack:** SwiftUI (AngularGradient, animation, blur), iOS 17+ Observable pattern

---

### Task 1: Add moodLightColor preference to AppSettings

**Files:**
- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/AppSettings.swift`

**Step 1: Add the key**

Add after line 21 (`static let reminderMinute = "reminderMinute"`):

```swift
        static let moodLightColor    = "moodLightColor"
```

**Step 2: Add the stored property**

Add after line 62 (the `reminderMinute` property closing brace):

```swift

    var moodLightColor: String {
        didSet { defaults.set(moodLightColor, forKey: Keys.moodLightColor) }
    }
```

**Step 3: Register the default**

Add to the `defaults.register(defaults:)` dictionary (after the `Keys.reminderMinute: 0` line 78):

```swift
            Keys.moodLightColor: "cyan"
```

**Step 4: Load from UserDefaults**

Add after line 90 (`self.reminderMinute = defaults.integer(forKey: Keys.reminderMinute)`):

```swift
        self.moodLightColor = defaults.string(forKey: Keys.moodLightColor) ?? "cyan"
```

**Step 5: Build and verify**

Run: `cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/ios/Tinnitussaurus && xcodebuild -scheme Tinnitussaurus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 6: Commit**

```
git add ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/AppSettings.swift
git commit -m "Add moodLightColor preference to AppSettings"
```

IMPORTANT: Do NOT add any Co-Authored-By lines. The project's CLAUDE.md forbids this.

---

### Task 2: Create MoodLightOverlay component

**Files:**
- Create: `ios/Tinnitussaurus/Tinnitussaurus/SharedViews/Components/MoodLightOverlay.swift`

**Step 1: Create the file with full implementation**

```swift
import SwiftUI

/// Animated glowing border overlay that activates during therapy sessions.
/// Renders a rotating angular gradient stroke with blur around the screen edge.
struct MoodLightOverlay: View {

    let colorPreset: String
    let isActive: Bool

    @State private var rotation: Double = 0
    @State private var hueShift: Double = 0

    var body: some View {
        if isActive {
            RoundedRectangle(cornerRadius: 0)
                .strokeBorder(
                    AngularGradient(
                        colors: gradientColors,
                        center: .center,
                        startAngle: .degrees(rotation),
                        endAngle: .degrees(rotation + 360)
                    ),
                    lineWidth: 8
                )
                .blur(radius: 20)
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .transition(.opacity)
                .onAppear {
                    withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                        rotation = 360
                    }
                    if colorPreset == "rainbow" {
                        withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                            hueShift = 1.0
                        }
                    }
                }
                .hueRotation(.degrees(hueShift * 360))
        }
    }

    private var gradientColors: [Color] {
        switch colorPreset {
        case "purple":
            return [.purple, .indigo, .purple, .indigo, .purple]
        case "cyan":
            return [Color.accentCyan, .teal, Color.accentCyan, .teal, Color.accentCyan]
        case "pink":
            return [.pink, Color(hex: 0xFF00FF), .pink, Color(hex: 0xFF00FF), .pink]
        case "green":
            return [Color.accentGreen, .mint, Color.accentGreen, .mint, Color.accentGreen]
        case "amber":
            return [Color.accentAmber, .orange, Color.accentAmber, .orange, Color.accentAmber]
        case "rainbow":
            return [.purple, Color.accentCyan, Color.accentGreen, .pink, Color.accentAmber, .purple]
        default:
            return [Color.accentCyan, .teal, Color.accentCyan, .teal, Color.accentCyan]
        }
    }
}

#Preview("Purple") {
    ZStack {
        Color.bgPrimary.ignoresSafeArea()
        Text("Therapy Session")
            .foregroundStyle(.white)
        MoodLightOverlay(colorPreset: "purple", isActive: true)
    }
}

#Preview("Rainbow") {
    ZStack {
        Color.bgPrimary.ignoresSafeArea()
        Text("Therapy Session")
            .foregroundStyle(.white)
        MoodLightOverlay(colorPreset: "rainbow", isActive: true)
    }
}
```

**Step 2: Build and verify**

Run: `cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/ios/Tinnitussaurus && xcodebuild -scheme Tinnitussaurus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 3: Commit**

```
git add ios/Tinnitussaurus/Tinnitussaurus/SharedViews/Components/MoodLightOverlay.swift
git commit -m "Add MoodLightOverlay animated glow border component"
```

IMPORTANT: Do NOT add any Co-Authored-By lines.

---

### Task 3: Overlay on ContentView in the app entry point

**Files:**
- Modify: `ios/Tinnitussaurus/Tinnitussaurus/App/TinnitussaurusApp.swift`

**Step 1: Add the mood light overlay**

Replace line 43 (`ContentView()`):

```swift
            ContentView()
                .overlay {
                    MoodLightOverlay(
                        colorPreset: appSettings.moodLightColor,
                        isActive: sessionManager.isRunning
                    )
                }
```

**Step 2: Wrap the isActive transition in animation**

Add an `.animation` modifier to the overlay so it fades in/out. After the `.overlay { ... }` block, before `.fullScreenCover`:

```swift
                .animation(.easeInOut(duration: 0.8), value: sessionManager.isRunning)
```

**Step 3: Build and verify**

Run: `cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/ios/Tinnitussaurus && xcodebuild -scheme Tinnitussaurus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 4: Commit**

```
git add ios/Tinnitussaurus/Tinnitussaurus/App/TinnitussaurusApp.swift
git commit -m "Activate mood light overlay during therapy sessions"
```

IMPORTANT: Do NOT add any Co-Authored-By lines.

---

### Task 4: Add Mood Light color picker to SettingsView

**Files:**
- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Features/Settings/SettingsView.swift`

**Step 1: Add the Mood Light section**

Insert a new section after the "Daily Reminder" section (after line 58, the closing brace of the Reminders section). Add:

```swift

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
```

**Step 2: Add the moodLightBinding computed property**

Add after the `reminderDateBinding` computed property (after line 179):

```swift

    private var moodLightBinding: Binding<String> {
        Binding(
            get: { settings.moodLightColor },
            set: { settings.moodLightColor = $0 }
        )
    }
```

**Step 3: Add the helper views at the bottom of the file**

Add before the `#Preview` block:

```swift

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
```

**Step 4: Build and verify**

Run: `cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/ios/Tinnitussaurus && xcodebuild -scheme Tinnitussaurus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 5: Commit**

```
git add ios/Tinnitussaurus/Tinnitussaurus/Features/Settings/SettingsView.swift
git commit -m "Add mood light color picker to Settings"
```

IMPORTANT: Do NOT add any Co-Authored-By lines.

---

### Task 5: End-to-End Verification

**Step 1: Build the full project**

Run: `cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/ios/Tinnitussaurus && xcodebuild -scheme Tinnitussaurus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`

Expected: `** BUILD SUCCEEDED **`

**Step 2: Manual verification checklist**

- [ ] Open Settings — "Mood Light" section visible with 6 color circles (5 solid + 1 rainbow)
- [ ] Cyan is selected by default (white ring)
- [ ] Tap purple — white ring moves to purple
- [ ] Go to Session tab, start a session — glowing purple border appears with fade-in
- [ ] Stop session — glow fades out
- [ ] Go to Settings, select "rainbow" — rainbow circle gets white ring
- [ ] Start a session — rainbow-shifting glow appears
- [ ] Kill and relaunch — color preference persists

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Add `moodLightColor` preference | `AppSettings.swift` |
| 2 | Create `MoodLightOverlay` component | `MoodLightOverlay.swift` (new) |
| 3 | Overlay on `ContentView` gated on session state | `TinnitussaurusApp.swift` |
| 4 | Add color picker to Settings | `SettingsView.swift` |
| 5 | End-to-end build + manual verification | — |
