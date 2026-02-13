# 🎧 Tinnitus Relief Pro

A Progressive Web App (PWA) for tinnitus relief using notched sound therapy and frequency matching.

## Features

- **Tone Matcher**: Find your tinnitus frequency with precise controls
- **Notched Noise Therapy**: Broadband noise with a notch at your tinnitus frequency
- **Notched Music Player**: Listen to music with a notch filter applied
- **Session Tracking**: Track your therapy progress over time
- **Multiple Profiles**: Save different settings for different users
- **Works Offline**: Once installed, works without internet

## Installation on iPhone

1. Open the app URL in Safari
2. Tap the Share button (📤) at the bottom of the screen
3. Scroll down and tap "Add to Home Screen"
4. Name your app and tap "Add"
5. The app icon will appear on your home screen!

## Deploy to GitHub Pages

### Quick Setup:

1. **Create a GitHub repository** at https://github.com/new
   - Name it `tinnitus-relief-app` (or any name you prefer)
   - Keep it public for free GitHub Pages hosting
   - Don't initialize with README (we already have files)

2. **Push to GitHub** (run these commands in the app folder):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/tinnitus-relief-app.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repo → Settings → Pages
   - Under "Source", select "Deploy from a branch"
   - Select "main" branch and "/ (root)" folder
   - Click Save
   - Your app will be live at: `https://YOUR_USERNAME.github.io/tinnitus-relief-app/`

## Generate App Icons

Open `generate-icons.html` in a browser and click "Download All Icons" to generate the PWA icons. Save them to the `icons/` folder.

## Tech Stack

- Pure JavaScript (no frameworks)
- Web Audio API for audio generation
- Service Worker for offline support
- LocalStorage for data persistence

## Important Notes

- Use headphones for best results
- Start at LOW volume
- Web Audio API requires HTTPS (automatic with GitHub Pages)

## License

MIT License - Free to use and modify
