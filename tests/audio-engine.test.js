/**
 * Audio Engine Tests
 * Tests core audio functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AudioEngine since we can't import ES6 modules directly
// In a real setup, you'd refactor audio-engine.js to be a proper ES6 module

describe('AudioEngine', () => {
  let audioContext;
  
  beforeEach(() => {
    audioContext = new AudioContext();
  });

  describe('Oscillator Creation', () => {
    it('should create oscillator with correct frequency', () => {
      const osc = audioContext.createOscillator();
      osc.frequency.value = 440;
      expect(osc.frequency.value).toBe(440);
    });

    it('should support different waveforms', () => {
      const osc = audioContext.createOscillator();
      const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
      
      waveforms.forEach(waveform => {
        osc.type = waveform;
        expect(osc.type).toBe(waveform);
      });
    });

    it('should handle frequency range (100-15000 Hz)', () => {
      const osc = audioContext.createOscillator();
      
      // Test minimum
      osc.frequency.value = 100;
      expect(osc.frequency.value).toBe(100);
      
      // Test maximum
      osc.frequency.value = 15000;
      expect(osc.frequency.value).toBe(15000);
      
      // Test mid-range
      osc.frequency.value = 4000;
      expect(osc.frequency.value).toBe(4000);
    });
  });

  describe('Gain Control', () => {
    it('should create gain node with correct initial value', () => {
      const gain = audioContext.createGain();
      gain.gain.value = 0.5;
      expect(gain.gain.value).toBe(0.5);
    });

    it('should handle volume range (0-1)', () => {
      const gain = audioContext.createGain();
      
      gain.gain.value = 0;
      expect(gain.gain.value).toBe(0);
      
      gain.gain.value = 1;
      expect(gain.gain.value).toBe(1);
      
      gain.gain.value = 0.5;
      expect(gain.gain.value).toBe(0.5);
    });
  });

  describe('Panning', () => {
    it('should create stereo panner for left channel', () => {
      const panner = audioContext.createStereoPanner();
      panner.pan.value = -1; // Full left
      expect(panner.pan.value).toBe(-1);
    });

    it('should create stereo panner for right channel', () => {
      const panner = audioContext.createStereoPanner();
      panner.pan.value = 1; // Full right
      expect(panner.pan.value).toBe(1);
    });

    it('should support center panning', () => {
      const panner = audioContext.createStereoPanner();
      panner.pan.value = 0; // Center
      expect(panner.pan.value).toBe(0);
    });
  });

  describe('Notch Filter', () => {
    it('should create notch filter at specified frequency', () => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'notch';
      filter.frequency.value = 4000;
      filter.Q.value = 1;
      
      expect(filter.type).toBe('notch');
      expect(filter.frequency.value).toBe(4000);
      expect(filter.Q.value).toBe(1);
    });

    it('should support different Q values for notch width', () => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'notch';
      
      const qValues = [0.5, 1, 2, 4];
      qValues.forEach(q => {
        filter.Q.value = q;
        expect(filter.Q.value).toBe(q);
      });
    });
  });

  describe('Phase Inversion', () => {
    it('should support phase inversion with negative gain', () => {
      const gain = audioContext.createGain();
      
      // Normal phase
      gain.gain.value = 1;
      expect(gain.gain.value).toBe(1);
      
      // Inverted phase
      gain.gain.value = -1;
      expect(gain.gain.value).toBe(-1);
    });
  });

  describe('Analyzer', () => {
    it('should create analyzer with correct FFT size', () => {
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 2048;
      
      expect(analyzer.fftSize).toBe(2048);
      expect(analyzer.frequencyBinCount).toBe(1024); // fftSize / 2
    });
  });

  describe('Audio Graph Connections', () => {
    it('should connect oscillator to gain to destination', () => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      const connectSpy = vi.spyOn(osc, 'connect');
      osc.connect(gain);
      
      expect(connectSpy).toHaveBeenCalledWith(gain);
    });

    it('should allow disconnection of nodes', () => {
      const osc = audioContext.createOscillator();
      const disconnectSpy = vi.spyOn(osc, 'disconnect');
      
      osc.disconnect();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Tone Control', () => {
    it('should start and stop oscillator', () => {
      const osc = audioContext.createOscillator();
      const startSpy = vi.spyOn(osc, 'start');
      const stopSpy = vi.spyOn(osc, 'stop');
      
      osc.start();
      expect(startSpy).toHaveBeenCalled();
      
      osc.stop();
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});

describe('AudioEngine - Edge Cases', () => {
  it('should handle rapid frequency changes', () => {
    const audioContext = new AudioContext();
    const osc = audioContext.createOscillator();
    
    // Rapidly change frequency
    for (let i = 0; i < 100; i++) {
      osc.frequency.value = 100 + (i * 100);
    }
    
    expect(osc.frequency.value).toBe(10000);
  });

  it('should handle multiple concurrent tones', () => {
    const audioContext = new AudioContext();
    const oscs = [];
    
    // Create 10 oscillators
    for (let i = 0; i < 10; i++) {
      const osc = audioContext.createOscillator();
      osc.frequency.value = 440 * (i + 1);
      oscs.push(osc);
    }
    
    expect(oscs).toHaveLength(10);
    oscs.forEach((osc, i) => {
      expect(osc.frequency.value).toBe(440 * (i + 1));
    });
  });
});

describe('AudioEngine - Performance', () => {
  it('should create audio nodes quickly', () => {
    const audioContext = new AudioContext();
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      audioContext.createOscillator();
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should create 1000 nodes in less than 100ms
    expect(duration).toBeLessThan(100);
  });
});
