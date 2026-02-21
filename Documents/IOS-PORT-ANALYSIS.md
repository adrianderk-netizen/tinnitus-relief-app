# iOS Native Port Analysis: Tinnitussaurus

**Date:** February 12, 2026
**Scope:** Full feasibility analysis for porting from PWA/Capacitor to native iOS (Swift/SwiftUI)

---

## Executive Summary

Three independent analyses were conducted:
1. **Technical Porting Requirements** — What it takes to build native
2. **App Store & Business Factors** — Compliance, competition, monetization
3. **Devil's Advocate** — The case against going native

**Bottom line:** The native port is technically feasible (~10-12 engineer-weeks, ~3,150 lines of Swift across 28-35 files), but the **codebase isn't ready**, the **economics don't currently justify it**, and **Capacitor can get you 90% there in 3-4 weeks**. Fix the web app first, ship via Capacitor, validate the market, then revisit native when you have 500+ paying users.

---

## Part 1: Technical Porting Requirements

### Audio Engine (Highest Risk)

The Web Audio API must be replaced with AVAudioEngine + custom DSP. This is the hardest part of the port.

| Component | iOS Framework | Complexity | Est. Lines |
|-----------|--------------|-----------|-----------|
| Oscillator (sine/square/triangle/saw) | AVAudioSourceNode + custom DSP | MEDIUM | 150 |
| Notch filter bank (real-time updates) | Custom biquad IIR filters | **HIGH** | 250 |
| Noise generation (white/pink/brown) | AVAudioPCMBuffer synthesis | MEDIUM | 150 |
| Stereo panning + phase inversion | AVAudioMixerNode gain control | LOW | 50 |
| FFT spectrum analysis | Accelerate framework (vDSP) | MEDIUM | 80 |
| Audio session management | AVAudioSession | LOW | 30 |
| **Audio total** | | | **~710** |

**Key risks:**
- AVAudioEngine has strict threading requirements — audio callbacks can't allocate memory, use locks, or call NSLog
- Real-time notch filter coefficient updates require lock-free parameter passing
- No debugger on audio thread (halts cause stutters)
- Brown noise needs peak limiting (current web version has a spike bug too)

**Recommended approach:** AVAudioSourceNode (iOS 13+) for oscillators, custom biquad cascade for notch filters, Accelerate framework for FFT.

### UI Porting (SwiftUI)

| Screen/Component | SwiftUI Equivalent | Lines |
|---|---|---|
| Tab navigation (3 modes) | `TabView` + `.tabItem()` | 80 |
| Tone Matcher (sliders, controls, ear selector) | `Slider`, `Picker`, `DisclosureGroup` | 250 |
| Manual tuning section | Frequency/volume/waveform controls | 150 |
| Waveform visualizer | SwiftUI `Canvas` (iOS 15+) | 150 |
| Spectrum visualizer | SwiftUI `Canvas` or Metal | 120 |
| Notched Noise view | Noise type picker + notch controls | 150 |
| Notched Music view | `fileImporter` + AVAudioPlayerNode | 180 |
| Session timer + statistics | `ProgressView`, stat grid | 200 |
| Onboarding (4 slides) | `TabView(.page)` + `fullScreenCover` | 250 |
| Paywall modal | Pricing cards + RevenueCat | 150 |
| **UI total** | | **~1,610** |

### Data Layer

| Current (Web) | iOS Replacement | Complexity |
|---|---|---|
| `localStorage` (settings) | `UserDefaults` | LOW |
| `localStorage` (sessions, profiles, journal) | SwiftData (iOS 17+) or CoreData | MEDIUM |
| JSON export | `FileManager` + `Codable` | LOW |
| Migration from web data | JSON parsing into SwiftData | MEDIUM |

**Est. lines:** ~400 across models, repositories, and migration logic.

### Platform API Mapping

| Web API | iOS Replacement | Lines |
|---|---|---|
| Wake Lock API | `UIApplication.idleTimerDisabled` | 20 |
| `<input type="file">` | `.fileImporter()` | 40 |
| `navigator.vibrate()` | `UIImpactFeedbackGenerator` | 30 |
| Service Worker (offline) | Not needed (native is always "offline") | 0 |
| Push notifications (new) | `UNUserNotificationCenter` | 50 |
| Background audio (new) | `AVAudioSession(.playback)` | 30 |

### Total Native Codebase Estimate

| Category | Lines | Files |
|----------|-------|-------|
| Audio engine | 710 | 7 |
| Views (SwiftUI) | 1,610 | 15 |
| Data layer | 400 | 7 |
| Platform APIs | 230 | 5 |
| Utilities/constants | 200 | 4 |
| **Total** | **~3,150** | **~28-35** |

### Sprint Breakdown (10-12 weeks)

| Weeks | Focus | Deliverable |
|-------|-------|-------------|
| 1-2 | Audio engine foundation | Oscillators + noise generation working |
| 3-4 | Advanced audio | Notch filters + FFT + music playback |
| 5-6 | Core UI | Tone matcher + frequency controls + visualizers |
| 7-8 | Remaining UI | Noise/music views + session timer |
| 9-10 | Data + integration | SwiftData + RevenueCat + profiles |
| 11-12 | Polish + launch | Accessibility, QA, App Store submission |

---

## Part 2: App Store & Business Factors

### App Store Review — Health App Compliance

**Category:** Health & Fitness (NOT Medical — Medical requires higher scrutiny)

**Medical claims risk:** The app is in a **medium risk zone**. It doesn't diagnose or monitor, but it references "clinically-studied" therapy and implies therapeutic outcomes.

**FDA clearance:** NOT required. The app is a wellness/coping tool, not a regulated medical device.

**Required disclaimers:**
- Change "Science-Based Sound Therapy" → "Sound Therapy for Tinnitus Management"
- Soften "clinically-studied approach" → "based on published research"
- Add "This app is intended for wellness purposes only" to App Store description
- Add "Consult an audiologist or ENT specialist before use" to onboarding
- Have references to published studies ready (Okamoto et al. 2010, Pantev et al. 2012)

### 10 Must-Fix Items Before Any App Store Submission

| # | Item | Severity |
|---|------|----------|
| 1 | Fix placeholder contact emails in privacy-policy.html and terms-of-service.html | **Blocker** |
| 2 | Install `@revenuecat/purchases-capacitor` | **Blocker** |
| 3 | Replace test RevenueCat API key (`subscription-manager.js:19`) | **Blocker** |
| 4 | Soften medical language ("clinically-studied", "Science-Based") | **Blocker** |
| 5 | Add CCPA/GDPR rights to privacy policy | **Blocker** |
| 6 | Add subscription disclosure terms to App Store description | **Blocker** |
| 7 | Select "Health & Fitness" category in App Store Connect | **Blocker** |
| 8 | Add Apple Standard EULA reference to Terms of Service | High |
| 9 | Specify governing law state in ToS (line 100 says "United States" — need specific state) | High |
| 10 | Apply for Apple Small Business Program (15% commission vs 30%) | High |

### Competitive Landscape

| App | Price | Model | Key Differentiator |
|-----|-------|-------|--------------------|
| **Oto** | $14.99/mo, $89.99/yr | Premium CBT + sound | Clinical backing, NHS-endorsed |
| **Widex Zen / ReSound / Beltone** | Free | Loss leader | Tied to hearing aid hardware |
| **myNoise** | $9.99 one-time | Utility | No medical claims |
| **White Noise+** | $2.99 one-time | Utility | Generic masking |
| **Tinnitussaurus** | $7.99/mo, $59.99/yr | Freemium | Notched music + combined matching |

**Your differentiators:**
- Notched music therapy from personal library (few competitors offer this)
- Combined frequency matching + notched therapy in one app
- 47% cheaper than Oto
- Relief journal with trend visualization
- No hardware dependency

**Your weaknesses:**
- No CBT/psychological component
- No clinical validation or audiologist endorsement
- Zero brand recognition
- No HealthKit integration

### Monetization

**Revenue after Apple's cut:**

| Plan | Price | At 30% | Your Take | At 15% (Small Biz) | Your Take |
|------|-------|--------|-----------|---------------------|-----------|
| Monthly | $7.99 | -$2.40 | $5.59 | -$1.20 | $6.79 |
| Annual | $59.99 | -$18.00 | $41.99 | -$9.00 | $50.99 |

**Pricing recommendation:** Consider $9.99/mo and $49.99/yr — higher monthly creates stronger annual conversion incentive.

### Legal Gaps

- **HIPAA:** Does NOT apply (direct-to-consumer, no PHI transmitted)
- **Privacy policy:** Missing CCPA/GDPR rights, RevenueCat data specifics, placeholder contact info
- **Terms of Service:** Missing Apple EULA reference, specific governing law state, arbitration clause

### Annual Operating Costs

| Item | Cost/Year |
|------|-----------|
| Apple Developer Account | $99 |
| RevenueCat (free up to $2,500 MTR) | $0 initially |
| Domain/hosting for support pages | $50-100 |
| Legal review (one-time) | $500-2,000 |
| **Total Year 1** | **~$650-2,200** |

---

## Part 3: The Case Against Going Native (Devil's Advocate)

### 1. The Codebase Isn't Ready to Port

The recent deep analysis found:
- **6 critical bugs** (session timing broken, streak calc wrong, noise spikes, negative frequencies, race condition, canvas resize)
- **0% real test coverage** (all 99 tests use mock classes, never import actual modules)
- **Monolithic architecture** (app.js = 1,221 lines, tight coupling everywhere)

**Porting broken code to Swift doesn't fix it — it just ports the bugs.** You'd be rewriting ~3,000 lines of buggy JavaScript into ~5,000+ lines of Swift with the same architectural problems plus new iOS-specific bugs you haven't encountered yet.

### 2. Capacitor Already Gives You iOS

The app already has Capacitor configured. Web Audio API **works perfectly** in WKWebView on iOS. The app doesn't need:
- Ultra-low-latency (<20ms) processing
- Audio input capture
- Complex spatial audio (HRTF)
- Advanced effects processing

**A 300-line native Capacitor plugin** for background audio would give 90% of native benefits:

```swift
@objc func enableBackgroundAudio(_ call: CAPPluginCall) {
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.playback, mode: .default)
    try audioSession.setActive(true)
    call.resolve()
}
```

**1 week of work vs. 6 months.**

### 3. The Math Doesn't Work

**Native port cost:**
- 25-35 weeks realistic timeline (solo developer)
- ~$48,000 in labor at $100k salary
- Plus 30-40% buffer for audio debugging surprises

**Revenue projection (year 1):**
- Tinnitus relief is niche (~1M Americans actively seeking apps)
- Realistic year-1 users: 50-200
- Revenue: $2,000-8,000
- **ROI: -83% to -84% (loss)**

**Break-even requires 2,000+ subscribers.** At 0.5% conversion, that's 400,000 installs. Top 100 health apps get 100k+/month. You're starting from zero.

### 4. Audio Programming in AVAudioEngine is HARD

Web Audio API abstracts away 80% of complexity. Native requires:
- Thread-safe communication with audio engine (no locks, no memory allocation on audio thread)
- Manual sample-accurate parameter scheduling
- Audio callback runs ~44,100 times/second — one mistake = dropout
- Can't use debugger on audio thread (causes stutters)
- Can't use NSLog on audio thread (causes glitches)
- Typical debug cycle: 4-8 hours per audio bug

### 5. Business Risks

- **App Store rejection** for health claims (2-4 week delay per rejection cycle)
- **Apple's 30% cut** destroys margins on a niche app
- **Competition** from established players with clinical backing and hearing aid partnerships
- **User acquisition cost** for health apps: $15-50/user (at $41/year revenue, need 2+ year LTV to break even)
- **Most health app users churn within 3 months**

### 6. What You Should Do Instead

**Weeks 1-2:** Fix remaining bugs, polish onboarding
**Weeks 3-4:** Ship to App Store via Capacitor (it's already configured)
**Weeks 5-12:** Get real users (Reddit, tinnitus forums, Google Ads), measure retention and conversion
**Month 4-6:** Add native audio plugin if users request background audio
**Month 6+:** Only go native IF you have 500+ paying users, 70%+ monthly retention, and clear ROI

**In the same 6-month timeline, you could alternatively:**
- Ship Capacitor app to iOS AND Android (60% more market)
- Fix the web app and add clinical features
- Validate the market with real users
- Establish brand presence
- Prove traction for funding/partnerships

### 7. Conditions Under Which Native WOULD Make Sense

Go native only when ALL of these are true:
- 500+ active paying users (market validated)
- 80%+ trial-to-paid conversion
- 60%+ monthly retention
- Consistent user requests for features requiring native (real-time voice analysis, HealthKit, spatial audio)
- Revenue to fund 2-person team for 3+ months
- Willingness to maintain TWO codebases permanently

**None of these conditions are currently met.**

---

## Recommended Path Forward

### Option A: Ship Capacitor Now (Recommended)

| Timeline | Action | Cost |
|----------|--------|------|
| Week 1-2 | Fix 6 critical bugs, fix legal placeholders, soften medical language | $0 |
| Week 3 | Install RevenueCat Capacitor plugin, configure App Store Connect | $99 (dev account) |
| Week 4 | Submit to App Store + Google Play via Capacitor | $25 (Play Store) |
| Week 5-8 | Marketing: Reddit, tinnitus forums, targeted ads | $500-2,000 |
| Week 9-12 | Iterate based on user feedback | $0 |
| **Total** | | **~$624-2,124** |

### Option B: Capacitor + Native Audio Plugin

Everything in Option A, plus:

| Timeline | Action | Cost |
|----------|--------|------|
| Week 5-6 | Build native Capacitor plugin for background audio | ~$2,000 labor |
| **Total** | | **~$2,624-4,124** |

### Option C: Full Native Port (Not Recommended Now)

| Timeline | Action | Cost |
|----------|--------|------|
| Months 1-3 | Audio engine + core UI | ~$24,000 labor |
| Months 3-5 | Data layer + remaining features | ~$16,000 labor |
| Month 6 | Polish, QA, App Store submission | ~$8,000 labor |
| **Total** | | **~$48,000+** |

**Revisit Option C when you have 500+ paying users and validated market demand.**
