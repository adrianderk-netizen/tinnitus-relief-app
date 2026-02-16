# iOS Port Implementation Plan: Tinnitus Relief Pro

**Date:** February 12, 2026
**Scope:** Full native iOS rewrite (Swift/SwiftUI) from existing PWA/Capacitor app

---

## Context

Porting the existing PWA/Capacitor tinnitus relief app to a native iOS app (Swift/SwiftUI). The current app has 9 JS modules, 1,221-line monolithic controller, and 645-line HTML with dark theme UI. This plan covers the full native rewrite with improved architecture, fixing the 6 critical bugs from the codebase analysis along the way.

---

## UI Design Direction

### Aesthetic: "Clinical Noir" — Medical precision meets dark luxury

**Tone:** Refined, trust-inspiring, therapeutic — NOT generic health-app green. Think high-end audio equipment meets clinical instrument. Dark, atmospheric, with precise cyan instrumentation accents.

**Typography:**
- Display: **SF Pro Display** (weight: Bold/Heavy) for headers
- Body: **SF Pro Rounded** for controls and labels — softer, more approachable
- Mono: **SF Mono** for frequency values, timers — reinforces precision

**Color System:**
```
bg-primary:     #0A0E1A (near-black with blue undertone)
bg-card:        #111827 (elevated surface)
bg-card-hover:  #1F2937 (interactive surface)
accent-cyan:    #00D9FF (primary brand — frequency indicators, active states)
accent-cyan-dim: rgba(0, 217, 255, 0.15) (backgrounds, glows)
accent-green:   #10B981 (start/play, success states)
accent-red:     #EF4444 (stop, destructive)
accent-purple:  #8B5CF6 (mark/pin frequency)
accent-amber:   #F59E0B (warnings, phase inversion)
text-primary:   #F9FAFB
text-secondary: #9CA3AF
text-muted:     #6B7280
```

**Key Design Decisions:**
1. **Bottom tab bar** (iOS native) instead of top tabs — thumb-reachable
2. **Large frequency display** as hero element — the number IS the interface
3. **Haptic-coupled sliders** — frequency changes trigger subtle haptics
4. **Glassmorphism cards** — frosted glass effect (`.ultraThinMaterial`)
5. **Animated waveform** as ambient background, not boxed in canvas
6. **Circular progress** for session timer (Apple Fitness rings style)
7. **Pull-to-refresh** on journal/stats views
8. **Sheet-based modals** (iOS native) for onboarding, paywall, journal entry

### Screen Map (7 screens + 3 modals)

**Tab Bar (4 tabs):**
1. **Tune** — Tone matcher with frequency sweep, manual controls, waveform viz
2. **Therapy** — Notched noise + notched music in a unified view
3. **Session** — Timer with circular progress, quick start, daily streak
4. **Journal** — Relief journal entries, severity chart, export

**Modals:**
5. **Onboarding** (fullScreenCover, 4 pages via TabView)
6. **Paywall** (sheet, 0.85 detent)
7. **Settings** (NavigationStack push)

---

## Implementation Plan

### Phase 1: Project Setup & Audio Engine (Week 1-2)

**1.1 Xcode Project Setup**
- Create new SwiftUI project: `TinnitusReliefPro`
- Bundle ID: `com.paulabac.tinnitusreliefpro`
- Minimum iOS: 16.0
- Add packages: RevenueCat SDK
- Configure audio background mode in Info.plist
- Set up SwiftData model container

**1.2 Audio Engine (highest risk — do first)**

| File | Purpose | Lines |
|------|---------|-------|
| `AudioEngineManager.swift` | Main audio controller, @Observable | 300 |
| `OscillatorNode.swift` | Custom DSP via AVAudioSourceNode | 150 |
| `NotchFilterBank.swift` | Biquad IIR cascade with lock-free param updates | 250 |
| `NoiseGenerator.swift` | White/pink/brown via AVAudioPCMBuffer | 150 |
| `FrequencyAnalyzer.swift` | FFT via Accelerate vDSP | 80 |
| `AudioSessionConfig.swift` | AVAudioSession setup, background audio | 30 |

**Critical fixes built into native version:**
- Brown noise: add `min(max(sample, -1), 1)` peak limiting (fixes Bug #3)
- Notch filter: clamp `lowerFreq` to `max(20, lowerFreq)` (fixes Bug #4)
- Use `@MainActor` + `await` for all init (fixes Bug #5 race condition)

### Phase 2: Core UI — Tune Tab (Week 3-4)

**2.1 Navigation Shell**

| File | Purpose |
|------|---------|
| `TinnitusReliefProApp.swift` | App entry, SwiftData container, environment |
| `ContentView.swift` | TabView with 4 tabs |
| `Theme.swift` | Color/font constants |

**2.2 Tune Tab (most complex view)**

| File | Purpose |
|------|---------|
| `TuneView.swift` | Main tune tab with sections |
| `FrequencyHeroView.swift` | Large animated frequency display |
| `AutoTuningSection.swift` | Frequency sweep with "That's My Tinnitus!" |
| `ManualTuningSection.swift` | Sliders, ear selector, waveform picker |
| `WaveformCanvas.swift` | SwiftUI Canvas waveform visualizer |
| `EarSelectorView.swift` | Segmented both/left/right |
| `FrequencyPresetsView.swift` | Common frequency quick-select |
| `AdvancedOptionsView.swift` | Fine tune, phase inversion, per-ear enable |

### Phase 3: Therapy Tab + Spectrum Viz (Week 5-6)

| File | Purpose |
|------|---------|
| `TherapyView.swift` | Unified noise + music view |
| `NotchedNoiseSection.swift` | Noise type picker, notch controls |
| `NotchedMusicSection.swift` | File picker, player, seek bar |
| `SpectrumCanvas.swift` | FFT spectrum with notch overlay |
| `NotchControlsView.swift` | Shared notch freq/width/depth controls |

### Phase 4: Session Tab + Data Layer (Week 7-8)

| File | Purpose |
|------|---------|
| `SessionView.swift` | Timer + stats |
| `CircularTimerView.swift` | Apple Fitness-style ring timer |
| `SessionStatsGrid.swift` | Today/week/streak/all-time |
| `QuickStartButton.swift` | "Start 30-min session" hero button |
| `Models/TinnitusSession.swift` | SwiftData @Model |
| `Models/UserProfile.swift` | SwiftData @Model |
| `Models/JournalEntry.swift` | SwiftData @Model |
| `Repositories/SessionRepository.swift` | CRUD + stats queries |
| `Repositories/ProfileRepository.swift` | Profile management |
| `Repositories/JournalRepository.swift` | Journal CRUD + trends |
| `Managers/AppSettings.swift` | UserDefaults wrapper |

**Critical fixes built in:**
- Pause/resume: track `totalPauseDuration` separately (fixes Bug #1)
- Streak: use `Calendar.startOfDay(for:)` properly (fixes Bug #2)

### Phase 5: Journal Tab + Modals (Week 9-10)

| File | Purpose |
|------|---------|
| `JournalView.swift` | Entry list + chart |
| `SeverityChartView.swift` | Swift Charts trend line |
| `JournalEntryRow.swift` | Single entry display |
| `CheckInSheet.swift` | Daily severity input modal |
| `ExportManager.swift` | PDF/text report generation |
| `OnboardingView.swift` | 4-page TabView(.page) |
| `OnboardingSlide.swift` | Reusable slide template |
| `PaywallView.swift` | Pricing cards, feature list |
| `PricingCardView.swift` | Monthly/annual card component |
| `SubscriptionManager.swift` | RevenueCat integration |

### Phase 6: Polish + Launch (Week 11-12)

- Background audio, wake lock, haptic feedback, local notifications
- VoiceOver labels, Dynamic Type, Reduced Motion
- App Store prep: soften medical language, privacy policy, screenshots
- Health & Fitness category, Small Business Program (15% commission)

---

## File Structure

```
TinnitusReliefPro/
├── TinnitusReliefProApp.swift
├── ContentView.swift
├── Theme.swift
├── Audio/
│   ├── AudioEngineManager.swift
│   ├── OscillatorNode.swift
│   ├── NotchFilterBank.swift
│   ├── NoiseGenerator.swift
│   ├── FrequencyAnalyzer.swift
│   └── AudioSessionConfig.swift
├── Views/
│   ├── Tune/
│   │   ├── TuneView.swift
│   │   ├── FrequencyHeroView.swift
│   │   ├── AutoTuningSection.swift
│   │   ├── ManualTuningSection.swift
│   │   ├── EarSelectorView.swift
│   │   ├── FrequencyPresetsView.swift
│   │   └── AdvancedOptionsView.swift
│   ├── Therapy/
│   │   ├── TherapyView.swift
│   │   ├── NotchedNoiseSection.swift
│   │   ├── NotchedMusicSection.swift
│   │   └── NotchControlsView.swift
│   ├── Session/
│   │   ├── SessionView.swift
│   │   ├── CircularTimerView.swift
│   │   ├── SessionStatsGrid.swift
│   │   └── QuickStartButton.swift
│   ├── Journal/
│   │   ├── JournalView.swift
│   │   ├── SeverityChartView.swift
│   │   ├── JournalEntryRow.swift
│   │   ├── CheckInSheet.swift
│   │   └── ExportManager.swift
│   ├── Onboarding/
│   │   ├── OnboardingView.swift
│   │   └── OnboardingSlide.swift
│   ├── Paywall/
│   │   ├── PaywallView.swift
│   │   └── PricingCardView.swift
│   └── Components/
│       ├── WaveformCanvas.swift
│       └── SpectrumCanvas.swift
├── Data/
│   ├── Models/
│   │   ├── TinnitusSession.swift
│   │   ├── UserProfile.swift
│   │   └── JournalEntry.swift
│   ├── Repositories/
│   │   ├── SessionRepository.swift
│   │   ├── ProfileRepository.swift
│   │   └── JournalRepository.swift
│   └── AppSettings.swift
├── Managers/
│   ├── SessionManager.swift
│   ├── SubscriptionManager.swift
│   ├── HapticManager.swift
│   └── NotificationManager.swift
└── Tests/
    ├── AudioEngineTests.swift
    ├── SessionManagerTests.swift
    ├── DataLayerTests.swift
    └── SubscriptionTests.swift
```

**Total: ~40 Swift files, ~4,000 lines**
