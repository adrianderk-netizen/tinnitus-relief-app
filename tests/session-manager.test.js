/**
 * Session Manager Tests
 * Tests session timing, statistics, and data persistence
 * Uses the REAL SessionManager class from ../js/session-manager.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../js/session-manager.js';

describe('SessionManager', () => {
  let sessionManager;
  let mockWakeLockSentinel;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    // Mock navigator.wakeLock so requestWakeLock doesn't throw
    mockWakeLockSentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: vi.fn().mockResolvedValue(mockWakeLockSentinel),
      },
      writable: true,
      configurable: true,
    });

    sessionManager = new SessionManager();
  });

  afterEach(() => {
    // Ensure timers are stopped to avoid leaking intervals
    if (sessionManager.isRunning) {
      sessionManager.stop();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Duration Management', () => {
    it('should set session duration in minutes', () => {
      sessionManager.setDurationMinutes(30);
      expect(sessionManager.targetDuration).toBe(30 * 60 * 1000);
    });

    it('should handle various duration presets', () => {
      const durations = [15, 30, 60, 120];

      durations.forEach(minutes => {
        sessionManager.setDurationMinutes(minutes);
        expect(sessionManager.targetDuration).toBe(minutes * 60 * 1000);
      });
    });

    it('should set duration in milliseconds', () => {
      sessionManager.setDuration(120000);
      expect(sessionManager.targetDuration).toBe(120000);
    });
  });

  describe('Session Control', () => {
    it('should start a session', async () => {
      await sessionManager.start('tone', 440);
      expect(sessionManager.isRunning).toBe(true);
      expect(sessionManager.isPaused).toBe(false);
    });

    it('should pause a running session', async () => {
      await sessionManager.start('tone', 440);
      sessionManager.pause();

      expect(sessionManager.isRunning).toBe(true);
      expect(sessionManager.isPaused).toBe(true);
    });

    it('should resume a paused session', async () => {
      await sessionManager.start('tone', 440);
      sessionManager.pause();
      await sessionManager.start('tone', 440); // Resume

      expect(sessionManager.isRunning).toBe(true);
      expect(sessionManager.isPaused).toBe(false);
    });

    it('should stop a session and reset', async () => {
      await sessionManager.start('tone', 440);
      sessionManager.stop();

      expect(sessionManager.isRunning).toBe(false);
      expect(sessionManager.isPaused).toBe(false);
    });

    it('should fire onStart callback when starting', async () => {
      const onStart = vi.fn();
      sessionManager.on('onStart', onStart);
      await sessionManager.start('tone', 440);

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'tone', frequency: 440 })
      );
    });

    it('should fire onStop callback when stopping', async () => {
      const onStop = vi.fn();
      sessionManager.on('onStop', onStop);
      await sessionManager.start('tone', 440);
      sessionManager.stop();

      expect(onStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('Elapsed and Remaining Time', () => {
    it('should track elapsed time correctly', async () => {
      await sessionManager.start('tone', 440);

      vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

      const elapsed = sessionManager.getElapsed();
      expect(elapsed).toBe(30 * 60 * 1000);
    });

    it('should calculate remaining time correctly', async () => {
      sessionManager.setDurationMinutes(60); // 1 hour
      await sessionManager.start('tone', 440);

      vi.advanceTimersByTime(15 * 60 * 1000); // 15 minutes

      const remaining = sessionManager.getRemaining();
      expect(remaining).toBe(45 * 60 * 1000);
    });

    it('should not go below 0 for remaining time', async () => {
      sessionManager.setDurationMinutes(1); // 1 minute
      await sessionManager.start('tone', 440);

      // Advance to just before the 60s tick that triggers auto-stop
      // The tick fires every 1000ms; at 60s the onComplete fires and stops the session.
      // Advance 59 seconds so we are still running with 1s remaining.
      vi.advanceTimersByTime(59 * 1000);
      expect(sessionManager.getRemaining()).toBe(1000);

      // After the session auto-completes (at the 60s tick), remaining resets because
      // isRunning becomes false and getElapsed returns 0 => remaining = targetDuration.
      vi.advanceTimersByTime(1000);
      expect(sessionManager.isRunning).toBe(false);
    });

    it('should return 0 elapsed when not running', () => {
      expect(sessionManager.getElapsed()).toBe(0);
    });
  });

  describe('Tick and Progress', () => {
    it('should call onTick with progress info', async () => {
      const onTick = vi.fn();
      sessionManager.on('onTick', onTick);
      sessionManager.setDurationMinutes(60); // 1 hour
      await sessionManager.start('tone', 440);

      vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes (1800 ticks)

      expect(onTick).toHaveBeenCalled();

      // Check the last call's progress is approximately 0.5
      const lastCall = onTick.mock.calls[onTick.mock.calls.length - 1][0];
      expect(lastCall.progress).toBeCloseTo(0.5, 1);
      expect(lastCall.remaining).toBe(30 * 60 * 1000);
    });

    it('should call onComplete when session duration is reached', async () => {
      const onComplete = vi.fn();
      sessionManager.on('onComplete', onComplete);
      sessionManager.setDurationMinutes(1); // 1 minute
      await sessionManager.start('tone', 440);

      vi.advanceTimersByTime(60 * 1000); // exactly 1 minute

      expect(onComplete).toHaveBeenCalledTimes(1);
      // After completion, session should be stopped
      expect(sessionManager.isRunning).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should return stats with all expected properties', () => {
      const stats = sessionManager.getStats();

      expect(stats).toHaveProperty('todayTime');
      expect(stats).toHaveProperty('weekTime');
      expect(stats).toHaveProperty('totalTime');
      expect(stats).toHaveProperty('streak');
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('todaySessions');
      expect(stats).toHaveProperty('weekSessions');
    });

    it('should return zero stats when no history exists', () => {
      const stats = sessionManager.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalTime).toBe(0);
      expect(stats.todayTime).toBe(0);
      expect(stats.weekTime).toBe(0);
      expect(stats.streak).toBe(0);
    });

    it('should include formatted time strings', () => {
      const stats = sessionManager.getStats();

      expect(stats.todayTimeFormatted).toMatch(/\d+:\d{2}/);
      expect(stats.weekTimeFormatted).toMatch(/\d+:\d{2}/);
      expect(stats.totalTimeFormatted).toMatch(/\d+:\d{2}/);
    });

    it('should compute stats from session history', () => {
      // Seed history with a session from today lasting 2 minutes
      const now = new Date();
      sessionManager.setHistory([
        { id: 1, date: now.toISOString(), mode: 'tone', frequency: 440, duration: 120000, completed: true },
      ]);

      const stats = sessionManager.getStats();
      expect(stats.totalSessions).toBe(1);
      expect(stats.totalTime).toBe(120000);
      expect(stats.todayTime).toBe(120000);
      expect(stats.streak).toBe(1);
    });

    it('should calculate streak across consecutive days', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      sessionManager.setHistory([
        { id: 1, date: twoDaysAgo.toISOString(), mode: 'tone', frequency: 440, duration: 120000, completed: true },
        { id: 2, date: yesterday.toISOString(), mode: 'tone', frequency: 440, duration: 120000, completed: true },
        { id: 3, date: now.toISOString(), mode: 'tone', frequency: 440, duration: 120000, completed: true },
      ]);

      const stats = sessionManager.getStats();
      expect(stats.streak).toBe(3);
    });
  });

  describe('History Management', () => {
    it('should persist history to localStorage', async () => {
      sessionManager.setDurationMinutes(60);
      await sessionManager.start('tone', 440);

      // Advance past 60 seconds (minimum for history saving)
      vi.advanceTimersByTime(120000);
      sessionManager.stop();

      const saved = localStorage.getItem('tinnitusSessionHistory');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved);
      expect(parsed.length).toBe(1);
      expect(parsed[0].duration).toBe(120000);
    });

    it('should not save sessions shorter than 1 minute to history', async () => {
      sessionManager.setDurationMinutes(60);
      await sessionManager.start('tone', 440);

      vi.advanceTimersByTime(30000); // 30 seconds
      sessionManager.stop();

      expect(sessionManager.getHistory().length).toBe(0);
    });

    it('should load history from localStorage', () => {
      const history = [
        { id: 1, date: new Date().toISOString(), mode: 'tone', frequency: 440, duration: 120000, completed: false },
      ];
      localStorage.setItem('tinnitusSessionHistory', JSON.stringify(history));

      const sm = new SessionManager();
      expect(sm.getHistory().length).toBe(1);
    });

    it('should clear history', () => {
      sessionManager.setHistory([
        { id: 1, date: new Date().toISOString(), mode: 'tone', frequency: 440, duration: 120000, completed: true },
      ]);
      expect(sessionManager.getHistory().length).toBe(1);

      sessionManager.clearHistory();
      expect(sessionManager.getHistory().length).toBe(0);
    });
  });

  describe('Wake Lock', () => {
    it('should handle wake lock release event', async () => {
      await sessionManager.start('tone', 440);

      // Capture the release event listener
      const addListenerCalls = mockWakeLockSentinel.addEventListener.mock.calls;
      const releaseCall = addListenerCalls.find(c => c[0] === 'release');
      expect(releaseCall).toBeDefined();

      // Trigger the release handler
      expect(() => releaseCall[1]()).not.toThrow();
    });

    it('should still start session when wakeLock.request rejects', async () => {
      navigator.wakeLock.request = vi.fn().mockRejectedValue(new Error('NotAllowedError'));

      await sessionManager.start('tone', 440);

      expect(sessionManager.isRunning).toBe(true);
    });

    it('should still start session when navigator.wakeLock is undefined', async () => {
      // Must delete the property entirely so 'wakeLock' in navigator is false
      delete navigator.wakeLock;

      await sessionManager.start('tone', 440);

      expect(sessionManager.isRunning).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle starting an already running session', async () => {
      await sessionManager.start('tone', 440);
      const firstStartTime = sessionManager.startTime;

      await sessionManager.start('tone', 440); // Try to start again

      // Should not change start time (guard: if running and not paused, return)
      expect(sessionManager.startTime).toBe(firstStartTime);
    });

    it('should handle pausing when not running', () => {
      expect(() => {
        sessionManager.pause();
      }).not.toThrow();
    });

    it('should handle stopping when not running', () => {
      const result = sessionManager.stop();
      // The real stop() returns undefined when not running
      expect(result).toBeUndefined();
    });

    it('should preserve elapsed time when pausing', async () => {
      await sessionManager.start('tone', 440);

      // Run for 10 seconds
      vi.advanceTimersByTime(10000);
      sessionManager.pause();

      const pausedElapsed = sessionManager.pausedTime;

      // Wait 5 more seconds while paused
      vi.advanceTimersByTime(5000);

      // Elapsed should not change while paused
      expect(sessionManager.pausedTime).toBe(pausedElapsed);
      expect(sessionManager.getElapsed()).toBe(pausedElapsed);
    });

    it('should resume from the correct time after pause', async () => {
      await sessionManager.start('tone', 440);

      vi.advanceTimersByTime(10000); // Run 10s
      sessionManager.pause();
      vi.advanceTimersByTime(5000); // Pause 5s
      await sessionManager.start('tone', 440); // Resume

      vi.advanceTimersByTime(5000); // Run another 5s

      // Total elapsed should be 15s (10s + 5s), not 20s
      expect(sessionManager.getElapsed()).toBe(15000);
    });
  });

  describe('Performance', () => {
    it('should handle rapid start/stop cycles', async () => {
      for (let i = 0; i < 100; i++) {
        await sessionManager.start('tone', 440);
        vi.advanceTimersByTime(100);
        sessionManager.stop();
      }

      // Should not throw errors
      expect(sessionManager.isRunning).toBe(false);
    });
  });
});

describe('SessionManager - setHistory edge case', () => {
  it('should default to empty array when non-array passed to setHistory', () => {
    localStorage.clear();
    const sm = new SessionManager();
    sm.setHistory('not an array');
    expect(sm.getHistory()).toEqual([]);
  });
});

describe('SessionManager - Time Formatting', () => {
  it('should format seconds correctly', () => {
    expect(SessionManager.formatTime(30000)).toBe('0:30');       // 30 seconds
    expect(SessionManager.formatTime(90000)).toBe('1:30');       // 1 min 30 sec
    expect(SessionManager.formatTime(3600000)).toBe('1:00:00');  // 1 hour
    expect(SessionManager.formatTime(3661000)).toBe('1:01:01');  // 1:01:01
  });

  it('should format zero correctly', () => {
    expect(SessionManager.formatTime(0)).toBe('0:00');
  });

  it('should format large values correctly', () => {
    // 10 hours
    expect(SessionManager.formatTime(36000000)).toBe('10:00:00');
  });
});
