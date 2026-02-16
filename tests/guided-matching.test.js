/**
 * Guided Matching Wizard Tests
 * Tests the full step-by-step frequency matching flow:
 * launch, close, step navigation, ear selection, sweep engine,
 * frequency marking, confidence calculation, and result saving.
 * Uses the REAL GuidedMatchingWizard class from js/guided-matching.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GuidedMatchingWizard } from '../js/guided-matching.js';

// Helper to create a mock oscillator with spyable methods
function createMockOscillator() {
  return {
    frequency: { value: 440, setTargetAtTime: vi.fn() },
    type: 'sine',
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  };
}

function createMockGainNode() {
  return {
    gain: { value: 1, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn()
  };
}

function createMockPannerNode() {
  return {
    pan: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn()
  };
}

function createMockApp() {
  return {
    audioEngine: {
      init: vi.fn(),
      createOscillator: vi.fn(() => createMockOscillator()),
      createGain: vi.fn(() => createMockGainNode()),
      createPanner: vi.fn(() => createMockPannerNode()),
      connectToMaster: vi.fn(),
      currentTime: 0
    },
    matchedFrequencies: { left: 0, right: 0 },
    noiseState: { notchFreq: 0 },
    musicState: { notchFreq: 0 },
    autoSaveState: vi.fn(),
    switchMode: vi.fn(),
    dashboardManager: {
      updateMatchedFrequency: vi.fn()
    },
    wizardManager: {
      isWizardMode: false,
      completeCurrentStep: vi.fn()
    },
    els: {
      leftMatchedFreq: document.createElement('span'),
      rightMatchedFreq: document.createElement('span')
    }
  };
}

describe('GuidedMatchingWizard', () => {
  let wizard;
  let mockApp;
  let rafCallbacks;
  let rafIdCounter;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';

    mockApp = createMockApp();

    // Mock requestAnimationFrame / cancelAnimationFrame
    rafCallbacks = {};
    rafIdCounter = 0;
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      const id = ++rafIdCounter;
      rafCallbacks[id] = cb;
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => {
      delete rafCallbacks[id];
    }));

    // Mock performance.now
    let perfTime = 1000;
    vi.stubGlobal('performance', {
      now: vi.fn(() => perfTime),
      // helper to advance time in tests
      _setTime: (t) => { perfTime = t; }
    });

    // Mock navigator.vibrate
    vi.stubGlobal('navigator', {
      ...navigator,
      vibrate: vi.fn()
    });

    wizard = new GuidedMatchingWizard(mockApp);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  // Helper: fire one pending rAF callback
  function flushOneFrame() {
    const ids = Object.keys(rafCallbacks);
    if (ids.length > 0) {
      const id = ids[0];
      const cb = rafCallbacks[id];
      delete rafCallbacks[id];
      cb();
    }
  }

  // ---------------------------------------------------------------
  // 1. Construction - default state values
  // ---------------------------------------------------------------
  describe('Construction', () => {
    it('should store the app reference', () => {
      expect(wizard.app).toBe(mockApp);
    });

    it('should store the audioEngine reference', () => {
      expect(wizard.audioEngine).toBe(mockApp.audioEngine);
    });

    it('should initialize currentStep to 0', () => {
      expect(wizard.currentStep).toBe(0);
    });

    it('should default selectedEar to both', () => {
      expect(wizard.selectedEar).toBe('both');
    });

    it('should default isActive to false', () => {
      expect(wizard.isActive).toBe(false);
    });

    it('should default isPlaying to false', () => {
      expect(wizard.isPlaying).toBe(false);
    });

    it('should default isPaused to false', () => {
      expect(wizard.isPaused).toBe(false);
    });

    it('should default currentFreq to 1000', () => {
      expect(wizard.currentFreq).toBe(1000);
    });

    it('should default sweepSpeed to 100', () => {
      expect(wizard.sweepSpeed).toBe(100);
    });

    it('should default startFreq to 1000 and endFreq to 12000', () => {
      expect(wizard.startFreq).toBe(1000);
      expect(wizard.endFreq).toBe(12000);
    });

    it('should default volume to 0.3', () => {
      expect(wizard.volume).toBe(0.3);
    });

    it('should default matchedFrequencies to empty array', () => {
      expect(wizard.matchedFrequencies).toEqual([]);
    });

    it('should default oscillator, gainNode, pannerNode to null', () => {
      expect(wizard.oscillator).toBeNull();
      expect(wizard.gainNode).toBeNull();
      expect(wizard.pannerNode).toBeNull();
    });

    it('should default animationId to null', () => {
      expect(wizard.animationId).toBeNull();
    });

    it('should default onComplete to null', () => {
      expect(wizard.onComplete).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // 2. launch()
  // ---------------------------------------------------------------
  describe('launch()', () => {
    it('should set isActive to true', () => {
      wizard.launch();
      expect(wizard.isActive).toBe(true);
    });

    it('should reset currentStep to 0', () => {
      wizard.currentStep = 3;
      wizard.launch();
      expect(wizard.currentStep).toBe(0);
    });

    it('should reset matchedFrequencies to empty array', () => {
      wizard.matchedFrequencies = [4000, 5000];
      wizard.launch();
      expect(wizard.matchedFrequencies).toEqual([]);
    });

    it('should call stopSweep to clean up any running sweep', () => {
      const stopSpy = vi.spyOn(wizard, 'stopSweep');
      wizard.launch();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should call createModal', () => {
      const createSpy = vi.spyOn(wizard, 'createModal');
      wizard.launch();
      expect(createSpy).toHaveBeenCalled();
    });

    it('should call showStep(0)', () => {
      const showSpy = vi.spyOn(wizard, 'showStep');
      wizard.launch();
      expect(showSpy).toHaveBeenCalledWith(0);
    });

    it('should create the modal element in the DOM', () => {
      wizard.launch();
      const modal = document.getElementById('guidedMatchingModal');
      expect(modal).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // 3. close()
  // ---------------------------------------------------------------
  describe('close()', () => {
    beforeEach(() => {
      wizard.launch();
    });

    it('should call stopSweep', () => {
      const stopSpy = vi.spyOn(wizard, 'stopSweep');
      wizard.close();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should set isActive to false', () => {
      wizard.close();
      expect(wizard.isActive).toBe(false);
    });

    it('should add closing class to modal', () => {
      wizard.close();
      const modal = document.getElementById('guidedMatchingModal');
      expect(modal.classList.contains('closing')).toBe(true);
    });

    it('should remove modal from DOM after 300ms', () => {
      wizard.close();
      // Modal still exists before timeout
      expect(document.getElementById('guidedMatchingModal')).not.toBeNull();
      vi.advanceTimersByTime(300);
      expect(document.getElementById('guidedMatchingModal')).toBeNull();
    });

    it('should handle close when no modal exists', () => {
      document.getElementById('guidedMatchingModal')?.remove();
      expect(() => wizard.close()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------
  // 4. createModal()
  // ---------------------------------------------------------------
  describe('createModal()', () => {
    it('should create a modal element with the correct id', () => {
      wizard.createModal();
      const modal = document.getElementById('guidedMatchingModal');
      expect(modal).not.toBeNull();
      expect(modal.className).toContain('guided-modal');
    });

    it('should remove existing modal before creating new one', () => {
      wizard.createModal();
      wizard.createModal();
      const modals = document.querySelectorAll('#guidedMatchingModal');
      expect(modals.length).toBe(1);
    });

    it('should create 4 progress dots', () => {
      wizard.createModal();
      const dots = document.querySelectorAll('.gp-dot');
      expect(dots.length).toBe(4);
    });

    it('should create close button that calls close()', () => {
      wizard.createModal();
      const closeSpy = vi.spyOn(wizard, 'close');
      const closeBtn = document.getElementById('guidedClose');
      closeBtn.click();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should have a guidedBody container', () => {
      wizard.createModal();
      const body = document.getElementById('guidedBody');
      expect(body).not.toBeNull();
    });

    it('should add open class via requestAnimationFrame', () => {
      wizard.createModal();
      flushOneFrame();
      const modal = document.getElementById('guidedMatchingModal');
      expect(modal.classList.contains('open')).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // 5. showStep()
  // ---------------------------------------------------------------
  describe('showStep()', () => {
    beforeEach(() => {
      wizard.launch();
    });

    it('should update currentStep', () => {
      wizard.showStep(2);
      expect(wizard.currentStep).toBe(2);
    });

    it('should set active class on dots up to current step', () => {
      wizard.showStep(2);
      const dots = document.querySelectorAll('.gp-dot');
      expect(dots[0].classList.contains('active')).toBe(true);
      expect(dots[1].classList.contains('active')).toBe(true);
      expect(dots[2].classList.contains('active')).toBe(true);
      expect(dots[3].classList.contains('active')).toBe(false);
    });

    it('should set done class on dots before current step', () => {
      wizard.showStep(2);
      const dots = document.querySelectorAll('.gp-dot');
      expect(dots[0].classList.contains('done')).toBe(true);
      expect(dots[1].classList.contains('done')).toBe(true);
      expect(dots[2].classList.contains('done')).toBe(false);
    });

    it('should set active class on lines before current step', () => {
      wizard.showStep(2);
      const lines = document.querySelectorAll('.gp-line');
      expect(lines[0].classList.contains('active')).toBe(true);
      expect(lines[1].classList.contains('active')).toBe(true);
      expect(lines[2].classList.contains('active')).toBe(false);
    });

    it('should do nothing if guidedBody is not present', () => {
      document.body.innerHTML = '';
      expect(() => wizard.showStep(1)).not.toThrow();
    });

    it('should render welcome for step 0', () => {
      const spy = vi.spyOn(wizard, 'renderWelcome');
      wizard.showStep(0);
      expect(spy).toHaveBeenCalled();
    });

    it('should render ear select for step 1', () => {
      const spy = vi.spyOn(wizard, 'renderEarSelect');
      wizard.showStep(1);
      expect(spy).toHaveBeenCalled();
    });

    it('should render sweep for step 2', () => {
      const spy = vi.spyOn(wizard, 'renderSweep');
      wizard.showStep(2);
      expect(spy).toHaveBeenCalled();
    });

    it('should render confirm for step 3', () => {
      wizard.matchedFrequencies = [5000];
      const spy = vi.spyOn(wizard, 'renderConfirm');
      wizard.showStep(3);
      expect(spy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // 6. Step navigation
  // ---------------------------------------------------------------
  describe('Step navigation', () => {
    beforeEach(() => {
      wizard.launch();
    });

    it('should navigate from welcome (step 0) to ear select (step 1) via I\'m Ready button', () => {
      const readyBtn = document.getElementById('gsNext');
      readyBtn.click();
      expect(wizard.currentStep).toBe(1);
    });

    it('should navigate from ear select (step 1) to sweep (step 2) via Next', () => {
      wizard.showStep(1);
      document.getElementById('gsNext').click();
      expect(wizard.currentStep).toBe(2);
    });

    it('should navigate back from ear select (step 1) to welcome (step 0)', () => {
      wizard.showStep(1);
      document.getElementById('gsBack').click();
      expect(wizard.currentStep).toBe(0);
    });

    it('should navigate back from sweep (step 2) to ear select (step 1) and stop sweep', () => {
      wizard.showStep(2);
      const stopSpy = vi.spyOn(wizard, 'stopSweep');
      document.getElementById('gsBack').click();
      expect(wizard.currentStep).toBe(1);
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should navigate from sweep (step 2) to confirm (step 3) via Next and stop sweep', () => {
      wizard.showStep(2);
      wizard.matchedFrequencies = [5000];
      // Re-render so next button is enabled
      wizard.showStep(2);
      const stopSpy = vi.spyOn(wizard, 'stopSweep');
      document.getElementById('gsNext').click();
      expect(wizard.currentStep).toBe(3);
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should navigate back from confirm (step 3) to sweep (step 2) and reset state', () => {
      wizard.matchedFrequencies = [5000, 6000];
      wizard.showStep(3);
      document.getElementById('gsBack').click();
      expect(wizard.currentStep).toBe(2);
      expect(wizard.matchedFrequencies).toEqual([]);
      expect(wizard.currentFreq).toBe(wizard.startFreq);
    });
  });

  // ---------------------------------------------------------------
  // 7. Ear selection
  // ---------------------------------------------------------------
  describe('Ear selection', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(1);
    });

    it('should default to both selected', () => {
      const bothBtn = document.querySelector('.gs-ear-btn[data-ear="both"]');
      expect(bothBtn.classList.contains('selected')).toBe(true);
    });

    it('should update selectedEar when clicking left', () => {
      const leftBtn = document.querySelector('.gs-ear-btn[data-ear="left"]');
      leftBtn.click();
      expect(wizard.selectedEar).toBe('left');
    });

    it('should update selectedEar when clicking right', () => {
      const rightBtn = document.querySelector('.gs-ear-btn[data-ear="right"]');
      rightBtn.click();
      expect(wizard.selectedEar).toBe('right');
    });

    it('should add selected class to clicked button and remove from others', () => {
      const leftBtn = document.querySelector('.gs-ear-btn[data-ear="left"]');
      const bothBtn = document.querySelector('.gs-ear-btn[data-ear="both"]');
      leftBtn.click();
      expect(leftBtn.classList.contains('selected')).toBe(true);
      expect(bothBtn.classList.contains('selected')).toBe(false);
    });

    it('should render right ear button with selected class when selectedEar is right', () => {
      wizard.selectedEar = 'right';
      wizard.showStep(1);
      const rightBtn = document.querySelector('.gs-ear-btn[data-ear="right"]');
      expect(rightBtn.classList.contains('selected')).toBe(true);
      const bothBtn = document.querySelector('.gs-ear-btn[data-ear="both"]');
      expect(bothBtn.classList.contains('selected')).toBe(false);
      const leftBtn = document.querySelector('.gs-ear-btn[data-ear="left"]');
      expect(leftBtn.classList.contains('selected')).toBe(false);
    });

    it('should render left ear button with selected class when selectedEar is left', () => {
      wizard.selectedEar = 'left';
      wizard.showStep(1);
      const leftBtn = document.querySelector('.gs-ear-btn[data-ear="left"]');
      expect(leftBtn.classList.contains('selected')).toBe(true);
      const bothBtn = document.querySelector('.gs-ear-btn[data-ear="both"]');
      expect(bothBtn.classList.contains('selected')).toBe(false);
    });

    it('should allow switching between ears', () => {
      const leftBtn = document.querySelector('.gs-ear-btn[data-ear="left"]');
      const rightBtn = document.querySelector('.gs-ear-btn[data-ear="right"]');
      leftBtn.click();
      expect(wizard.selectedEar).toBe('left');
      rightBtn.click();
      expect(wizard.selectedEar).toBe('right');
      expect(leftBtn.classList.contains('selected')).toBe(false);
      expect(rightBtn.classList.contains('selected')).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // 8. startSweep()
  // ---------------------------------------------------------------
  describe('startSweep()', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(2);
    });

    it('should call audioEngine.init()', () => {
      wizard.startSweep();
      expect(mockApp.audioEngine.init).toHaveBeenCalled();
    });

    it('should create oscillator with startFreq and sine type', () => {
      wizard.startSweep();
      expect(mockApp.audioEngine.createOscillator).toHaveBeenCalledWith(wizard.startFreq, 'sine');
    });

    it('should create gain node with volume', () => {
      wizard.startSweep();
      expect(mockApp.audioEngine.createGain).toHaveBeenCalledWith(wizard.volume);
    });

    it('should create panner with 0 for both ears', () => {
      wizard.selectedEar = 'both';
      wizard.startSweep();
      expect(mockApp.audioEngine.createPanner).toHaveBeenCalledWith(0);
    });

    it('should create panner with -1 for left ear', () => {
      wizard.selectedEar = 'left';
      wizard.startSweep();
      expect(mockApp.audioEngine.createPanner).toHaveBeenCalledWith(-1);
    });

    it('should create panner with 1 for right ear', () => {
      wizard.selectedEar = 'right';
      wizard.startSweep();
      expect(mockApp.audioEngine.createPanner).toHaveBeenCalledWith(1);
    });

    it('should connect oscillator -> gain -> panner -> master', () => {
      wizard.startSweep();
      expect(wizard.oscillator.connect).toHaveBeenCalledWith(wizard.gainNode);
      expect(wizard.gainNode.connect).toHaveBeenCalledWith(wizard.pannerNode);
      expect(mockApp.audioEngine.connectToMaster).toHaveBeenCalledWith(wizard.pannerNode);
    });

    it('should start the oscillator', () => {
      wizard.startSweep();
      expect(wizard.oscillator.start).toHaveBeenCalled();
    });

    it('should set isPlaying to true', () => {
      wizard.startSweep();
      expect(wizard.isPlaying).toBe(true);
    });

    it('should enable the match button', () => {
      wizard.startSweep();
      const matchBtn = document.getElementById('gsMatchBtn');
      expect(matchBtn.disabled).toBe(false);
    });

    it('should request animation frame for sweep', () => {
      wizard.startSweep();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should guard against double start when already playing and not paused', () => {
      wizard.startSweep();
      mockApp.audioEngine.createOscillator.mockClear();
      wizard.startSweep();
      expect(mockApp.audioEngine.createOscillator).not.toHaveBeenCalled();
    });

    it('should handle resume from pause without creating new nodes', () => {
      wizard.startSweep();
      wizard.isPaused = true;
      mockApp.audioEngine.createOscillator.mockClear();
      wizard.startSweep();
      // Should not create new oscillator when resuming
      expect(mockApp.audioEngine.createOscillator).not.toHaveBeenCalled();
      expect(wizard.isPaused).toBe(false);
      expect(wizard.isPlaying).toBe(true);
    });

    it('should set currentFreq to startFreq on fresh start', () => {
      wizard.currentFreq = 5000;
      wizard.startSweep();
      expect(wizard.currentFreq).toBe(wizard.startFreq);
    });
  });

  // ---------------------------------------------------------------
  // 9. togglePause()
  // ---------------------------------------------------------------
  describe('togglePause()', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(2);
    });

    it('should do nothing if not playing', () => {
      wizard.isPlaying = false;
      wizard.togglePause();
      expect(wizard.isPaused).toBe(false);
    });

    it('should toggle isPaused to true when playing', () => {
      wizard.startSweep();
      wizard.togglePause();
      expect(wizard.isPaused).toBe(true);
    });

    it('should toggle isPaused back to false and restart animation', () => {
      wizard.startSweep();
      wizard.togglePause(); // pause
      expect(wizard.isPaused).toBe(true);
      const animateSpy = vi.spyOn(wizard, 'animateSweep');
      wizard.togglePause(); // unpause
      expect(wizard.isPaused).toBe(false);
      expect(animateSpy).toHaveBeenCalled();
    });

    it('should update lastUpdateTime when resuming', () => {
      wizard.startSweep();
      wizard.togglePause(); // pause
      performance._setTime(5000);
      wizard.togglePause(); // resume
      expect(wizard.lastUpdateTime).toBe(5000);
    });
  });

  // ---------------------------------------------------------------
  // 10. stopSweep()
  // ---------------------------------------------------------------
  describe('stopSweep()', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(2);
      wizard.startSweep();
    });

    it('should set isPlaying to false', () => {
      wizard.stopSweep();
      expect(wizard.isPlaying).toBe(false);
    });

    it('should set isPaused to false', () => {
      wizard.isPaused = true;
      wizard.stopSweep();
      expect(wizard.isPaused).toBe(false);
    });

    it('should stop the oscillator', () => {
      const osc = wizard.oscillator;
      wizard.stopSweep();
      expect(osc.stop).toHaveBeenCalled();
    });

    it('should disconnect the oscillator', () => {
      const osc = wizard.oscillator;
      wizard.stopSweep();
      expect(osc.disconnect).toHaveBeenCalled();
    });

    it('should null out oscillator', () => {
      wizard.stopSweep();
      expect(wizard.oscillator).toBeNull();
    });

    it('should cancel animation frame', () => {
      const animId = wizard.animationId;
      wizard.stopSweep();
      expect(cancelAnimationFrame).toHaveBeenCalledWith(animId);
    });

    it('should null out animationId', () => {
      wizard.stopSweep();
      expect(wizard.animationId).toBeNull();
    });

    it('should null out gainNode and pannerNode', () => {
      wizard.stopSweep();
      expect(wizard.gainNode).toBeNull();
      expect(wizard.pannerNode).toBeNull();
    });

    it('should handle stopSweep when no oscillator exists', () => {
      wizard.oscillator = null;
      wizard.animationId = null;
      expect(() => wizard.stopSweep()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------
  // 11. animateSweep()
  // ---------------------------------------------------------------
  describe('animateSweep()', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(2);
    });

    it('should return immediately if not playing', () => {
      wizard.isPlaying = false;
      requestAnimationFrame.mockClear();
      wizard.animateSweep();
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('should return immediately if paused', () => {
      wizard.isPlaying = true;
      wizard.isPaused = true;
      requestAnimationFrame.mockClear();
      wizard.animateSweep();
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('should advance frequency based on sweepSpeed and dt', () => {
      wizard.startSweep();
      // startSweep sets lastUpdateTime to 1000 and calls animateSweep
      // Clear to control manually
      wizard.isPaused = true; // stop auto-advance
      wizard.isPaused = false;

      const initialFreq = wizard.currentFreq;
      // Advance time by 500ms (0.5s)
      performance._setTime(1500);
      wizard.lastUpdateTime = 1000;
      wizard.animateSweep();
      // sweepSpeed = 100 Hz/s, dt = 0.5s => freq should advance by 50 Hz
      expect(wizard.currentFreq).toBeCloseTo(initialFreq + 50, 0);
    });

    it('should update oscillator frequency', () => {
      wizard.startSweep();
      performance._setTime(1500);
      wizard.lastUpdateTime = 1000;
      // Manually call animateSweep (clear previous rAF calls)
      requestAnimationFrame.mockClear();
      wizard.animateSweep();
      expect(wizard.oscillator.frequency.setTargetAtTime).toHaveBeenCalled();
    });

    it('should update the frequency display', () => {
      wizard.startSweep();
      performance._setTime(1500);
      wizard.lastUpdateTime = 1000;
      wizard.animateSweep();
      const freqVal = document.getElementById('gsFreqVal');
      expect(freqVal.textContent).toContain('Hz');
    });

    it('should request another animation frame', () => {
      wizard.startSweep();
      requestAnimationFrame.mockClear();
      performance._setTime(1100);
      wizard.lastUpdateTime = 1000;
      wizard.animateSweep();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should call onSweepComplete when freq reaches endFreq', () => {
      wizard.startSweep();
      const completeSpy = vi.spyOn(wizard, 'onSweepComplete');
      wizard.currentFreq = 11999;
      // Advance by enough to push past endFreq
      performance._setTime(2000);
      wizard.lastUpdateTime = 1000;
      wizard.animateSweep();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should cap currentFreq at endFreq when completing', () => {
      wizard.startSweep();
      vi.spyOn(wizard, 'onSweepComplete').mockImplementation(() => {});
      wizard.currentFreq = 11999;
      performance._setTime(2000);
      wizard.lastUpdateTime = 1000;
      wizard.animateSweep();
      expect(wizard.currentFreq).toBe(wizard.endFreq);
    });
  });

  // ---------------------------------------------------------------
  // 12. markFrequency()
  // ---------------------------------------------------------------
  describe('markFrequency()', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(2);
    });

    it('should do nothing if not playing', () => {
      wizard.isPlaying = false;
      wizard.markFrequency();
      expect(wizard.matchedFrequencies).toEqual([]);
    });

    it('should record rounded current frequency', () => {
      wizard.startSweep();
      wizard.currentFreq = 4567.8;
      wizard.markFrequency();
      expect(wizard.matchedFrequencies).toContain(4568);
    });

    it('should push multiple frequencies', () => {
      wizard.startSweep();
      wizard.currentFreq = 3000;
      wizard.markFrequency();
      wizard.currentFreq = 5000;
      wizard.markFrequency();
      expect(wizard.matchedFrequencies).toEqual([3000, 5000]);
    });

    it('should call navigator.vibrate', () => {
      wizard.startSweep();
      wizard.currentFreq = 4000;
      wizard.markFrequency();
      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('should add pulse class to match button and remove after 400ms', () => {
      wizard.startSweep();
      wizard.currentFreq = 4000;
      wizard.markFrequency();
      const btn = document.getElementById('gsMatchBtn');
      expect(btn.classList.contains('pulse')).toBe(true);
      vi.advanceTimersByTime(400);
      expect(btn.classList.contains('pulse')).toBe(false);
    });

    it('should show match info and update count', () => {
      wizard.startSweep();
      wizard.currentFreq = 4000;
      wizard.markFrequency();
      const info = document.getElementById('gsMatchInfo');
      const count = document.getElementById('gsMatchCount');
      expect(info.style.display).toBe('');
      expect(count.textContent).toBe('1');
    });

    it('should enable the Next button', () => {
      wizard.startSweep();
      wizard.currentFreq = 4000;
      wizard.markFrequency();
      const nextBtn = document.getElementById('gsNext');
      expect(nextBtn.disabled).toBe(false);
    });

    it('should increment match count correctly', () => {
      wizard.startSweep();
      wizard.currentFreq = 3000;
      wizard.markFrequency();
      wizard.currentFreq = 4000;
      wizard.markFrequency();
      wizard.currentFreq = 5000;
      wizard.markFrequency();
      const count = document.getElementById('gsMatchCount');
      expect(count.textContent).toBe('3');
    });
  });

  // ---------------------------------------------------------------
  // 13. calculateConfidence()
  // ---------------------------------------------------------------
  describe('calculateConfidence()', () => {
    it('should return 0 for no matches', () => {
      wizard.matchedFrequencies = [];
      expect(wizard.calculateConfidence()).toBe(0);
    });

    it('should return 30 for exactly 1 match', () => {
      wizard.matchedFrequencies = [5000];
      expect(wizard.calculateConfidence()).toBe(30);
    });

    it('should return 100 for identical matches (zero stdDev)', () => {
      wizard.matchedFrequencies = [5000, 5000, 5000];
      expect(wizard.calculateConfidence()).toBe(100);
    });

    it('should return high confidence for closely grouped matches', () => {
      wizard.matchedFrequencies = [5000, 5010, 4990];
      const confidence = wizard.calculateConfidence();
      expect(confidence).toBeGreaterThan(90);
    });

    it('should return lower confidence for spread matches', () => {
      wizard.matchedFrequencies = [2000, 8000];
      const confidence = wizard.calculateConfidence();
      expect(confidence).toBeLessThan(50);
    });

    it('should clamp to 0 minimum', () => {
      wizard.matchedFrequencies = [1000, 12000];
      const confidence = wizard.calculateConfidence();
      expect(confidence).toBeGreaterThanOrEqual(0);
    });

    it('should clamp to 100 maximum', () => {
      wizard.matchedFrequencies = [5000, 5000];
      const confidence = wizard.calculateConfidence();
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should return a rounded integer', () => {
      wizard.matchedFrequencies = [5000, 5050, 5100];
      const confidence = wizard.calculateConfidence();
      expect(confidence).toBe(Math.round(confidence));
    });
  });

  // ---------------------------------------------------------------
  // 14. saveResult()
  // ---------------------------------------------------------------
  describe('saveResult()', () => {
    const testFreq = 6000;

    beforeEach(() => {
      wizard.launch();
    });

    it('should save to both left and right when selectedEar is both', () => {
      wizard.selectedEar = 'both';
      wizard.saveResult(testFreq);
      expect(mockApp.matchedFrequencies.left).toBe(testFreq);
      expect(mockApp.matchedFrequencies.right).toBe(testFreq);
    });

    it('should save only to left when selectedEar is left', () => {
      wizard.selectedEar = 'left';
      wizard.saveResult(testFreq);
      expect(mockApp.matchedFrequencies.left).toBe(testFreq);
      expect(mockApp.matchedFrequencies.right).toBe(0);
    });

    it('should save only to right when selectedEar is right', () => {
      wizard.selectedEar = 'right';
      wizard.saveResult(testFreq);
      expect(mockApp.matchedFrequencies.left).toBe(0);
      expect(mockApp.matchedFrequencies.right).toBe(testFreq);
    });

    it('should update leftMatchedFreq UI element for left ear', () => {
      wizard.selectedEar = 'left';
      wizard.saveResult(testFreq);
      expect(mockApp.els.leftMatchedFreq.textContent).toBe(`${testFreq} Hz`);
    });

    it('should update rightMatchedFreq UI element for right ear', () => {
      wizard.selectedEar = 'right';
      wizard.saveResult(testFreq);
      expect(mockApp.els.rightMatchedFreq.textContent).toBe(`${testFreq} Hz`);
    });

    it('should update both UI elements for both ears', () => {
      wizard.selectedEar = 'both';
      wizard.saveResult(testFreq);
      expect(mockApp.els.leftMatchedFreq.textContent).toBe(`${testFreq} Hz`);
      expect(mockApp.els.rightMatchedFreq.textContent).toBe(`${testFreq} Hz`);
    });

    it('should set noiseState.notchFreq', () => {
      wizard.saveResult(testFreq);
      expect(mockApp.noiseState.notchFreq).toBe(testFreq);
    });

    it('should set musicState.notchFreq', () => {
      wizard.saveResult(testFreq);
      expect(mockApp.musicState.notchFreq).toBe(testFreq);
    });

    it('should call autoSaveState', () => {
      wizard.saveResult(testFreq);
      expect(mockApp.autoSaveState).toHaveBeenCalled();
    });

    it('should call dashboardManager.updateMatchedFrequency', () => {
      wizard.saveResult(testFreq);
      expect(mockApp.dashboardManager.updateMatchedFrequency).toHaveBeenCalled();
    });

    it('should notify wizardManager when in wizard mode', () => {
      mockApp.wizardManager.isWizardMode = true;
      wizard.saveResult(testFreq);
      expect(mockApp.wizardManager.completeCurrentStep).toHaveBeenCalledWith('frequency-marked');
    });

    it('should not notify wizardManager when not in wizard mode', () => {
      mockApp.wizardManager.isWizardMode = false;
      wizard.saveResult(testFreq);
      expect(mockApp.wizardManager.completeCurrentStep).not.toHaveBeenCalled();
    });

    it('should call onComplete callback with freq and ear', () => {
      wizard.onComplete = vi.fn();
      wizard.selectedEar = 'left';
      wizard.saveResult(testFreq);
      expect(wizard.onComplete).toHaveBeenCalledWith(testFreq, 'left');
    });

    it('should not throw if onComplete is null', () => {
      wizard.onComplete = null;
      expect(() => wizard.saveResult(testFreq)).not.toThrow();
    });

    it('should call close()', () => {
      const closeSpy = vi.spyOn(wizard, 'close');
      wizard.saveResult(testFreq);
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should switch to notched-noise mode', () => {
      wizard.saveResult(testFreq);
      expect(mockApp.switchMode).toHaveBeenCalledWith('notched-noise');
    });

    it('should handle missing els gracefully', () => {
      mockApp.els = null;
      expect(() => {
        wizard.selectedEar = 'both';
        wizard.saveResult(testFreq);
      }).not.toThrow();
    });

    it('should handle missing dashboardManager gracefully', () => {
      mockApp.dashboardManager = null;
      expect(() => wizard.saveResult(testFreq)).not.toThrow();
    });

    it('should handle missing wizardManager gracefully', () => {
      mockApp.wizardManager = null;
      expect(() => wizard.saveResult(testFreq)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------
  // renderConfirm with empty matchedFrequencies
  // ---------------------------------------------------------------
  describe('renderConfirm with empty matches', () => {
    it('should render with avg=0 when matchedFrequencies is empty', () => {
      wizard.launch();
      wizard.matchedFrequencies = [];
      wizard.showStep(3);
      const body = document.getElementById('guidedBody');
      expect(body.innerHTML).toContain('0 Hz');
    });
  });

  // ---------------------------------------------------------------
  // stopSweep error handling (try/catch on oscillator)
  // ---------------------------------------------------------------
  describe('stopSweep with failing oscillator', () => {
    it('should handle oscillator.stop() throwing an error', () => {
      wizard.launch();
      wizard.showStep(2);
      wizard.startSweep();
      // Make stop throw
      wizard.oscillator.stop = vi.fn(() => { throw new Error('already stopped'); });
      expect(() => wizard.stopSweep()).not.toThrow();
    });

    it('should handle oscillator.disconnect() throwing an error', () => {
      wizard.launch();
      wizard.showStep(2);
      wizard.startSweep();
      // Make disconnect throw
      wizard.oscillator.disconnect = vi.fn(() => { throw new Error('already disconnected'); });
      expect(() => wizard.stopSweep()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------
  // Additional: onSweepComplete()
  // ---------------------------------------------------------------
  describe('onSweepComplete()', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(2);
      wizard.startSweep();
    });

    it('should stop the sweep', () => {
      const stopSpy = vi.spyOn(wizard, 'stopSweep');
      wizard.onSweepComplete();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should go to step 3 if there are matched frequencies', () => {
      wizard.matchedFrequencies = [5000];
      wizard.onSweepComplete();
      expect(wizard.currentStep).toBe(3);
    });

    it('should reset and re-render sweep if no matched frequencies', () => {
      wizard.matchedFrequencies = [];
      const renderSpy = vi.spyOn(wizard, 'renderSweep');
      wizard.onSweepComplete();
      expect(wizard.currentFreq).toBe(wizard.startFreq);
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // Additional: updateSweepDisplay()
  // ---------------------------------------------------------------
  describe('updateSweepDisplay()', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(2);
    });

    it('should update frequency text', () => {
      wizard.currentFreq = 5555;
      wizard.updateSweepDisplay();
      const freqVal = document.getElementById('gsFreqVal');
      expect(freqVal.textContent).toBe('5555 Hz');
    });

    it('should update progress bar width', () => {
      wizard.currentFreq = 6500; // midway between 1000 and 12000
      wizard.updateSweepDisplay();
      const fill = document.getElementById('gsSweepFill');
      const expectedPct = ((6500 - 1000) / (12000 - 1000)) * 100;
      expect(fill.style.width).toBe(`${expectedPct}%`);
    });

    it('should show 0% at startFreq', () => {
      wizard.currentFreq = 1000;
      wizard.updateSweepDisplay();
      const fill = document.getElementById('gsSweepFill');
      expect(fill.style.width).toBe('0%');
    });

    it('should show 100% at endFreq', () => {
      wizard.currentFreq = 12000;
      wizard.updateSweepDisplay();
      const fill = document.getElementById('gsSweepFill');
      expect(fill.style.width).toBe('100%');
    });
  });

  // ---------------------------------------------------------------
  // Additional: Sweep UI button interactions
  // ---------------------------------------------------------------
  describe('Sweep UI button interactions', () => {
    beforeEach(() => {
      wizard.launch();
      wizard.showStep(2);
    });

    it('should hide start button and show pause button on start click', () => {
      const startBtn = document.getElementById('gsStartSweep');
      const pauseBtn = document.getElementById('gsPauseSweep');
      startBtn.click();
      expect(startBtn.style.display).toBe('none');
      expect(pauseBtn.style.display).toBe('');
    });

    it('should toggle pause button text', () => {
      const startBtn = document.getElementById('gsStartSweep');
      startBtn.click();
      const pauseBtn = document.getElementById('gsPauseSweep');
      pauseBtn.click();
      expect(pauseBtn.textContent).toContain('Resume');
      pauseBtn.click();
      expect(pauseBtn.textContent).toContain('Pause');
    });

    it('should call markFrequency when match button is clicked', () => {
      // Start sweep so isPlaying is true and button is enabled
      wizard.startSweep();
      const markSpy = vi.spyOn(wizard, 'markFrequency');
      const matchBtn = document.getElementById('gsMatchBtn');
      matchBtn.click();
      expect(markSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // Additional: Confirm step rendering
  // ---------------------------------------------------------------
  describe('Confirm step rendering', () => {
    it('should display average frequency', () => {
      wizard.launch();
      wizard.matchedFrequencies = [4000, 6000];
      wizard.showStep(3);
      const body = document.getElementById('guidedBody');
      expect(body.innerHTML).toContain('5000 Hz');
    });

    it('should display ear label for both ears', () => {
      wizard.launch();
      wizard.matchedFrequencies = [5000];
      wizard.selectedEar = 'both';
      wizard.showStep(3);
      const body = document.getElementById('guidedBody');
      expect(body.innerHTML).toContain('Both Ears');
    });

    it('should display ear label for left ear', () => {
      wizard.launch();
      wizard.matchedFrequencies = [5000];
      wizard.selectedEar = 'left';
      wizard.showStep(3);
      const body = document.getElementById('guidedBody');
      expect(body.innerHTML).toContain('Left Ear');
    });

    it('should display ear label for right ear', () => {
      wizard.launch();
      wizard.matchedFrequencies = [5000];
      wizard.selectedEar = 'right';
      wizard.showStep(3);
      const body = document.getElementById('guidedBody');
      expect(body.innerHTML).toContain('Right Ear');
    });

    it('should call saveResult when Save button is clicked', () => {
      wizard.launch();
      wizard.matchedFrequencies = [5000, 5100];
      wizard.showStep(3);
      const saveSpy = vi.spyOn(wizard, 'saveResult');
      document.getElementById('gsSave').click();
      expect(saveSpy).toHaveBeenCalledWith(5050); // average
    });

    it('should display confidence label', () => {
      wizard.launch();
      wizard.matchedFrequencies = [5000, 5000, 5000];
      wizard.showStep(3);
      const body = document.getElementById('guidedBody');
      expect(body.innerHTML).toContain('High Confidence');
    });

    it('should display match count and frequencies', () => {
      wizard.launch();
      wizard.matchedFrequencies = [3000, 5000, 7000];
      wizard.showStep(3);
      const body = document.getElementById('guidedBody');
      expect(body.innerHTML).toContain('3 match(es)');
      expect(body.innerHTML).toContain('3000 Hz');
      expect(body.innerHTML).toContain('5000 Hz');
      expect(body.innerHTML).toContain('7000 Hz');
    });
  });
});
