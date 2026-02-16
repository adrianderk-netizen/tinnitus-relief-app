/**
 * Frequency Sweep Manager Tests
 * Tests the REAL FrequencySweepManager from js/frequency-sweep.js
 * Tests sweep range, speed, start/pause/stop, matching, and confidence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FrequencySweepManager } from '../js/frequency-sweep.js';

describe('FrequencySweepManager', () => {
    let sweep;
    let mockAudioEngine;
    let mockOscillator;

    beforeEach(() => {
        vi.useFakeTimers();

        // Mock performance.now to return a stable value so animate() delta is 0
        // on the initial call from start(). Tests that need to advance time
        // will override this with their own spy.
        vi.spyOn(performance, 'now').mockReturnValue(1000);

        // Mock requestAnimationFrame to capture the callback without running it
        vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
            return 999; // Return a fake animation frame ID
        }));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        vi.stubGlobal('alert', vi.fn());

        // Mock navigator.vibrate
        Object.defineProperty(navigator, 'vibrate', {
            value: vi.fn(),
            writable: true,
            configurable: true
        });

        // Set up the DOM structure that init() / showSweepUI() expects
        document.body.innerHTML = `
            <div id="tone-matcher">
                <div class="mode-header"></div>
            </div>
        `;

        // Create a mock oscillator that is returned by createOscillator
        mockOscillator = {
            frequency: { value: 440, setTargetAtTime: vi.fn() },
            type: 'sine',
            connect: vi.fn(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        };

        mockAudioEngine = {
            init: vi.fn(),
            createOscillator: vi.fn(() => mockOscillator),
            createGain: vi.fn(() => ({
                gain: { value: 0.3 },
                connect: vi.fn()
            })),
            createPanner: vi.fn((panValue) => ({
                pan: { value: panValue },
                connect: vi.fn()
            })),
            connectToMaster: vi.fn(),
            currentTime: 0
        };

        sweep = new FrequencySweepManager(mockAudioEngine);
    });

    afterEach(() => {
        // Clean up: stop sweep if running to cancel animation frames
        if (sweep.isRunning) {
            sweep.stop();
        }
        vi.useRealTimers();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        it('should start with default sweep range 1000-12000 Hz', () => {
            expect(sweep.startFreq).toBe(1000);
            expect(sweep.endFreq).toBe(12000);
        });

        it('should start with default speed 100 Hz/sec', () => {
            expect(sweep.sweepSpeed).toBe(100);
        });

        it('should not be running initially', () => {
            expect(sweep.isRunning).toBe(false);
            expect(sweep.isPaused).toBe(false);
        });

        it('should have empty matched frequencies', () => {
            expect(sweep.matchedFrequencies).toEqual([]);
            expect(sweep.confidenceLevel).toBe(0);
        });

        it('should store the audio engine reference', () => {
            expect(sweep.audioEngine).toBe(mockAudioEngine);
        });

        it('should have null audio nodes before starting', () => {
            expect(sweep.oscillator).toBeNull();
            expect(sweep.gainNode).toBeNull();
            expect(sweep.pannerNode).toBeNull();
        });

        it('should initialize callback slots as null', () => {
            expect(sweep.callbacks.onFrequencyUpdate).toBeNull();
            expect(sweep.callbacks.onSweepComplete).toBeNull();
            expect(sweep.callbacks.onMatch).toBeNull();
        });
    });

    describe('init()', () => {
        it('should create the sweep UI panel in the DOM', () => {
            sweep.init();
            expect(document.querySelector('.sweep-panel')).not.toBeNull();
        });

        it('should not create duplicate panels on repeated init calls', () => {
            sweep.init();
            sweep.init();
            const panels = document.querySelectorAll('.sweep-panel');
            expect(panels.length).toBe(1);
        });

        it('should create sweep control buttons', () => {
            sweep.init();
            expect(document.getElementById('startSweep')).not.toBeNull();
            expect(document.getElementById('pauseSweep')).not.toBeNull();
            expect(document.getElementById('stopSweep')).not.toBeNull();
            expect(document.getElementById('resetSweep')).not.toBeNull();
        });

        it('should create the match button', () => {
            sweep.init();
            expect(document.getElementById('matchThisFreq')).not.toBeNull();
        });

        it('should create frequency display elements', () => {
            sweep.init();
            expect(document.getElementById('sweepCurrentFreq')).not.toBeNull();
            expect(document.getElementById('sweepProgressFill')).not.toBeNull();
        });

        it('should create sweep range input fields', () => {
            sweep.init();
            expect(document.getElementById('sweepStartFreq')).not.toBeNull();
            expect(document.getElementById('sweepEndFreq')).not.toBeNull();
        });

        it('should create ear selection dropdown', () => {
            sweep.init();
            expect(document.getElementById('sweepEar')).not.toBeNull();
        });

        it('should create speed selection dropdown', () => {
            sweep.init();
            expect(document.getElementById('sweepSpeed')).not.toBeNull();
        });
    });

    describe('Sweep Control - start()', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should start sweep and set isRunning to true', () => {
            sweep.start();
            expect(sweep.isRunning).toBe(true);
            expect(sweep.isPaused).toBe(false);
        });

        it('should set current freq to start freq on fresh start', () => {
            sweep.start();
            expect(sweep.currentFreq).toBe(1000);
        });

        it('should call audioEngine.init() on start', () => {
            sweep.start();
            expect(mockAudioEngine.init).toHaveBeenCalled();
        });

        it('should create oscillator, gain, and panner nodes', () => {
            sweep.start();
            expect(mockAudioEngine.createOscillator).toHaveBeenCalled();
            expect(mockAudioEngine.createGain).toHaveBeenCalled();
            expect(mockAudioEngine.createPanner).toHaveBeenCalled();
        });

        it('should connect the audio nodes and start the oscillator', () => {
            sweep.start();
            expect(mockOscillator.connect).toHaveBeenCalled();
            expect(mockOscillator.start).toHaveBeenCalled();
            expect(mockAudioEngine.connectToMaster).toHaveBeenCalled();
        });

        it('should not restart if already running', () => {
            sweep.start();
            mockAudioEngine.createOscillator.mockClear();

            // Manually set currentFreq to simulate progress
            sweep.currentFreq = 5000;
            sweep.start(); // should not reset

            // Should not create new oscillator
            expect(mockAudioEngine.createOscillator).not.toHaveBeenCalled();
            expect(sweep.currentFreq).toBe(5000);
        });

        it('should enable the match button when started', () => {
            const matchBtn = document.getElementById('matchThisFreq');
            expect(matchBtn.disabled).toBe(true);
            sweep.start();
            expect(matchBtn.disabled).toBe(false);
        });

        it('should schedule animation via requestAnimationFrame', () => {
            sweep.start();
            expect(requestAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('Sweep Control - togglePause()', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should pause a running sweep', () => {
            sweep.start();
            sweep.togglePause();
            expect(sweep.isRunning).toBe(true);
            expect(sweep.isPaused).toBe(true);
        });

        it('should resume from pause', () => {
            sweep.start();
            sweep.togglePause();
            sweep.togglePause(); // resume
            expect(sweep.isPaused).toBe(false);
            expect(sweep.isRunning).toBe(true);
        });

        it('should not pause if not running', () => {
            sweep.togglePause();
            expect(sweep.isPaused).toBe(false);
        });

        it('should update pause button text when paused', () => {
            sweep.start();
            sweep.togglePause();
            const btn = document.getElementById('pauseSweep');
            expect(btn.textContent).toContain('Resume');
        });

        it('should update pause button text when resumed', () => {
            sweep.start();
            sweep.togglePause();
            sweep.togglePause();
            const btn = document.getElementById('pauseSweep');
            expect(btn.textContent).toContain('Pause');
        });

        it('should call requestAnimationFrame when resuming', () => {
            sweep.start();
            requestAnimationFrame.mockClear();
            sweep.togglePause();  // pause
            sweep.togglePause();  // resume
            expect(requestAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('Sweep Control - stop()', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should stop a running sweep', () => {
            sweep.start();
            sweep.stop();
            expect(sweep.isRunning).toBe(false);
            expect(sweep.isPaused).toBe(false);
        });

        it('should stop and disconnect the oscillator', () => {
            sweep.start();
            sweep.stop();
            expect(mockOscillator.stop).toHaveBeenCalled();
            expect(mockOscillator.disconnect).toHaveBeenCalled();
            expect(sweep.oscillator).toBeNull();
        });

        it('should cancel animation frame', () => {
            sweep.start();
            sweep.stop();
            expect(cancelAnimationFrame).toHaveBeenCalled();
        });

        it('should null out audio nodes', () => {
            sweep.start();
            sweep.stop();
            expect(sweep.oscillator).toBeNull();
            expect(sweep.gainNode).toBeNull();
            expect(sweep.pannerNode).toBeNull();
        });

        it('should disable the match button', () => {
            sweep.start();
            sweep.stop();
            const matchBtn = document.getElementById('matchThisFreq');
            expect(matchBtn.disabled).toBe(true);
        });
    });

    describe('Sweep Control - reset()', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should reset to initial state', () => {
            sweep.start();
            sweep.currentFreq = 8000;
            sweep.matchedFrequencies = [4000, 4500];
            sweep.confidenceLevel = 70;
            sweep.reset();

            expect(sweep.isRunning).toBe(false);
            expect(sweep.currentFreq).toBe(1000);
            expect(sweep.matchedFrequencies).toEqual([]);
            expect(sweep.confidenceLevel).toBe(0);
        });

        it('should stop the oscillator when resetting', () => {
            sweep.start();
            sweep.reset();
            expect(mockOscillator.stop).toHaveBeenCalled();
        });
    });

    describe('Sweep Range', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should allow custom start frequency', () => {
            sweep.startFreq = 2000;
            sweep.start();
            expect(sweep.currentFreq).toBe(2000);
        });

        it('should allow custom end frequency', () => {
            sweep.endFreq = 8000;
            expect(sweep.endFreq).toBe(8000);
        });

        it('should update startFreq via input field change event', () => {
            const input = document.getElementById('sweepStartFreq');
            input.value = '2000';
            input.dispatchEvent(new Event('change'));
            expect(sweep.startFreq).toBe(2000);
        });

        it('should update endFreq via input field change event', () => {
            const input = document.getElementById('sweepEndFreq');
            input.value = '8000';
            input.dispatchEvent(new Event('change'));
            expect(sweep.endFreq).toBe(8000);
        });

        it('should clamp start frequency to valid range', () => {
            const input = document.getElementById('sweepStartFreq');
            input.value = '50';
            input.dispatchEvent(new Event('change'));
            expect(sweep.startFreq).toBe(100);
        });

        it('should clamp start frequency max to 15000', () => {
            const input = document.getElementById('sweepStartFreq');
            input.value = '20000';
            input.dispatchEvent(new Event('change'));
            expect(sweep.startFreq).toBe(15000);
        });
    });

    describe('Speed Control', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should update sweepSpeed via dropdown change event', () => {
            const select = document.getElementById('sweepSpeed');
            select.value = '200';
            select.dispatchEvent(new Event('change'));
            expect(sweep.sweepSpeed).toBe(200);
        });

        it('should set speed to slow via dropdown', () => {
            const select = document.getElementById('sweepSpeed');
            select.value = '50';
            select.dispatchEvent(new Event('change'));
            expect(sweep.sweepSpeed).toBe(50);
        });
    });

    describe('Animation / Sweep Progress', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should advance frequency based on elapsed time during animate()', () => {
            // Arrange: mock performance.now to control time
            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            // After start(), lastUpdateTime = 1000 and animate() was called once.
            // The first animate() call computes delta from lastUpdateTime.
            // Capture the animate callback passed to requestAnimationFrame.
            const animateCallback = requestAnimationFrame.mock.calls[0][0];

            // Advance time by 1 second
            timeNow = 2000;
            requestAnimationFrame.mockClear();
            animateCallback();

            // With speed=100 Hz/sec and delta=1s, freq should advance by 100
            expect(sweep.currentFreq).toBeCloseTo(1100, 0);
        });

        it('should not advance when paused', () => {
            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            sweep.togglePause();

            // Try calling animate directly -- it should bail out
            sweep.animate();
            expect(sweep.currentFreq).toBe(1000);
        });

        it('should not advance when stopped', () => {
            sweep.currentFreq = 1000;
            // animate() when not running should do nothing
            sweep.animate();
            expect(sweep.currentFreq).toBe(1000);
        });

        it('should update the oscillator frequency during animation', () => {
            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            const animateCallback = requestAnimationFrame.mock.calls[0][0];

            timeNow = 2000;
            animateCallback();

            expect(mockOscillator.frequency.setTargetAtTime).toHaveBeenCalled();
        });

        it('should fire onFrequencyUpdate callback during animation', () => {
            const updateCb = vi.fn();
            sweep.on('onFrequencyUpdate', updateCb);

            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            const animateCallback = requestAnimationFrame.mock.calls[0][0];

            timeNow = 1500;
            animateCallback();

            expect(updateCb).toHaveBeenCalledWith(expect.any(Number));
        });

        it('should schedule the next animation frame during sweep', () => {
            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            requestAnimationFrame.mockClear();

            const animateCallback = requestAnimationFrame.mock.calls[0]?.[0] ||
                (() => sweep.animate());

            timeNow = 1100;
            // Call animate directly since we cleared mock
            sweep.animate();

            expect(requestAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('Sweep Completion', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should complete when reaching end frequency', () => {
            const completeCb = vi.fn();
            sweep.on('onSweepComplete', completeCb);

            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            const animateCallback = requestAnimationFrame.mock.calls[0][0];

            // Jump forward enough time that freq exceeds endFreq
            // With speed=100Hz/s, need (12000-1000)/100 = 110 seconds
            timeNow = 1000 + 120 * 1000; // 120 seconds later
            animateCallback();

            expect(sweep.isRunning).toBe(false);
            expect(completeCb).toHaveBeenCalled();
        });

        it('should cap frequency at end freq on completion', () => {
            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            const animateCallback = requestAnimationFrame.mock.calls[0][0];

            timeNow = 1000 + 200 * 1000;
            animateCallback();

            expect(sweep.currentFreq).toBe(12000);
        });

        it('should call alert on sweep complete', () => {
            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            const animateCallback = requestAnimationFrame.mock.calls[0][0];

            timeNow = 1000 + 200 * 1000;
            animateCallback();

            expect(alert).toHaveBeenCalled();
        });

        it('should pass matched frequencies and confidence to onSweepComplete callback', () => {
            const completeCb = vi.fn();
            sweep.on('onSweepComplete', completeCb);

            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();

            // Mark a frequency before completing
            sweep.currentFreq = 4000;
            sweep.matchedFrequencies.push(4000);
            sweep.calculateConfidence();

            const animateCallback = requestAnimationFrame.mock.calls[0][0];
            timeNow = 1000 + 200 * 1000;
            animateCallback();

            expect(completeCb).toHaveBeenCalledWith(
                expect.arrayContaining([4000]),
                expect.any(Number)
            );
        });
    });

    describe('Frequency Matching', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should not mark when not running', () => {
            // markCurrentFrequency returns undefined (no explicit return) when not running
            const result = sweep.markCurrentFrequency();
            expect(result).toBeUndefined();
            expect(sweep.matchedFrequencies).toEqual([]);
        });

        it('should record matched frequency', () => {
            sweep.start();
            sweep.currentFreq = 4500;
            sweep.markCurrentFrequency();
            expect(sweep.matchedFrequencies).toContain(4500);
        });

        it('should round matched frequency', () => {
            sweep.start();
            sweep.currentFreq = 4500.7;
            sweep.markCurrentFrequency();
            expect(sweep.matchedFrequencies).toContain(4501);
        });

        it('should fire onMatch callback with frequency, confidence, and ear', () => {
            const matchCb = vi.fn();
            sweep.on('onMatch', matchCb);

            sweep.start();
            sweep.currentFreq = 4000;

            // Set ear to left
            const earSelect = document.getElementById('sweepEar');
            earSelect.value = 'left';

            sweep.markCurrentFrequency();

            expect(matchCb).toHaveBeenCalledWith(4000, expect.any(Number), 'left');
        });

        it('should support different ear selections', () => {
            const matchCb = vi.fn();
            sweep.on('onMatch', matchCb);

            sweep.start();
            sweep.currentFreq = 4000;

            const earSelect = document.getElementById('sweepEar');

            earSelect.value = 'right';
            sweep.markCurrentFrequency();
            expect(matchCb).toHaveBeenCalledWith(4000, expect.any(Number), 'right');

            earSelect.value = 'both';
            sweep.markCurrentFrequency();
            expect(matchCb).toHaveBeenCalledWith(4000, expect.any(Number), 'both');
        });

        it('should accumulate multiple matches', () => {
            sweep.start();
            sweep.currentFreq = 4000;
            sweep.markCurrentFrequency();
            sweep.currentFreq = 4200;
            sweep.markCurrentFrequency();
            sweep.currentFreq = 4100;
            sweep.markCurrentFrequency();
            expect(sweep.matchedFrequencies).toHaveLength(3);
        });

        it('should trigger haptic feedback if navigator.vibrate is available', () => {
            sweep.start();
            sweep.currentFreq = 5000;
            sweep.markCurrentFrequency();
            expect(navigator.vibrate).toHaveBeenCalledWith(50);
        });

        it('should add matched CSS class briefly for visual feedback', () => {
            sweep.start();
            sweep.currentFreq = 5000;
            const matchBtn = document.getElementById('matchThisFreq');
            sweep.markCurrentFrequency();
            expect(matchBtn.classList.contains('matched')).toBe(true);
        });

        it('should show matched frequencies in the matches list', () => {
            sweep.start();
            sweep.currentFreq = 5000;
            sweep.markCurrentFrequency();

            const matchesContainer = document.getElementById('sweepMatches');
            expect(matchesContainer.style.display).toBe('block');
        });
    });

    describe('Confidence Calculation', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should be 0 with no matches', () => {
            sweep.calculateConfidence();
            expect(sweep.confidenceLevel).toBe(0);
        });

        it('should be 30 with single match', () => {
            sweep.matchedFrequencies = [4000];
            sweep.calculateConfidence();
            expect(sweep.confidenceLevel).toBe(30);
        });

        it('should be high (100) with perfectly consistent matches', () => {
            sweep.matchedFrequencies = [4000, 4000, 4000];
            sweep.calculateConfidence();
            expect(sweep.confidenceLevel).toBe(100);
        });

        it('should be lower with spread-out matches', () => {
            sweep.matchedFrequencies = [3000, 5000, 7000];
            sweep.calculateConfidence();
            expect(sweep.confidenceLevel).toBeLessThan(100);
        });

        it('should clamp between 0 and 100', () => {
            sweep.matchedFrequencies = [1000, 15000]; // huge spread
            sweep.calculateConfidence();
            expect(sweep.confidenceLevel).toBeGreaterThanOrEqual(0);
            expect(sweep.confidenceLevel).toBeLessThanOrEqual(100);
        });

        it('should increase confidence with more consistent data', () => {
            sweep.matchedFrequencies = [4000, 4500]; // 500 Hz spread
            sweep.calculateConfidence();
            const lowConfidence = sweep.confidenceLevel;

            sweep.matchedFrequencies = [4000, 4010]; // 10 Hz spread
            sweep.calculateConfidence();
            const highConfidence = sweep.confidenceLevel;

            expect(highConfidence).toBeGreaterThan(lowConfidence);
        });

        it('should update the confidence label in the DOM', () => {
            sweep.matchedFrequencies = [4000];
            sweep.calculateConfidence();

            const label = document.getElementById('confidenceLabel');
            expect(label.textContent).toContain('30%');
        });
    });

    describe('Callback Registration', () => {
        it('should register onMatch callback', () => {
            const cb = vi.fn();
            sweep.on('onMatch', cb);
            expect(sweep.callbacks.onMatch).toBe(cb);
        });

        it('should register onSweepComplete callback', () => {
            const cb = vi.fn();
            sweep.on('onSweepComplete', cb);
            expect(sweep.callbacks.onSweepComplete).toBe(cb);
        });

        it('should register onFrequencyUpdate callback', () => {
            const cb = vi.fn();
            sweep.on('onFrequencyUpdate', cb);
            expect(sweep.callbacks.onFrequencyUpdate).toBe(cb);
        });

        it('should ignore unknown events', () => {
            sweep.on('nonexistent', vi.fn());
            expect(sweep.callbacks).not.toHaveProperty('nonexistent');
        });
    });

    describe('Ear Selection', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should create panner with pan=0 for both ears (default)', () => {
            sweep.start();
            expect(mockAudioEngine.createPanner).toHaveBeenCalledWith(0);
        });

        it('should create panner with pan=-1 for left ear', () => {
            const earSelect = document.getElementById('sweepEar');
            earSelect.value = 'left';
            sweep.start();
            expect(mockAudioEngine.createPanner).toHaveBeenCalledWith(-1);
        });

        it('should create panner with pan=1 for right ear', () => {
            const earSelect = document.getElementById('sweepEar');
            earSelect.value = 'right';
            sweep.start();
            expect(mockAudioEngine.createPanner).toHaveBeenCalledWith(1);
        });
    });

    describe('Resume from Pause', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should not create new oscillator when resuming from pause', () => {
            sweep.start();
            sweep.currentFreq = 5000;
            sweep.togglePause(); // pause

            mockAudioEngine.createOscillator.mockClear();
            sweep.start(); // resume via start()

            // When resuming from pause, no new oscillator is created
            expect(mockAudioEngine.createOscillator).not.toHaveBeenCalled();
            // Frequency should remain where we left off
            expect(sweep.currentFreq).toBe(5000);
        });

        it('should restore isRunning=true and isPaused=false on resume', () => {
            sweep.start();
            sweep.togglePause();
            sweep.start(); // resume
            expect(sweep.isRunning).toBe(true);
            expect(sweep.isPaused).toBe(false);
        });
    });

    describe('DOM Display Updates', () => {
        beforeEach(() => {
            sweep.init();
        });

        it('should update frequency display text during animation', () => {
            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            const animateCallback = requestAnimationFrame.mock.calls[0][0];

            timeNow = 2000; // 1 second later
            animateCallback();

            const freqDisplay = document.getElementById('sweepCurrentFreq');
            expect(freqDisplay.textContent).toBe('1100 Hz');
        });

        it('should update progress bar during animation', () => {
            let timeNow = 1000;
            vi.spyOn(performance, 'now').mockImplementation(() => timeNow);

            sweep.start();
            const animateCallback = requestAnimationFrame.mock.calls[0][0];

            timeNow = 2000;
            animateCallback();

            const progressFill = document.getElementById('sweepProgressFill');
            // Progress should be non-zero
            expect(progressFill.style.width).not.toBe('0%');
        });

        it('should disable start button and enable pause/stop when running', () => {
            sweep.start();
            expect(document.getElementById('startSweep').disabled).toBe(true);
            expect(document.getElementById('pauseSweep').disabled).toBe(false);
            expect(document.getElementById('stopSweep').disabled).toBe(false);
        });

        it('should enable start button and disable pause/stop when stopped', () => {
            sweep.start();
            sweep.stop();
            expect(document.getElementById('startSweep').disabled).toBe(false);
            expect(document.getElementById('pauseSweep').disabled).toBe(true);
            expect(document.getElementById('stopSweep').disabled).toBe(true);
        });
    });
});
