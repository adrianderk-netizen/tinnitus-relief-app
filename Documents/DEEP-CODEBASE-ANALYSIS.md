# Deep Codebase Analysis: Tinnitus Relief Pro

**Date:** February 12, 2026
**Scope:** Full codebase audit — architecture, all JS modules, tests, styles, documentation

---

## Architecture Overview

- **Type:** Single-Page App (PWA + Capacitor for iOS/Android)
- **Entry:** `index.html` (645 lines) → sequential script loading → `app.js` (1,221 lines)
- **Modules:** 9 JS files in `js/`, no ES6 module imports (global namespace)
- **Styling:** Single `styles.css` (2000+ lines)
- **Storage:** All client-side via localStorage (privacy-first, no server)
- **Deployment:** GitHub Actions → Netlify (dev + prod branches)
- **Testing:** Vitest + happy-dom, 3 test files

### Module Dependency Graph

```
index.html (main entry)
├── styles.css
├── js/audio-engine.js         (90 lines - Web Audio API wrapper)
├── js/visualizer.js           (300+ lines - spectrum & waveform canvas)
├── js/session-manager.js      (92 lines - session tracking + Wake Lock)
├── js/subscription-manager.js (400+ lines - RevenueCat integration)
├── js/wizard-manager.js       (300+ lines - onboarding wizard)
├── js/frequency-sweep.js      (500+ lines - auto-frequency detection)
├── js/relief-journal.js       (300+ lines - daily check-in tracking)
├── js/dashboard-manager.js    (150+ lines - hero dashboard UI)
├── js/tone-matcher-ui.js      (400+ lines - unified tone controls)
├── app.js                     (1,221 lines - TinnitusReliefApp controller)
├── sw.js                      (99 lines - service worker, cache v11)
└── manifest.json              (70 lines - PWA manifest)
```

### Data Persistence (localStorage Keys)

| Key | Contents |
|-----|----------|
| `tinnitusSessionHistory` | Session records array |
| `tinnitusProfiles` | User profiles object |
| `tinnitusLastSession` | Last session state for restore |
| `tinnitusLastProfile` | Last active profile name |
| `tinnitusOnboardingComplete` | First-time user flag |
| `tinnitusWizardComplete` | Setup wizard flag |
| `tinnitusJournalEntries` | Daily check-in entries |
| `tinnitusLastCheckIn` | Date of last check-in |
| `mockSubscriptionState` | Mock trial/premium state (browser) |

---

## Critical Bugs Found

### 1. Session pause/resume is broken (`js/session-manager.js`)
- Resume sets `startTime = Date.now() - this.pausedTime` but doesn't account for cumulative pause duration
- `stop()` calculates duration as `Date.now() - this.startTime`, which includes all pause time
- **Impact:** Session durations are inaccurate

### 2. Streak calculation midnight boundary bug (`js/session-manager.js`)
- Session spanning midnight (11:59 PM → 12:01 AM) incorrectly counts as 2-day streak
- No timezone handling

### 3. Brown noise volume spikes (`js/audio-engine.js`)
- `d[i] *= 3.5` multiplication with no peak limiting — can produce unexpected loud spikes

### 4. Notch filter negative frequencies (`js/audio-engine.js`)
- With low `centerFreq` and octave-based width, `lowerFreq` can go negative, causing audio artifacts

### 5. Subscription init race condition (`app.js:70`)
- `subscriptionManager.init()` is async but not awaited — UI renders before subscription state is known

### 6. Canvas visualizers break on resize (`js/visualizer.js`)
- No `resize` event listener — canvases don't redraw on window resize or device rotation
- No HiDPI/pixel ratio detection — looks blurry on Retina displays

---

## Tests Are Not Testing Real Code

**This is the single biggest quality gap in the project.**

All 3 test files create **local mock classes** instead of importing actual modules:

```js
// session-manager.test.js line 10 — defines MockSessionManager class
// Never imports from js/session-manager.js

// audio-engine.test.js line 8 — "Mock AudioEngine since we can't import ES6 modules directly"
// Tests the mock AudioContext from setup.js, not actual audio-engine.js

// subscription-manager.test.js line 9 — defines MockSubscriptionManager class
// Never imports from js/subscription-manager.js
```

**Impact:**
- 99 test cases exist, but **real code coverage is ~0%**
- Coverage thresholds (70% lines) are configured but meaningless
- Documentation claims "65 tests" with coverage targets — misleading
- 6 of 9 JS modules have **zero test files** at all

**Untested modules:** `dashboard-manager.js`, `frequency-sweep.js`, `relief-journal.js`, `tone-matcher-ui.js`, `visualizer.js`, `wizard-manager.js`

---

## Security Issues

| Issue | Location | Severity |
|-------|----------|----------|
| RevenueCat API key hardcoded in client JS | `subscription-manager.js:19` | HIGH |
| No input validation before localStorage writes | Multiple modules | MEDIUM |
| innerHTML used with potentially unsanitized data | `dashboard-manager.js` | MEDIUM |
| No Content Security Policy headers | `index.html` | LOW |
| localStorage unbounded — no quota checks | All modules | LOW |

---

## Architectural Problems

### No Module System
- All classes attached to `window` (global namespace pollution)
- `package.json` declares `"type": "module"` but doesn't actually use ES6 imports
- Scripts loaded sequentially without `defer`/`async` (render-blocking)
- No build system — no bundling, minification, or tree-shaking

### Monolithic app.js (1,221 lines)
- Main controller handles: tone control, noise control, music control, profiles, sessions, onboarding, subscription events, auto-save/restore
- `autoSaveState()` and `autoRestoreState()` have nearly identical structure — violates DRY
- Complex profile load/save logic with 3 different branches
- 66 lines of feature gating logic that should be extracted

### Tight Coupling
- `ToneMatcherUI` directly calls `this.app.startTone()`
- `WizardManager` directly calls `app.switchMode()`
- `DashboardManager` accesses `app.journalManager`
- `FrequencySweepManager` uses callback to update `app.matchedFrequencies`
- Changes to `app.js` interface would break multiple managers

### Multiple Sources of Truth
- Matched frequencies stored in: `app.matchedFrequencies`, `toneMatcherUI` settings, AND `frequencySweep` matched array
- Session history in: `sessionManager.history`, profile-specific history, AND app state
- Subscription status in: `subscriptionManager`, UI elements, AND feature flags

---

## Performance Concerns

| Issue | Impact |
|-------|--------|
| No debouncing on slider events (frequency, volume, notch) | Excessive DOM updates per second |
| Canvas visualizers render every frame with no rate limiting | Battery drain on mobile |
| `autoSaveState()` writes localStorage on every control change | I/O bottleneck |
| Sequential script loading blocks page render | Slower initial load |
| `renderChart()` rebuilds entire chart on every journal entry | Slow with many entries |
| `updateAllVolumes()` called on master volume change even with no audio | Unnecessary processing |
| No batching of localStorage operations | Multiple writes per interaction |

---

## CSS Analysis

### Strengths
- Mobile-first responsive design with proper breakpoints (768px, 375px)
- iOS safe area insets (`env(safe-area-inset-*)`)
- PWA standalone mode handling
- Consistent color system (cyan `#00d9ff`, dark gradient background)
- BEM-like naming approach (`.btn-start`, `.ear-panel`, `.left-ear`)

### Issues

| Issue | Details |
|-------|---------|
| `!important` overrides | `.profiles-section { display: none !important; }` — specificity problems |
| Missing focus/focus-visible states | Keyboard navigation broken for range inputs |
| No high-contrast mode support | Accessibility gap |
| Color-only indicators | Confidence meter uses red/orange/green with no text alternative |
| Single 2000+ line file | No modularity or component separation |
| Heavy emoji usage without alt text | Screen readers can't interpret them |
| No ARIA labels on interactive elements | Accessibility gap |
| Color contrast borderline | `.subtitle` at `#a0a0a0` is WCAG AA but borderline |

---

## Documentation vs Reality

| Claim | Reality |
|-------|---------|
| "70% test coverage" | ~0% real coverage (tests use mocks) |
| "65 unit tests" | 99 tests but test mock classes, not real modules |
| MEMORY-BANK says cache v4 | Actually v11 (7 versions undocumented) |
| "Fully functional" tone matcher | CRITICAL-FIXES.md documents visualizer bugs |
| "Implemented" premium features | No payment backend exists |
| TBD coverage metrics | 6+ months without being filled in |

---

## Module-by-Module Quality Ratings

| Module | Lines | Quality | Risk | Key Issues |
|--------|-------|---------|------|------------|
| `audio-engine.js` | 90 | Good | Medium | Clean API; noise spike bug, negative freq bug, no cleanup methods |
| `session-manager.js` | 92 | Medium | **High** | Pause/resume broken, streak calc wrong, dead `pausedTime` code |
| `subscription-manager.js` | 400+ | Good | Medium | Well-structured; API key exposed, Capacitor check can throw |
| `dashboard-manager.js` | 150+ | Medium | Medium | Heavy emoji, accessibility gaps, random tip repetition |
| `frequency-sweep.js` | 500+ | Medium | Medium | Linear sweep (should be log), resume-from-pause time discontinuity |
| `relief-journal.js` | 300+ | Medium | Medium | Chart edge cases, no notes max length, memory leak in export |
| `tone-matcher-ui.js` | 400+ | Medium | Medium | Stop/start hack for param updates, no debouncing, no validation |
| `visualizer.js` | 300+ | Medium | Medium | No resize handler, no HiDPI, continuous animation without throttling |
| `wizard-manager.js` | 300+ | Medium | Low | Hardcoded step counts, tight coupling, 3s auto-advance arbitrary |
| `app.js` | 1,221 | Medium | **High** | Monolithic, race conditions, DRY violations, magic string selectors |

---

## Recommended Priority Fixes

### P0 — Critical
1. Fix session pause/resume elapsed time calculation
2. Fix streak calculation midnight boundary bug
3. Add peak limiting to brown noise generation
4. Await subscription manager init before rendering UI

### P1 — High
5. Rewrite tests to import and test actual modules (not mocks)
6. Add tests for the 6 untested modules
7. Move RevenueCat API key to environment variable / backend
8. Add canvas resize handling
9. Add input validation before localStorage writes

### P2 — Medium
10. Add debouncing to slider events
11. Split `app.js` into smaller controllers
12. Use logarithmic frequency sweep instead of linear
13. Add focus states and ARIA labels for accessibility
14. Guard against negative notch filter frequencies

### P3 — Low
15. Split `styles.css` into component files
16. Add Content Security Policy headers
17. Add localStorage quota checks
18. Update documentation to match actual state
19. Add `defer` to script tags for faster initial load
