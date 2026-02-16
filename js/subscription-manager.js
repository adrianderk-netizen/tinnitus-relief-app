/**
 * Subscription Manager - Handles RevenueCat integration and feature gating
 * Supports both MOCK mode (for browser testing) and PRODUCTION mode (with RevenueCat)
 */

class SubscriptionManager {
    constructor() {
        // Subscription state
        this.isPremium = false;
        this.isTrialActive = false;
        this.trialEndDate = null;
        this.subscriptionType = null; // 'monthly' or 'annual'
        this.trialDaysRemaining = 0;
        
        // Mode: 'mock' for browser testing, 'production' for real RevenueCat
        this.mode = this.detectMode();
        
        // RevenueCat configuration
        this.revenueCatApiKey = 'test_XoSzeDdocAQjUQNXJvJxhmEmDdq';
        
        // Feature flags
        this.features = {
            basicToneMatching: true,  // Always free
            pinkNoise: true,          // Always free
            whiteNoise: false,        // Premium
            brownNoise: false,        // Premium
            musicNotching: false,     // Premium
            advancedControls: false,  // Premium (fine-tune, phase inversion)
            unlimitedSessions: false, // Premium
            fullHistory: false,       // Premium
            multipleProfiles: false,  // Premium
            exportReports: false      // Premium
        };
        
        // Callbacks
        this.onSubscriptionChange = null;
    }
    
    /**
     * Detect if we're running in browser (mock) or Capacitor (production)
     */
    detectMode() {
        // Check if Capacitor is available
        if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() !== 'web') {
            return 'production';
        }
        return 'mock';
    }
    
    /**
     * Initialize the subscription manager
     */
    async init() {
        console.log(`[SubscriptionManager] Initializing in ${this.mode} mode`);
        
        if (this.mode === 'production') {
            await this.initRevenueCat();
        } else {
            await this.initMockMode();
        }
        
        this.updateUI();
    }
    
    /**
     * Initialize RevenueCat (production mode)
     */
    async initRevenueCat() {
        try {
            // Check if RevenueCat plugin is available
            if (typeof Purchases === 'undefined') {
                console.warn('[SubscriptionManager] RevenueCat not available, falling back to mock mode');
                this.mode = 'mock';
                await this.initMockMode();
                return;
            }
            
            // Configure RevenueCat
            await Purchases.configure({
                apiKey: this.revenueCatApiKey,
                appUserID: null // RevenueCat will generate anonymous ID
            });
            
            console.log('[SubscriptionManager] RevenueCat configured');
            
            // Check current subscription status
            await this.checkSubscriptionStatus();
            
        } catch (error) {
            console.error('[SubscriptionManager] RevenueCat initialization failed:', error);
            this.mode = 'mock';
            await this.initMockMode();
        }
    }
    
    /**
     * Initialize mock mode (for browser testing)
     */
    async initMockMode() {
        console.log('[SubscriptionManager] Running in MOCK mode - simulating subscription');
        
        // Load saved mock state from localStorage
        const savedState = localStorage.getItem('mockSubscriptionState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.isPremium = state.isPremium || false;
                this.isTrialActive = state.isTrialActive || false;
                this.subscriptionType = state.subscriptionType || null;

                // Check if trial expired
                if (this.isTrialActive && state.trialEndDate) {
                    const trialEnd = new Date(state.trialEndDate);
                    if (new Date() > trialEnd) {
                        this.isTrialActive = false;
                        this.isPremium = false;
                        localStorage.removeItem('mockSubscriptionState');
                    } else {
                        this.trialEndDate = trialEnd;
                        this.trialDaysRemaining = Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24));
                    }
                }
            } catch {
                console.warn('[SubscriptionManager] Corrupted subscription data, resetting');
                localStorage.removeItem('mockSubscriptionState');
            }
        }
        
        // Update feature flags based on subscription status
        this.updateFeatureAccess();
        
        console.log('[SubscriptionManager] Mock state loaded:', {
            isPremium: this.isPremium,
            isTrialActive: this.isTrialActive,
            trialDaysRemaining: this.trialDaysRemaining
        });
    }
    
    /**
     * Check subscription status from RevenueCat
     */
    async checkSubscriptionStatus() {
        if (this.mode === 'mock') {
            return;
        }
        
        try {
            const customerInfo = await Purchases.getCustomerInfo();
            
            // Check for active entitlement (we'll set this up in RevenueCat dashboard)
            const entitlementIdentifier = 'premium'; // or 'pro'
            const hasAccess = customerInfo.entitlements.active[entitlementIdentifier] !== undefined;
            
            this.isPremium = hasAccess;
            
            // Check if in trial
            if (hasAccess) {
                const entitlement = customerInfo.entitlements.active[entitlementIdentifier];
                const periodType = entitlement.periodType;
                this.isTrialActive = periodType === 'TRIAL';
                
                if (this.isTrialActive && entitlement.expirationDate) {
                    this.trialEndDate = new Date(entitlement.expirationDate);
                    this.trialDaysRemaining = Math.ceil((this.trialEndDate - new Date()) / (1000 * 60 * 60 * 24));
                }
            }
            
            this.updateFeatureAccess();
            
            console.log('[SubscriptionManager] Subscription status:', {
                isPremium: this.isPremium,
                isTrialActive: this.isTrialActive
            });
            
        } catch (error) {
            console.error('[SubscriptionManager] Failed to check subscription status:', error);
        }
    }
    
    /**
     * Update feature access based on subscription status
     */
    updateFeatureAccess() {
        const hasAccess = this.isPremium || this.isTrialActive;
        
        this.features.whiteNoise = hasAccess;
        this.features.brownNoise = hasAccess;
        this.features.musicNotching = hasAccess;
        this.features.advancedControls = hasAccess;
        this.features.unlimitedSessions = hasAccess;
        this.features.fullHistory = hasAccess;
        this.features.multipleProfiles = hasAccess;
        this.features.exportReports = hasAccess;
    }
    
    /**
     * Check if a specific feature is available
     */
    hasFeature(featureName) {
        return this.features[featureName] === true;
    }
    
    /**
     * Lock a feature and show paywall if not available
     * Returns true if user has access, false if locked
     */
    lockFeature(featureName, customMessage = null) {
        const hasAccess = this.isPremium || this.isTrialActive;
        
        if (hasAccess) {
            return true;
        }
        
        // Show paywall
        this.showPaywall(customMessage || this.getFeatureMessage(featureName));
        return false;
    }
    
    /**
     * Get user-friendly message for locked feature
     */
    getFeatureMessage(featureName) {
        const messages = {
            'All Noise Types': 'Access white and brown noise for varied therapy options',
            'Music Notching': 'Play your favorite music with notched audio therapy',
            'Advanced Controls': 'Use advanced frequency matching tools',
            'Unlimited Sessions': 'Remove the 30-minute session limit',
            'Full History': 'View your complete therapy history',
            'Multiple Profiles': 'Create profiles for multiple users',
            'Export Reports': 'Generate PDF reports for your healthcare provider'
        };
        
        return messages[featureName] || 'Access all premium features';
    }
    
    /**
     * Show paywall modal
     */
    showPaywall(featureMessage = null) {
        const paywallModal = document.getElementById('paywallModal');
        const featureNameEl = document.getElementById('paywallFeatureName');
        
        if (featureMessage) {
            featureNameEl.textContent = featureMessage;
        }
        
        paywallModal.classList.add('active');
    }
    
    /**
     * Hide paywall modal
     */
    hidePaywall() {
        const paywallModal = document.getElementById('paywallModal');
        paywallModal.classList.remove('active');
    }
    
    /**
     * Start free trial or purchase subscription
     */
    async subscribe(plan) {
        console.log(`[SubscriptionManager] Attempting to subscribe: ${plan}`);
        
        if (this.mode === 'mock') {
            return await this.mockSubscribe(plan);
        }
        
        try {
            // Get available packages
            const offerings = await Purchases.getOfferings();
            
            if (offerings.current === null) {
                throw new Error('No offerings available');
            }
            
            // Find the appropriate package
            let packageToPurchase;
            if (plan === 'monthly') {
                packageToPurchase = offerings.current.monthly;
            } else if (plan === 'annual') {
                packageToPurchase = offerings.current.annual;
            }
            
            if (!packageToPurchase) {
                throw new Error(`Package not found: ${plan}`);
            }
            
            // Make the purchase
            const { customerInfo, productIdentifier } = await Purchases.purchasePackage({
                aPackage: packageToPurchase
            });
            
            console.log('[SubscriptionManager] Purchase successful:', productIdentifier);
            
            // Update subscription status
            await this.checkSubscriptionStatus();
            this.hidePaywall();
            this.updateUI();
            
            // Notify user
            alert('🎉 Welcome to Premium! All features are now unlocked.');
            
            if (this.onSubscriptionChange) {
                this.onSubscriptionChange();
            }
            
            return true;
            
        } catch (error) {
            if (error.userCancelled) {
                console.log('[SubscriptionManager] User cancelled purchase');
            } else {
                console.error('[SubscriptionManager] Purchase failed:', error);
                alert('Purchase failed. Please try again.');
            }
            return false;
        }
    }
    
    /**
     * Mock subscription (for testing in browser)
     */
    async mockSubscribe(plan) {
        console.log(`[SubscriptionManager] MOCK: Starting ${plan} subscription with 7-day trial`);
        
        // Simulate 7-day trial
        this.isTrialActive = true;
        this.isPremium = true; // During trial, user has premium access
        this.subscriptionType = plan;
        
        // Set trial end date (7 days from now)
        this.trialEndDate = new Date();
        this.trialEndDate.setDate(this.trialEndDate.getDate() + 7);
        this.trialDaysRemaining = 7;
        
        // Save to localStorage
        localStorage.setItem('mockSubscriptionState', JSON.stringify({
            isPremium: this.isPremium,
            isTrialActive: this.isTrialActive,
            subscriptionType: this.subscriptionType,
            trialEndDate: this.trialEndDate.toISOString()
        }));
        
        // Update features
        this.updateFeatureAccess();
        this.hidePaywall();
        this.updateUI();
        
        // Notify user
        alert('🎉 7-Day Free Trial Started!\n\nYou now have access to all premium features. Your trial will end on ' + 
              this.trialEndDate.toLocaleDateString() + '.\n\n(This is MOCK mode for testing)');
        
        if (this.onSubscriptionChange) {
            this.onSubscriptionChange();
        }
        
        return true;
    }
    
    /**
     * Restore previous purchases
     */
    async restorePurchases() {
        console.log('[SubscriptionManager] Restoring purchases...');
        
        if (this.mode === 'mock') {
            alert('Restore Purchases is only available in the iOS app.\n\n(Currently in MOCK mode)');
            return;
        }
        
        try {
            const customerInfo = await Purchases.restorePurchases();
            await this.checkSubscriptionStatus();
            
            if (this.isPremium) {
                alert('✅ Purchases restored successfully!');
                this.updateUI();
            } else {
                alert('No active subscriptions found.');
            }
            
        } catch (error) {
            console.error('[SubscriptionManager] Restore failed:', error);
            alert('Failed to restore purchases. Please try again.');
        }
    }
    
    /**
     * Update UI elements based on subscription status
     */
    updateUI() {
        const statusBar = document.getElementById('subscriptionStatus');
        const statusText = document.getElementById('statusText');
        const statusDays = document.getElementById('statusDays');
        
        if (this.isTrialActive) {
            statusBar.style.display = 'block';
            statusText.textContent = '✨ Free Trial Active';
            statusDays.textContent = `${this.trialDaysRemaining} day${this.trialDaysRemaining !== 1 ? 's' : ''} remaining`;
        } else if (this.isPremium) {
            statusBar.style.display = 'block';
            statusText.textContent = '⭐ Premium Member';
            statusDays.textContent = this.subscriptionType === 'annual' ? 'Annual Plan' : 'Monthly Plan';
        } else {
            statusBar.style.display = 'none';
        }
        
        // Update premium badges visibility
        this.updatePremiumBadges();
    }
    
    /**
     * Update visibility of premium badges
     */
    updatePremiumBadges() {
        const hasAccess = this.isPremium || this.isTrialActive;
        const badges = document.querySelectorAll('.premium-badge-tab');
        
        badges.forEach(badge => {
            if (hasAccess) {
                badge.style.display = 'none'; // Hide badges if user has access
            } else {
                badge.style.display = 'inline-block';
            }
        });
    }
    
    /**
     * Cancel subscription (directs to App Store settings)
     */
    cancelSubscription() {
        if (this.mode === 'mock') {
            // In mock mode, just clear the state
            if (confirm('Cancel your mock trial/subscription?')) {
                localStorage.removeItem('mockSubscriptionState');
                this.isPremium = false;
                this.isTrialActive = false;
                this.trialEndDate = null;
                this.subscriptionType = null;
                this.updateFeatureAccess();
                this.updateUI();
                alert('Trial cancelled (MOCK mode)');
            }
            return;
        }
        
        // In production, direct to App Store subscription management
        alert('To cancel your subscription, please go to:\n\niOS Settings → [Your Name] → Subscriptions → Tinnitus Relief Pro');
    }
    
    /**
     * Get subscription info for display
     */
    getSubscriptionInfo() {
        return {
            isPremium: this.isPremium,
            isTrialActive: this.isTrialActive,
            subscriptionType: this.subscriptionType,
            trialDaysRemaining: this.trialDaysRemaining,
            trialEndDate: this.trialEndDate,
            mode: this.mode
        };
    }
}

// Export for use in app.js
window.SubscriptionManager = SubscriptionManager;
export { SubscriptionManager };
