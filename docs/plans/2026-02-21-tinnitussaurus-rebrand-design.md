# Tinnitussaurus Rebrand Design

## Overview

Rebrand the native iOS app from "Tinnitus Relief Pro" to "Tinnitussaurus", matching the visual identity established at tinnitussaurus.com.

## Scope

- **In scope**: iOS native SwiftUI app (identity, visuals, copy)
- **Out of scope**: PWA/web files, company name change (Paulabac, LLC stays)

## Phase 1: Identity Swap

### Project & Config
- Rename Xcode project: `TinnitusReliefPro` -> `Tinnitussaurus`
- Bundle ID: `com.paulabac.tinnitusreliefpro` -> `com.paulabac.tinnitussaurus`
- Display name: "Tinnitus Relief" -> "Tinnitussaurus"
- Update `project.yml`, `Info.plist`, `capacitor.config.json`, `package.json`, `manifest.json`

### Directory Rename
- `ios/TinnitusReliefPro/` -> `ios/Tinnitussaurus/`
- All nested directories and file references updated accordingly

### Text/Copy Updates (~30 Swift files)
- All user-facing strings: "Tinnitus Relief Pro" / "Tinnitus Relief" -> "Tinnitussaurus"
- Tagline: "Tame the Ringing."
- Notification text, export labels, subscription references, onboarding copy

### App Icon
- Replace current headphone icon with dinosaur-themed icon matching the site logo

## Phase 2: Visual Polish

### Design Tokens (from tinnitussaurus.com)

**Colors:**
- Primary cyan: `#00d9ff` (dino-500) -- already in use, confirmed match
- Light cyan: `#33e1ff` (dino-400)
- Dark cyan: `#00b8d9` (dino-600)
- Accent green: `#22c55e` (jungle-500)
- Accent amber: `#f59e0b` (amber-500)
- Background darkest: `#080c18` (abyss-950)
- Background dark: `#0f172a` (abyss-900)
- Background card: `#1a1a2e` (abyss-800)
- Background hover: `#252547` (abyss-700)

**Typography:**
- Headings: Space Grotesk (400-700)
- Body: Inter (400+)

**Effects:**
- Button glow: `0 0 20px rgba(0,217,255,0.4)` on hover/press
- Card borders: `white/5` with `dino-500/20` on hover
- Rounded corners: 2xl for cards, xl for buttons

### SwiftUI Changes
- Create a `TinnitussaurusTheme` or update existing color/style definitions
- Apply Space Grotesk + Inter fonts (bundle as custom fonts)
- Add glow modifiers for primary buttons
- Update card styles with new border/hover treatment
- Ensure dark background palette matches site (`#080c18` base)

### Assets
- Dinosaur logo SVG converted to PDF vector asset for Xcode
- Updated app icon set (all required iOS sizes)
- Splash/launch screen with Tinnitussaurus branding

## Files Affected

### Config (5 files)
- `package.json`
- `manifest.json`
- `capacitor.config.json`
- `ios/*/project.yml`
- `ios/*/Info.plist`

### Swift Source (~30 files)
- `TinnitusReliefProApp.swift` (rename + references)
- `ContentView.swift`
- `OnboardingView.swift`
- `SettingsView.swift`
- `SubscriptionManager.swift`
- `NotificationManager.swift`
- `ExportManager.swift`
- `SessionManager.swift`
- All views and managers with user-facing strings

### Assets
- `Assets.xcassets` (app icon, logo, colors)
- `Fonts/` directory (Space Grotesk, Inter)

### Documentation
- `README.md`
- Other relevant markdown files

## What Stays the Same
- All core audio/therapy functionality
- Company: Paulabac, LLC
- Bundle ID prefix: `com.paulabac`
- PWA/web files (separate concern)
