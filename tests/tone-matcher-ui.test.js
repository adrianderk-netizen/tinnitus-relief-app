/**
 * Tone Matcher UI Tests
 * Tests ear selector, controls, settings persistence, and section toggle
 * Uses the REAL ToneMatcherUI class from js/tone-matcher-ui.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToneMatcherUI } from '../js/tone-matcher-ui.js';

/**
 * Helper: create all the DOM elements ToneMatcherUI expects.
 * Called inside beforeEach so every test starts with a clean DOM.
 */
function createDOM() {
  document.body.innerHTML = '';

  // --- Ear-selector buttons ---
  const earBtnBoth  = document.createElement('button');
  earBtnBoth.classList.add('btn-ear');
  earBtnBoth.dataset.ear = 'both';
  document.body.appendChild(earBtnBoth);

  const earBtnLeft  = document.createElement('button');
  earBtnLeft.classList.add('btn-ear');
  earBtnLeft.dataset.ear = 'left';
  document.body.appendChild(earBtnLeft);

  const earBtnRight = document.createElement('button');
  earBtnRight.classList.add('btn-ear');
  earBtnRight.dataset.ear = 'right';
  document.body.appendChild(earBtnRight);

  // --- Ear status indicator ---
  const earStatus = document.createElement('span');
  earStatus.id = 'earStatusText';
  document.body.appendChild(earStatus);

  // --- Frequency slider + input ---
  const freqSlider = document.createElement('input');
  freqSlider.id = 'unifiedToneFreq';
  freqSlider.type = 'range';
  freqSlider.min = '100';
  freqSlider.max = '15000';
  freqSlider.value = '4000';
  document.body.appendChild(freqSlider);

  const freqInput = document.createElement('input');
  freqInput.id = 'unifiedToneFreqInput';
  freqInput.type = 'number';
  freqInput.value = '4000';
  document.body.appendChild(freqInput);

  // --- Volume slider + display ---
  const volumeSlider = document.createElement('input');
  volumeSlider.id = 'unifiedToneVolume';
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '100';
  volumeSlider.value = '50';
  document.body.appendChild(volumeSlider);

  const volumeDisplay = document.createElement('span');
  volumeDisplay.id = 'unifiedToneVolumeDisplay';
  volumeDisplay.textContent = '50%';
  document.body.appendChild(volumeDisplay);

  // --- Waveform select ---
  const waveformSelect = document.createElement('select');
  waveformSelect.id = 'unifiedToneWaveform';
  ['sine', 'square', 'sawtooth', 'triangle'].forEach(w => {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w;
    waveformSelect.appendChild(opt);
  });
  document.body.appendChild(waveformSelect);

  // --- Fine-tune slider + display ---
  const fineTuneSlider = document.createElement('input');
  fineTuneSlider.id = 'unifiedToneFineTune';
  fineTuneSlider.type = 'range';
  fineTuneSlider.min = '-10';
  fineTuneSlider.max = '10';
  fineTuneSlider.step = '0.1';
  fineTuneSlider.value = '0';
  document.body.appendChild(fineTuneSlider);

  const fineTuneDisplay = document.createElement('span');
  fineTuneDisplay.id = 'unifiedToneFineTuneDisplay';
  fineTuneDisplay.textContent = '0 Hz';
  document.body.appendChild(fineTuneDisplay);

  // --- Start / Stop buttons ---
  const startBtn = document.createElement('button');
  startBtn.id = 'startToneUnified';
  document.body.appendChild(startBtn);

  const stopBtn = document.createElement('button');
  stopBtn.id = 'stopToneUnified';
  document.body.appendChild(stopBtn);

  // --- Mark button ---
  const markBtn = document.createElement('button');
  markBtn.id = 'unifiedToneMark';
  markBtn.textContent = 'Mark Frequency';
  document.body.appendChild(markBtn);

  // --- Phase-inversion button + status ---
  const invertBtn = document.createElement('button');
  invertBtn.id = 'unifiedToneInvert';
  document.body.appendChild(invertBtn);

  const phaseStatus = document.createElement('span');
  phaseStatus.id = 'unifiedTonePhaseStatus';
  document.body.appendChild(phaseStatus);

  // --- Per-ear enable checkboxes (advanced) ---
  const leftEnable = document.createElement('input');
  leftEnable.id = 'leftToneEnabled';
  leftEnable.type = 'checkbox';
  leftEnable.checked = true;
  document.body.appendChild(leftEnable);

  const rightEnable = document.createElement('input');
  rightEnable.id = 'rightToneEnabled';
  rightEnable.type = 'checkbox';
  rightEnable.checked = true;
  document.body.appendChild(rightEnable);

  // --- Matched-frequency displays ---
  const leftMatchedFreq = document.createElement('span');
  leftMatchedFreq.id = 'leftMatchedFreq';
  document.body.appendChild(leftMatchedFreq);

  const rightMatchedFreq = document.createElement('span');
  rightMatchedFreq.id = 'rightMatchedFreq';
  document.body.appendChild(rightMatchedFreq);

  // --- Advanced toggle ---
  const toggleAdvanced = document.createElement('button');
  toggleAdvanced.id = 'toggleAdvanced';
  document.body.appendChild(toggleAdvanced);

  const advancedContent = document.createElement('div');
  advancedContent.id = 'advancedContent';
  advancedContent.style.display = 'none';
  document.body.appendChild(advancedContent);

  // --- Section toggle (section-header inside tuning-section) ---
  const section = document.createElement('div');
  section.classList.add('tuning-section', 'expanded');
  const sectionHeader = document.createElement('div');
  sectionHeader.classList.add('section-header');
  const sectionContent = document.createElement('div');
  sectionContent.classList.add('section-content');
  sectionContent.style.display = 'block';
  section.appendChild(sectionHeader);
  section.appendChild(sectionContent);
  document.body.appendChild(section);

  // --- Canvas for unified visualizer ---
  const canvas = document.createElement('canvas');
  canvas.id = 'unifiedToneWave';
  document.body.appendChild(canvas);
}

/**
 * Build a mock app object that satisfies ToneMatcherUI's constructor expectations.
 */
function createMockApp() {
  return {
    toneState: {
      isPlaying: false,
      left: {
        enabled: true,
        frequency: 4000,
        fineTune: 0,
        volume: 0.5,
        waveform: 'sine',
        phaseInverted: false
      },
      right: {
        enabled: true,
        frequency: 4000,
        fineTune: 0,
        volume: 0.5,
        waveform: 'sine',
        phaseInverted: false
      }
    },
    matchedFrequencies: { left: null, right: null },
    startTone: vi.fn(),
    stopTone: vi.fn(),
    autoSaveState: vi.fn(),
    visualizers: {}
  };
}

// ──────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────

describe('ToneMatcherUI', () => {
  let ui;
  let mockApp;

  beforeEach(() => {
    // Reset localStorage between tests
    localStorage.clear();

    // Build a fresh DOM and app for every test
    createDOM();
    mockApp = createMockApp();
    ui = new ToneMatcherUI(mockApp);
  });

  // ── Initialization ──────────────────────────────────────

  describe('Initialization', () => {
    it('should default to both ears selected', () => {
      expect(ui.selectedEar).toBe('both');
    });

    it('should not be playing initially', () => {
      expect(ui.isPlaying).toBe(false);
    });

    it('should have default left settings', () => {
      expect(ui.leftSettings.frequency).toBe(4000);
      expect(ui.leftSettings.waveform).toBe('sine');
      expect(ui.leftSettings.volume).toBe(0.5);
    });

    it('should have default right settings matching left', () => {
      expect(ui.rightSettings.frequency).toBe(ui.leftSettings.frequency);
      expect(ui.rightSettings.waveform).toBe(ui.leftSettings.waveform);
    });

    it('should store a reference to the app', () => {
      expect(ui.app).toBe(mockApp);
    });
  });

  // ── Ear Selection ───────────────────────────────────────

  describe('Ear Selection', () => {
    it('should select left ear', () => {
      ui.selectEar('left');
      expect(ui.selectedEar).toBe('left');
    });

    it('should select right ear', () => {
      ui.selectEar('right');
      expect(ui.selectedEar).toBe('right');
    });

    it('should select both ears', () => {
      ui.selectEar('left');
      ui.selectEar('both');
      expect(ui.selectedEar).toBe('both');
    });

    it('should update ear status text on selection', () => {
      ui.selectEar('left');
      const indicator = document.getElementById('earStatusText');
      expect(indicator.textContent).toBe('Adjusting: Left Ear Only');
    });

    it('should mark the correct button as active', () => {
      ui.selectEar('right');
      const btns = document.querySelectorAll('.btn-ear');
      btns.forEach(btn => {
        if (btn.dataset.ear === 'right') {
          expect(btn.classList.contains('active')).toBe(true);
        } else {
          expect(btn.classList.contains('active')).toBe(false);
        }
      });
    });

    it('should load right settings into UI when right ear selected', () => {
      // Give right ear a distinct frequency first
      ui.selectEar('right');
      ui.updateSetting('frequency', 6000);

      // Now re-select right to trigger loadSettingsToUI
      ui.selectEar('right');

      const freqSlider = document.getElementById('unifiedToneFreq');
      expect(freqSlider.value).toBe('6000');
    });

    it('should respond to ear-button click events', () => {
      const leftBtn = document.querySelector('[data-ear="left"]');
      leftBtn.click();
      expect(ui.selectedEar).toBe('left');
    });
  });

  // ── Settings Update ─────────────────────────────────────

  describe('Settings Update', () => {
    it('should update both ears when both selected', () => {
      ui.selectEar('both');
      ui.updateSetting('frequency', 6000);
      expect(ui.leftSettings.frequency).toBe(6000);
      expect(ui.rightSettings.frequency).toBe(6000);
    });

    it('should update only left ear when left selected', () => {
      ui.selectEar('left');
      ui.updateSetting('frequency', 6000);
      expect(ui.leftSettings.frequency).toBe(6000);
      expect(ui.rightSettings.frequency).toBe(4000);
    });

    it('should update only right ear when right selected', () => {
      ui.selectEar('right');
      ui.updateSetting('frequency', 8000);
      expect(ui.rightSettings.frequency).toBe(8000);
      expect(ui.leftSettings.frequency).toBe(4000);
    });

    it('should update volume setting', () => {
      ui.updateSetting('volume', 0.8);
      expect(ui.leftSettings.volume).toBe(0.8);
    });

    it('should update waveform setting', () => {
      ui.updateSetting('waveform', 'square');
      expect(ui.leftSettings.waveform).toBe('square');
    });

    it('should update fine tune setting', () => {
      ui.updateSetting('fineTune', 3.5);
      expect(ui.leftSettings.fineTune).toBe(3.5);
    });

    it('should allow independent ear settings', () => {
      ui.selectEar('left');
      ui.updateSetting('frequency', 4000);
      ui.selectEar('right');
      ui.updateSetting('frequency', 8000);

      expect(ui.leftSettings.frequency).toBe(4000);
      expect(ui.rightSettings.frequency).toBe(8000);
    });

    it('should call autoSaveState when a setting changes', () => {
      ui.updateSetting('frequency', 5000);
      expect(mockApp.autoSaveState).toHaveBeenCalled();
    });

    it('should call applyAudioSettings when updating setting while playing', () => {
      vi.useFakeTimers();
      ui.startTone();
      mockApp.stopTone.mockClear();

      ui.updateSetting('frequency', 6000);

      // applyAudioSettings calls stopTone
      expect(mockApp.stopTone).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should sync frequency slider and input on frequency change', () => {
      ui.updateSetting('frequency', 7777);
      const freqSlider = document.getElementById('unifiedToneFreq');
      const freqInput  = document.getElementById('unifiedToneFreqInput');
      expect(freqSlider.value).toBe('7777');
      expect(freqInput.value).toBe('7777');
    });
  });

  // ── Frequency Controls (DOM events) ─────────────────────

  describe('Frequency Controls', () => {
    it('should update settings when frequency slider fires input event', () => {
      const freqSlider = document.getElementById('unifiedToneFreq');
      freqSlider.value = '5500';
      freqSlider.dispatchEvent(new Event('input'));

      expect(ui.leftSettings.frequency).toBe(5500);
    });

    it('should update settings when frequency input fires change event', () => {
      const freqInput = document.getElementById('unifiedToneFreqInput');
      freqInput.value = '9000';
      freqInput.dispatchEvent(new Event('change'));

      expect(ui.leftSettings.frequency).toBe(9000);
    });

    it('should clamp frequency input to valid range', () => {
      const freqInput = document.getElementById('unifiedToneFreqInput');
      freqInput.value = '50'; // below min of 100
      freqInput.dispatchEvent(new Event('change'));

      expect(ui.leftSettings.frequency).toBe(100);
    });
  });

  // ── Volume Controls ─────────────────────────────────────

  describe('Volume Controls', () => {
    it('should update volume via slider input event', () => {
      const volumeSlider = document.getElementById('unifiedToneVolume');
      volumeSlider.value = '80';
      volumeSlider.dispatchEvent(new Event('input'));

      expect(ui.leftSettings.volume).toBe(0.8);
    });

    it('should update volume display text', () => {
      const volumeSlider = document.getElementById('unifiedToneVolume');
      volumeSlider.value = '75';
      volumeSlider.dispatchEvent(new Event('input'));

      const display = document.getElementById('unifiedToneVolumeDisplay');
      expect(display.textContent).toBe('75%');
    });
  });

  // ── Waveform Selection ──────────────────────────────────

  describe('Waveform Selection', () => {
    it('should update waveform via select change event', () => {
      const sel = document.getElementById('unifiedToneWaveform');
      sel.value = 'sawtooth';
      sel.dispatchEvent(new Event('change'));

      expect(ui.leftSettings.waveform).toBe('sawtooth');
    });

    it('should update both ears waveform when both selected', () => {
      ui.selectEar('both');
      const sel = document.getElementById('unifiedToneWaveform');
      sel.value = 'triangle';
      sel.dispatchEvent(new Event('change'));

      expect(ui.leftSettings.waveform).toBe('triangle');
      expect(ui.rightSettings.waveform).toBe('triangle');
    });
  });

  // ── Fine Tune ───────────────────────────────────────────

  describe('Fine Tune', () => {
    it('should update fineTune via slider input event', () => {
      const slider = document.getElementById('unifiedToneFineTune');
      slider.value = '3.5';
      slider.dispatchEvent(new Event('input'));

      expect(ui.leftSettings.fineTune).toBe(3.5);
    });

    it('should update fineTune display text', () => {
      const slider = document.getElementById('unifiedToneFineTune');
      slider.value = '-2.5';
      slider.dispatchEvent(new Event('input'));

      const display = document.getElementById('unifiedToneFineTuneDisplay');
      expect(display.textContent).toBe('-2.5 Hz');
    });
  });

  // ── Frequency Marking ──────────────────────────────────

  describe('Frequency Marking', () => {
    it('should mark both ears when both selected', () => {
      ui.selectEar('both');
      ui.updateSetting('frequency', 5000);
      ui.markFrequency();

      expect(mockApp.matchedFrequencies.left).toBe(5000);
      expect(mockApp.matchedFrequencies.right).toBe(5000);
    });

    it('should mark only left ear', () => {
      ui.selectEar('left');
      ui.updateSetting('frequency', 5000);
      ui.markFrequency();

      expect(mockApp.matchedFrequencies.left).toBe(5000);
      expect(mockApp.matchedFrequencies.right).toBeNull();
    });

    it('should mark only right ear', () => {
      ui.selectEar('right');
      ui.updateSetting('frequency', 7000);
      ui.markFrequency();

      expect(mockApp.matchedFrequencies.right).toBe(7000);
      expect(mockApp.matchedFrequencies.left).toBeNull();
    });

    it('should include fine tune in marked frequency', () => {
      ui.updateSetting('frequency', 4000);
      ui.updateSetting('fineTune', 2.5);
      ui.markFrequency();

      expect(mockApp.matchedFrequencies.left).toBe(4002.5);
    });

    it('should update the matched-frequency display elements', () => {
      ui.selectEar('both');
      ui.updateSetting('frequency', 4500);
      ui.updateSetting('fineTune', 0);
      ui.markFrequency();

      const leftDisp  = document.getElementById('leftMatchedFreq');
      const rightDisp = document.getElementById('rightMatchedFreq');
      expect(leftDisp.textContent).toBe('4500.0 Hz');
      expect(rightDisp.textContent).toBe('4500.0 Hz');
    });

    it('should auto-save after marking', () => {
      ui.markFrequency();
      expect(mockApp.autoSaveState).toHaveBeenCalled();
    });

    it('should respond to mark button click', () => {
      ui.updateSetting('frequency', 3000);
      document.getElementById('unifiedToneMark').click();
      expect(mockApp.matchedFrequencies.left).toBe(3000);
    });
  });

  // ── Wizard Step Completion on Mark ─────────────────────

  describe('Wizard Step Completion on Mark', () => {
    it('should call wizard.completeCurrentStep when marking in wizard mode', () => {
      mockApp.wizard = {
        isWizardMode: true,
        completeCurrentStep: vi.fn(),
      };
      ui.markFrequency();
      expect(mockApp.wizard.completeCurrentStep).toHaveBeenCalledWith('frequency-marked');
    });

    it('should not call wizard.completeCurrentStep when not in wizard mode', () => {
      mockApp.wizard = {
        isWizardMode: false,
        completeCurrentStep: vi.fn(),
      };
      ui.markFrequency();
      expect(mockApp.wizard.completeCurrentStep).not.toHaveBeenCalled();
    });

    it('should not error when wizard is undefined', () => {
      mockApp.wizard = undefined;
      expect(() => ui.markFrequency()).not.toThrow();
    });
  });

  // ── Phase Inversion While Playing ─────────────────────

  describe('Phase Inversion While Playing', () => {
    it('should call applyAudioSettings when toggling phase while playing', () => {
      vi.useFakeTimers();
      ui.startTone();
      mockApp.stopTone.mockClear();

      ui.togglePhaseInversion();

      // applyAudioSettings stops and restarts the tone
      expect(mockApp.stopTone).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should NOT call applyAudioSettings when toggling phase while not playing', () => {
      ui.togglePhaseInversion();
      expect(mockApp.stopTone).not.toHaveBeenCalled();
      expect(mockApp.startTone).not.toHaveBeenCalled();
    });
  });

  // ── Phase Inversion ─────────────────────────────────────

  describe('Phase Inversion', () => {
    it('should toggle phase inversion', () => {
      ui.togglePhaseInversion();
      expect(ui.leftSettings.phaseInverted).toBe(true);
    });

    it('should toggle back to normal', () => {
      ui.togglePhaseInversion();
      ui.togglePhaseInversion();
      expect(ui.leftSettings.phaseInverted).toBe(false);
    });

    it('should invert both ears when both selected', () => {
      ui.selectEar('both');
      ui.togglePhaseInversion();
      expect(ui.leftSettings.phaseInverted).toBe(true);
      expect(ui.rightSettings.phaseInverted).toBe(true);
    });

    it('should invert only selected ear', () => {
      ui.selectEar('left');
      ui.togglePhaseInversion();
      expect(ui.leftSettings.phaseInverted).toBe(true);
      expect(ui.rightSettings.phaseInverted).toBe(false);
    });

    it('should invert only right ear when right is selected', () => {
      ui.selectEar('right');
      ui.togglePhaseInversion();
      expect(ui.rightSettings.phaseInverted).toBe(true);
      expect(ui.leftSettings.phaseInverted).toBe(false);
    });

    it('should update phase status text on toggle', () => {
      ui.togglePhaseInversion();
      const status = document.getElementById('unifiedTonePhaseStatus');
      expect(status.innerHTML).toContain('INVERTED');
    });

    it('should respond to invert button click', () => {
      document.getElementById('unifiedToneInvert').click();
      expect(ui.leftSettings.phaseInverted).toBe(true);
    });
  });

  // ── Per-Ear Enable ──────────────────────────────────────

  describe('Per-Ear Enable', () => {
    it('should track left ear enabled state', () => {
      ui.leftSettings.enabled = false;
      expect(ui.leftSettings.enabled).toBe(false);
    });

    it('should track right ear enabled state', () => {
      ui.rightSettings.enabled = false;
      expect(ui.rightSettings.enabled).toBe(false);
    });

    it('should default both ears to enabled', () => {
      expect(ui.leftSettings.enabled).toBe(true);
      expect(ui.rightSettings.enabled).toBe(true);
    });

    it('should update leftSettings.enabled via checkbox change event', () => {
      const cb = document.getElementById('leftToneEnabled');
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));
      expect(ui.leftSettings.enabled).toBe(false);
    });

    it('should update rightSettings.enabled via checkbox change event', () => {
      const cb = document.getElementById('rightToneEnabled');
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));
      expect(ui.rightSettings.enabled).toBe(false);
    });
  });

  // ── Start / Stop Tone ───────────────────────────────────

  describe('Start / Stop Tone', () => {
    it('should call app.startTone and set isPlaying on start', () => {
      ui.startTone();
      expect(mockApp.startTone).toHaveBeenCalled();
      expect(ui.isPlaying).toBe(true);
    });

    it('should call app.stopTone and clear isPlaying on stop', () => {
      ui.startTone();
      ui.stopTone();
      expect(mockApp.stopTone).toHaveBeenCalled();
      expect(ui.isPlaying).toBe(false);
    });

    it('should copy settings to toneState on start', () => {
      ui.updateSetting('frequency', 6500);
      ui.startTone();
      expect(mockApp.toneState.left.frequency).toBe(6500);
    });

    it('should disable start button and enable stop button when playing', () => {
      ui.startTone();
      expect(document.getElementById('startToneUnified').disabled).toBe(true);
      expect(document.getElementById('stopToneUnified').disabled).toBe(false);
    });

    it('should enable start button and disable stop button when stopped', () => {
      ui.startTone();
      ui.stopTone();
      expect(document.getElementById('startToneUnified').disabled).toBe(false);
      expect(document.getElementById('stopToneUnified').disabled).toBe(true);
    });
  });

  // ── Section Toggles ─────────────────────────────────────

  describe('Section Toggles', () => {
    it('should collapse an expanded section on header click', () => {
      const header  = document.querySelector('.section-header');
      const section = document.querySelector('.tuning-section');
      const content = section.querySelector('.section-content');

      // Section starts expanded
      expect(section.classList.contains('expanded')).toBe(true);

      header.click();
      expect(section.classList.contains('expanded')).toBe(false);
      expect(content.style.display).toBe('none');
    });

    it('should expand a collapsed section on header click', () => {
      const header  = document.querySelector('.section-header');
      const section = document.querySelector('.tuning-section');
      const content = section.querySelector('.section-content');

      // Collapse first
      header.click();
      expect(section.classList.contains('expanded')).toBe(false);

      // Expand
      header.click();
      expect(section.classList.contains('expanded')).toBe(true);
      expect(content.style.display).toBe('block');
    });
  });

  // ── Advanced Toggle ─────────────────────────────────────

  describe('Advanced Toggle', () => {
    it('should show advanced content on first click', () => {
      const btn     = document.getElementById('toggleAdvanced');
      const content = document.getElementById('advancedContent');

      btn.click();
      expect(content.style.display).toBe('block');
    });

    it('should hide advanced content on second click', () => {
      const btn     = document.getElementById('toggleAdvanced');
      const content = document.getElementById('advancedContent');

      btn.click(); // show
      btn.click(); // hide
      expect(content.style.display).toBe('none');
    });
  });

  // ── Settings Persistence (localStorage) ─────────────────

  describe('Settings Persistence', () => {
    it('should trigger autoSaveState on setting updates', () => {
      ui.updateSetting('frequency', 5000);
      ui.updateSetting('volume', 0.3);
      ui.updateSetting('waveform', 'square');

      expect(mockApp.autoSaveState).toHaveBeenCalledTimes(3);
    });

    it('should trigger autoSaveState when marking frequency', () => {
      mockApp.autoSaveState.mockClear();
      ui.markFrequency();
      expect(mockApp.autoSaveState).toHaveBeenCalled();
    });
  });

  // ── moveFrequencySweep ─────────────────────────────────

  describe('moveFrequencySweep', () => {
    it('should move sweep panel to auto-tuning container when both exist', () => {
      // Create sweep panel and container
      const sweepPanel = document.createElement('div');
      sweepPanel.className = 'sweep-panel';
      sweepPanel.textContent = 'Sweep Controls';
      document.body.appendChild(sweepPanel);

      const autoContainer = document.createElement('div');
      autoContainer.id = 'frequencySweepContainer';
      document.body.appendChild(autoContainer);

      ui.moveFrequencySweep();

      expect(autoContainer.contains(sweepPanel)).toBe(true);
    });

    it('should not throw when sweep panel is missing', () => {
      // No sweep panel or container in DOM (already absent from createDOM)
      expect(() => ui.moveFrequencySweep()).not.toThrow();
    });

    it('should not throw when container is missing', () => {
      const sweepPanel = document.createElement('div');
      sweepPanel.className = 'sweep-panel';
      document.body.appendChild(sweepPanel);

      expect(() => ui.moveFrequencySweep()).not.toThrow();
    });
  });

  // ── createUnifiedVisualizer ────────────────────────────

  describe('createUnifiedVisualizer', () => {
    it('should create a WaveformVisualizer when window.WaveformVisualizer is available', () => {
      // Mock WaveformVisualizer
      const mockViz = {
        setParams: vi.fn(),
        start: vi.fn()
      };
      window.WaveformVisualizer = vi.fn(() => mockViz);

      ui.createUnifiedVisualizer();

      expect(window.WaveformVisualizer).toHaveBeenCalledWith('unifiedToneWave');
      expect(mockViz.setParams).toHaveBeenCalledWith(4000, 'sine', 1, false);
      expect(mockViz.start).toHaveBeenCalled();
      expect(mockApp.visualizers.unified).toBe(mockViz);

      delete window.WaveformVisualizer;
    });

    it('should not create visualizer when WaveformVisualizer is not available', () => {
      delete window.WaveformVisualizer;
      expect(() => ui.createUnifiedVisualizer()).not.toThrow();
      expect(mockApp.visualizers.unified).toBeUndefined();
    });
  });

  // ── applyAudioSettings ─────────────────────────────────

  describe('applyAudioSettings', () => {
    it('should stop and restart tone when playing', () => {
      vi.useFakeTimers();
      ui.startTone();
      mockApp.startTone.mockClear();
      mockApp.stopTone.mockClear();

      ui.applyAudioSettings();

      // Should stop immediately
      expect(mockApp.stopTone).toHaveBeenCalled();

      // Should restart after 50ms
      vi.advanceTimersByTime(50);
      expect(mockApp.startTone).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should do nothing when not playing', () => {
      ui.applyAudioSettings();
      expect(mockApp.stopTone).not.toHaveBeenCalled();
      expect(mockApp.startTone).not.toHaveBeenCalled();
    });
  });

  // ── Visualizer updates via updateSetting ──────────────

  describe('Visualizer updates', () => {
    it('should update unified visualizer on frequency change', () => {
      const mockViz = { setParams: vi.fn(), start: vi.fn() };
      mockApp.visualizers.unified = mockViz;

      ui.updateSetting('frequency', 6000);

      expect(mockViz.setParams).toHaveBeenCalledWith(6000, 'sine', 1, false);
    });

    it('should update unified visualizer on waveform change', () => {
      const mockViz = { setParams: vi.fn(), start: vi.fn() };
      mockApp.visualizers.unified = mockViz;

      ui.updateSetting('waveform', 'square');

      expect(mockViz.setParams).toHaveBeenCalledWith(4000, 'square', 1, false);
    });

    it('should not update visualizer on volume change', () => {
      const mockViz = { setParams: vi.fn(), start: vi.fn() };
      mockApp.visualizers.unified = mockViz;

      ui.updateSetting('volume', 0.8);

      expect(mockViz.setParams).not.toHaveBeenCalled();
    });

    it('should update visualizer in loadSettingsToUI', () => {
      const mockViz = { setParams: vi.fn(), start: vi.fn() };
      mockApp.visualizers.unified = mockViz;

      ui.rightSettings.frequency = 8000;
      ui.rightSettings.waveform = 'triangle';
      ui.rightSettings.phaseInverted = true;
      ui.selectEar('right');

      expect(mockViz.setParams).toHaveBeenCalledWith(8000, 'triangle', 1, true);
    });
  });

  // ── Per-ear enable with audio playing ──────────────────

  describe('Per-Ear Enable while playing', () => {
    it('should call applyAudioSettings when left ear toggled while playing', () => {
      vi.useFakeTimers();
      ui.startTone();
      mockApp.stopTone.mockClear();

      const cb = document.getElementById('leftToneEnabled');
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));

      // applyAudioSettings calls stopTone
      expect(mockApp.stopTone).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should call applyAudioSettings when right ear toggled while playing', () => {
      vi.useFakeTimers();
      ui.startTone();
      mockApp.stopTone.mockClear();

      const cb = document.getElementById('rightToneEnabled');
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));

      expect(mockApp.stopTone).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
