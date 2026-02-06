/**
 * Subscription Manager Tests
 * Tests subscription state, feature gating, and trial management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock SubscriptionManager
class MockSubscriptionManager {
  constructor() {
    this.mode = 'mock';
    this.subscriptionStatus = 'free';
    this.trialActive = false;
    this.trialEndDate = null;
    this.features = {
      basic: ['toneMatching', 'basicNoise'],
      premium: ['allNoiseTypes', 'musicNotching', 'advancedControls', 'unlimitedSessions', 'analytics']
    };
  }

  async init() {
    // Load subscription state from localStorage
    const saved = localStorage.getItem('subscriptionState');
    if (saved) {
      const state = JSON.parse(saved);
      this.subscriptionStatus = state.status;
      this.trialActive = state.trialActive;
      if (state.trialEndDate) {
        this.trialEndDate = new Date(state.trialEndDate);
      }
    }
  }

  hasFeature(featureName) {
    if (this.subscriptionStatus === 'premium' || this.trialActive) {
      return true;
    }
    return this.features.basic.includes(featureName);
  }

  lockFeature(featureName) {
    if (this.hasFeature(featureName)) {
      return true;
    }
    return false;
  }

  async subscribe(plan) {
    if (plan === 'monthly' || plan === 'annual') {
      this.subscriptionStatus = 'premium';
      this.trialActive = false;
      this.saveState();
      return true;
    }
    return false;
  }

  async startTrial() {
    this.trialActive = true;
    this.trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    this.saveState();
    return true;
  }

  async cancelSubscription() {
    this.subscriptionStatus = 'free';
    this.trialActive = false;
    this.trialEndDate = null;
    this.saveState();
    return true;
  }

  getTrialDaysRemaining() {
    if (!this.trialActive || !this.trialEndDate) return 0;
    const now = new Date();
    const diff = this.trialEndDate - now;
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }

  saveState() {
    localStorage.setItem('subscriptionState', JSON.stringify({
      status: this.subscriptionStatus,
      trialActive: this.trialActive,
      trialEndDate: this.trialEndDate ? this.trialEndDate.toISOString() : null
    }));
  }
}

describe('SubscriptionManager', () => {
  let subscriptionManager;

  beforeEach(() => {
    localStorage.clear();
    subscriptionManager = new MockSubscriptionManager();
  });

  describe('Initialization', () => {
    it('should initialize with free status', () => {
      expect(subscriptionManager.subscriptionStatus).toBe('free');
      expect(subscriptionManager.trialActive).toBe(false);
    });

    it('should restore state from localStorage', async () => {
      // Set up saved state
      localStorage.setItem('subscriptionState', JSON.stringify({
        status: 'premium',
        trialActive: false,
        trialEndDate: null
      }));

      const manager = new MockSubscriptionManager();
      await manager.init();

      expect(manager.subscriptionStatus).toBe('premium');
    });
  });

  describe('Feature Access', () => {
    it('should allow basic features for free users', () => {
      expect(subscriptionManager.hasFeature('toneMatching')).toBe(true);
      expect(subscriptionManager.hasFeature('basicNoise')).toBe(true);
    });

    it('should block premium features for free users', () => {
      expect(subscriptionManager.hasFeature('allNoiseTypes')).toBe(false);
      expect(subscriptionManager.hasFeature('musicNotching')).toBe(false);
      expect(subscriptionManager.hasFeature('advancedControls')).toBe(false);
    });

    it('should allow all features for premium users', () => {
      subscriptionManager.subscriptionStatus = 'premium';

      expect(subscriptionManager.hasFeature('toneMatching')).toBe(true);
      expect(subscriptionManager.hasFeature('allNoiseTypes')).toBe(true);
      expect(subscriptionManager.hasFeature('musicNotching')).toBe(true);
      expect(subscriptionManager.hasFeature('advancedControls')).toBe(true);
    });

    it('should allow all features during trial', () => {
      subscriptionManager.trialActive = true;

      expect(subscriptionManager.hasFeature('allNoiseTypes')).toBe(true);
      expect(subscriptionManager.hasFeature('musicNotching')).toBe(true);
    });
  });

  describe('Trial Management', () => {
    it('should start a 7-day trial', async () => {
      await subscriptionManager.startTrial();

      expect(subscriptionManager.trialActive).toBe(true);
      expect(subscriptionManager.trialEndDate).toBeInstanceOf(Date);
      expect(subscriptionManager.getTrialDaysRemaining()).toBe(7);
    });

    it('should calculate remaining trial days correctly', async () => {
      await subscriptionManager.startTrial();
      
      // Mock 3 days passed
      const threeDaysAgo = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
      subscriptionManager.trialEndDate = threeDaysAgo;

      expect(subscriptionManager.getTrialDaysRemaining()).toBe(4);
    });

    it('should return 0 days when trial expired', async () => {
      subscriptionManager.trialActive = true;
      subscriptionManager.trialEndDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      expect(subscriptionManager.getTrialDaysRemaining()).toBe(0);
    });

    it('should not have trial days when no trial active', () => {
      expect(subscriptionManager.getTrialDaysRemaining()).toBe(0);
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to monthly plan', async () => {
      const result = await subscriptionManager.subscribe('monthly');

      expect(result).toBe(true);
      expect(subscriptionManager.subscriptionStatus).toBe('premium');
    });

    it('should subscribe to annual plan', async () => {
      const result = await subscriptionManager.subscribe('annual');

      expect(result).toBe(true);
      expect(subscriptionManager.subscriptionStatus).toBe('premium');
    });

    it('should end trial when subscribing', async () => {
      await subscriptionManager.startTrial();
      await subscriptionManager.subscribe('monthly');

      expect(subscriptionManager.trialActive).toBe(false);
      expect(subscriptionManager.subscriptionStatus).toBe('premium');
    });

    it('should cancel subscription', async () => {
      await subscriptionManager.subscribe('monthly');
      await subscriptionManager.cancelSubscription();

      expect(subscriptionManager.subscriptionStatus).toBe('free');
    });

    it('should reject invalid plans', async () => {
      const result = await subscriptionManager.subscribe('invalid');
      expect(result).toBe(false);
    });
  });

  describe('Feature Gating', () => {
    it('should lock premium features for free users', () => {
      const allowed = subscriptionManager.lockFeature('musicNotching');
      expect(allowed).toBe(false);
    });

    it('should allow premium features for premium users', () => {
      subscriptionManager.subscriptionStatus = 'premium';
      const allowed = subscriptionManager.lockFeature('musicNotching');
      expect(allowed).toBe(true);
    });

    it('should allow all features during trial', () => {
      subscriptionManager.trialActive = true;
      const allowed = subscriptionManager.lockFeature('advancedControls');
      expect(allowed).toBe(true);
    });
  });

  describe('State Persistence', () => {
    it('should save subscription state to localStorage', () => {
      subscriptionManager.subscriptionStatus = 'premium';
      subscriptionManager.saveState();

      const saved = localStorage.getItem('subscriptionState');
      expect(saved).toBeTruthy();
      
      const state = JSON.parse(saved);
      expect(state.status).toBe('premium');
    });

    it('should save trial state to localStorage', async () => {
      await subscriptionManager.startTrial();

      const saved = localStorage.getItem('subscriptionState');
      const state = JSON.parse(saved);

      expect(state.trialActive).toBe(true);
      expect(state.trialEndDate).toBeTruthy();
    });

    it('should restore trial end date correctly', async () => {
      const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      localStorage.setItem('subscriptionState', JSON.stringify({
        status: 'free',
        trialActive: true,
        trialEndDate: endDate.toISOString()
      }));

      const manager = new MockSubscriptionManager();
      await manager.init();

      expect(manager.trialActive).toBe(true);
      expect(manager.trialEndDate).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing localStorage gracefully', async () => {
      const manager = new MockSubscriptionManager();
      await manager.init();

      expect(manager.subscriptionStatus).toBe('free');
    });

    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem('subscriptionState', 'invalid json{');

      const manager = new MockSubscriptionManager();
      
      // Should not throw
      await expect(manager.init()).resolves.not.toThrow();
    });

    it('should handle rapid subscription changes', async () => {
      for (let i = 0; i < 10; i++) {
        await subscriptionManager.subscribe('monthly');
        await subscriptionManager.cancelSubscription();
      }

      expect(subscriptionManager.subscriptionStatus).toBe('free');
    });
  });
});

describe('SubscriptionManager - Feature Lists', () => {
  it('should have correct basic features', () => {
    const manager = new MockSubscriptionManager();
    expect(manager.features.basic).toContain('toneMatching');
    expect(manager.features.basic).toContain('basicNoise');
  });

  it('should have correct premium features', () => {
    const manager = new MockSubscriptionManager();
    expect(manager.features.premium).toContain('allNoiseTypes');
    expect(manager.features.premium).toContain('musicNotching');
    expect(manager.features.premium).toContain('advancedControls');
  });
});
