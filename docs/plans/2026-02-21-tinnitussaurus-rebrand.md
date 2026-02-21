# Tinnitussaurus Rebrand Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand the native iOS app from "Tinnitus Relief Pro" to "Tinnitussaurus", matching the visual identity at tinnitussaurus.com.

**Architecture:** Two-phase rebrand. Phase 1 swaps identity (names, bundle IDs, copy). Phase 2 applies the tinnitussaurus.com visual design system (colors, fonts, effects). The iOS app is fully native SwiftUI — no web files involved.

**Tech Stack:** Swift/SwiftUI, XcodeGen (project.yml), SwiftData, RevenueCat

---

### Task 1: Update Root Config Files

**Files:**
- Modify: `package.json` (lines 2, 45-46)
- Modify: `manifest.json` (lines 2-3)
- Modify: `capacitor.config.json` (lines 2-3)

**Step 1: Update package.json**

```json
// Line 2
"name": "tinnitussaurus"
// Line 45-46
"appId": "com.paulabac.tinnitussaurus",
"appName": "Tinnitussaurus"
```

**Step 2: Update manifest.json**

```json
"name": "Tinnitussaurus",
"short_name": "Tinnitussaurus"
```

**Step 3: Update capacitor.config.json**

```json
"appId": "com.paulabac.tinnitussaurus",
"appName": "Tinnitussaurus"
```

**Step 4: Commit**

```bash
git add package.json manifest.json capacitor.config.json
git commit -m "chore: rebrand config files to Tinnitussaurus"
```

---

### Task 2: Rename iOS Directory Structure

**Important:** This renames the entire iOS project directory tree. Must be done before updating file contents.

**Step 1: Rename directories (bottom-up to avoid conflicts)**

```bash
cd /path/to/tinnitus-relief-app

# Rename inner source directory
mv ios/TinnitusReliefPro/TinnitusReliefPro ios/TinnitusReliefPro/Tinnitussaurus

# Rename test directories
mv ios/TinnitusReliefPro/TinnitusReliefProTests ios/TinnitusReliefPro/TinnitussaurusTests
mv ios/TinnitusReliefPro/TinnitusReliefProUITests ios/TinnitusReliefPro/TinnitussaurusUITests

# Rename xcodeproj
mv ios/TinnitusReliefPro/TinnitusReliefPro.xcodeproj ios/TinnitusReliefPro/Tinnitussaurus.xcodeproj

# Rename top-level project directory last
mv ios/TinnitusReliefPro ios/Tinnitussaurus
```

**Step 2: Rename the main app Swift file**

```bash
mv ios/Tinnitussaurus/Tinnitussaurus/App/TinnitusReliefProApp.swift ios/Tinnitussaurus/Tinnitussaurus/App/TinnitussaurusApp.swift
```

**Step 3: Rename test files**

```bash
mv ios/Tinnitussaurus/TinnitussaurusTests/TinnitusReliefProTests.swift ios/Tinnitussaurus/TinnitussaurusTests/TinnitussaurusTests.swift
mv ios/Tinnitussaurus/TinnitussaurusUITests/TinnitusReliefProUITests.swift ios/Tinnitussaurus/TinnitussaurusUITests/TinnitussaurusUITests.swift
```

**Step 4: Verify the new directory structure**

```bash
ls -la ios/Tinnitussaurus/
# Expected: Tinnitussaurus/, TinnitussaurusTests/, TinnitussaurusUITests/, Tinnitussaurus.xcodeproj/, project.yml, build/, *.xcconfig
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: rename iOS project directories to Tinnitussaurus"
```

---

### Task 3: Update project.yml

**Files:**
- Modify: `ios/Tinnitussaurus/project.yml`

**Step 1: Update all references in project.yml**

Replace these values:
- `name: TinnitusReliefPro` → `name: Tinnitussaurus`
- Target name `TinnitusReliefPro:` → `Tinnitussaurus:`
- `CFBundleDisplayName: Tinnitus Relief` → `CFBundleDisplayName: Tinnitussaurus`
- `PRODUCT_BUNDLE_IDENTIFIER: com.paulabac.tinnitusreliefpro` → `PRODUCT_BUNDLE_IDENTIFIER: com.paulabac.tinnitussaurus`
- `TinnitusReliefProTests:` → `TinnitussaurusTests:`
- `com.paulabac.tinnitusreliefpro.tests` → `com.paulabac.tinnitussaurus.tests`
- `TinnitusReliefProUITests:` → `TinnitussaurusUITests:`
- `com.paulabac.tinnitusreliefpro.uitests` → `com.paulabac.tinnitussaurus.uitests`
- All source path references: `TinnitusReliefPro/` → `Tinnitussaurus/`

**Step 2: Update Info.plist**

Modify `ios/Tinnitussaurus/Tinnitussaurus/Info.plist`:
- `<string>Tinnitus Relief</string>` → `<string>Tinnitussaurus</string>` (CFBundleDisplayName)
- `Tinnitus Relief Pro sends daily reminders` → `Tinnitussaurus sends daily reminders`

**Step 3: Commit**

```bash
git add ios/Tinnitussaurus/project.yml ios/Tinnitussaurus/Tinnitussaurus/Info.plist
git commit -m "chore: update project.yml and Info.plist for Tinnitussaurus"
```

---

### Task 4: Update App Entry Point and Struct Name

**Files:**
- Modify: `ios/Tinnitussaurus/Tinnitussaurus/App/TinnitussaurusApp.swift`

**Step 1: Rename the struct**

```swift
// Change:
struct TinnitusReliefProApp: App {
// To:
struct TinnitussaurusApp: App {
```

**Step 2: Commit**

```bash
git add ios/Tinnitussaurus/Tinnitussaurus/App/TinnitussaurusApp.swift
git commit -m "chore: rename app struct to TinnitussaurusApp"
```

---

### Task 5: Update All Logger Subsystem Strings

**Files (12 files):** All files containing `Logger(subsystem: ... "TinnitusReliefPro"`

In each file, replace `"TinnitusReliefPro"` with `"Tinnitussaurus"` in the Logger initializer:

- `ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/ExportManager.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/SessionManager.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/SubscriptionManager.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/NotificationManager.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Audio/AudioEngineManager.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Audio/AudioSessionConfig.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Audio/OscillatorNode.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Audio/NoiseGenerator.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Audio/NotchFilterBank.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Audio/FrequencyAnalyzer.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Data/Repositories/SessionRepository.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Data/Repositories/JournalRepository.swift`
- `ios/Tinnitussaurus/Tinnitussaurus/Core/Data/Repositories/ProfileRepository.swift`

**Pattern:** `"TinnitusReliefPro"` → `"Tinnitussaurus"` in Logger subsystem fallback strings.

**Step 1: Update all 13 files**

**Step 2: Commit**

```bash
git add ios/Tinnitussaurus/Tinnitussaurus/Core/
git commit -m "chore: update logger subsystem strings to Tinnitussaurus"
```

---

### Task 6: Update User-Facing Strings

**Files:**
- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Features/Onboarding/Views/OnboardingView.swift`
  - `"Welcome to\nTinnitus Relief Pro"` → `"Welcome to\nTinnitussaurus"`

- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Features/Legal/PrivacyPolicyView.swift`
  - All `"Tinnitus Relief Pro"` → `"Tinnitussaurus"`

- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Features/Legal/TermsOfServiceView.swift`
  - All `"Tinnitus Relief Pro"` → `"Tinnitussaurus"` (6 occurrences)

- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/ExportManager.swift`
  - `"TinnitusRelief-Report-"` → `"Tinnitussaurus-Report-"` (2 occurrences: PDF and TXT)

- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/SubscriptionManager.swift`
  - `"Tinnitus Relief Pro"` in subscription cancel alert → `"Tinnitussaurus"`

- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Core/Managers/NotificationManager.swift`
  - Any user-facing notification text referencing the app name

- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Features/Settings/SettingsView.swift`
  - Any app name references

- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Features/Help/GettingStartedView.swift`
  - Any app name references

- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Features/Paywall/Views/PaywallView.swift`
  - Any app name references

**Step 1: Search for and update ALL remaining references**

Run a grep across the entire ios directory for `Tinnitus Relief` and `TinnitusRelief` to catch any missed references.

**Step 2: Commit**

```bash
git add ios/Tinnitussaurus/Tinnitussaurus/Features/ ios/Tinnitussaurus/Tinnitussaurus/Core/
git commit -m "chore: update all user-facing strings to Tinnitussaurus"
```

---

### Task 7: Update Test Files

**Files:**
- Modify: `ios/Tinnitussaurus/TinnitussaurusTests/TinnitussaurusTests.swift`
  - Rename test class/struct references from `TinnitusReliefProTests` to `TinnitussaurusTests`
- Modify: `ios/Tinnitussaurus/TinnitussaurusUITests/TinnitussaurusUITests.swift`
  - Rename test class/struct references from `TinnitusReliefProUITests` to `TinnitussaurusUITests`

**Step 1: Update test file contents**

**Step 2: Commit**

```bash
git add ios/Tinnitussaurus/TinnitussaurusTests/ ios/Tinnitussaurus/TinnitussaurusUITests/
git commit -m "chore: update test files for Tinnitussaurus rebrand"
```

---

### Task 8: Update Theme.swift - Color Palette

**Files:**
- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Core/Theme/Theme.swift`

**Step 1: Update color definitions to match tinnitussaurus.com**

Current → New mapping:
```swift
// Backgrounds (update to match abyss palette)
static let bgPrimary   = Color(hex: 0x080C18)  // was 0x0A0E1A, now abyss-950
static let bgCard      = Color(hex: 0x1A1A2E)  // was 0x111827, now abyss-800
static let bgCardHover = Color(hex: 0x252547)  // was 0x1F2937, now abyss-700

// Add secondary background
static let bgSecondary = Color(hex: 0x0F172A)  // abyss-900

// Accents (update green to match jungle-500)
static let accentCyan    = Color(hex: 0x00D9FF)  // unchanged, dino-500
static let accentCyanDim = Color(hex: 0x00D9FF).opacity(0.15)  // unchanged
static let accentCyanLight = Color(hex: 0x33E1FF)  // NEW: dino-400
static let accentCyanDark  = Color(hex: 0x00B8D9)  // NEW: dino-600
static let accentGreen   = Color(hex: 0x22C55E)  // was 0x10B981, now jungle-500
static let accentRed     = Color(hex: 0xEF4444)  // unchanged
static let accentPurple  = Color(hex: 0x8B5CF6)  // unchanged
static let accentAmber   = Color(hex: 0xF59E0B)  // unchanged
```

**Step 2: Add border/glow utilities matching site**

```swift
/// Card with subtle white border matching tinnitussaurus.com
func tinnitussaurusCard() -> some View {
    self
        .background(Color.bgCard)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.05), lineWidth: 1)
        )
}
```

**Step 3: Commit**

```bash
git add ios/Tinnitussaurus/Tinnitussaurus/Core/Theme/Theme.swift
git commit -m "feat: update color palette to match tinnitussaurus.com"
```

---

### Task 9: Add Custom Fonts (Space Grotesk + Inter)

**Files:**
- Create: `ios/Tinnitussaurus/Tinnitussaurus/Resources/Fonts/SpaceGrotesk-Regular.ttf`
- Create: `ios/Tinnitussaurus/Tinnitussaurus/Resources/Fonts/SpaceGrotesk-Medium.ttf`
- Create: `ios/Tinnitussaurus/Tinnitussaurus/Resources/Fonts/SpaceGrotesk-SemiBold.ttf`
- Create: `ios/Tinnitussaurus/Tinnitussaurus/Resources/Fonts/SpaceGrotesk-Bold.ttf`
- Create: `ios/Tinnitussaurus/Tinnitussaurus/Resources/Fonts/Inter-Regular.ttf`
- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Info.plist` (add UIAppFonts array)
- Modify: `ios/Tinnitussaurus/Tinnitussaurus/Core/Theme/Theme.swift` (update Font helpers)

**Step 1: Download fonts**

Download Space Grotesk and Inter .ttf files from Google Fonts and place in Resources/Fonts/.

**Step 2: Register fonts in Info.plist**

Add to Info.plist:
```xml
<key>UIAppFonts</key>
<array>
    <string>SpaceGrotesk-Regular.ttf</string>
    <string>SpaceGrotesk-Medium.ttf</string>
    <string>SpaceGrotesk-SemiBold.ttf</string>
    <string>SpaceGrotesk-Bold.ttf</string>
    <string>Inter-Regular.ttf</string>
</array>
```

**Step 3: Update Theme.swift font definitions**

```swift
extension Font {
    static let displayLarge: Font = .custom("SpaceGrotesk-Bold", size: 34)
    static let displayMedium: Font = .custom("SpaceGrotesk-SemiBold", size: 24)
    static let monoLarge: Font = .system(size: 48, weight: .bold, design: .monospaced)
    static let monoMedium: Font = .system(size: 24, weight: .medium, design: .monospaced)
}
```

**Step 4: Add font resources to project.yml**

Ensure the Fonts directory is included in the resource bundle.

**Step 5: Commit**

```bash
git add ios/Tinnitussaurus/Tinnitussaurus/Resources/Fonts/
git add ios/Tinnitussaurus/Tinnitussaurus/Info.plist
git add ios/Tinnitussaurus/Tinnitussaurus/Core/Theme/Theme.swift
git commit -m "feat: add Space Grotesk and Inter custom fonts"
```

---

### Task 10: Add Dinosaur Logo Asset

**Files:**
- Create: `ios/Tinnitussaurus/Tinnitussaurus/Resources/Assets.xcassets/DinoLogo.imageset/` (PDF vector asset)
- Modify: Views that display the logo (e.g., onboarding, settings)

**Step 1: Create SVG file from the site's dinosaur logo path**

The logo SVG path data (from tinnitussaurus.com Header.tsx):
```svg
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path fill="#00d9ff" d="M8 26c-1 0-2-.5-2-1.5V22c0-.5.2-1 .5-1.3.3-.3.7-.5 1.2-.5h.3c.3-1.5 1-2.8 2-3.8V12c0-2 .8-3.8 2-5.2C13.2 5.5 15 4.5 17 4.5c1.5 0 2.8.5 3.8 1.5.5-.3 1-.5 1.7-.5 1.4 0 2.5 1.1 2.5 2.5 0 .7-.3 1.3-.7 1.8.5.8.7 1.7.7 2.7 0 1.5-.5 2.8-1.5 4-.2.2-.4.4-.5.5v5.5c0 .5-.2 1-.5 1.3-.3.3-.7.5-1.2.5h-1.5c-1 0-1.8-.8-1.8-1.8v-1.2h-4v1.2c0 1-.8 1.8-1.8 1.8H8zm14-18c-.3 0-.5.2-.5.5s.2.5.5.5.5-.2.5-.5-.2-.5-.5-.5z"/>
</svg>
```

**Step 2: Convert SVG to PDF for Xcode asset catalog**

Use a tool or script to convert the SVG to a PDF vector asset.

**Step 3: Add to Assets.xcassets as DinoLogo imageset**

**Step 4: Update OnboardingView and any header views to display the logo**

**Step 5: Commit**

```bash
git add ios/Tinnitussaurus/Tinnitussaurus/Resources/
git commit -m "feat: add dinosaur logo asset"
```

---

### Task 11: Regenerate Xcode Project and Verify Build

**Step 1: Regenerate the Xcode project using XcodeGen**

```bash
cd ios/Tinnitussaurus
xcodegen generate
```

**Step 2: Open in Xcode and verify build succeeds**

```bash
xed ios/Tinnitussaurus/Tinnitussaurus.xcodeproj
```

Build with Cmd+B. Fix any remaining references to old names.

**Step 3: Run a final grep to catch stragglers**

Search entire `ios/Tinnitussaurus/` directory for:
- `TinnitusReliefPro` (should be zero hits outside build/ and .xcodeproj internals)
- `Tinnitus Relief Pro` (should be zero)
- `TinnitusRelief` (should be zero)
- `tinnitusreliefpro` (should be zero outside capacitor legacy)

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: regenerate Xcode project and fix remaining references"
```

---

### Task 12: Update Documentation

**Files:**
- Modify: `README.md` — update app name references
- Modify: Any docs that reference "Tinnitus Relief Pro"

**Step 1: Search docs for old name and update**

```bash
grep -r "Tinnitus Relief" *.md docs/
```

**Step 2: Commit**

```bash
git add README.md docs/
git commit -m "docs: update documentation for Tinnitussaurus rebrand"
```
