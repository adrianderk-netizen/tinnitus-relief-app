/**
 * Visualizer Tests
 * Tests canvas handling, waveform rendering, spectrum display, and reinit
 * Uses REAL SpectrumVisualizer and WaveformVisualizer classes from ../js/visualizer.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpectrumVisualizer, WaveformVisualizer } from '../js/visualizer.js';

// Store originals so we can restore them
let origRAF;
let origCAF;
let rafId;

/**
 * Helper: augment the mock canvas context returned by setup.js
 * with all methods/properties that the real visualizer classes use.
 * We patch HTMLCanvasElement.prototype.getContext for the duration of each test.
 */
function patchGetContext() {
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowColor: '',
      shadowBlur: 0,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      setLineDash: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      canvas: this,
    };
  };
}

/**
 * Helper: mock getBoundingClientRect on a canvas to return given dimensions.
 * Passing width=0, height=0 simulates a canvas with no layout dimensions.
 */
function mockBoundingRect(canvas, width, height) {
  canvas.getBoundingClientRect = vi.fn(() => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
  }));
}

beforeEach(() => {
  // Patch canvas context with all needed methods
  patchGetContext();

  // Mock requestAnimationFrame / cancelAnimationFrame
  rafId = 0;
  origRAF = globalThis.requestAnimationFrame;
  origCAF = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = vi.fn(() => ++rafId);
  globalThis.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  // Restore originals
  globalThis.requestAnimationFrame = origRAF;
  globalThis.cancelAnimationFrame = origCAF;
});

// ============================================================
// SpectrumVisualizer
// ============================================================
describe('SpectrumVisualizer', () => {
  let canvas;

  beforeEach(() => {
    document.body.innerHTML = '<canvas id="testSpectrum"></canvas>';
    canvas = document.getElementById('testSpectrum');
    // Default: zero-size so initCanvas uses defaults (800x200)
    mockBoundingRect(canvas, 0, 0);
  });

  describe('Initialization', () => {
    it('should handle missing canvas element gracefully', () => {
      const viz = new SpectrumVisualizer('nonexistent');
      expect(viz.canvas).toBeNull();
      expect(viz.ctx).toBeNull();
    });

    it('should initialize with existing canvas', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.canvas).toBeTruthy();
      expect(viz.ctx).toBeTruthy();
    });

    it('should use default dimensions for zero-size canvas', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.canvas.width).toBe(800);
      expect(viz.canvas.height).toBe(200);
    });

    it('should scale canvas to 2x bounding rect when dimensions are available', () => {
      mockBoundingRect(canvas, 400, 200);
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.canvas.width).toBe(800);
      expect(viz.canvas.height).toBe(400);
    });

    it('should start with no analyzer', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.analyzer).toBeNull();
    });

    it('should start with no animation', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.animationId).toBeNull();
    });

    it('should initialize notchFrequency to null and notchWidth to 1', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.notchFrequency).toBeNull();
      expect(viz.notchWidth).toBe(1);
    });
  });

  describe('Notch Control', () => {
    it('should set notch frequency and width', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.setNotch(4000, 1);
      expect(viz.notchFrequency).toBe(4000);
      expect(viz.notchWidth).toBe(1);
    });

    it('should clear notch', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.setNotch(4000);
      viz.clearNotch();
      expect(viz.notchFrequency).toBeNull();
    });

    it('should default notch width to 1', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.setNotch(6000);
      expect(viz.notchWidth).toBe(1);
    });

    it('should allow changing notch width', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.setNotch(6000, 2);
      expect(viz.notchWidth).toBe(2);
    });
  });

  describe('Frequency to X Mapping', () => {
    it('should map 20 Hz to x=0', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.freqToX(20)).toBeCloseTo(0, 0);
    });

    it('should map 20000 Hz to canvas width', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.freqToX(20000)).toBeCloseTo(viz.canvas.width, 0);
    });

    it('should use logarithmic scaling', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      const x1000 = viz.freqToX(1000);
      const x10000 = viz.freqToX(10000);
      const x100 = viz.freqToX(100);
      // Each decade in log space should span the same pixel distance
      const span1 = x1000 - x100;
      const span2 = x10000 - x1000;
      expect(span1).toBeCloseTo(span2, 0);
    });

    it('should return increasing x for increasing frequency', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      const x100 = viz.freqToX(100);
      const x1000 = viz.freqToX(1000);
      const x10000 = viz.freqToX(10000);
      expect(x100).toBeLessThan(x1000);
      expect(x1000).toBeLessThan(x10000);
    });
  });

  describe('Animation', () => {
    it('should start animation and set animationId', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.start();
      expect(viz.animationId).toBeTruthy();
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should not double-start', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.start();
      const firstId = viz.animationId;
      const callCount = globalThis.requestAnimationFrame.mock.calls.length;
      viz.start();
      // animationId should remain the same
      expect(viz.animationId).toBe(firstId);
      // requestAnimationFrame should not have been called again
      expect(globalThis.requestAnimationFrame.mock.calls.length).toBe(callCount);
    });

    it('should stop animation and clear animationId', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.start();
      const id = viz.animationId;
      viz.stop();
      expect(viz.animationId).toBeNull();
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(id);
    });

    it('should handle stop when not running', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(() => viz.stop()).not.toThrow();
      expect(viz.animationId).toBeNull();
    });

    it('should call reinitCanvas when starting', () => {
      mockBoundingRect(canvas, 500, 250);
      const viz = new SpectrumVisualizer('testSpectrum');
      // After construction with zero-rect, now set non-zero
      mockBoundingRect(canvas, 500, 250);
      viz.start();
      // reinitCanvas should have updated dimensions
      expect(viz.canvas.width).toBe(1000);
      expect(viz.canvas.height).toBe(500);
    });
  });

  describe('Draw', () => {
    it('should not throw without canvas', () => {
      const viz = new SpectrumVisualizer('nonexistent');
      expect(() => viz.draw()).not.toThrow();
    });

    it('should not throw with valid canvas and no analyzer', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(() => viz.draw()).not.toThrow();
    });

    it('should not throw with valid canvas and analyzer (no data)', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      const mockAnalyzer = {
        frequencyBinCount: 1024,
        fftSize: 2048,
        smoothingTimeConstant: 0,
        context: { sampleRate: 44100 },
        getByteFrequencyData: vi.fn((arr) => {
          // Fill with zeros (no data)
          arr.fill(0);
        }),
      };
      viz.setAnalyzer(mockAnalyzer);
      expect(() => viz.draw()).not.toThrow();
    });

    it('should not throw with valid canvas and analyzer (with data)', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      const mockAnalyzer = {
        frequencyBinCount: 1024,
        fftSize: 2048,
        smoothingTimeConstant: 0,
        context: { sampleRate: 44100 },
        getByteFrequencyData: vi.fn((arr) => {
          // Fill with some non-zero data
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
        }),
      };
      viz.setAnalyzer(mockAnalyzer);
      expect(() => viz.draw()).not.toThrow();
    });

    it('should draw notch indicator when notch is set', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.setNotch(4000, 1);
      expect(() => viz.draw()).not.toThrow();
    });

    it('should draw spectrum bars with notch highlighting when both analyzer and notch are set', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      const mockAnalyzer = {
        frequencyBinCount: 1024,
        fftSize: 2048,
        smoothingTimeConstant: 0,
        context: { sampleRate: 44100 },
        getByteFrequencyData: vi.fn((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = 128;
          }
        }),
      };
      viz.setAnalyzer(mockAnalyzer);
      viz.setNotch(4000, 1);
      expect(() => viz.draw()).not.toThrow();
    });
  });

  describe('Analyzer', () => {
    it('should accept analyzer node', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      const mockAnalyzer = {
        frequencyBinCount: 1024,
        smoothingTimeConstant: 0,
      };
      viz.setAnalyzer(mockAnalyzer);
      expect(viz.analyzer).toBe(mockAnalyzer);
    });

    it('should set smoothingTimeConstant on analyzer', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      const mockAnalyzer = {
        frequencyBinCount: 1024,
        smoothingTimeConstant: 0,
      };
      viz.setAnalyzer(mockAnalyzer);
      expect(mockAnalyzer.smoothingTimeConstant).toBe(0.8);
    });

    it('should handle null analyzer', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      viz.setAnalyzer(null);
      expect(viz.analyzer).toBeNull();
    });
  });

  describe('reinitCanvas', () => {
    it('should update dimensions when bounding rect has positive size', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      // Initially defaults (800x200) because bounding rect is 0x0
      expect(viz.canvas.width).toBe(800);
      expect(viz.canvas.height).toBe(200);

      // Now simulate the canvas having layout dimensions
      mockBoundingRect(canvas, 300, 150);
      viz.reinitCanvas();
      expect(viz.canvas.width).toBe(600);
      expect(viz.canvas.height).toBe(300);
    });

    it('should not change dimensions when bounding rect is zero', () => {
      const viz = new SpectrumVisualizer('testSpectrum');
      expect(viz.canvas.width).toBe(800);
      // bounding rect is still 0x0
      viz.reinitCanvas();
      expect(viz.canvas.width).toBe(800);
    });

    it('should not crash on null canvas', () => {
      const viz = new SpectrumVisualizer('nonexistent');
      expect(() => viz.reinitCanvas()).not.toThrow();
    });
  });
});

// ============================================================
// WaveformVisualizer
// ============================================================
describe('WaveformVisualizer', () => {
  let canvas;

  beforeEach(() => {
    document.body.innerHTML = '<canvas id="testWave"></canvas>';
    canvas = document.getElementById('testWave');
    // Default: zero-size so initCanvas uses defaults (600x120)
    mockBoundingRect(canvas, 0, 0);
  });

  describe('Initialization', () => {
    it('should handle missing canvas gracefully', () => {
      const viz = new WaveformVisualizer('nonexistent');
      expect(viz.canvas).toBeNull();
      expect(viz.ctx).toBeNull();
    });

    it('should initialize with existing canvas', () => {
      const viz = new WaveformVisualizer('testWave');
      expect(viz.canvas).toBeTruthy();
      expect(viz.ctx).toBeTruthy();
    });

    it('should initialize with default waveform params', () => {
      const viz = new WaveformVisualizer('testWave');
      expect(viz.waveParams.frequency).toBe(1000);
      expect(viz.waveParams.waveform).toBe('sine');
      expect(viz.waveParams.amplitude).toBe(1);
      expect(viz.waveParams.inverted).toBe(false);
    });

    it('should use default dimensions for zero-size canvas', () => {
      const viz = new WaveformVisualizer('testWave');
      expect(viz.canvas.width).toBe(600);
      expect(viz.canvas.height).toBe(120);
    });

    it('should scale canvas to 2x bounding rect when dimensions are available', () => {
      mockBoundingRect(canvas, 300, 100);
      const viz = new WaveformVisualizer('testWave');
      expect(viz.canvas.width).toBe(600);
      expect(viz.canvas.height).toBe(200);
    });

    it('should start with time at 0', () => {
      const viz = new WaveformVisualizer('testWave');
      expect(viz.time).toBe(0);
    });

    it('should start with no animation', () => {
      const viz = new WaveformVisualizer('testWave');
      expect(viz.animationId).toBeNull();
    });
  });

  describe('Waveform Parameters', () => {
    it('should update all parameters', () => {
      const viz = new WaveformVisualizer('testWave');
      viz.setParams(8000, 'square', 0.5, true);
      expect(viz.waveParams.frequency).toBe(8000);
      expect(viz.waveParams.waveform).toBe('square');
      expect(viz.waveParams.amplitude).toBe(0.5);
      expect(viz.waveParams.inverted).toBe(true);
    });

    it('should default amplitude to 1 and inverted to false', () => {
      const viz = new WaveformVisualizer('testWave');
      viz.setParams(4000, 'sine');
      expect(viz.waveParams.amplitude).toBe(1);
      expect(viz.waveParams.inverted).toBe(false);
    });

    it('should allow setting different waveform types', () => {
      const viz = new WaveformVisualizer('testWave');
      for (const wf of ['sine', 'square', 'sawtooth', 'triangle']) {
        viz.setParams(1000, wf);
        expect(viz.waveParams.waveform).toBe(wf);
      }
    });
  });

  describe('Waveform Value Generation', () => {
    let viz;
    beforeEach(() => {
      viz = new WaveformVisualizer('testWave');
    });

    it('should generate sine wave values', () => {
      expect(viz.getWaveformValue('sine', 0)).toBeCloseTo(0, 5);
      expect(viz.getWaveformValue('sine', 0.25)).toBeCloseTo(1, 5);
      expect(viz.getWaveformValue('sine', 0.5)).toBeCloseTo(0, 5);
      expect(viz.getWaveformValue('sine', 0.75)).toBeCloseTo(-1, 5);
    });

    it('should generate square wave values', () => {
      expect(viz.getWaveformValue('square', 0.1)).toBe(1);
      expect(viz.getWaveformValue('square', 0.6)).toBe(-1);
    });

    it('should generate sawtooth wave values', () => {
      expect(viz.getWaveformValue('sawtooth', 0)).toBeCloseTo(-1, 5);
      expect(viz.getWaveformValue('sawtooth', 0.5)).toBeCloseTo(0, 5);
      expect(viz.getWaveformValue('sawtooth', 1)).toBeCloseTo(-1, 5); // wraps
    });

    it('should generate triangle wave values', () => {
      expect(viz.getWaveformValue('triangle', 0)).toBeCloseTo(-1, 5);
      expect(viz.getWaveformValue('triangle', 0.25)).toBeCloseTo(0, 5);
      expect(viz.getWaveformValue('triangle', 0.5)).toBeCloseTo(1, 5);
      expect(viz.getWaveformValue('triangle', 0.75)).toBeCloseTo(0, 5);
    });

    it('should default to sine for unknown waveforms', () => {
      expect(viz.getWaveformValue('unknown', 0.25)).toBeCloseTo(1, 5);
    });

    it('should handle phase wrapping correctly', () => {
      // Phase > 1 should wrap
      expect(viz.getWaveformValue('sine', 1.25)).toBeCloseTo(
        viz.getWaveformValue('sine', 0.25),
        5
      );
    });

    it('should handle negative phase wrapping', () => {
      expect(viz.getWaveformValue('sine', -0.75)).toBeCloseTo(
        viz.getWaveformValue('sine', 0.25),
        5
      );
    });
  });

  describe('Animation Control', () => {
    it('should start animation', () => {
      const viz = new WaveformVisualizer('testWave');
      viz.start();
      expect(viz.animationId).toBeTruthy();
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should not double-start animation', () => {
      const viz = new WaveformVisualizer('testWave');
      viz.start();
      const id = viz.animationId;
      const callCount = globalThis.requestAnimationFrame.mock.calls.length;
      viz.start();
      expect(viz.animationId).toBe(id);
      expect(globalThis.requestAnimationFrame.mock.calls.length).toBe(callCount);
    });

    it('should stop animation and clear id', () => {
      const viz = new WaveformVisualizer('testWave');
      viz.start();
      const id = viz.animationId;
      viz.stop();
      expect(viz.animationId).toBeNull();
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(id);
    });

    it('should handle stop when not running', () => {
      const viz = new WaveformVisualizer('testWave');
      expect(() => viz.stop()).not.toThrow();
      expect(viz.animationId).toBeNull();
    });

    it('should increment time in animate()', () => {
      const viz = new WaveformVisualizer('testWave');
      const initialTime = viz.time;
      viz.animate();
      expect(viz.time).toBeCloseTo(initialTime + 0.016, 5);
    });

    it('should call reinitCanvas when starting', () => {
      const viz = new WaveformVisualizer('testWave');
      // After construction, simulate non-zero layout
      mockBoundingRect(canvas, 400, 100);
      viz.start();
      expect(viz.canvas.width).toBe(800);
      expect(viz.canvas.height).toBe(200);
    });
  });

  describe('Draw', () => {
    it('should not throw without canvas', () => {
      const viz = new WaveformVisualizer('nonexistent');
      expect(() => viz.draw()).not.toThrow();
    });

    it('should not throw with valid canvas', () => {
      const viz = new WaveformVisualizer('testWave');
      expect(() => viz.draw()).not.toThrow();
    });

    it('should not throw when inverted', () => {
      const viz = new WaveformVisualizer('testWave');
      viz.setParams(1000, 'sine', 1, true);
      expect(() => viz.draw()).not.toThrow();
    });

    it('should not throw for each waveform type', () => {
      const viz = new WaveformVisualizer('testWave');
      for (const wf of ['sine', 'square', 'sawtooth', 'triangle']) {
        viz.setParams(1000, wf);
        expect(() => viz.draw()).not.toThrow();
      }
    });
  });

  describe('Canvas Reinit', () => {
    it('should reinit canvas dimensions when bounding rect is positive', () => {
      const viz = new WaveformVisualizer('testWave');
      // Initially uses defaults (600x120)
      expect(viz.canvas.width).toBe(600);

      mockBoundingRect(canvas, 350, 80);
      viz.reinitCanvas();
      expect(viz.canvas.width).toBe(700);
      expect(viz.canvas.height).toBe(160);
    });

    it('should not change dimensions when bounding rect is zero', () => {
      const viz = new WaveformVisualizer('testWave');
      expect(viz.canvas.width).toBe(600);

      // bounding rect is still 0x0
      viz.reinitCanvas();
      expect(viz.canvas.width).toBe(600);
    });

    it('should not crash on null canvas', () => {
      const viz = new WaveformVisualizer('nonexistent');
      expect(() => viz.reinitCanvas()).not.toThrow();
    });
  });
});
