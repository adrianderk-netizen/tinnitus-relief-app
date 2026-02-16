/**
 * Wizard Manager Tests
 * Tests step progression, mode locking, completion, and localStorage state
 * Uses the REAL WizardManager class from js/wizard-manager.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WizardManager } from '../js/wizard-manager.js';

describe('WizardManager', () => {
  let wizard;
  let mockApp;

  beforeEach(() => {
    localStorage.clear();

    // Mock app object with the methods WizardManager calls
    mockApp = {
      switchMode: vi.fn()
    };

    // Build the minimal DOM structure that WizardManager expects:
    //  - A .container element with a <header> child (for showWizardUI insertBefore)
    //  - .tab-btn elements with data-mode attributes (for lockModes)
    document.body.innerHTML = `
      <div class="container">
        <header></header>
        <button class="tab-btn" data-mode="tone-matcher">Tone Matcher</button>
        <button class="tab-btn" data-mode="notched-noise">Notched Noise</button>
        <button class="tab-btn" data-mode="sound-library">Sound Library</button>
      </div>
    `;

    // Mock window.confirm so skipWizard can proceed without user interaction
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Use fake timers so we can control setTimeout (used in nextStep and elsewhere)
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should not start wizard if onboarding not complete', () => {
      wizard = new WizardManager(mockApp);
      expect(wizard.isWizardMode).toBe(false);
    });

    it('should start wizard after onboarding is complete', () => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
      expect(wizard.isWizardMode).toBe(true);
      expect(wizard.currentStep).toBe(0);
    });

    it('should not start wizard if previously completed', () => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      localStorage.setItem('tinnitusWizardComplete', 'true');
      wizard = new WizardManager(mockApp);
      expect(wizard.isWizardMode).toBe(false);
      expect(wizard.wizardComplete).toBe(true);
    });

    it('should create wizard banner UI when wizard starts', () => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
      const banner = document.querySelector('.wizard-banner');
      expect(banner).not.toBeNull();
    });
  });

  describe('Step Progression', () => {
    beforeEach(() => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
    });

    it('should start at step 0 (welcome)', () => {
      expect(wizard.currentStep).toBe(0);
      expect(wizard.getCurrentStep().id).toBe('welcome');
    });

    it('should have 4 steps total', () => {
      expect(wizard.steps).toHaveLength(4);
    });

    it('should advance on matching action', () => {
      wizard.currentStep = 1; // find-frequency step
      wizard.completeCurrentStep('frequency-marked');
      expect(wizard.currentStep).toBe(2);
    });

    it('should not advance on wrong action', () => {
      wizard.currentStep = 1;
      wizard.completeCurrentStep('wrong-action');
      expect(wizard.currentStep).toBe(1);
    });

    it('should not advance past last step', () => {
      wizard.currentStep = 3;
      wizard.nextStep();
      expect(wizard.currentStep).toBe(3);
    });

    it('should progress through all steps correctly', () => {
      // Step 0 -> 1 (nextStep, since welcome has no required action)
      wizard.nextStep();
      expect(wizard.getCurrentStep().id).toBe('find-frequency');

      // Step 1 -> 2
      wizard.completeCurrentStep('frequency-marked');
      expect(wizard.getCurrentStep().id).toBe('test-therapy');

      // Step 2 -> 3
      wizard.completeCurrentStep('therapy-tested');
      expect(wizard.getCurrentStep().id).toBe('complete');
    });

    it('should update wizard banner text when step changes', () => {
      wizard.nextStep(); // move to step 1
      const title = document.getElementById('wizardTitle');
      expect(title.textContent).toBe('Step 1: Find Your Frequency');
    });

    it('should call app.switchMode when step has an allowedMode', () => {
      wizard.nextStep(); // step 1: find-frequency, allowedMode = 'tone-matcher'
      expect(mockApp.switchMode).toHaveBeenCalledWith('tone-matcher');
    });

    it('should schedule completeWizard when reaching the final step', () => {
      wizard.nextStep(); // step 1
      wizard.nextStep(); // step 2
      wizard.nextStep(); // step 3 (complete) - triggers setTimeout

      expect(wizard.isWizardMode).toBe(true); // still active before timer fires

      vi.advanceTimersByTime(3000);
      expect(wizard.isWizardMode).toBe(false);
      expect(wizard.wizardComplete).toBe(true);
    });
  });

  describe('Mode Locking', () => {
    beforeEach(() => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
    });

    it('should lock non-tone-matcher tabs at welcome step', () => {
      const notchedBtn = document.querySelector('.tab-btn[data-mode="notched-noise"]');
      expect(notchedBtn.classList.contains('wizard-locked')).toBe(true);
      expect(notchedBtn.style.pointerEvents).toBe('none');
    });

    it('should allow tone-matcher at welcome step', () => {
      const toneBtn = document.querySelector('.tab-btn[data-mode="tone-matcher"]');
      expect(toneBtn.classList.contains('wizard-locked')).toBe(false);
    });

    it('should allow tone-matcher at find-frequency step', () => {
      wizard.currentStep = 1;
      wizard.lockModes();
      const toneBtn = document.querySelector('.tab-btn[data-mode="tone-matcher"]');
      expect(toneBtn.classList.contains('wizard-locked')).toBe(false);
    });

    it('should allow notched-noise at therapy step', () => {
      wizard.currentStep = 2;
      wizard.lockModes();
      const notchedBtn = document.querySelector('.tab-btn[data-mode="notched-noise"]');
      expect(notchedBtn.classList.contains('wizard-locked')).toBe(false);
    });

    it('should unlock all modes at complete step', () => {
      wizard.currentStep = 3;
      wizard.lockModes();
      const allBtns = document.querySelectorAll('.tab-btn');
      allBtns.forEach(btn => {
        expect(btn.classList.contains('wizard-locked')).toBe(false);
      });
    });

    it('should unlock all modes when wizard mode is off', () => {
      wizard.isWizardMode = false;
      wizard.lockModes();
      const allBtns = document.querySelectorAll('.tab-btn');
      allBtns.forEach(btn => {
        expect(btn.classList.contains('wizard-locked')).toBe(false);
        expect(btn.style.pointerEvents).toBe('');
      });
    });
  });

  describe('Wizard Completion', () => {
    beforeEach(() => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
    });

    it('should mark as complete', () => {
      wizard.completeWizard();
      expect(wizard.isWizardMode).toBe(false);
      expect(wizard.wizardComplete).toBe(true);
    });

    it('should persist completion to localStorage', () => {
      wizard.completeWizard();
      expect(localStorage.getItem('tinnitusWizardComplete')).toBe('true');
    });

    it('should not accept step completions after wizard done', () => {
      wizard.completeWizard();
      wizard.currentStep = 1;
      wizard.completeCurrentStep('frequency-marked');
      expect(wizard.currentStep).toBe(1); // unchanged
    });

    it('should show celebration UI on completion', () => {
      wizard.completeWizard();
      const celebration = document.querySelector('.wizard-celebration');
      expect(celebration).not.toBeNull();
    });

    it('should unlock all tab buttons on completion', () => {
      wizard.completeWizard();
      const allBtns = document.querySelectorAll('.tab-btn');
      allBtns.forEach(btn => {
        expect(btn.classList.contains('wizard-locked')).toBe(false);
      });
    });
  });

  describe('Skip Wizard', () => {
    beforeEach(() => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
    });

    it('should complete wizard when skipped and user confirms', () => {
      window.confirm.mockReturnValue(true);
      wizard.skipWizard();
      expect(wizard.wizardComplete).toBe(true);
      expect(wizard.isWizardMode).toBe(false);
    });

    it('should persist skip to localStorage', () => {
      window.confirm.mockReturnValue(true);
      wizard.skipWizard();
      expect(localStorage.getItem('tinnitusWizardComplete')).toBe('true');
    });

    it('should not skip wizard when user cancels confirm', () => {
      window.confirm.mockReturnValue(false);
      wizard.skipWizard();
      expect(wizard.wizardComplete).toBe(false);
      expect(wizard.isWizardMode).toBe(true);
    });
  });

  describe('Restart Wizard', () => {
    beforeEach(() => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
    });

    it('should restart from step 0', () => {
      wizard.currentStep = 3;
      wizard.completeWizard();
      wizard.restartWizard();

      expect(wizard.currentStep).toBe(0);
      expect(wizard.isWizardMode).toBe(true);
      expect(wizard.wizardComplete).toBe(false);
    });

    it('should recreate wizard banner UI on restart', () => {
      wizard.completeWizard();
      // Allow the banner hide animation timeout
      vi.advanceTimersByTime(300);
      wizard.restartWizard();
      const banner = document.querySelector('.wizard-banner');
      expect(banner).not.toBeNull();
    });
  });

  describe('isComplete Helper', () => {
    it('should return false initially', () => {
      wizard = new WizardManager(mockApp);
      expect(wizard.isComplete()).toBe(false);
    });

    it('should return true after completion', () => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
      wizard.completeWizard();
      expect(wizard.isComplete()).toBe(true);
    });
  });

  describe('getCurrentStep', () => {
    it('should return the correct step object', () => {
      localStorage.setItem('tinnitusOnboardingComplete', 'true');
      wizard = new WizardManager(mockApp);
      const step = wizard.getCurrentStep();
      expect(step.id).toBe('welcome');
      expect(step.title).toBe('Welcome to Setup!');
    });
  });
});
