# Tinnitus Relief Pro - Test Cases & Acceptance Criteria

## Table of Contents
1. [PWA Installation & Offline Functionality](#1-pwa-installation--offline-functionality)
2. [Tone Matcher Feature](#2-tone-matcher-feature)
3. [Notched Noise Therapy](#3-notched-noise-therapy)
4. [Notched Music Therapy](#4-notched-music-therapy)
5. [Session Management](#5-session-management)
6. [Relief Journal](#6-relief-journal)
7. [Onboarding Experience](#7-onboarding-experience)
8. [Mobile Responsiveness](#8-mobile-responsiveness)
9. [Audio Engine](#9-audio-engine)
10. [Premium Features & Paywall](#10-premium-features--paywall)

---

## 1. PWA Installation & Offline Functionality

### Test Case 1.1: PWA Installation - iOS Safari
**Preconditions:** User has iOS device with Safari browser

**Steps:**
1. Navigate to https://effervescent-strudel-fff5cd.netlify.app
2. Tap Share button
3. Select "Add to Home Screen"
4. Tap "Add"
5. Tap the app icon on home screen

**Expected Result:**
- App installs successfully
- Icon appears on home screen with correct branding
- App opens in full-screen mode (no browser bars)
- App loads index.html without "Page not found" error

**Acceptance Criteria:**
- ✅ PWA installs on first attempt
- ✅ Icon matches app branding (headphone icon with blue theme)
- ✅ Opens in standalone mode
- ✅ No browser chrome visible
- ✅ App name displays as "Tinnitus Relief Pro"

---

### Test Case 1.2: PWA Installation - Android Chrome
**Preconditions:** User has Android device with Chrome browser

**Steps:**
1. Navigate to https://effervescent-strudel-fff5cd.netlify.app
2. Tap menu (⋮) button
3. Select "Add to Home screen" or "Install app"
4. Confirm installation
5. Tap the app icon on home screen

**Expected Result:**
- Install banner appears automatically after page load
- App installs successfully
- Opens in standalone mode
- All features functional

**Acceptance Criteria:**
- ✅ Install prompt appears within 5 seconds of page load
- ✅ Installation completes in < 10 seconds
- ✅ App opens without browser UI
- ✅ Back button functions correctly within app

---

### Test Case 1.3: Offline Functionality
**Preconditions:** PWA installed, user has accessed app at least once while online

**Steps:**
1. Open installed PWA while online
2. Navigate through all tabs (Tone Matcher, Notched Noise, Notched Music)
3. Close app
4. Enable airplane mode
5. Open PWA again
6. Try to use basic features

**Expected Result:**
- App loads from cache
- UI displays correctly
- Audio generation works (tone matcher)
- Session timer functions
- Local storage data persists

**Acceptance Criteria:**
- ✅ App loads in < 3 seconds offline
- ✅ All cached pages accessible
- ✅ Audio engine generates tones offline
- ✅ Previously matched frequencies display
- ✅ Session history accessible
- ⚠️ Network-dependent features show appropriate "offline" message

---

## 2. Tone Matcher Feature

### Test Case 2.1: Basic Frequency Matching
**Preconditions:** App is open, user on "Tone Matcher" tab

**Steps:**
1. Click "Start Tone" button
2. Verify audio plays in both ears
3. Adjust Left Ear frequency slider from 4000 Hz to 8000 Hz
4. Adjust volume slider
5. Select different waveform (Sine → Square)
6. Click "Stop Tone"

**Expected Result:**
- Audio starts immediately on button click
- Frequency changes reflected in real-time
- Volume adjusts smoothly
- Waveform change audible
- Audio stops cleanly on stop

**Acceptance Criteria:**
- ✅ Audio latency < 100ms on start
- ✅ Frequency range: 200 Hz - 15000 Hz
- ✅ Frequency adjusts in real-time without clicking/popping
- ✅ Volume range: 0% - 100% (master volume enforced)
- ✅ Waveforms available: Sine, Square, Triangle, Sawtooth
- ✅ No audio artifacts when stopping

---

### Test Case 2.2: Mark Tinnitus Frequency
**Preconditions:** Tone is playing at specific frequency

**Steps:**
1. Adjust Left Ear to 6500 Hz
2. Click "Mark as Tinnitus Frequency" for Left Ear
3. Adjust Right Ear to 7200 Hz
4. Click "Mark as Tinnitus Frequency" for Right Ear
5. Scroll to "Your Tinnitus Frequencies" section
6. Verify frequencies saved

**Expected Result:**
- Button provides visual feedback on click
- Frequency saved to localStorage
- "Your Tinnitus Frequencies" displays correct values
- Values persist after page refresh

**Acceptance Criteria:**
- ✅ Marked frequency displayed immediately
- ✅ Visual confirmation shown (toast/notification)
- ✅ Frequencies stored separately for each ear
- ✅ Data persists across sessions
- ✅ Frequencies display with 2 decimal precision (e.g., 6500.00 Hz)

---

### Test Case 2.3: Fine Tune Adjustment
**Preconditions:** Tone playing at any frequency

**Steps:**
1. Set frequency to 5000 Hz using slider
2. Use Fine Tune slider (±10 Hz)
3. Adjust to +5 Hz
4. Verify displayed frequency shows 5005 Hz
5. Adjust to -8 Hz
6. Verify displayed frequency shows 4992 Hz

**Expected Result:**
- Fine tune allows precise ±10 Hz adjustment
- Display updates in real-time
- Audio frequency changes accordingly

**Acceptance Criteria:**
- ✅ Fine tune range: -10 Hz to +10 Hz
- ✅ Increments: 0.1 Hz steps
- ✅ Total frequency = base frequency + fine tune
- ✅ Fine tune resets when base frequency changes

---

### Test Case 2.4: Phase Inversion
**Preconditions:** Tone playing in both ears

**Steps:**
1. Start tone at 6000 Hz both ears
2. Click "Toggle Phase Inversion" for Left Ear
3. Observe phase indicator changes to "Inverted"
4. Listen for phase cancellation effect
5. Click toggle again
6. Verify returns to "Normal"

**Expected Result:**
- Phase indicator updates immediately
- Audible change in sound (phase difference)
- Button visual state changes (color/text)
- Phase persists when frequency changes

**Acceptance Criteria:**
- ✅ Phase indicator displays "Normal" or "Inverted"
- ✅ Visual feedback on button (color change)
- ✅ Phase inversion applies correctly to waveform
- ✅ Can invert left, right, or both independently

---

### Test Case 2.5: Common Frequency Presets
**Preconditions:** On Tone Matcher tab

**Steps:**
1. Click "1000 Hz" preset button
2. Verify both ears set to 1000 Hz
3. Click "6000 Hz" preset
4. Verify both ears update to 6000 Hz
5. Manually adjust Left to 5500 Hz
6. Click "4000 Hz" preset
7. Verify both ears reset to 4000 Hz

**Expected Result:**
- Preset applies to both ears simultaneously
- Audio updates smoothly
- Any manual adjustments overridden

**Acceptance Criteria:**
- ✅ Presets available: 1000, 2000, 4000, 6000, 8000 Hz
- ✅ Applies to both ears
- ✅ Visual feedback on selected preset
- ✅ Transition is smooth without audio glitches

---

## 3. Notched Noise Therapy

### Test Case 3.1: White/Pink Noise Generation
**Preconditions:** User has marked tinnitus frequency, on "Notched Noise" tab

**Steps:**
1. Navigate to "Notched Noise" tab
2. Verify tinnitus frequency pre-populated (e.g., 6500 Hz)
3. Select "White Noise" as noise type
4. Set notch width to 1 octave
5. Click "Start Therapy"
6. Listen for notched white noise

**Expected Result:**
- Notch automatically centers on tinnitus frequency
- Notch width adjustable (0.5, 1, 2 octaves)
- Audio clearly has frequency gap at tinnitus frequency
- Visualizer shows notch in spectrum

**Acceptance Criteria:**
- ✅ Noise types: White, Pink, Brown
- ✅ Notch widths: 0.5, 1, 2 octaves
- ✅ Notch centered on marked frequency ± 50 Hz accuracy
- ✅ Spectrum analyzer displays notch visually
- ✅ Audio quality: no clipping, clean noise

---

### Test Case 3.2: Notch Configuration
**Preconditions:** Therapy session active

**Steps:**
1. Start notched noise at 5000 Hz, 1 octave notch
2. Change notch width to 0.5 octave while playing
3. Observe audio and visualizer update
4. Change center frequency to 6000 Hz
5. Verify notch moves to new frequency

**Expected Result:**
- Real-time updates to notch parameters
- Smooth transitions without clicking
- Visualizer updates immediately

**Acceptance Criteria:**
- ✅ Notch width changes applied in < 200ms
- ✅ Frequency changes smooth
- ✅ No audio artifacts during parameter changes
- ✅ Visualizer matches audio output

---

## 4. Notched Music Therapy

### Test Case 4.1: Music Upload
**Preconditions:** User on "Notched Music" tab

**Steps:**
1. Click "Upload Music" button
2. Select MP3 file (< 20MB)
3. Verify file name displays
4. File loads successfully
5. Click play
6. Verify music plays with notch applied

**Expected Result:**
- File picker opens
- Supported formats: MP3, WAV, OGG, M4A
- File loads within reasonable time (< 5s for 10MB)
- Music plays with notch filter applied

**Acceptance Criteria:**
- ✅ Supports: MP3, WAV, OGG, M4A formats
- ✅ Max file size: 50MB
- ✅ File name displayed after upload
- ✅ Progress indicator during load
- ✅ Error message for unsupported formats
- ✅ Notch filter applies to uploaded music

---

### Test Case 4.2: Music Playback Controls
**Preconditions:** Music file uploaded and loaded

**Steps:**
1. Click play button
2. Music plays
3. Click pause button
4. Music pauses
5. Drag progress bar to 50%
6. Verify playback resumes at new position
7. Adjust volume
8. Click stop

**Expected Result:**
- Standard playback controls function
- Progress bar updates in real-time
- Seeking works accurately
- Volume independent of master volume

**Acceptance Criteria:**
- ✅ Play/Pause toggle button
- ✅ Stop button resets to beginning
- ✅ Progress bar shows current time / total time
- ✅ Seeking accurate within 1 second
- ✅ Volume slider: 0-100%
- ✅ Current time displays as MM:SS

---

## 5. Session Management

### Test Case 5.1: Session Timer
**Preconditions:** User on any therapy tab

**Steps:**
1. Select "1 hour" from timer dropdown
2. Click "Start" button
3. Verify timer counts down from 60:00
4. Observe progress bar fills
5. Click "Pause"
6. Verify timer pauses
7. Click "Start" again
8. Timer resumes
9. Click "Stop"
10. Timer resets to selected duration

**Expected Result:**
- Timer counts down accurately
- Progress bar visually represents time remaining
- Pause/resume functions correctly
- Stats update (Today, This Week, etc.)

**Acceptance Criteria:**
- ✅ Timer durations: 15 min, 30 min, 1 hour, 2 hours, Custom
- ✅ Countdown accurate within 1 second
- ✅ Progress bar updates every second
- ✅ Pause preserves exact time
- ✅ Stop resets to selected duration
- ✅ Session time logged to stats after completion

---

### Test Case 5.2: Session Statistics
**Preconditions:** User has completed multiple sessions

**Steps:**
1. Complete a 30-minute session
2. Observe "Today" stat increments by 30 minutes
3. Check "This Week" stat
4. Complete another session next day
5. Verify "Streak" increments
6. Skip a day
7. Verify streak resets to 0

**Expected Result:**
- Stats update immediately after session
- All time tracking accumulates
- Streak tracks consecutive days

**Acceptance Criteria:**
- ✅ Today: Shows minutes for current day (resets at midnight)
- ✅ This Week: Shows weekly total (resets Monday)
- ✅ Streak: Consecutive days with at least 1 session
- ✅ All Time: Total minutes across all sessions
- ✅ Stats persist in localStorage
- ✅ Display format: hours:minutes (e.g., 5:30)

---

## 6. Relief Journal

### Test Case 6.1: Daily Check-In Prompt
**Preconditions:** User hasn't checked in today

**Steps:**
1. Open app (or after 5 minutes of use)
2. Daily check-in modal appears
3. Select severity level (1-10 scale)
4. Add notes (optional)
5. Select quick tags (e.g., "Good Sleep", "Stressed")
6. Click "Save Check-In"

**Expected Result:**
- Modal appears automatically if not checked in
- Severity selection required before save enabled
- Notes and tags optional
- Confirmation shown after save

**Acceptance Criteria:**
- ✅ Modal appears once per day only
- ✅ Severity scale: 1 (Minimal) to 10 (Severe)
- ✅ Severity required, notes/tags optional
- ✅ Quick tags: Good Sleep, Poor Sleep, Stressed, Relaxed, Loud Day, Quiet Day
- ✅ "Skip for today" option available
- ✅ Check-in saved with timestamp

---

### Test Case 6.2: Journal Chart Visualization
**Preconditions:** User has multiple journal entries

**Steps:**
1. Navigate to Journal section
2. Observe chart displays last 30 days
3. Verify data points for each entry
4. Check trend indicator (Improving/Stable/Worsening)
5. Verify average severity calculation

**Expected Result:**
- Chart plots severity over time
- Line graph with data points
- Trend analysis shown
- Average calculation correct

**Acceptance Criteria:**
- ✅ Chart displays last 30 days
- ✅ X-axis: Dates, Y-axis: Severity (1-10)
- ✅ Data points connected with line
- ✅ Trend indicator based on first vs last 7-day average
- ✅ Average severity displays to 1 decimal place
- ✅ Chart updates immediately after new entry

---

### Test Case 6.3: Journal Export
**Preconditions:** User has journal entries

**Steps:**
1. Click "Export Report" button
2. Verify download initiates
3. Open downloaded .txt file
4. Verify all entries included with:
   - Date/time
   - Severity
   - Notes
   - Tags
   - Summary statistics

**Expected Result:**
- Text file downloads successfully
- All data formatted clearly
- Includes summary stats at top

**Acceptance Criteria:**
- ✅ File format: Plain text (.txt)
- ✅ File name includes date: `tinnitus-journal-YYYY-MM-DD.txt`
- ✅ Includes summary: average, min, max severity
- ✅ Each entry clearly separated
- ✅ All entry data included
- ✅ Human-readable format

---

## 7. Onboarding Experience

### Test Case 7.1: First-Time User Onboarding
**Preconditions:** Fresh install or localStorage cleared

**Steps:**
1. Open app for first time
2. Onboarding modal appears
3. Read Slide 1: Welcome + Theory
4. Click "Next"
5. View Slide 2: Visual guide
6. Click "Next"
7. View Slide 3: Daily therapy guide
8. Click "Next"
9. View Slide 4: Premium trial offer
10. Click "Start Free Trial" or "Continue with Free"

**Expected Result:**
- Modal appears on first load only
- 4 slides with clear information
- Skip option available
- Dismisses after completion

**Acceptance Criteria:**
- ✅ Shows only on first visit (localStorage flag)
- ✅ 4 slides with progress dots
- ✅ "Skip" button always visible
- ✅ "Previous" and "Next" navigation
- ✅ Slide 4 has "Start Trial" or "Continue Free"
- ✅ Modal dismisses after completion or skip
- ✅ Sets localStorage: `tinnitusOnboardingComplete: true`

---

### Test Case 7.2: Wizard Tutorial
**Preconditions:** User completed onboarding, hasn't completed wizard

**Steps:**
1. Wizard banner appears at top of dashboard
2. Complete Step 1: Find tinnitus frequency
3. Progress updates to 33%
4. Complete Step 2: Start therapy session
5. Progress updates to 66%
6. Complete Step 3: Daily check-in
7. Progress updates to 100%
8. Celebration modal appears

**Expected Result:**
- Banner guides user through first tasks
- Progress updates after each step
- Celebration shown on completion
- Banner dismissible

**Acceptance Criteria:**
- ✅ Banner appears until wizard complete
- ✅ 3 steps tracked
- ✅ Progress bar visual indicator
- ✅ "Skip" button available
- ✅ Celebration modal with confetti animation
- ✅ Sets localStorage: `tinnitusWizardComplete: true`

---

## 8. Mobile Responsiveness

### Test Case 8.1: Mobile Layout - Portrait
**Preconditions:** Device in portrait orientation (width < 768px)

**Steps:**
1. Open app on mobile device
2. Verify dashboard displays correctly
3. Check quick actions in 2-column grid
4. Verify frequency display shows left/right side-by-side
5. Test all interactive elements (buttons, sliders)
6. Verify no horizontal scrolling

**Expected Result:**
- Layout adapts to mobile width
- All text readable
- Buttons properly sized (min 44x44px)
- No content cut off

**Acceptance Criteria:**
- ✅ No horizontal scrolling
- ✅ Quick actions: 2-column grid
- ✅ Frequency display: 2-column grid
- ✅ Touch targets minimum 44x44px
- ✅ Text minimum 16px (prevents iOS zoom on input)
- ✅ All content within safe area (iOS notch/home indicator)

---

### Test Case 8.2: Mobile Layout - Landscape
**Preconditions:** Device in landscape orientation

**Steps:**
1. Rotate device to landscape
2. Verify layout adjusts
3. Check that controls remain accessible
4. Test slider functionality

**Expected Result:**
- Layout responds to landscape
- Content doesn't overflow
- All features usable

**Acceptance Criteria:**
- ✅ Layout adjusts for landscape
- ✅ No content hidden behind browser chrome
- ✅ Sliders remain usable
- ✅ Modals centered and sized appropriately

---

### Test Case 8.3: iOS Safe Area
**Preconditions:** iOS device with notch (iPhone X and newer)

**Steps:**
1. Open PWA in standalone mode
2. Verify content doesn't overlap with:
   - Status bar/notch area
   - Home indicator at bottom
3. Test on various iOS devices

**Expected Result:**
- Content within safe areas
- Proper padding applied

**Acceptance Criteria:**
- ✅ Uses `env(safe-area-inset-*)` CSS variables
- ✅ No content behind notch
- ✅ No content behind home indicator
- ✅ Proper padding on left/right edges

---

## 9. Audio Engine

### Test Case 9.1: Audio Context Initialization
**Preconditions:** App freshly loaded

**Steps:**
1. Navigate to Tone Matcher
2. Click "Start Tone" for first time
3. Verify audio plays (may require user interaction on mobile)
4. Stop and restart
5. Verify audio continues to work

**Expected Result:**
- Audio context initializes on first user interaction
- Subsequent starts work immediately
- No errors in console

**Acceptance Criteria:**
- ✅ Audio context created on first interaction
- ✅ Sample rate: 44100 Hz or device default
- ✅ No console errors
- ✅ Works on iOS Safari (requires user interaction)
- ✅ Works on Chrome/Firefox desktop
- ✅ Audio context not suspended

---

### Test Case 9.2: Stereo Channel Separation
**Preconditions:** Headphones connected, tone playing

**Steps:**
1. Start tone with Left: 1000 Hz, Right: 2000 Hz
2. Put on headphones
3. Verify left ear hears 1000 Hz only
4. Verify right ear hears 2000 Hz only
5. Swap Left to 3000 Hz
6. Verify left ear now hears 3000 Hz

**Expected Result:**
- Complete stereo separation
- No crosstalk between channels
- Independent control of each ear

**Acceptance Criteria:**
- ✅ Left and right channels fully independent
- ✅ No audio leakage between channels
- ✅ Stereo panning accurate
- ✅ Works with all waveforms

---

### Test Case 9.3: Master Volume Control
**Preconditions:** Audio playing

**Steps:**
1. Set master volume to 50%
2. Set Left ear volume to 100%
3. Verify actual output is 50% (master × ear)
4. Set master to 25%
5. Verify output reduces to 25%
6. Set master to 0%
7. Verify audio muted

**Expected Result:**
- Master volume acts as ceiling
- Individual volumes multiply with master
- 0% master = complete silence

**Acceptance Criteria:**
- ✅ Master volume range: 0-100%
- ✅ Actual volume = master × ear volume
- ✅ 0% master mutes all audio
- ✅ Volume changes smooth (no clicking)
- ✅ Warning banner shows for high volumes

---

### Test Case 9.4: Waveform Generation
**Preconditions:** Tone Matcher active

**Steps:**
1. Set frequency to 440 Hz (A4 note)
2. Select "Sine" waveform - verify pure tone
3. Select "Square" waveform - verify harsh, buzzy sound
4. Select "Triangle" waveform - verify softer than square
5. Select "Sawtooth" waveform - verify bright, rich harmonics

**Expected Result:**
- Each waveform has distinct tonal character
- Smooth transitions between waveforms
- Frequency remains constant during change

**Acceptance Criteria:**
- ✅ Sine: Pure tone, no harmonics
- ✅ Square: Rich odd harmonics (1st, 3rd, 5th...)
- ✅ Triangle: Softer odd harmonics
- ✅ Sawtooth: All harmonics (1st, 2nd, 3rd...)
- ✅ Waveform changes without audio glitches
- ✅ No clicking or popping during transitions

---

## 10. Premium Features & Paywall

### Test Case 10.1: Free Trial Activation
**Preconditions:** New user, never activated trial

**Steps:**
1. Click on "Notched Noise" tab (premium feature)
2. Paywall modal appears
3. Click "Start 7-Day Free Trial"
4. Verify trial activates
5. Access all premium features
6. Check subscription status shows "7 days remaining"

**Expected Result:**
- Trial activates immediately
- All premium features unlocked
- Countdown shows days remaining
- localStorage tracks trial start date

**Acceptance Criteria:**
- ✅ Trial length: 7 days
- ✅ No payment required for trial
- ✅ All premium features accessible
- ✅ Trial status displayed on dashboard
- ✅ localStorage: `premiumTrialStart` with date
- ✅ localStorage: `premiumStatus: trial`

---

### Test Case 10.2: Paywall Display for Premium Features
**Preconditions:** User hasn't activated trial or subscription

**Steps:**
1. Click "Notched Noise" tab
2. Verify paywall modal appears
3. Check modal displays:
   - Premium benefits list
   - Pricing options (Weekly/Monthly/Yearly)
   - "Start Free Trial" button
   - "Continue with Free" option
4. Click "Continue with Free"
5. Modal dismisses, returns to free features

**Expected Result:**
- Paywall prevents access to premium tabs
- Clear pricing information
- Option to continue free

**Acceptance Criteria:**
- ✅ Paywall shows for: Notched Noise, Notched Music tabs
- ✅ Pricing displayed: $2.99/week, $9.99/month, $99.99/year
- ✅ Benefits list shows 6+ premium features
- ✅ "Best Value" badge on yearly plan
- ✅ "Continue Free" option available
- ✅ Paywall dismissible

---

### Test Case 10.3: Trial Expiration
**Preconditions:** Trial was activated 7+ days ago

**Steps:**
1. Open app after 7 days
2. Attempt to access premium feature
3. Verify paywall appears
4. Check message indicates "Trial Expired"
5. Subscription options shown

**Expected Result:**
- Premium features locked
- Clear message about trial expiration
- Upgrade options presented

**Acceptance Criteria:**
- ✅ Trial expires exactly 7 days after activation
- ✅ Premium tabs locked after expiration
- ✅ "Trial Expired" message displayed
- ✅ Subscription options presented
- ✅ Free features still accessible

---

## Cross-Cutting Acceptance Criteria

### Performance
- ✅ Initial page load: < 3 seconds (4G connection)
- ✅ PWA install size: < 5 MB
- ✅ Audio latency: < 100ms
- ✅ UI interactions respond within 100ms
- ✅ Battery efficient (< 5% per hour of use)

### Accessibility
- ✅ All interactive elements keyboard accessible
- ✅ Focus indicators visible
- ✅ Color contrast ratio ≥ 4.5:1 for text
- ✅ Touch targets minimum 44x44px
- ✅ Form inputs have labels
- ✅ Error messages clear and actionable

### Security & Privacy
- ✅ All data stored locally (no server transmission)
- ✅ localStorage used appropriately
- ✅ No sensitive data logged to console in production
- ✅ HTTPS only (enforced by Netlify)
- ✅ No third-party tracking scripts

### Browser Compatibility
- ✅ iOS Safari 14+
- ✅ Chrome Mobile 90+
- ✅ Chrome Desktop 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ⚠️ Samsung Internet (best effort)

### Data Persistence
- ✅ Tinnitus frequencies persist across sessions
- ✅ Session history persists
- ✅ Journal entries persist
- ✅ Premium/trial status persists
- ✅ Settings persist
- ✅ Clear data option available

---

## Priority Testing Matrix

| Feature | Priority | Devices | Browsers |
|---------|----------|---------|----------|
| PWA Install | P0 | iOS, Android | Safari, Chrome |
| Tone Matcher | P0 | All | All |
| Frequency Marking | P0 | All | All |
| Session Timer | P1 | All | All |
| Offline Mode | P1 | All | All |
| Notched Noise | P1 | All | All |
| Journal | P2 | Mobile Primary | All |
| Notched Music | P2 | All | All |
| Onboarding | P2 | All | All |
| Premium/Paywall | P2 | All | All |

**Priority Levels:**
- **P0:** Critical - App unusable if fails
- **P1:** High - Major feature impacted
- **P2:** Medium - Feature degraded but workarounds exist
- **P3:** Low - Minor cosmetic or edge cases

---

## Test Environment Setup

### Required Devices
- iPhone 12 or newer (iOS 15+)
- Android device (Android 10+)
- Desktop browser (Chrome/Firefox)

### Required Hardware
- Quality headphones/earbuds for audio testing
- Internet connection for initial load
- Airplane mode capability for offline testing

### Test Data Setup
1. Fresh install (localStorage cleared)
2. Returning user (with saved frequencies)
3. Active trial user
4. Expired trial user
5. User with journal history

---

## Bug Severity Definitions

### Critical (P0)
- App crashes or won't load
- Audio completely non-functional
- Data loss occurs
- PWA won't install

### High (P1)
- Major feature broken (e.g., session timer doesn't work)
- Audio has major artifacts
- UI elements overlap/unusable
- Premium features accessible when shouldn't be

### Medium (P2)
- Minor feature issues
- Cosmetic UI problems
- Performance degradation
- Inconsistent behavior

### Low (P3)
- Typos
- Minor visual glitches
- Edge case failures
- Enhancement requests

---

**Document Version:** 1.0  
**Last Updated:** February 3, 2026  
**Status:** Ready for QA Testing
