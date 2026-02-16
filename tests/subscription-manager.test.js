/**
 * Subscription Manager Tests
 * Tests the REAL SubscriptionManager class from ../js/subscription-manager.js
 * Tests subscription state, feature gating, and trial management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionManager } from '../js/subscription-manager.js';

/**
 * Helper: create the DOM elements that the real SubscriptionManager expects
 * when calling updateUI(), showPaywall(), hidePaywall(), updatePremiumBadges()
 */
function setupDomElements() {
  // Clean previous elements
  document.body.innerHTML = '';

  // Paywall modal
  const paywallModal = document.createElement('div');
  paywallModal.id = 'paywallModal';
  document.body.appendChild(paywallModal);

  // Paywall feature name text
  const paywallFeatureName = document.createElement('span');
  paywallFeatureName.id = 'paywallFeatureName';
  document.body.appendChild(paywallFeatureName);

  // Subscription status bar
  const subscriptionStatus = document.createElement('div');
  subscriptionStatus.id = 'subscriptionStatus';
  document.body.appendChild(subscriptionStatus);

  // Status text
  const statusText = document.createElement('span');
  statusText.id = 'statusText';
  document.body.appendChild(statusText);

  // Status days
  const statusDays = document.createElement('span');
  statusDays.id = 'statusDays';
  document.body.appendChild(statusDays);
}

describe('SubscriptionManager', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();

    // Mock window.alert and window.confirm used by the real class
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);

    manager = new SubscriptionManager();
    // The constructor calls detectMode(). Since Capacitor is not defined, mode === 'mock'.
  });

  describe('Initialization', () => {
    it('should initialize with free status', () => {
      expect(manager.isPremium).toBe(false);
      expect(manager.isTrialActive).toBe(false);
      expect(manager.mode).toBe('mock');
    });

    it('should restore state from localStorage via init()', async () => {
      // Set up saved mock state
      localStorage.setItem('mockSubscriptionState', JSON.stringify({
        isPremium: true,
        isTrialActive: false,
        subscriptionType: 'monthly',
        trialEndDate: null
      }));

      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.isPremium).toBe(true);
      expect(mgr.subscriptionType).toBe('monthly');
    });
  });

  describe('Feature Access', () => {
    it('should allow basic features for free users', () => {
      // basicToneMatching and pinkNoise are always true
      expect(manager.hasFeature('basicToneMatching')).toBe(true);
      expect(manager.hasFeature('pinkNoise')).toBe(true);
    });

    it('should block premium features for free users', () => {
      expect(manager.hasFeature('whiteNoise')).toBe(false);
      expect(manager.hasFeature('musicNotching')).toBe(false);
      expect(manager.hasFeature('advancedControls')).toBe(false);
    });

    it('should allow all features for premium users', () => {
      manager.isPremium = true;
      manager.updateFeatureAccess();

      expect(manager.hasFeature('basicToneMatching')).toBe(true);
      expect(manager.hasFeature('whiteNoise')).toBe(true);
      expect(manager.hasFeature('musicNotching')).toBe(true);
      expect(manager.hasFeature('advancedControls')).toBe(true);
      expect(manager.hasFeature('unlimitedSessions')).toBe(true);
    });

    it('should allow all features during trial', () => {
      manager.isTrialActive = true;
      manager.updateFeatureAccess();

      expect(manager.hasFeature('whiteNoise')).toBe(true);
      expect(manager.hasFeature('musicNotching')).toBe(true);
      expect(manager.hasFeature('advancedControls')).toBe(true);
    });
  });

  describe('Trial Management', () => {
    it('should start a 7-day trial via subscribe()', async () => {
      await manager.subscribe('monthly');

      expect(manager.isTrialActive).toBe(true);
      expect(manager.isPremium).toBe(true);
      expect(manager.trialEndDate).toBeInstanceOf(Date);
      expect(manager.trialDaysRemaining).toBe(7);
    });

    it('should calculate remaining trial days on init', async () => {
      // Save state with a trial ending 4 days from now
      const fourDaysFromNow = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
      localStorage.setItem('mockSubscriptionState', JSON.stringify({
        isPremium: true,
        isTrialActive: true,
        subscriptionType: 'monthly',
        trialEndDate: fourDaysFromNow.toISOString()
      }));

      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.trialDaysRemaining).toBe(4);
    });

    it('should detect expired trial on init', async () => {
      // Save state with a trial that ended yesterday
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      localStorage.setItem('mockSubscriptionState', JSON.stringify({
        isPremium: true,
        isTrialActive: true,
        subscriptionType: 'monthly',
        trialEndDate: yesterday.toISOString()
      }));

      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.isTrialActive).toBe(false);
      expect(mgr.isPremium).toBe(false);
    });

    it('should return 0 trial days when no trial active', () => {
      expect(manager.trialDaysRemaining).toBe(0);
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to monthly plan', async () => {
      const result = await manager.subscribe('monthly');

      expect(result).toBe(true);
      expect(manager.isPremium).toBe(true);
      expect(manager.subscriptionType).toBe('monthly');
    });

    it('should subscribe to annual plan', async () => {
      const result = await manager.subscribe('annual');

      expect(result).toBe(true);
      expect(manager.isPremium).toBe(true);
      expect(manager.subscriptionType).toBe('annual');
    });

    it('should activate trial when subscribing', async () => {
      await manager.subscribe('monthly');

      expect(manager.isTrialActive).toBe(true);
      expect(manager.isPremium).toBe(true);
    });

    it('should cancel subscription when confirm returns true', () => {
      // First subscribe
      manager.isPremium = true;
      manager.isTrialActive = true;
      manager.subscriptionType = 'monthly';
      manager.updateFeatureAccess();

      global.confirm = vi.fn(() => true);

      manager.cancelSubscription();

      expect(manager.isPremium).toBe(false);
      expect(manager.isTrialActive).toBe(false);
      expect(manager.subscriptionType).toBe(null);
    });

    it('should not cancel subscription when confirm returns false', () => {
      manager.isPremium = true;
      manager.isTrialActive = true;
      manager.subscriptionType = 'monthly';
      manager.updateFeatureAccess();

      global.confirm = vi.fn(() => false);

      manager.cancelSubscription();

      // State should be unchanged
      expect(manager.isPremium).toBe(true);
      expect(manager.isTrialActive).toBe(true);
    });
  });

  describe('Feature Gating', () => {
    it('should lock premium features for free users and show paywall', () => {
      const allowed = manager.lockFeature('musicNotching');
      expect(allowed).toBe(false);

      // Paywall should be shown (active class added)
      const paywallModal = document.getElementById('paywallModal');
      expect(paywallModal.classList.contains('active')).toBe(true);
    });

    it('should allow premium features for premium users without showing paywall', () => {
      manager.isPremium = true;

      const allowed = manager.lockFeature('musicNotching');
      expect(allowed).toBe(true);

      // Paywall should NOT be shown
      const paywallModal = document.getElementById('paywallModal');
      expect(paywallModal.classList.contains('active')).toBe(false);
    });

    it('should allow all features during trial without showing paywall', () => {
      manager.isTrialActive = true;

      const allowed = manager.lockFeature('advancedControls');
      expect(allowed).toBe(true);

      const paywallModal = document.getElementById('paywallModal');
      expect(paywallModal.classList.contains('active')).toBe(false);
    });
  });

  describe('State Persistence', () => {
    it('should save subscription state to localStorage when subscribing', async () => {
      await manager.subscribe('monthly');

      const saved = localStorage.getItem('mockSubscriptionState');
      expect(saved).toBeTruthy();

      const state = JSON.parse(saved);
      expect(state.isPremium).toBe(true);
      expect(state.subscriptionType).toBe('monthly');
    });

    it('should save trial state to localStorage', async () => {
      await manager.subscribe('annual');

      const saved = localStorage.getItem('mockSubscriptionState');
      const state = JSON.parse(saved);

      expect(state.isTrialActive).toBe(true);
      expect(state.trialEndDate).toBeTruthy();
    });

    it('should restore trial end date correctly from localStorage', async () => {
      const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      localStorage.setItem('mockSubscriptionState', JSON.stringify({
        isPremium: true,
        isTrialActive: true,
        subscriptionType: 'monthly',
        trialEndDate: endDate.toISOString()
      }));

      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.isTrialActive).toBe(true);
      expect(mgr.trialEndDate).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing localStorage gracefully', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.isPremium).toBe(false);
      expect(mgr.isTrialActive).toBe(false);
    });

    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem('mockSubscriptionState', 'invalid json{');

      const mgr = new SubscriptionManager();

      // Should not throw
      await expect(mgr.init()).resolves.not.toThrow();
      // Should fall back to default state
      expect(mgr.isPremium).toBe(false);
    });

    it('should handle rapid subscription changes', async () => {
      for (let i = 0; i < 10; i++) {
        await manager.subscribe('monthly');
        global.confirm = vi.fn(() => true);
        manager.cancelSubscription();
      }

      expect(manager.isPremium).toBe(false);
      expect(manager.isTrialActive).toBe(false);
    });
  });
});

describe('SubscriptionManager - Feature Flags', () => {
  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);
  });

  it('should have correct free features by default', () => {
    const mgr = new SubscriptionManager();
    expect(mgr.hasFeature('basicToneMatching')).toBe(true);
    expect(mgr.hasFeature('pinkNoise')).toBe(true);
  });

  it('should have correct premium features locked by default', () => {
    const mgr = new SubscriptionManager();
    expect(mgr.hasFeature('whiteNoise')).toBe(false);
    expect(mgr.hasFeature('brownNoise')).toBe(false);
    expect(mgr.hasFeature('musicNotching')).toBe(false);
    expect(mgr.hasFeature('advancedControls')).toBe(false);
    expect(mgr.hasFeature('unlimitedSessions')).toBe(false);
    expect(mgr.hasFeature('fullHistory')).toBe(false);
    expect(mgr.hasFeature('multipleProfiles')).toBe(false);
    expect(mgr.hasFeature('exportReports')).toBe(false);
  });
});

describe('SubscriptionManager - UI Updates', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);
    manager = new SubscriptionManager();
  });

  it('should hide status bar for free users', () => {
    manager.updateUI();
    const statusBar = document.getElementById('subscriptionStatus');
    expect(statusBar.style.display).toBe('none');
  });

  it('should show trial info when trial is active', () => {
    manager.isTrialActive = true;
    manager.isPremium = true;
    manager.trialDaysRemaining = 5;
    manager.updateUI();

    const statusBar = document.getElementById('subscriptionStatus');
    const statusDays = document.getElementById('statusDays');
    expect(statusBar.style.display).toBe('block');
    expect(statusDays.textContent).toContain('5');
  });

  it('should show premium info for premium members without trial', () => {
    manager.isPremium = true;
    manager.isTrialActive = false;
    manager.subscriptionType = 'annual';
    manager.updateUI();

    const statusBar = document.getElementById('subscriptionStatus');
    const statusDays = document.getElementById('statusDays');
    expect(statusBar.style.display).toBe('block');
    expect(statusDays.textContent).toContain('Annual Plan');
  });
});

describe('SubscriptionManager - Paywall', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);
    manager = new SubscriptionManager();
  });

  it('should show paywall modal', () => {
    manager.showPaywall('Test feature message');

    const paywallModal = document.getElementById('paywallModal');
    const featureNameEl = document.getElementById('paywallFeatureName');

    expect(paywallModal.classList.contains('active')).toBe(true);
    expect(featureNameEl.textContent).toBe('Test feature message');
  });

  it('should hide paywall modal', () => {
    // First show it
    manager.showPaywall('Test');
    // Then hide it
    manager.hidePaywall();

    const paywallModal = document.getElementById('paywallModal');
    expect(paywallModal.classList.contains('active')).toBe(false);
  });

  it('should hide paywall after subscribing', async () => {
    // Show paywall first
    manager.showPaywall('Test');
    const paywallModal = document.getElementById('paywallModal');
    expect(paywallModal.classList.contains('active')).toBe(true);

    // Subscribe (which calls hidePaywall internally)
    await manager.subscribe('monthly');

    expect(paywallModal.classList.contains('active')).toBe(false);
  });
});

describe('SubscriptionManager - getSubscriptionInfo', () => {
  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);
  });

  it('should return correct info object', () => {
    const mgr = new SubscriptionManager();
    const info = mgr.getSubscriptionInfo();

    expect(info).toEqual({
      isPremium: false,
      isTrialActive: false,
      subscriptionType: null,
      trialDaysRemaining: 0,
      trialEndDate: null,
      mode: 'mock'
    });
  });

  it('should reflect subscription state in info', async () => {
    const mgr = new SubscriptionManager();
    await mgr.subscribe('annual');

    const info = mgr.getSubscriptionInfo();
    expect(info.isPremium).toBe(true);
    expect(info.isTrialActive).toBe(true);
    expect(info.subscriptionType).toBe('annual');
    expect(info.trialDaysRemaining).toBe(7);
    expect(info.trialEndDate).toBeInstanceOf(Date);
  });
});

// ============================================================
// Production Mode Tests (RevenueCat code paths)
// ============================================================

/**
 * Helper: create a mock Purchases global that simulates RevenueCat API
 */
function createMockPurchases(overrides = {}) {
  return {
    configure: vi.fn().mockResolvedValue(undefined),
    getCustomerInfo: vi.fn().mockResolvedValue({
      entitlements: { active: {} }
    }),
    getOfferings: vi.fn().mockResolvedValue({
      current: {
        monthly: { identifier: 'monthly_pkg' },
        annual: { identifier: 'annual_pkg' }
      }
    }),
    purchasePackage: vi.fn().mockResolvedValue({
      customerInfo: { entitlements: { active: { premium: {} } } },
      productIdentifier: 'com.test.premium'
    }),
    restorePurchases: vi.fn().mockResolvedValue({
      entitlements: { active: {} }
    }),
    ...overrides
  };
}

describe('SubscriptionManager - Production Mode (RevenueCat)', () => {
  let manager;
  let mockPurchases;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);

    // Set up Capacitor mock to trigger production mode
    global.Capacitor = { getPlatform: () => 'ios' };
    mockPurchases = createMockPurchases();
    global.Purchases = mockPurchases;
  });

  afterEach(() => {
    delete global.Capacitor;
    delete global.Purchases;
  });

  describe('detectMode', () => {
    it('should detect production mode when Capacitor is available on non-web platform', () => {
      const mgr = new SubscriptionManager();
      expect(mgr.mode).toBe('production');
    });

    it('should detect mock mode when Capacitor platform is web', () => {
      global.Capacitor = { getPlatform: () => 'web' };
      const mgr = new SubscriptionManager();
      expect(mgr.mode).toBe('mock');
    });
  });

  describe('initRevenueCat', () => {
    it('should configure RevenueCat with API key', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mockPurchases.configure).toHaveBeenCalledWith({
        apiKey: mgr.revenueCatApiKey,
        appUserID: null
      });
    });

    it('should check subscription status after configuring', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mockPurchases.getCustomerInfo).toHaveBeenCalled();
    });

    it('should fall back to mock mode when Purchases is undefined', async () => {
      delete global.Purchases;
      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.mode).toBe('mock');
    });

    it('should fall back to mock mode on RevenueCat error', async () => {
      global.Purchases = {
        configure: vi.fn().mockRejectedValue(new Error('Network error'))
      };
      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.mode).toBe('mock');
    });
  });

  describe('checkSubscriptionStatus - production', () => {
    it('should set isPremium when entitlement is active', async () => {
      mockPurchases.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: {
              periodType: 'NORMAL',
              expirationDate: null
            }
          }
        }
      });

      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.isPremium).toBe(true);
      expect(mgr.isTrialActive).toBe(false);
    });

    it('should detect trial period from entitlement', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      mockPurchases.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: {
              periodType: 'TRIAL',
              expirationDate: futureDate
            }
          }
        }
      });

      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.isPremium).toBe(true);
      expect(mgr.isTrialActive).toBe(true);
      expect(mgr.trialDaysRemaining).toBe(5);
      expect(mgr.trialEndDate).toBeInstanceOf(Date);
    });

    it('should set isPremium to false when no active entitlements', async () => {
      mockPurchases.getCustomerInfo.mockResolvedValue({
        entitlements: { active: {} }
      });

      const mgr = new SubscriptionManager();
      await mgr.init();

      expect(mgr.isPremium).toBe(false);
    });

    it('should handle getCustomerInfo error gracefully', async () => {
      mockPurchases.getCustomerInfo.mockRejectedValue(new Error('API error'));

      const mgr = new SubscriptionManager();
      await expect(mgr.init()).resolves.not.toThrow();
    });

    it('should skip production check when in mock mode', async () => {
      const mgr = new SubscriptionManager();
      mgr.mode = 'mock';
      await mgr.checkSubscriptionStatus();

      // Should not call getCustomerInfo since mode is mock
      expect(mockPurchases.getCustomerInfo).not.toHaveBeenCalled();
    });
  });

  describe('subscribe - production', () => {
    it('should purchase monthly package via RevenueCat', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();
      mockPurchases.getCustomerInfo.mockClear();

      const result = await mgr.subscribe('monthly');

      expect(mockPurchases.getOfferings).toHaveBeenCalled();
      expect(mockPurchases.purchasePackage).toHaveBeenCalledWith({
        aPackage: { identifier: 'monthly_pkg' }
      });
      expect(result).toBe(true);
    });

    it('should purchase annual package via RevenueCat', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();

      await mgr.subscribe('annual');

      expect(mockPurchases.purchasePackage).toHaveBeenCalledWith({
        aPackage: { identifier: 'annual_pkg' }
      });
    });

    it('should fire onSubscriptionChange callback after purchase', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();
      const callback = vi.fn();
      mgr.onSubscriptionChange = callback;

      await mgr.subscribe('monthly');

      expect(callback).toHaveBeenCalled();
    });

    it('should show success alert after purchase', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();

      await mgr.subscribe('monthly');

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to Premium')
      );
    });

    it('should hide paywall after successful purchase', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();
      mgr.showPaywall('test');

      await mgr.subscribe('monthly');

      const paywallModal = document.getElementById('paywallModal');
      expect(paywallModal.classList.contains('active')).toBe(false);
    });

    it('should handle user cancellation gracefully', async () => {
      mockPurchases.purchasePackage.mockRejectedValue({ userCancelled: true });
      const mgr = new SubscriptionManager();
      await mgr.init();

      const result = await mgr.subscribe('monthly');

      expect(result).toBe(false);
    });

    it('should handle purchase error and show alert', async () => {
      mockPurchases.purchasePackage.mockRejectedValue(new Error('Payment failed'));
      const mgr = new SubscriptionManager();
      await mgr.init();

      const result = await mgr.subscribe('monthly');

      expect(result).toBe(false);
      expect(global.alert).toHaveBeenCalledWith('Purchase failed. Please try again.');
    });

    it('should handle null offerings', async () => {
      mockPurchases.getOfferings.mockResolvedValue({ current: null });
      const mgr = new SubscriptionManager();
      await mgr.init();

      const result = await mgr.subscribe('monthly');

      expect(result).toBe(false);
    });

    it('should handle missing package for plan', async () => {
      mockPurchases.getOfferings.mockResolvedValue({
        current: { monthly: null, annual: null }
      });
      const mgr = new SubscriptionManager();
      await mgr.init();

      const result = await mgr.subscribe('monthly');

      expect(result).toBe(false);
    });
  });

  describe('restorePurchases - production', () => {
    it('should call Purchases.restorePurchases', async () => {
      const mgr = new SubscriptionManager();
      await mgr.init();

      await mgr.restorePurchases();

      expect(mockPurchases.restorePurchases).toHaveBeenCalled();
    });

    it('should show success alert when purchases restored and premium', async () => {
      mockPurchases.restorePurchases.mockResolvedValue({});
      // After restore, checkSubscriptionStatus will be called
      mockPurchases.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: { periodType: 'NORMAL', expirationDate: null }
          }
        }
      });

      const mgr = new SubscriptionManager();
      await mgr.init();
      await mgr.restorePurchases();

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('restored successfully')
      );
    });

    it('should show no subscriptions alert when nothing to restore', async () => {
      mockPurchases.restorePurchases.mockResolvedValue({});
      mockPurchases.getCustomerInfo.mockResolvedValue({
        entitlements: { active: {} }
      });

      const mgr = new SubscriptionManager();
      await mgr.init();
      await mgr.restorePurchases();

      expect(global.alert).toHaveBeenCalledWith('No active subscriptions found.');
    });

    it('should handle restore error gracefully', async () => {
      mockPurchases.restorePurchases.mockRejectedValue(new Error('Network error'));

      const mgr = new SubscriptionManager();
      await mgr.init();
      await mgr.restorePurchases();

      expect(global.alert).toHaveBeenCalledWith(
        'Failed to restore purchases. Please try again.'
      );
    });
  });

  describe('cancelSubscription - production', () => {
    it('should show App Store instructions in production mode', () => {
      const mgr = new SubscriptionManager();
      mgr.cancelSubscription();

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('iOS Settings')
      );
    });
  });
});

describe('SubscriptionManager - Premium Badges', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);

    // Add premium badge elements
    const badge1 = document.createElement('span');
    badge1.className = 'premium-badge-tab';
    document.body.appendChild(badge1);
    const badge2 = document.createElement('span');
    badge2.className = 'premium-badge-tab';
    document.body.appendChild(badge2);

    manager = new SubscriptionManager();
  });

  it('should show premium badges for free users', () => {
    manager.updatePremiumBadges();
    const badges = document.querySelectorAll('.premium-badge-tab');
    badges.forEach(badge => {
      expect(badge.style.display).toBe('inline-block');
    });
  });

  it('should hide premium badges for premium users', () => {
    manager.isPremium = true;
    manager.updatePremiumBadges();
    const badges = document.querySelectorAll('.premium-badge-tab');
    badges.forEach(badge => {
      expect(badge.style.display).toBe('none');
    });
  });

  it('should hide premium badges during trial', () => {
    manager.isTrialActive = true;
    manager.updatePremiumBadges();
    const badges = document.querySelectorAll('.premium-badge-tab');
    badges.forEach(badge => {
      expect(badge.style.display).toBe('none');
    });
  });
});

describe('SubscriptionManager - Feature Messages', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    manager = new SubscriptionManager();
  });

  it('should return correct message for All Noise Types', () => {
    expect(manager.getFeatureMessage('All Noise Types')).toContain('noise');
  });

  it('should return correct message for Music Notching', () => {
    expect(manager.getFeatureMessage('Music Notching')).toContain('music');
  });

  it('should return correct message for Advanced Controls', () => {
    expect(manager.getFeatureMessage('Advanced Controls')).toContain('frequency');
  });

  it('should return correct message for Unlimited Sessions', () => {
    expect(manager.getFeatureMessage('Unlimited Sessions')).toContain('session');
  });

  it('should return correct message for Full History', () => {
    expect(manager.getFeatureMessage('Full History')).toContain('history');
  });

  it('should return correct message for Multiple Profiles', () => {
    expect(manager.getFeatureMessage('Multiple Profiles')).toContain('profile');
  });

  it('should return correct message for Export Reports', () => {
    expect(manager.getFeatureMessage('Export Reports')).toContain('report');
  });

  it('should return default message for unknown features', () => {
    expect(manager.getFeatureMessage('Unknown Feature')).toContain('premium');
  });

  it('should use custom message when provided to lockFeature', () => {
    manager.lockFeature('anything', 'Custom lock message');
    const featureNameEl = document.getElementById('paywallFeatureName');
    expect(featureNameEl.textContent).toBe('Custom lock message');
  });

  it('should use getFeatureMessage when no custom message', () => {
    manager.lockFeature('All Noise Types');
    const featureNameEl = document.getElementById('paywallFeatureName');
    expect(featureNameEl.textContent).toContain('noise');
  });
});

describe('SubscriptionManager - showPaywall edge cases', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    manager = new SubscriptionManager();
  });

  it('should show paywall without changing feature name when message is null', () => {
    const featureNameEl = document.getElementById('paywallFeatureName');
    featureNameEl.textContent = 'original text';
    manager.showPaywall(null);

    const paywallModal = document.getElementById('paywallModal');
    expect(paywallModal.classList.contains('active')).toBe(true);
    expect(featureNameEl.textContent).toBe('original text');
  });

  it('should show paywall without changing feature name when no argument', () => {
    const featureNameEl = document.getElementById('paywallFeatureName');
    featureNameEl.textContent = 'original';
    manager.showPaywall();

    const paywallModal = document.getElementById('paywallModal');
    expect(paywallModal.classList.contains('active')).toBe(true);
    expect(featureNameEl.textContent).toBe('original');
  });
});

describe('SubscriptionManager - UI: monthly plan text', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    manager = new SubscriptionManager();
  });

  it('should show Monthly Plan text for monthly subscription', () => {
    manager.isPremium = true;
    manager.isTrialActive = false;
    manager.subscriptionType = 'monthly';
    manager.updateUI();

    const statusDays = document.getElementById('statusDays');
    expect(statusDays.textContent).toContain('Monthly Plan');
  });

  it('should show singular day when 1 trial day remaining', () => {
    manager.isTrialActive = true;
    manager.isPremium = true;
    manager.trialDaysRemaining = 1;
    manager.updateUI();

    const statusDays = document.getElementById('statusDays');
    expect(statusDays.textContent).toBe('1 day remaining');
  });

  it('should show plural days when multiple trial days remaining', () => {
    manager.isTrialActive = true;
    manager.isPremium = true;
    manager.trialDaysRemaining = 3;
    manager.updateUI();

    const statusDays = document.getElementById('statusDays');
    expect(statusDays.textContent).toBe('3 days remaining');
  });
});

describe('SubscriptionManager - onSubscriptionChange callback', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    setupDomElements();
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);
    manager = new SubscriptionManager();
  });

  it('should fire onSubscriptionChange after mock subscribe', async () => {
    const callback = vi.fn();
    manager.onSubscriptionChange = callback;

    await manager.subscribe('monthly');

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not throw when onSubscriptionChange is null', async () => {
    manager.onSubscriptionChange = null;
    await expect(manager.subscribe('monthly')).resolves.toBe(true);
  });

  it('should show mock restore message in mock mode', async () => {
    await manager.restorePurchases();
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('MOCK mode')
    );
  });
});
