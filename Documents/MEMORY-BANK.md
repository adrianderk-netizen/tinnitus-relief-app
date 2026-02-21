# Tinnitussaurus - Memory Bank
## Project Context & State Documentation

**Last Updated:** February 4, 2026  
**Status:** ✅ Production - Live on Netlify  
**Version:** 1.0.1

---

## 🎯 Project Overview

**Name:** Tinnitussaurus
**Type:** Progressive Web App (PWA)  
**Purpose:** Notched Sound Therapy & Frequency Matching for Tinnitus Relief  
**Target Users:** Individuals suffering from tinnitus  
**Platform:** Web-based PWA (iOS, Android, Desktop)

### Core Value Proposition
Provide accessible, evidence-based sound therapy for tinnitus management through:
- Frequency matching to identify tinnitus pitch
- Notched noise therapy (removes user's tinnitus frequency from white/pink noise)
- Session tracking and progress monitoring
- Relief journaling for symptom tracking

---

## 🌐 Deployment Information

### Production URL
**Live Site:** https://effervescent-strudel-fff5cd.netlify.app

### Deployment Platform
- **Host:** Netlify
- **Method:** Continuous deployment from GitHub
- **Branch:** Dev (auto-deploys on push)
- **HTTPS:** Enabled automatically by Netlify
- **Custom Domain:** Not configured (using Netlify subdomain)

### Repository
- **GitHub:** https://github.com/adrianderk-netizen/tinnitus-relief-app.git
- **Active Branch:** Dev
- **Latest Commit:** faaa715 (Visualizer fix - Known Issue #1)

### Recent Deployment Fixes (Critical)
**Issue:** PWA showed "Page not found" when installed on mobile home screen

**Root Cause:** Manifest and service worker configured for GitHub Pages paths (`/tinnitus-relief-app/`) instead of Netlify root paths (`/`)

**Solution Applied:**
1. **Commit faae79b:** Fixed `manifest.json` - Changed `start_url` and `scope` from `/tinnitus-relief-app/` to `/`
2. **Commit d8813b7:** Fixed `sw.js` - Changed `BASE_PATH` from `/tinnitus-relief-app` to empty string, updated cache name to v4
3. **Result:** PWA now installs and launches correctly on iOS and Android

---

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Audio:** Web Audio API
- **Storage:** localStorage (client-side only)
- **PWA:** Service Worker, Web App Manifest
- **Hosting:** Netlify (static site)
- **Version Control:** Git/GitHub

### No Backend
- Completely client-side application
- All data stored locally in browser
- No server API or database
- Privacy-focused: no data transmission

---

## 📁 Project Structure

```
tinnitus-relief-app/
├── index.html              # Main entry point
├── app.js                  # Core app initialization
├── styles.css             # Complete styling (single file)
├── manifest.json          # PWA manifest (paths: /)
├── sw.js                  # Service worker (cache: v5)
├── capacitor.config.json  # Capacitor config (for native builds)
├── README.md              # Project documentation
├── ImprovementPlan.md     # Feature roadmap
├── ONBOARDING-IMPLEMENTATION-GUIDE.md
├── TEST-CASES-AND-ACCEPTANCE-CRITERIA.md
├── MEMORY-BANK.md         # This file
│
├── js/
│   ├── audio-engine.js           # Core audio generation
│   ├── visualizer.js             # Waveform visualization
│   ├── session-manager.js        # Timer & progress tracking
│   ├── dashboard-manager.js      # Dashboard UI
│   ├── frequency-sweep.js        # Guided frequency matching
│   ├── relief-journal.js         # Daily check-ins & journaling
│   ├── subscription-manager.js   # Premium/trial management
│   └── wizard-manager.js         # Onboarding wizard
│
├── icons/                        # PWA icons (16px to 512px)
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-167x167.png
│   ├── icon-180x180.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
│
└── Documents/
    └── Issue Log.docx            # Known issues tracking
```

---

## 🎨 Key Features & Implementation Status

### ✅ Implemented Features

#### 1. Tone Matcher (Free)
- **Purpose:** Find user's tinnitus frequency
- **Status:** Fully functional
- **Components:**
  - Dual oscillators (left/right ear independent)
  - Frequency range: 200-15000 Hz
  - Waveforms: Sine, Square, Triangle, Sawtooth
  - Fine-tune: ±10 Hz precision
  - Phase inversion toggle
  - Volume control per ear
  - Common frequency presets (1000, 2000, 4000, 6000, 8000 Hz)
  - "Mark as Tinnitus Frequency" saves to localStorage
  - Waveform visualizers (canvas-based)

#### 2. Session Management (Free)
- **Purpose:** Track therapy time
- **Status:** Fully functional
- **Features:**
  - Timer durations: 15 min, 30 min, 1 hour, 2 hours, Custom
  - Play/Pause/Stop controls
  - Progress bar with countdown
  - Statistics tracking:
    - Today (minutes)
    - This Week (minutes)
    - Streak (consecutive days)
    - All Time (total minutes)
  - Stats persist in localStorage

#### 3. Relief Journal (Free)
- **Purpose:** Track symptom severity over time
- **Status:** Fully functional
- **Features:**
  - Daily check-in modal (auto-appears once per day)
  - Severity scale: 1-10
  - Optional notes and quick tags
  - Chart visualization (last 30 days)
  - Trend analysis (improving/stable/worsening)
  - Average severity calculation
  - Export to .txt file
  - All data in localStorage

#### 4. Notched Noise Therapy (Premium)
- **Purpose:** Play noise with tinnitus frequency removed
- **Status:** Implemented (behind paywall)
- **Features:**
  - Noise types: White, Pink, Brown
  - Notch widths: 0.5, 1, 2 octaves
  - Auto-centers on marked frequency
  - Spectrum analyzer visualization
  - Real-time parameter adjustment

#### 5. Notched Music Therapy (Premium)
- **Purpose:** Apply notch filter to user's music
- **Status:** Implemented (behind paywall)
- **Features:**
  - Upload music files (MP3, WAV, OGG, M4A)
  - Standard playback controls
  - Progress bar with seeking
  - Notch filter applied to music
  - Volume control

#### 6. Onboarding & Tutorial
- **Purpose:** Guide new users
- **Status:** Fully functional
- **Components:**
  - 4-slide onboarding modal (shows once)
  - Wizard banner with progress (3 steps)
  - Celebration modal on completion
  - localStorage flags: `tinnitusOnboardingComplete`, `tinnitusWizardComplete`

#### 7. Premium/Subscription System
- **Purpose:** Monetization
- **Status:** Frontend UI complete (no payment integration)
- **Features:**
  - 7-day free trial
  - Paywall modals for premium features
  - Subscription status display
  - Trial countdown
  - Pricing: $2.99/week, $9.99/month, $99.99/year
  - localStorage tracking: `premiumStatus`, `premiumTrialStart`

#### 8. PWA Capabilities
- **Status:** Fully functional
- **Features:**
  - Installable on iOS/Android/Desktop
  - Offline support (service worker v4)
  - Standalone mode (no browser UI)
  - App icons for all sizes
  - HTTPS required (provided by Netlify)

---

## 🎨 UI/UX Design

### Design System
- **Color Scheme:**
  - Primary: #00d9ff (cyan/blue)
  - Background gradient: #1a1a2e → #16213e → #0f3460
  - Success: #00cc66
  - Warning: #ffc107
  - Danger: #ff4444

- **Typography:**
  - Font: 'Segoe UI', sans-serif
  - Responsive sizing (mobile-first)

- **Layout:**
  - Max width: 1200px
  - Mobile breakpoint: 768px
  - Tab-based navigation
  - Modal overlays for popups

### Recent Mobile UX Fixes (January 25, 2026)
**Commits 55cda1b & c59b84c:**

1. **Fixed horizontal scrolling:**
   - Added `overflow-x: hidden` to body and container
   - Added `width: 100%` to prevent overflow

2. **Optimized layouts for mobile:**
   - Quick actions: 2-column grid (was auto-fit)
   - Frequency display: 2-column grid side-by-side
   - Vertical icon/text layout for compact buttons

3. **Hidden profiles section:**
   - `display: none !important` on all profile elements
   - Feature not needed for current version

### iOS Specific
- Safe area insets for notch/home indicator
- Prevents zoom on input focus (font-size: 16px)
- Touch targets minimum 44x44px
- Standalone display mode

---

## 💾 Data Storage Architecture

### localStorage Keys

#### User Preferences
```javascript
'tinnitusLeftFreq'          // Left ear frequency (Hz)
'tinnitusRightFreq'         // Right ear frequency (Hz)
'masterVolume'              // Master volume (0-1)
'leftVolume'                // Left ear volume (0-1)
'rightVolume'               // Right ear volume (0-1)
```

#### Session Data
```javascript
'tinnitusSessionHistory'    // Array of session objects
'tinnitusStats'             // Aggregated statistics
```

#### Journal Data
```javascript
'tinnitusJournalEntries'    // Array of journal entry objects
'tinnitusLastCheckIn'       // Date string of last check-in
```

#### Premium/Trial
```javascript
'premiumStatus'             // 'trial', 'subscribed', or 'free'
'premiumTrialStart'         // Date string of trial start
'premiumSubscriptionEnd'    // Date string of subscription end
```

#### Onboarding
```javascript
'tinnitusOnboardingComplete' // Boolean
'tinnitusWizardComplete'     // Boolean
```

### Data Structure Examples

**Journal Entry:**
```javascript
{
  date: "2026-02-03T14:30:00.000Z",
  severity: 7,
  notes: "Worse after loud concert yesterday",
  tags: ["bad-sleep", "stressed", "loud-environment"]
}
```

**Session Object:**
```javascript
{
  date: "2026-02-03",
  duration: 1800, // seconds
  type: "tone-matcher" // or "notched-noise", "notched-music"
}
```

---

## 🐛 Known Issues

### Current Issues
1. **Wave visualizers not showing:** JavaScript error "Cannot read properties of null (reading 'addEventListener')"
   - Impact: Waveform canvases appear black
   - Workaround: Audio still functions correctly
   - Priority: P2 (Medium)
   - Location: Likely in visualizer.js or audio-engine.js

2. **Daily check-in duplication:** May appear multiple times
   - Impact: Users see check-in modal repeatedly
   - Priority: P2 (Medium)
   - Needs investigation in relief-journal.js

3. **Journal "New Entry" button timing:** Button may not respond on first click
   - Impact: User needs to click twice sometimes
   - Cause: Event binding timing issue
   - Priority: P2 (Medium)

### Resolved Issues
- ✅ PWA "Page not found" error (Fixed: commits faae79b, d8813b7)
- ✅ Horizontal scrolling on mobile (Fixed: commit 55cda1b)
- ✅ Profiles section visibility (Fixed: commit 55cda1b)

---

## 🔑 Important Technical Details

### Service Worker Cache Strategy
- **Cache Name:** `tinnitus-relief-v5`
- **Strategy:** Cache first, falling back to network
- **Cached Resources:**
  - All HTML, CSS, JS files
  - All app icons
  - manifest.json
  
- **Cache Updates:**
  - Change `CACHE_NAME` constant in sw.js
  - Service worker automatically deletes old caches
  - Uses `skipWaiting()` for immediate updates

### Audio Engine Details
- **Audio Context:** Created on first user interaction (iOS requirement)
- **Sample Rate:** 44100 Hz (or device default)
- **Channels:** Stereo (separate left/right)
- **Master Volume:** Multiplies with individual ear volumes
- **Oscillator Types:** OscillatorNode with 4 waveform types

### Mobile Responsiveness
- **Breakpoint:** 768px
- **Touch targets:** Minimum 44x44px
- **Font size:** Minimum 16px (prevents iOS zoom)
- **Grid layouts:** Adapt to 1-column on mobile
- **Safe areas:** iOS notch/home indicator respected

---

## 🚀 Recent Development History

### February 4, 2026 (PM)
- **Commit faaa715:** Fixed visualizer initialization and cache issue (Known Issue #1)
  - **Problem:** Visualizers not displaying after cache clear
  - **Root Cause:** Stale service worker cache (v4) + canvas initialization timing
  - **Solution:**
    - Updated service worker cache from v4 → v5
    - Improved canvas initialization with `requestAnimationFrame` wrapper
    - Added canvas element verification before initialization
    - Added automatic retry logic if elements not ready
    - Fixed profile indicator null reference (changed `innerHTML` to `textContent`)
  - **Impact:** Visualizers should now load properly after cache clears
  - **Files Modified:** `sw.js`, `app.js`

### February 3, 2026
- **Commit 680ecce:** Added comprehensive test cases documentation
  - 29 test cases across 10 categories
  - Acceptance criteria for all features
  - Priority matrix and bug severity definitions

### February 2, 2026 (PM)
- **Commit faae79b:** Fixed manifest.json paths for Netlify
  - Changed start_url and scope from `/tinnitus-relief-app/` to `/`
  
- **Commit d8813b7:** Fixed service worker BASE_PATH
  - Changed BASE_PATH from `/tinnitus-relief-app` to empty string
  - Updated cache version to v4
  - Fixed all cached resource paths

- **Commit ef14561:** Removed temporary file
  - Cleaned up Documents/~$sue Log.docx

### January 25, 2026
- **Commit 55cda1b:** Fixed critical mobile UX issues
  - Prevented horizontal scrolling
  - Hidden profiles section completely
  
- **Commit c59b84c:** Optimized mobile UX layouts
  - 2-column grids for dashboard and frequency display
  - Vertical button layouts for better mobile space usage

### Earlier Commits
- **Commit 034bb12:** Finalized styles.css after onboarding pass
- Multiple commits for onboarding implementation
- Initial PWA setup and core features

---

## 📊 Project Metrics

### Code Statistics (Approximate)
- **Total Lines:** ~8,000+ lines
- **HTML:** ~500 lines (index.html)
- **CSS:** ~2,000+ lines (styles.css - single file)
- **JavaScript:** ~4,500+ lines (app.js + 8 module files)
- **Documentation:** ~1,500+ lines (4 markdown files)

### File Sizes
- **index.html:** ~15 KB
- **styles.css:** ~60 KB
- **app.js:** ~30 KB
- **js/ modules:** ~100 KB total
- **icons/:** ~150 KB total
- **Total PWA size:** < 500 KB (very lightweight)

### Performance Targets
- Initial load: < 3 seconds (4G)
- Audio latency: < 100ms
- UI response: < 100ms
- Battery usage: < 5% per hour

---

## 🔐 Security & Privacy

### Data Privacy
- **Zero server communication:** All processing happens client-side
- **No analytics:** No Google Analytics or tracking scripts
- **No third-party APIs:** Self-contained application
- **Local storage only:** Data never leaves user's device
- **HTTPS enforced:** Netlify provides SSL automatically

### Security Considerations
- Content Security Policy: Not currently configured (consider adding)
- No user authentication: Not needed for MVP
- No sensitive data: Only frequency preferences and journal entries
- localStorage limitations: Data can be cleared by user

---

## 🎯 Business Model

### Freemium Structure
**Free Tier:**
- Tone Matcher (frequency finding)
- Session timer
- Relief Journal
- Basic progress tracking

**Premium Tier ($2.99/week, $9.99/month, $99.99/year):**
- Notched Noise Therapy
- Notched Music Therapy
- Advanced analytics (future)
- Cloud backup (future)

**Trial:**
- 7-day free trial of premium features
- No payment required to start trial
- localStorage-based (no backend)

### Monetization Status
- **Payment Integration:** NOT YET IMPLEMENTED
- **Current State:** UI/paywall complete, but no actual payment processing
- **Next Steps Required:**
  - Integrate Stripe or similar payment processor
  - Implement subscription management backend
  - Add receipt validation
  - Implement auto-renewal logic

---

## 📱 Platform Support

### Tested & Working
- ✅ iOS 15+ Safari (iPhone)
- ✅ Chrome Mobile (Android)
- ✅ Chrome Desktop (Windows/Mac)
- ✅ Edge Desktop (Windows)

### Should Work (Not Extensively Tested)
- Firefox Mobile
- Firefox Desktop
- Samsung Internet Browser
- macOS Safari

### Known Limitations
- iOS requires user interaction before audio plays (Web Audio API requirement)
- Older browsers without Web Audio API support won't work
- Service worker requires HTTPS (Netlify provides this)

---

## 🛠️ Development Workflow

### Current Setup
- **IDE:** Visual Studio Code
- **Git Branch:** Dev (working branch)
- **Deployment:** Push to Dev → Auto-deploy to Netlify
- **Testing:** Manual testing on physical devices

### Deployment Process
1. Make code changes locally
2. Test in browser (local file or local server)
3. Commit to Git: `git add . && git commit -m "message"`
4. Push to GitHub: `git push origin Dev`
5. Netlify auto-deploys (30-60 seconds)
6. Test on live URL: https://effervescent-strudel-fff5cd.netlify.app

### Branch Strategy
- **Dev:** Active development and production (current)
- **Main:** Not actively used
- **Feature branches:** Can be created for major features

---

## 📈 Next Steps & Roadmap

### Immediate Priorities (P0)
1. **Fix visualizer.js addEventListener error**
   - Debug null reference issue
   - Ensure wave visualizers display
   
2. **Fix journal "New Entry" button timing**
   - Investigate event binding order
   - Ensure button responds on first click

3. **Fix daily check-in duplication**
   - Review date comparison logic
   - Test across midnight boundary

### Short-Term (P1)
1. **Payment Integration**
   - Choose payment provider (Stripe recommended)
   - Implement subscription backend
   - Add receipt validation
   
2. **Enhanced Audio Features**
   - More notch filter options
   - Custom noise profiles
   - Binaural beats option

3. **Analytics Dashboard**
   - Extended progress tracking
   - Correlation analysis (sleep, stress vs. severity)
   - Export to PDF reports

### Medium-Term (P2)
1. **Cloud Sync**
   - Optional backend for data backup
   - Cross-device synchronization
   - Account system

2. **Native Apps**
   - Use Capacitor to build iOS/Android apps
   - Submit to App Store / Play Store
   - Push notifications for reminders

3. **Community Features**
   - Success stories
   - Forum integration
   - Connect with audiologists

### Long-Term (P3)
1. **AI-Powered Insights**
   - Pattern detection in journal data
   - Personalized therapy recommendations
   
2. **Wearable Integration**
   - Sleep tracking correlation
   - Stress level monitoring

3. **Telemedicine Integration**
   - Connect with healthcare providers
   - Share progress reports
   - Virtual consultations

---

## 📝 Important Configuration Files

### manifest.json
```json
{
  "name": "Tinnitussaurus",
  "short_name": "Tinnitussaurus",
  "start_url": "/",           // Critical: Must be "/" for Netlify
  "scope": "/",               // Critical: Must be "/" for Netlify
  "display": "standalone",
  "background_color": "#0a1929",
  "theme_color": "#00d4ff"
}
```

### sw.js (Key Constants)
```javascript
const CACHE_NAME = 'tinnitus-relief-v4';  // Increment when cache needs update
const BASE_PATH = '';                      // Empty for Netlify root deployment
```

### capacitor.config.json
```json
{
  "appId": "com.tinnitusrelief.app",
  "appName": "Tinnitussaurus",
  "webDir": ".",
  "bundledWebRuntime": false
}
```

---

## 🧪 Testing Resources

### Test Documentation
- **File:** TEST-CASES-AND-ACCEPTANCE-CRITERIA.md
- **Test Cases:** 29 detailed test scenarios
- **Coverage:** All major features
- **Priority Matrix:** P0-P3 classification

### Test Environments Needed
1. **iPhone 12+ (iOS 15+)** - Primary mobile target
2. **Android device (10+)** - Secondary mobile target
3. **Chrome Desktop** - Primary desktop
4. **Quality headphones** - For audio testing

### Test Data Setup
1. Fresh install (localStorage cleared)
2. Returning user with saved frequencies
3. Active trial user
4. Expired trial user
5. User with 30+ days of journal entries

---

## 💡 Key Design Decisions

### Why Vanilla JavaScript?
- Faster load times (no framework overhead)
- Simpler maintenance
- Better for PWA performance
- No build process needed

### Why Single CSS File?
- Easier maintenance for small team
- Faster initial load (one HTTP request)
- Better caching strategy
- CSS is already organized with comments

### Why localStorage?
- Privacy-first approach (no server needed)
- Instant read/write (no network latency)
- Works offline by default
- Simple implementation
- Suitable for MVP scale

### Why No Backend (Yet)?
- Faster MVP development
- Lower operational costs
- Simpler deployment
- Privacy benefits
- Can add later if needed

### Why Netlify?
- Free tier sufficient
- Auto-deployment from GitHub
- HTTPS included
- Fast global CDN
- Simple configuration

---

## 🔄 Git Commit History (Recent)

```
680ecce - Add comprehensive test cases and acceptance criteria documentation
d8813b7 - Fix service worker BASE_PATH for Netlify deployment
faae79b - Fix PWA manifest paths for Netlify deployment
ef14561 - Remove temp file
c59b84c - Optimize mobile UX: 2-column layouts for dashboard and frequency display
55cda1b - Fix critical mobile UX issues: prevent horizontal scroll and hide profiles section
034bb12 - Fix and finalize styles.css after onboarding pass
```

---

## 📞 Support & Resources

### Key Documentation Files
1. **README.md** - Project overview & setup
2. **ImprovementPlan.md** - Feature roadmap
3. **ONBOARDING-IMPLEMENTATION-GUIDE.md** - Onboarding specs
4. **TEST-CASES-AND-ACCEPTANCE-CRITERIA.md** - QA documentation
5. **MEMORY-BANK.md** - This file (project state)

### External Resources
- **Web Audio API Docs:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **PWA Docs:** https://web.dev/progressive-web-apps/
- **Netlify Docs:** https://docs.netlify.com/
- **Tinnitus Research:** American Tinnitus Association

### Contact & Team
- **Developer:** Carlo
- **Repository Owner:** adrianderk-netizen
- **Working Directory:** `c:\Users\carlo\Documents\Vibe-Projects\tinnitus-relief-app`

---

## 🎓 Lessons Learned

### Technical
1. **PWA Path Configuration:** Always check manifest.json and service worker paths match hosting environment
2. **Mobile Testing:** Test on actual devices early - simulators miss real issues
3. **Audio Context:** iOS requires user interaction before audio plays - design accordingly
4. **Service Worker Caching:** Change cache version when updating SW to force updates

### Design
1. **Mobile-First:** Designing for mobile first prevents painful refactors later
2. **Touch Targets:** 44x44px minimum prevents user frustration
3. **Safe Areas:** iOS notch/home indicator must be accounted for
4. **No Horizontal Scroll:** Users hate horizontal scrolling - prevent at all costs

### Process
1. **Git Commits:** Smaller, focused commits are easier to debug and revert
2. **Documentation:** Write docs while context is fresh, not later
3. **Test Cases:** Formal test documentation catches edge cases
4. **Netlify Auto-Deploy:** Saves time but requires discipline (Dev branch = production)

---

## ⚙️ Environment Variables & Secrets

### Current Status
- **No environment variables needed** (static site)
- **No API keys** (no external services)
- **No secrets** (no authentication)

### Future Needs (When Payment Added)
- Stripe publishable key
- Stripe secret key (backend)
- Webhook signing secret

---

## 🔮 Future Considerations

### Scalability
- Current localStorage limit: ~5-10 MB per domain
- Journal entries could eventually hit this limit
- Solution: Implement data export/import or cloud backup

### Accessibility
- Add ARIA labels for screen readers
- Keyboard navigation for all features
- High contrast mode
- Audio alerts for visual feedback

### Internationalization
- Currently English only
- Consider Spanish, Mandarin, German translations
- RTL language support
- Localized audio prompts

### Performance Monitoring
- Consider adding lightweight analytics (privacy-respecting)
- Error tracking (Sentry or similar)
- Performance monitoring (Core Web Vitals)
- User feedback mechanism

---

## 📋 Maintenance Checklist

### Weekly
- [ ] Check Netlify deployment status
- [ ] Review any new GitHub issues
- [ ] Test PWA installation on latest iOS/Android
- [ ] Monitor browser console for errors

### Monthly
- [ ] Update dependencies (if using any)
- [ ] Review and triage bug backlog
- [ ] Test on new browser versions
- [ ] Backup localStorage data format documentation

### Quarterly
- [ ] Security audit
- [ ] Performance audit
- [ ] User feedback review
- [ ] Feature roadmap review
- [ ] Competitor analysis

### Annually
- [ ] Major version planning
- [ ] Technology stack review
- [ ] Design refresh consideration
- [ ] Business model evaluation

---

## 🎯 Success Metrics (To Implement)

### User Engagement
- Daily active users
- Average session duration
- Sessions per user per week
- Journal entry frequency

### Feature Usage
- % using Tone Matcher
- % marking frequencies
- % starting therapy sessions
- % completing daily check-ins

### Conversion
- Free trial activation rate
- Trial to paid conversion rate
- Subscription renewal rate
- Churn rate

### Technical
- PWA installation rate
- Crash/error rate
- Page load time (P75, P95)
- Offline usage rate

---

## 📖 Glossary

### Tinnitus-Specific Terms
- **Tinnitus:** Perception of sound when no external sound exists (ringing in ears)
- **Notched Sound Therapy:** Removing the tinnitus frequency from background noise
- **Frequency Matching:** Finding the specific frequency of user's tinnitus
- **Octave:** Musical interval where frequency doubles (e.g., 1000Hz to 2000Hz)
- **White Noise:** Equal energy across all frequencies
- **Pink Noise:** Equal energy per octave (sounds more balanced to human ear)

### Technical Terms
- **PWA:** Progressive Web App - web app that can be installed like native app
- **Service Worker:** Background script that enables offline functionality
- **Web Audio API:** Browser API for generating and processing audio
- **localStorage:** Browser storage mechanism for persistent data
- **Manifest:** JSON file defining PWA metadata and behavior

### Audio Terms
- **Oscillator:** Audio generator that produces waveforms
- **Waveform:** Shape of audio signal (Sine, Square, Triangle, Sawtooth)
- **Frequency:** Pitch of sound, measured in Hertz (Hz)
- **Phase:** Timing offset of a waveform
- **Stereo:** Two-channel audio (left and right)

---

## 🚨 Emergency Procedures

### Site Down
1. Check Netlify status: https://www.netlifystatus.com/
2. Check GitHub status: https://www.githubstatus.com/
3. Review latest deployment logs in Netlify
4. Rollback to previous deployment if needed
5. Check DNS if using custom domain

### Data Loss Reports
1. Educate user about localStorage limitations
2. Explain browser clear data impact
3. Provide data export instructions for future
4. Consider implementing cloud backup

### Critical Bug
1. Assess severity using P0-P3 definitions
2. If P0: Rollback deployment immediately
3. Create hotfix branch
4. Test fix thoroughly
5. Deploy and monitor

### Security Incident
1. Take site offline if needed
2. Assess scope of issue
3. Patch vulnerability
4. Test extensively
5. Notify users if data impacted (unlikely given local-only storage)

---

**END OF MEMORY BANK**

---

*This document should be updated whenever:*
- Major features are added
- Architecture changes
- Deployment configuration changes
- Critical bugs are fixed
- Team members change
- Business model evolves

*Last Updated By: AI Assistant*  
*Next Review: March 3, 2026*
