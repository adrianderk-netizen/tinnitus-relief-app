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
