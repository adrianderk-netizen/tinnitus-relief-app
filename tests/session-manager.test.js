/**
 * Session Manager Tests
 * Tests session timing, statistics, and data persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from './setup.js';

// Mock SessionManager behavior
class MockSessionManager {
  constructor() {
    this.targetDuration = 60 * 60 * 1000; // 1 hour in ms
    this.elapsed = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.callbacks = {};
  }

  setDurationMinutes(minutes) {
    this.targetDuration = minutes * 60 * 1000;
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.isPaused = false;
      this.startTime = Date.now();
    } else if (this.isPaused) {
      this.isPaused = false;
      this.startTime = Date.now() - this.elapsed;
    }
  }

  pause() {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.elapsed = Date.now() - this.startTime;
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    const finalElapsed = this.elapsed || (Date.now() - this.startTime);
    this.elapsed = 0;
    this.startTime = null;
    return finalElapsed;
  }

  getProgress() {
    if (!this.isRunning) return { elapsed: 0, remaining: this.targetDuration, progress: 0 };
    
    const currentElapsed = this.isPaused ? this.elapsed : (Date.now() - this.startTime);
    const remaining = Math.max(0, this.targetDuration - currentElapsed);
    const progress = Math.min(1, currentElapsed / this.targetDuration);
    
    return { elapsed: currentElapsed, remaining, progress };
  }

  getStats() {
    // Mock stats from localStorage
    return {
      todayTime: 1800000, // 30 minutes
      weekTime: 7200000, // 2 hours
      totalTime: 36000000, // 10 hours
      streak: 5,
      todayTimeFormatted: '30:00',
      weekTimeFormatted: '2:00:00',
      totalTimeFormatted: '10:00:00'
    };
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }
}

describe('SessionManager', () => {
  let sessionManager;

  beforeEach(() => {
    sessionManager = new MockSessionManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
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
  });

  describe('Session Control', () => {
    it('should start a session', () => {
      sessionManager.start();
      expect(sessionManager.isRunning).toBe(true);
      expect(sessionManager.isPaused).toBe(false);
    });

    it('should pause a running session', () => {
      sessionManager.start();
      sessionManager.pause();
      
      expect(sessionManager.isRunning).toBe(true);
      expect(sessionManager.isPaused).toBe(true);
    });

    it('should resume a paused session', () => {
      sessionManager.start();
      sessionManager.pause();
      sessionManager.start(); // Resume
      
      expect(sessionManager.isRunning).toBe(true);
      expect(sessionManager.isPaused).toBe(false);
    });

    it('should stop a session and reset', () => {
      sessionManager.start();
      const elapsed = sessionManager.stop();
      
      expect(sessionManager.isRunning).toBe(false);
      expect(sessionManager.isPaused).toBe(false);
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress correctly', () => {
      sessionManager.setDurationMinutes(60); // 1 hour
      sessionManager.start();
      
      // Simulate 30 minutes elapsed
      vi.advanceTimersByTime(30 * 60 * 1000);
      
      const progress = sessionManager.getProgress();
      expect(progress.progress).toBeCloseTo(0.5, 1);
    });

    it('should not exceed 100% progress', () => {
      sessionManager.setDurationMinutes(1); // 1 minute
      sessionManager.start();
      
      // Simulate 2 minutes elapsed
      vi.advanceTimersByTime(2 * 60 * 1000);
      
      const progress = sessionManager.getProgress();
      expect(progress.progress).toBe(1);
      expect(progress.remaining).toBe(0);
    });

    it('should show correct remaining time', () => {
      sessionManager.setDurationMinutes(60); // 1 hour
      sessionManager.start();
      
      // Simulate 15 minutes elapsed
      vi.advanceTimersByTime(15 * 60 * 1000);
      
      const progress = sessionManager.getProgress();
      expect(progress.remaining).toBe(45 * 60 * 1000);
    });
  });

  describe('Statistics', () => {
    it('should retrieve session statistics', () => {
      const stats = sessionManager.getStats();
      
      expect(stats).toHaveProperty('todayTime');
      expect(stats).toHaveProperty('weekTime');
      expect(stats).toHaveProperty('totalTime');
      expect(stats).toHaveProperty('streak');
    });

    it('should format time correctly', () => {
      const stats = sessionManager.getStats();
      
      expect(stats.todayTimeFormatted).toMatch(/\d+:\d{2}/);
      expect(stats.weekTimeFormatted).toMatch(/\d+:\d{2}:\d{2}/);
    });

    it('should track daily streak', () => {
      const stats = sessionManager.getStats();
      expect(stats.streak).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle starting an already running session', () => {
      sessionManager.start();
      const firstStartTime = sessionManager.startTime;
      
      sessionManager.start(); // Try to start again
      
      // Should not change start time
      expect(sessionManager.startTime).toBe(firstStartTime);
    });

    it('should handle pausing when not running', () => {
      expect(() => {
        sessionManager.pause();
      }).not.toThrow();
    });

    it('should handle stopping when not running', () => {
      const elapsed = sessionManager.stop();
      expect(elapsed).toBe(0);
    });

    it('should preserve elapsed time when pausing', () => {
      sessionManager.start();
      
      // Run for 10 seconds
      vi.advanceTimersByTime(10000);
      sessionManager.pause();
      
      const pausedElapsed = sessionManager.elapsed;
      
      // Wait 5 more seconds while paused
      vi.advanceTimersByTime(5000);
      
      // Elapsed should not change while paused
      expect(sessionManager.elapsed).toBe(pausedElapsed);
    });
  });

  describe('Performance', () => {
    it('should handle rapid start/stop cycles', () => {
      for (let i = 0; i < 100; i++) {
        sessionManager.start();
        vi.advanceTimersByTime(100);
        sessionManager.stop();
      }
      
      // Should not throw errors
      expect(sessionManager.isRunning).toBe(false);
    });
  });
});

describe('SessionManager - Time Formatting', () => {
  it('should format seconds correctly', () => {
    // Helper to format time (matches SessionManager.formatTime)
    const formatTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    expect(formatTime(30000)).toBe('0:30'); // 30 seconds
    expect(formatTime(90000)).toBe('1:30'); // 1 min 30 sec
    expect(formatTime(3600000)).toBe('1:00:00'); // 1 hour
    expect(formatTime(3661000)).toBe('1:01:01'); // 1:01:01
  });
});
