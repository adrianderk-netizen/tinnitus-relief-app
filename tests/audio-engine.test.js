/**
 * Audio Engine Tests
 * Tests the real AudioEngine class from ../js/audio-engine.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioEngine } from '../js/audio-engine.js';

// Helper to create a mock AudioParam with both value storage and Web Audio methods
function createMockAudioParam(initialValue = 0) {
  return {
    value: initialValue,
    setValueAtTime: vi.fn(function (v) { this.value = v; }),
    setTargetAtTime: vi.fn(function (v) { this.value = v; }),
    linearRampToValueAtTime: vi.fn(function (v) { this.value = v; }),
    exponentialRampToValueAtTime: vi.fn(function (v) { this.value = v; }),
  };
}

// Enhanced mock AudioContext that supports all operations AudioEngine needs
function createEnhancedMockAudioContext() {
  const ctx = {
    destination: { connect: vi.fn() },
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),

    createOscillator: vi.fn(() => ({
      frequency: createMockAudioParam(440),
      type: 'sine',
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),

    createGain: vi.fn(() => ({
      gain: createMockAudioParam(1),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),

    createStereoPanner: vi.fn(() => ({
      pan: createMockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),

    createAnalyser: vi.fn(() => ({
      fftSize: 2048,
      frequencyBinCount: 1024,
      smoothingTimeConstant: 0.8,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
    })),

    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: createMockAudioParam(350),
      Q: createMockAudioParam(1),
      gain: createMockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),

    createBufferSource: vi.fn(() => ({
      buffer: null,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),

    createBuffer: vi.fn((channels, length, sampleRate) => {
      const channelData = [];
      for (let ch = 0; ch < channels; ch++) {
        channelData.push(new Float32Array(length));
      }
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: vi.fn((ch) => channelData[ch]),
      };
    }),

    createMediaElementSource: vi.fn((element) => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      mediaElement: element,
    })),
  };

  return ctx;
}

describe('AudioEngine', () => {
  let engine;
  let mockCtx;

  beforeEach(() => {
    // Provide window.AudioContext so AudioEngine.init() can construct one
    mockCtx = createEnhancedMockAudioContext();
    const MockAudioContextClass = vi.fn(() => mockCtx);
    global.window = global.window || {};
    global.window.AudioContext = MockAudioContextClass;
    global.window.webkitAudioContext = undefined;

    // Provide MediaMetadata if not present
    global.MediaMetadata = global.MediaMetadata || vi.fn((data) => data);

    // Ensure navigator.mediaSession exists for media session tests
    if (!global.navigator) global.navigator = {};
    global.navigator.mediaSession = {
      metadata: null,
      playbackState: 'none',
      setActionHandler: vi.fn(),
    };

    engine = new AudioEngine();
    engine.init();
  });

  describe('Initialization', () => {
    it('should create an AudioContext on init', () => {
      expect(engine.audioContext).toBe(mockCtx);
    });

    it('should create a master gain node connected to destination', () => {
      expect(engine.masterGain).toBeDefined();
      expect(engine.masterGain.connect).toHaveBeenCalled();
    });

    it('should not create a second AudioContext on repeated init calls', () => {
      const firstCtx = engine.audioContext;
      engine.init();
      expect(engine.audioContext).toBe(firstCtx);
    });

    it('should resume a suspended context on init', () => {
      // Create a fresh engine with a suspended context
      const suspendedCtx = createEnhancedMockAudioContext();
      suspendedCtx.state = 'suspended';
      global.window.AudioContext = vi.fn(() => suspendedCtx);

      const freshEngine = new AudioEngine();
      freshEngine.init();

      expect(suspendedCtx.resume).toHaveBeenCalled();
    });
  });

  describe('currentTime', () => {
    it('should return audioContext.currentTime', () => {
      mockCtx.currentTime = 1.5;
      expect(engine.currentTime).toBe(1.5);
    });

    it('should return 0 when audioContext is null', () => {
      const uninitEngine = new AudioEngine();
      expect(uninitEngine.currentTime).toBe(0);
    });
  });

  describe('Oscillator Creation', () => {
    it('should create oscillator with default frequency 440 and sine waveform', () => {
      const osc = engine.createOscillator();
      expect(osc.type).toBe('sine');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(440, engine.currentTime);
    });

    it('should create oscillator with specified frequency', () => {
      const osc = engine.createOscillator(1000);
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(1000, engine.currentTime);
    });

    it('should support different waveforms', () => {
      const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];

      waveforms.forEach((waveform) => {
        const osc = engine.createOscillator(440, waveform);
        expect(osc.type).toBe(waveform);
      });
    });

    it('should handle frequency range (100-15000 Hz)', () => {
      const oscLow = engine.createOscillator(100);
      expect(oscLow.frequency.setValueAtTime).toHaveBeenCalledWith(100, engine.currentTime);

      const oscHigh = engine.createOscillator(15000);
      expect(oscHigh.frequency.setValueAtTime).toHaveBeenCalledWith(15000, engine.currentTime);

      const oscMid = engine.createOscillator(4000);
      expect(oscMid.frequency.setValueAtTime).toHaveBeenCalledWith(4000, engine.currentTime);
    });
  });

  describe('Gain Control', () => {
    it('should create gain node with default value 1', () => {
      const gain = engine.createGain();
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(1, engine.currentTime);
    });

    it('should create gain node with specified value', () => {
      const gain = engine.createGain(0.5);
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.5, engine.currentTime);
    });

    it('should handle volume range (0-1)', () => {
      const gainZero = engine.createGain(0);
      expect(gainZero.gain.setValueAtTime).toHaveBeenCalledWith(0, engine.currentTime);

      const gainFull = engine.createGain(1);
      expect(gainFull.gain.setValueAtTime).toHaveBeenCalledWith(1, engine.currentTime);

      const gainHalf = engine.createGain(0.5);
      expect(gainHalf.gain.setValueAtTime).toHaveBeenCalledWith(0.5, engine.currentTime);
    });
  });

  describe('Panning', () => {
    it('should create stereo panner for left channel', () => {
      const panner = engine.createPanner(-1);
      expect(panner.pan.setValueAtTime).toHaveBeenCalledWith(-1, engine.currentTime);
    });

    it('should create stereo panner for right channel', () => {
      const panner = engine.createPanner(1);
      expect(panner.pan.setValueAtTime).toHaveBeenCalledWith(1, engine.currentTime);
    });

    it('should support center panning (default)', () => {
      const panner = engine.createPanner();
      expect(panner.pan.setValueAtTime).toHaveBeenCalledWith(0, engine.currentTime);
    });
  });

  describe('Notch Filter', () => {
    it('should create notch filter at specified frequency', () => {
      const filter = engine.createNotchFilter(4000, 1);
      expect(filter.type).toBe('notch');
      expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(4000, engine.currentTime);
      expect(filter.Q.setValueAtTime).toHaveBeenCalledWith(1, engine.currentTime);
    });

    it('should use default frequency and Q when not specified', () => {
      const filter = engine.createNotchFilter();
      expect(filter.type).toBe('notch');
      expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(1000, engine.currentTime);
      expect(filter.Q.setValueAtTime).toHaveBeenCalledWith(10, engine.currentTime);
    });

    it('should support different Q values for notch width', () => {
      const qValues = [0.5, 1, 2, 4];
      qValues.forEach((q) => {
        const filter = engine.createNotchFilter(1000, q);
        expect(filter.Q.setValueAtTime).toHaveBeenCalledWith(q, engine.currentTime);
      });
    });
  });

  describe('parseNotchWidth', () => {
    it('should parse Hz-based width strings', () => {
      const result = engine.parseNotchWidth('hz50', 1000);
      expect(result.lowerFreq).toBe(950);
      expect(result.upperFreq).toBe(1050);
      expect(result.isNarrow).toBe(true);
      expect(result.hzWidth).toBe(50);
    });

    it('should parse octave-based width numbers', () => {
      const result = engine.parseNotchWidth(1, 1000);
      expect(result.isNarrow).toBe(false);
      expect(result.octaveWidth).toBe(1);
      expect(result.lowerFreq).toBeCloseTo(1000 / Math.pow(2, 0.5), 5);
      expect(result.upperFreq).toBeCloseTo(1000 * Math.pow(2, 0.5), 5);
    });

    it('should default to octave width 1 for invalid input', () => {
      const result = engine.parseNotchWidth(undefined, 1000);
      expect(result.octaveWidth).toBe(1);
      expect(result.isNarrow).toBe(false);
    });
  });

  describe('Notch Filter Bank', () => {
    it('should create a filter bank with connected filters', () => {
      const bank = engine.createNotchFilterBank(4000, 1, 1);
      expect(bank.input).toBeDefined();
      expect(bank.output).toBeDefined();
      expect(bank.filters).toBeDefined();
      expect(bank.filters.length).toBeGreaterThan(0);
    });

    it('should expose an update function', () => {
      const bank = engine.createNotchFilterBank(4000, 1, 1);
      expect(typeof bank.update).toBe('function');
    });

    it('should update filter frequencies via the update method', () => {
      const bank = engine.createNotchFilterBank(4000, 1, 1);
      bank.update(5000, 1, 1);

      bank.filters.forEach((f) => {
        expect(f.frequency.setTargetAtTime).toHaveBeenCalled();
        expect(f.Q.setTargetAtTime).toHaveBeenCalled();
      });
    });

    it('should connect filters in series', () => {
      const bank = engine.createNotchFilterBank(4000, 1, 1);
      // Each filter except the last should have called connect
      for (let i = 0; i < bank.filters.length - 1; i++) {
        expect(bank.filters[i].connect).toHaveBeenCalledWith(bank.filters[i + 1]);
      }
    });

    it('should handle Hz-based width in filter bank', () => {
      const bank = engine.createNotchFilterBank(4000, 'hz100', 1);
      expect(bank.filters.length).toBeGreaterThan(0);
    });
  });

  describe('Noise Buffers', () => {
    it('should create a white noise buffer with 2 channels', () => {
      const buf = engine.createWhiteNoiseBuffer(1);
      expect(buf.numberOfChannels).toBe(2);
      expect(mockCtx.createBuffer).toHaveBeenCalledWith(2, 44100, 44100);
    });

    it('should create a pink noise buffer with 2 channels', () => {
      const buf = engine.createPinkNoiseBuffer(1);
      expect(buf.numberOfChannels).toBe(2);
    });

    it('should create a brown noise buffer with 2 channels', () => {
      const buf = engine.createBrownNoiseBuffer(1);
      expect(buf.numberOfChannels).toBe(2);
    });

    it('should fill buffer channel data', () => {
      const buf = engine.createWhiteNoiseBuffer(1);
      // getChannelData should have been called for each channel
      expect(buf.getChannelData).toHaveBeenCalledWith(0);
      expect(buf.getChannelData).toHaveBeenCalledWith(1);
    });
  });

  describe('Noise Source', () => {
    it('should create a white noise source by default', () => {
      const src = engine.createNoiseSource();
      expect(src.loop).toBe(true);
      expect(src.buffer).toBeDefined();
    });

    it('should create a pink noise source', () => {
      const src = engine.createNoiseSource('pink');
      expect(src.loop).toBe(true);
      expect(src.buffer).toBeDefined();
    });

    it('should create a brown noise source', () => {
      const src = engine.createNoiseSource('brown');
      expect(src.loop).toBe(true);
      expect(src.buffer).toBeDefined();
    });
  });

  describe('Analyzer', () => {
    it('should create analyzer with default FFT size 2048', () => {
      const analyzer = engine.createAnalyzer();
      expect(analyzer.fftSize).toBe(2048);
      expect(analyzer.smoothingTimeConstant).toBe(0.8);
    });

    it('should create analyzer with specified FFT size', () => {
      const analyzer = engine.createAnalyzer(4096);
      expect(analyzer.fftSize).toBe(4096);
    });
  });

  describe('Phase Inversion', () => {
    it('should support phase inversion with negative gain', () => {
      const gain = engine.createGain(-1);
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(-1, engine.currentTime);
    });
  });

  describe('Audio Graph Connections', () => {
    it('should connect oscillator to gain via connect', () => {
      const osc = engine.createOscillator(440);
      const gain = engine.createGain(0.5);

      osc.connect(gain);
      expect(osc.connect).toHaveBeenCalledWith(gain);
    });

    it('should allow disconnection of nodes', () => {
      const osc = engine.createOscillator(440);
      osc.disconnect();
      expect(osc.disconnect).toHaveBeenCalled();
    });

    it('should connect a node to master gain via connectToMaster', () => {
      const osc = engine.createOscillator(440);
      engine.connectToMaster(osc);
      expect(osc.connect).toHaveBeenCalledWith(engine.masterGain);
    });
  });

  describe('Tone Control', () => {
    it('should start and stop oscillator', () => {
      const osc = engine.createOscillator(440);

      osc.start();
      expect(osc.start).toHaveBeenCalled();

      osc.stop();
      expect(osc.stop).toHaveBeenCalled();
    });
  });

  describe('Master Volume', () => {
    it('should set master volume via setMasterVolume', () => {
      engine.setMasterVolume(0.7);
      expect(engine.masterGain.gain.setTargetAtTime).toHaveBeenCalledWith(0.7, engine.currentTime, 0.01);
    });

    it('should not throw when masterGain is null', () => {
      engine.masterGain = null;
      expect(() => engine.setMasterVolume(0.5)).not.toThrow();
    });
  });

  describe('Media Element Source', () => {
    it('should create media element source from element', () => {
      const mockElement = { src: 'test.mp3' };
      const source = engine.createMediaElementSource(mockElement);
      expect(mockCtx.createMediaElementSource).toHaveBeenCalledWith(mockElement);
      expect(source.mediaElement).toBe(mockElement);
    });
  });

  describe('Background Audio', () => {
    it('should register a visibilitychange listener', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener');
      engine.setupBackgroundAudio();
      expect(addEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      addEventSpy.mockRestore();
    });
  });

  describe('Media Session', () => {
    it('should set media session metadata', () => {
      engine.setupMediaSession();
      expect(navigator.mediaSession.metadata).toBeDefined();
      expect(navigator.mediaSession.metadata.title).toBe('Tinnitus Relief Therapy');
    });

    it('should register action handlers when callbacks provided', () => {
      const onPlay = vi.fn();
      const onPause = vi.fn();
      const onStop = vi.fn();

      engine.setupMediaSession({ onPlay, onPause, onStop });

      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('play', onPlay);
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('pause', onPause);
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('stop', onStop);
    });

    it('should not register handlers for missing callbacks', () => {
      engine.setupMediaSession({ onPlay: vi.fn() });
      // Only play should be registered, not pause or stop
      const calls = navigator.mediaSession.setActionHandler.mock.calls;
      const actions = calls.map((c) => c[0]);
      expect(actions).toContain('play');
      expect(actions).not.toContain('pause');
      expect(actions).not.toContain('stop');
    });
  });

  describe('updateMediaSessionPlayback', () => {
    it('should set playbackState to playing when true', () => {
      engine.updateMediaSessionPlayback(true);
      expect(navigator.mediaSession.playbackState).toBe('playing');
    });

    it('should set playbackState to paused when false', () => {
      engine.updateMediaSessionPlayback(false);
      expect(navigator.mediaSession.playbackState).toBe('paused');
    });
  });
});

describe('AudioEngine - Edge Cases', () => {
  let engine;

  beforeEach(() => {
    const mockCtx = createEnhancedMockAudioContext();
    global.window = global.window || {};
    global.window.AudioContext = vi.fn(() => mockCtx);
    global.window.webkitAudioContext = undefined;

    engine = new AudioEngine();
    engine.init();
  });

  it('should handle rapid frequency changes', () => {
    // Create multiple oscillators with escalating frequencies
    let lastOsc;
    for (let i = 0; i < 100; i++) {
      lastOsc = engine.createOscillator(100 + i * 100);
    }

    // The last oscillator should have been created with frequency 10000
    expect(lastOsc.frequency.setValueAtTime).toHaveBeenCalledWith(10000, engine.currentTime);
  });

  it('should handle multiple concurrent tones', () => {
    const oscs = [];

    for (let i = 0; i < 10; i++) {
      const osc = engine.createOscillator(440 * (i + 1));
      oscs.push(osc);
    }

    expect(oscs).toHaveLength(10);
    oscs.forEach((osc, i) => {
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(440 * (i + 1), engine.currentTime);
    });
  });
});

describe('AudioEngine - Performance', () => {
  let engine;

  beforeEach(() => {
    const mockCtx = createEnhancedMockAudioContext();
    global.window = global.window || {};
    global.window.AudioContext = vi.fn(() => mockCtx);
    global.window.webkitAudioContext = undefined;

    engine = new AudioEngine();
    engine.init();
  });

  it('should create audio nodes quickly', () => {
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      engine.createOscillator();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should create 1000 nodes in less than 200ms
    expect(duration).toBeLessThan(200);
  });
});
