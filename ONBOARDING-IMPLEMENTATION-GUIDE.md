# Tinnitus Relief Pro - Onboarding Implementation Guide

## 📋 Overview

This guide documents the enhanced onboarding experience and subscription system implemented for Tinnitus Relief Pro.

---

## ✨ What Changed

### 1. **Enhanced Onboarding (4 Slides)**

#### **Slide 1: Welcome + Theory + Medical Disclaimer**
- **Purpose**: Give users context about tinnitus and how notched sound therapy works
- **Content**:
  - Brief explanation of tinnitus (affects 50M+ Americans)
  - Science behind notched sound therapy (neural plasticity)
  - Three key benefits: Personalized, Daily Sessions, Track Progress
  - Medical disclaimer (not a medical device, consult healthcare professional)

#### **Slide 2: Find Your Frequency (with Visual Guide)**
- **Purpose**: Step-by-step instructions for frequency matching
- **Features**:
  - Placeholder for animated guide/video (currently shows "coming soon")
  - 4 numbered steps with detailed descriptions
  - Helpful tip about common frequency ranges (4,000-8,000 Hz)

#### **Slide 3: Daily Therapy Sessions (with Visual Guide)**
- **Purpose**: Explain how to use the notched noise therapy
- **Features**:
  - Placeholder for animated guide/video
  - 4 numbered steps for starting therapy
  - Timeline callout (4-8 weeks for results)

#### **Slide 4: Premium Trial Offer**
- **Purpose**: Convert users to paid subscribers
- **Features**:
  - 6 premium feature highlights
  - Pricing display (Monthly $7.99, Annual $59.99 with 37% savings badge)
  - "Start 7-Day Free Trial" button (defaults to annual plan)
  - "Restore Purchases" button
  - Clear trial terms

### 2. **Subscription System**

#### **Features**
- ✅ **Mock Mode**: Fully functional in browser for testing
- ✅ **Production Mode**: Ready for RevenueCat integration
- ✅ **7-Day Free Trial**: Automatic trial for new users
- ✅ **Feature Gating**: Locks premium features for free users
- ✅ **Paywall Modal**: Beautiful modal shown when accessing locked features
- ✅ **Status Bar**: Shows trial days remaining or subscription status

#### **Premium Features**
- 🔒 White and Brown Noise (Pink is free)
- 🔒 Notched Music Player
- 🔒 Advanced Controls (Fine-tune frequency, Phase inversion)
- 🔒 Unlimited Session Duration
- 🔒 Full History & Analytics
- 🔒 Multiple Profiles

#### **Free Features**
- ✅ Basic Tone Matching
- ✅ Pink Noise Therapy
- ✅ Basic Session Timer
- ✅ Basic Progress Tracking

---

## 🧪 Testing the Implementation

### Test in Browser (Mock Mode)

1. **Open the app in your browser**:
   ```bash
   # Navigate to the app directory
   cd tinnitus-relief-app
   
   # Open index.html in browser
   # Or use a local server:
   npx http-server . -p 8080 -o
   ```

2. **Test Onboarding Flow**:
   - ✓ First-time users see the onboarding automatically
   - ✓ Navigate through all 4 slides using Next/Back buttons
   - ✓ Click dots to jump to specific slides
   - ✓ "Skip" button bypasses onboarding
   - ✓ Slide 4 has "Start 7-Day Free Trial" button

3. **Test Trial Activation** (Mock Mode):
   - Click "Start 7-Day Free Trial" on Slide 4
   - Should see alert: "7-Day Free Trial Started!"
   - Onboarding should close automatically
   - Status bar at top shows "✨ Free Trial Active" with days remaining
   - Premium badges on tabs should disappear

4. **Test Feature Access**:
   - **With Trial Active**:
     - Can access "Notched Noise" tab
     - Can select White/Brown noise
     - Can access "Notched Music" tab
     - Can use Fine-tune controls
     - Can use Phase Inversion
   
   - **Without Trial** (clear localStorage and reload):
     - Clicking "Notched Noise" shows paywall
     - Clicking "Notched Music" shows paywall
     - Selecting White/Brown noise reverts to Pink
     - Fine-tune resets to 0
     - Phase inversion shows paywall

5. **Test Paywall Modal**:
   - Click any premium feature without trial
   - Paywall should appear with:
     - Feature-specific message
     - 6 premium benefits listed
     - Monthly and Annual pricing options
     - "7-day free trial" message
     - Close button (X) or click outside to close

6. **Test Subscription Buttons**:
   - "Subscribe Monthly" → Shows trial started alert
   - "Subscribe Annual" → Shows trial started alert
   - "Restore Purchases" → Shows "MOCK mode" alert

### Clear Mock Data

To reset and test again:
```javascript
// In browser console:
localStorage.removeItem('mockSubscriptionState');
localStorage.removeItem('tinnitusOnboardingComplete');
location.reload();
```

---

## 🎬 Adding Real Videos/Animations

The onboarding currently has placeholders for animated guides. Here's how to add them:

### Option 1: Animated GIFs

1. **Create screen recordings**:
   - Record using QuickTime (Mac) or Windows Game Bar
   - Show: Adjusting frequency slider, starting notched noise, etc.
   - Keep under 5 seconds each

2. **Convert to GIF**:
   ```bash
   # Using ffmpeg
   ffmpeg -i recording.mov -vf "fps=15,scale=400:-1" -loop 0 output.gif
   ```

3. **Add to HTML**:
   ```html
   <div class="visual-guide">
       <img src="assets/guide-frequency-matching.gif" alt="Frequency matching guide">
   </div>
   ```

### Option 2: Short Video Files

1. **Create MP4 videos** (optimized for mobile):
   ```bash
   ffmpeg -i recording.mov -c:v libx264 -crf 28 -preset slow \
          -vf "scale=400:-1" -an guide.mp4
   ```

2. **Add to HTML**:
   ```html
   <div class="visual-guide">
       <video autoplay loop muted playsinline>
           <source src="assets/guide-frequency-matching.mp4" type="video/mp4">
       </video>
   </div>
   ```

### Option 3: Lottie Animations

For smaller file sizes and better quality:
1. Create animations in After Effects
2. Export as Lottie JSON using Bodymovin plugin
3. Use lottie-web library to display

---

## 🔐 RevenueCat Setup Guide

### 1. Create RevenueCat Account

1. Go to [app.revenuecat.com](https://app.revenuecat.com)
2. Sign up for free account
3. Create new app project

### 2. Configure App in RevenueCat

1. **Add iOS App**:
   - Bundle ID: `com.paulabac.tinnitusreliefpro`
   - Shared secret from App Store Connect

2. **Create Entitlements**:
   - Name: `premium` (or `pro`)
   - This is what the app checks for access

3. **Create Products**:
   - **Monthly Subscription**:
     - Product ID: `tinnitus_pro_monthly`
     - Price: $7.99/month
     - Free trial: 7 days
   - **Annual Subscription**:
     - Product ID: `tinnitus_pro_annual`
     - Price: $59.99/year
     - Free trial: 7 days

4. **Create Offerings**:
   - Default offering with both products
   - Set annual as "Featured" (best value)

5. **Get API Keys**:
   - iOS SDK key: Found in project settings
   - Replace in `subscription-manager.js`:
     ```javascript
     this.revenueCatApiKey = 'YOUR_IOS_SDK_KEY_HERE';
     ```

### 3. App Store Connect Setup

1. **Create In-App Purchases**:
   - Go to App Store Connect → Your App → In-App Purchases
   - Create two Auto-Renewable Subscriptions:
     - `tinnitus_pro_monthly`: $7.99/month
     - `tinnitus_pro_annual`: $59.99/year
   - Configure 7-day free trial for both
   - Add localized descriptions

2. **Subscription Group**:
   - Create group: "Tinnitus Relief Pro"
   - Add both subscriptions to group
   - Set upgrade/downgrade behavior

3. **Privacy Manifest** (iOS 17+):
   - Create `PrivacyInfo.xcprivacy` file
   - Declare data collection practices
   - Link to privacy policy URL

### 4. Testing Subscriptions

1. **Sandbox Testing**:
   - Create sandbox test accounts in App Store Connect
   - Sign out of App Store on test device
   - Install app via Xcode/TestFlight
   - Use sandbox account when prompted

2. **Test Flows**:
   - ✓ Start trial
   - ✓ Trial expiration
   - ✓ Subscribe during trial
   - ✓ Subscribe after trial expires
   - ✓ Restore purchases
   - ✓ Cancel subscription
   - ✓ Subscription renewal

---

## 📱 iOS App Submission Checklist

### Required Assets

- [ ] **App Icon** (all sizes: 20x20 to 1024x1024)
- [ ] **Launch Screen** (Storyboard or image set)
- [ ] **Screenshots** (6.5", 6.7", 5.5" devices required)
- [ ] **App Preview Video** (optional but recommended)
- [ ] **Privacy Policy** (accessible URL - privacy-policy.html)
- [ ] **Terms of Service** (accessible URL - terms-of-service.html)

### App Store Listing

- [ ] **App Name**: "Tinnitus Relief Pro"
- [ ] **Subtitle**: "Notched Sound Therapy"
- [ ] **Description**: Highlight benefits, science, features
- [ ] **Keywords**: tinnitus, sound therapy, hearing, relief, etc.
- [ ] **Category**: Medical or Health & Fitness
- [ ] **Age Rating**: 4+ (no restrictions)

### Compliance

- [ ] **Medical Disclaimer**: Must be prominent
- [ ] **Not a Medical Device**: Clear in description
- [ ] **Export Compliance**: Declare if using encryption
- [ ] **Content Rights**: Own all content
- [ ] **Privacy Policy**: Must be accessible
- [ ] **Subscription Terms**: Clear in app and listing

### Review Notes

Provide to Apple reviewer:
```
Test Account (if needed):
- None required (basic features work without login)

Subscription Testing:
- Sandbox environment configured
- RevenueCat integration for subscriptions

Medical Disclaimer:
- App shows clear disclaimer that it's not a medical device
- Users directed to consult healthcare professionals
- Located in: First onboarding screen

How to Test:
1. Complete onboarding flow (4 screens)
2. Use Tone Matcher to find frequency (free feature)
3. Try "Notched Noise" tab to see paywall for premium
4. Premium trial can be tested with sandbox account
```

---

## 🚀 Build and Deploy

### 1. Install Dependencies

```bash
cd tinnitus-relief-app
npm install
```

### 2. Initialize Capacitor iOS

```bash
npx cap add ios
npx cap sync ios
```

### 3. Configure Xcode Project

1. Open in Xcode:
   ```bash
   npx cap open ios
   ```

2. **Set Bundle ID**: `com.paulabac.tinnitusreliefpro`

3. **Set Team & Signing**: Your Apple Developer account

4. **Configure Capabilities**:
   - ✓ In-App Purchase

5. **Add RevenueCat SDK**:
   - Use CocoaPods or Swift Package Manager
   ```ruby
   # In ios/App/Podfile
   pod 'RevenueCat'
   ```

6. **Info.plist additions**:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>This app does not access your microphone</string>
   <key>NSAppleMusicUsageDescription</key>
   <string>To play your music with notched audio therapy</string>
   ```

### 4. Build and Test

```bash
# Build for simulator
npx cap run ios

# Build for device (requires paid Apple Developer account)
npx cap run ios --target=device
```

### 5. Archive and Submit

1. In Xcode: Product → Archive
2. Validate archive
3. Upload to App Store Connect
4. Submit for review

---

## 📊 Analytics & Monitoring

Consider adding:

- **Firebase Analytics**: Track user engagement
- **Sentry**: Error monitoring
- **RevenueCat Charts**: Subscription metrics (built-in)

---

## 🎨 Design Customization

All onboarding styles are in `styles.css` under these sections:

- `/* ===== NEW ONBOARDING STYLES ===== */`
- `/* Slide 1: Theory Section */`
- `/* Slides 2-3: Visual Guides */`
- `/* Slide 4: Premium Trial */`
- `/* ===== PAYWALL MODAL ===== */`
- `/* ===== SUBSCRIPTION STATUS BAR ===== */`
- `/* ===== PREMIUM BADGES ===== */`

---

## 🐛 Troubleshooting

### Onboarding doesn't show
```javascript
// Clear flag in console
localStorage.removeItem('tinnitusOnboardingComplete');
location.reload();
```

### Premium features accessible without subscription
- Check `subscriptionManager.isPremium` value
- Verify `subscriptionManager.updateFeatureAccess()` is called
- Check console for subscription init messages

### Paywall not showing
- Verify `lockFeature()` is being called
- Check if `paywallModal` element exists
- Inspect console for errors

### RevenueCat not working
- Verify API key is correct
- Check Capacitor environment (not browser)
- Look for console errors from RevenueCat SDK

---

## 📞 Support

For questions or issues:
- Email: support@tinnitusreliefpro.com
- RevenueCat Docs: https://docs.revenuecat.com
- Apple Developer Forums: https://developer.apple.com/forums

---

## ✅ Implementation Checklist

- [x] Enhanced onboarding with 4 slides
- [x] Theory and medical disclaimer on Slide 1
- [x] Visual guide placeholders on Slides 2-3
- [x] Premium trial offer on Slide 4
- [x] Subscription manager with mock mode
- [x] Feature gating for premium features
- [x] Paywall modal design and functionality
- [x] Premium badges on tabs
- [x] Status bar for trial/subscription
- [x] Privacy policy page
- [x] Terms of service page
- [x] Capacitor configuration
- [x] Package.json with dependencies
- [ ] Add actual video/GIF guides (user's task)
- [ ] Set up RevenueCat account (user's task)
- [ ] Configure App Store Connect (user's task)
- [ ] Create app screenshots (user's task)
- [ ] Submit to App Store (user's task)

---

**Last Updated**: January 23, 2026
**Version**: 1.0.0
