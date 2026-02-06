/**
 * Vitest Setup File
 * Global test utilities and mocks
 */

// Mock Web Audio API for testing
global.AudioContext = class MockAudioContext {
  constructor() {
    this.destination = { connect: () => {} };
    this.currentTime = 0;
    this.sampleRate = 44100;
  }
  
  createOscillator() {
    return {
      frequency: { value: 440, setTargetAtTime: () => {} },
      type: 'sine',
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  
  createGain() {
    return {
      gain: { value: 1, setTargetAtTime: () => {} },
      connect: () => {},
      disconnect: () => {}
    };
  }
  
  createStereoPanner() {
    return {
      pan: { value: 0 },
      connect: () => {},
      disconnect: () => {}
    };
  }
  
  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      connect: () => {},
      disconnect: () => {},
      getByteFrequencyData: () => {},
      getByteTimeDomainData: () => {}
    };
  }
  
  createBiquadFilter() {
    return {
      type: 'notch',
      frequency: { value: 1000 },
      Q: { value: 1 },
      gain: { value: 0 },
      connect: () => {},
      disconnect: () => {}
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  
  createMediaElementSource(element) {
    return {
      connect: () => {},
      disconnect: () => {},
      mediaElement: element
    };
  }
};

// Mock localStorage
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

// Mock canvas for visualizers
global.HTMLCanvasElement.prototype.getContext = function() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    fillText: () => {},
    measureText: () => ({ width: 0 }),
    canvas: { width: 800, height: 600 }
  };
};

// Mock console methods to reduce test noise (optional)
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Helper: Wait for async operations
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Create mock audio element
export const createMockAudio = () => ({
  src: '',
  volume: 1,
  currentTime: 0,
  duration: 100,
  paused: true,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
});

// Helper: Create mock DOM elements
export const createMockElement = (tag, attributes = {}) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'innerHTML') {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
};

console.log('✅ Test environment setup complete');
