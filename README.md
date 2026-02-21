# Tinnitussaurus

Notched sound therapy and frequency matching app for tinnitus relief. Available as a Progressive Web App (PWA) and a native iOS app.

## What It Does

- **Tone Matcher** — Find your tinnitus frequency using auto-detection or manual fine-tuning
- **Notched Noise Therapy** — Broadband noise with a precise notch filter at your tinnitus frequency
- **Notched Music Player** — Listen to music with a therapeutic notch filter applied
- **Session Tracking** — Track therapy duration, streaks, and progress over time
- **Relief Journal** — Log severity and notes to monitor trends
- **Multiple Profiles** — Save different frequency settings per user
- **Offline Support** — Works without internet once installed

## Platforms

### PWA (Web)

Runs in any modern browser. Installable on iPhone, Android, and desktop.

**Live:** https://effervescent-strudel-fff5cd.netlify.app

**Install on iPhone:**
1. Open the URL in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"

### iOS (Native)

Native Swift/SwiftUI app with AVAudioEngine for low-latency audio processing.

Located in `ios/Tinnitussaurus/`. Requires Xcode 15+ and iOS 17+.

```bash
open ios/Tinnitussaurus/Tinnitussaurus.xcodeproj
```

## Tech Stack

### PWA
- Vanilla JavaScript (no frameworks)
- Web Audio API
- Service Worker for offline caching
- LocalStorage for data persistence

### iOS
- Swift / SwiftUI
- AVAudioEngine & AVAudioPlayerNode
- Accelerate framework (FFT analysis)
- StoreKit 2 (subscriptions)
- SwiftData (persistence)

### Testing & CI/CD
- Vitest (65+ unit tests)
- GitHub Actions (automated testing on push)
- Netlify (automated deployment)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.x LTS
- npm (included with Node.js)

### Install & Run

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
tinnitus-relief-app/
├── index.html              # PWA entry point
├── app.js                  # Main app controller
├── styles.css              # Styles
├── sw.js                   # Service worker
├── manifest.json           # PWA manifest
├── js/
│   ├── audio-engine.js     # Web Audio tone generation & filters
│   ├── tone-matcher-ui.js  # Frequency matching UI
│   ├── frequency-sweep.js  # Auto-detection sweep
│   ├── session-manager.js  # Timer & session tracking
│   ├── dashboard-manager.js# Stats dashboard
│   ├── relief-journal.js   # Severity logging
│   ├── subscription-manager.js
│   ├── visualizer.js       # Audio visualizations
│   └── wizard-manager.js   # Onboarding flow
├── tests/                  # Unit tests
├── ios/
│   └── Tinnitussaurus/  # Native iOS app
│       ├── Core/
│       │   ├── Audio/      # AVAudioEngine, oscillators, filters
│       │   ├── Data/       # Models & repositories
│       │   └── Managers/   # Session, subscription, notifications
│       ├── Features/       # SwiftUI views (Tune, Therapy, Journal, etc.)
│       └── SharedViews/    # Reusable components
├── Documents/              # Analysis & planning docs
└── .github/workflows/      # CI/CD pipeline
```

## CI/CD

Pushes to `Dev` or `main` trigger the GitHub Actions pipeline:

1. Run all tests
2. Code quality checks
3. Deploy to Netlify (if tests pass)

Configure these GitHub secrets for deployment:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

## Important Notes

- Use headphones for best results
- Start at **low volume**
- HTTPS is required for Web Audio API (automatic with Netlify/GitHub Pages)

## License

Proprietary - Paulabac, LLC
