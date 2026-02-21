/**
 * Notification Manager Tests
 * Tests daily therapy reminders via the Notification API
 * Uses the REAL NotificationManager class from ../js/notification-manager.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationManager } from '../js/notification-manager.js';

describe('NotificationManager', () => {
  let manager;
  let notificationInstances;

  // Create a mock Notification class that behaves like the real one
  function createMockNotificationClass(permission = 'default') {
    notificationInstances = [];

    class MockNotification {
      constructor(title, options = {}) {
        this.title = title;
        this.body = options.body;
        this.icon = options.icon;
        this.badge = options.badge;
        this.tag = options.tag;
        this.renotify = options.renotify;
        this.close = vi.fn();
        this._onclick = null;
        notificationInstances.push(this);
      }

      set onclick(fn) {
        this._onclick = fn;
      }

      get onclick() {
        return this._onclick;
      }
    }

    MockNotification.permission = permission;
    MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

    return MockNotification;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    // Set up global Notification mock with default permission
    globalThis.Notification = createMockNotificationClass('default');

    // Mock window.focus
    globalThis.window.focus = vi.fn();
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete globalThis.Notification;
  });

  // -------------------------------------------------------
  // 1. Construction
  // -------------------------------------------------------
  describe('Construction', () => {
    it('should set default values', () => {
      manager = new NotificationManager();
      expect(manager.reminderEnabled).toBe(false);
      expect(manager.reminderHour).toBe(20);
      expect(manager.reminderMinute).toBe(0);
      expect(manager.checkIntervalId).toBeNull();
    });

    it('should read Notification.permission', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      expect(manager.permission).toBe('granted');
    });

    it('should read denied permission', () => {
      globalThis.Notification = createMockNotificationClass('denied');
      manager = new NotificationManager();
      expect(manager.permission).toBe('denied');
    });

    it('should fall back to default when Notification.permission is undefined', () => {
      const MockNotif = createMockNotificationClass('default');
      MockNotif.permission = undefined;
      globalThis.Notification = MockNotif;
      manager = new NotificationManager();
      expect(manager.permission).toBe('default');
    });

    it('should call loadSettings during construction', () => {
      localStorage.setItem('tinnitusReminderSettings', JSON.stringify({
        enabled: true,
        hour: 9,
        minute: 30
      }));
      manager = new NotificationManager();
      expect(manager.reminderEnabled).toBe(true);
      expect(manager.reminderHour).toBe(9);
      expect(manager.reminderMinute).toBe(30);
    });
  });

  // -------------------------------------------------------
  // 2. loadSettings()
  // -------------------------------------------------------
  describe('loadSettings()', () => {
    it('should use defaults when no saved data exists', () => {
      manager = new NotificationManager();
      expect(manager.reminderEnabled).toBe(false);
      expect(manager.reminderHour).toBe(20);
      expect(manager.reminderMinute).toBe(0);
    });

    it('should load settings from localStorage', () => {
      localStorage.setItem('tinnitusReminderSettings', JSON.stringify({
        enabled: true,
        hour: 14,
        minute: 45
      }));
      manager = new NotificationManager();
      expect(manager.reminderEnabled).toBe(true);
      expect(manager.reminderHour).toBe(14);
      expect(manager.reminderMinute).toBe(45);
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('tinnitusReminderSettings', 'not-valid-json{{{');
      manager = new NotificationManager();
      // Should fall through to defaults without throwing
      expect(manager.reminderEnabled).toBe(false);
      expect(manager.reminderHour).toBe(20);
      expect(manager.reminderMinute).toBe(0);
    });

    it('should use nullish coalescing defaults for missing fields', () => {
      localStorage.setItem('tinnitusReminderSettings', JSON.stringify({}));
      manager = new NotificationManager();
      expect(manager.reminderEnabled).toBe(false);
      expect(manager.reminderHour).toBe(20);
      expect(manager.reminderMinute).toBe(0);
    });

    it('should respect explicit falsy values like 0', () => {
      localStorage.setItem('tinnitusReminderSettings', JSON.stringify({
        enabled: false,
        hour: 0,
        minute: 0
      }));
      manager = new NotificationManager();
      expect(manager.reminderEnabled).toBe(false);
      expect(manager.reminderHour).toBe(0);
      expect(manager.reminderMinute).toBe(0);
    });
  });

  // -------------------------------------------------------
  // 3. saveSettings()
  // -------------------------------------------------------
  describe('saveSettings()', () => {
    it('should persist settings to localStorage', () => {
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.reminderHour = 7;
      manager.reminderMinute = 15;
      manager.saveSettings();

      const saved = JSON.parse(localStorage.getItem('tinnitusReminderSettings'));
      expect(saved.enabled).toBe(true);
      expect(saved.hour).toBe(7);
      expect(saved.minute).toBe(15);
    });

    it('should overwrite previous settings', () => {
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.reminderHour = 10;
      manager.reminderMinute = 30;
      manager.saveSettings();

      manager.reminderEnabled = false;
      manager.reminderHour = 22;
      manager.reminderMinute = 0;
      manager.saveSettings();

      const saved = JSON.parse(localStorage.getItem('tinnitusReminderSettings'));
      expect(saved.enabled).toBe(false);
      expect(saved.hour).toBe(22);
      expect(saved.minute).toBe(0);
    });
  });

  // -------------------------------------------------------
  // 4. setReminder()
  // -------------------------------------------------------
  describe('setReminder()', () => {
    it('should update properties', () => {
      manager = new NotificationManager();
      manager.setReminder(true, 15, 30);
      expect(manager.reminderEnabled).toBe(true);
      expect(manager.reminderHour).toBe(15);
      expect(manager.reminderMinute).toBe(30);
    });

    it('should save settings', () => {
      manager = new NotificationManager();
      manager.setReminder(true, 8, 0);
      const saved = JSON.parse(localStorage.getItem('tinnitusReminderSettings'));
      expect(saved.enabled).toBe(true);
      expect(saved.hour).toBe(8);
      expect(saved.minute).toBe(0);
    });

    it('should start reminder check when enabled', () => {
      manager = new NotificationManager();
      const spy = vi.spyOn(manager, 'startReminderCheck');
      manager.setReminder(true, 20, 0);
      expect(spy).toHaveBeenCalled();
    });

    it('should stop reminder check when disabled', () => {
      manager = new NotificationManager();
      const spy = vi.spyOn(manager, 'stopReminderCheck');
      manager.setReminder(false, 20, 0);
      expect(spy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // 5. isSupported()
  // -------------------------------------------------------
  describe('isSupported()', () => {
    it('should return true when Notification exists in window', () => {
      manager = new NotificationManager();
      expect(manager.isSupported()).toBe(true);
    });

    it('should return false when Notification does not exist', () => {
      manager = new NotificationManager();
      delete globalThis.Notification;
      // Temporarily remove Notification to test
      const result = manager.isSupported();
      // Restore it so afterEach cleanup works
      globalThis.Notification = createMockNotificationClass('default');
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------
  // 6. isPermitted()
  // -------------------------------------------------------
  describe('isPermitted()', () => {
    it('should return true when permission is granted', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      expect(manager.isPermitted()).toBe(true);
    });

    it('should return false when permission is default', () => {
      globalThis.Notification = createMockNotificationClass('default');
      manager = new NotificationManager();
      expect(manager.isPermitted()).toBe(false);
    });

    it('should return false when permission is denied', () => {
      globalThis.Notification = createMockNotificationClass('denied');
      manager = new NotificationManager();
      expect(manager.isPermitted()).toBe(false);
    });
  });

  // -------------------------------------------------------
  // 7. requestPermission()
  // -------------------------------------------------------
  describe('requestPermission()', () => {
    it('should return false when Notification is not supported', async () => {
      manager = new NotificationManager();
      delete globalThis.Notification;
      const result = await manager.requestPermission();
      globalThis.Notification = createMockNotificationClass('default');
      expect(result).toBe(false);
    });

    it('should return true when already granted', async () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      const result = await manager.requestPermission();
      expect(result).toBe(true);
      expect(manager.permission).toBe('granted');
    });

    it('should return false when denied', async () => {
      globalThis.Notification = createMockNotificationClass('denied');
      manager = new NotificationManager();
      const result = await manager.requestPermission();
      expect(result).toBe(false);
      expect(manager.permission).toBe('denied');
    });

    it('should request permission and return true when granted', async () => {
      globalThis.Notification = createMockNotificationClass('default');
      globalThis.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
      manager = new NotificationManager();
      const result = await manager.requestPermission();
      expect(globalThis.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(manager.permission).toBe('granted');
    });

    it('should request permission and return false when denied', async () => {
      globalThis.Notification = createMockNotificationClass('default');
      globalThis.Notification.requestPermission = vi.fn().mockResolvedValue('denied');
      manager = new NotificationManager();
      const result = await manager.requestPermission();
      expect(globalThis.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(false);
      expect(manager.permission).toBe('denied');
    });
  });

  // -------------------------------------------------------
  // 8. init()
  // -------------------------------------------------------
  describe('init()', () => {
    it('should call startReminderCheck and checkOnOpen', () => {
      manager = new NotificationManager();
      const startSpy = vi.spyOn(manager, 'startReminderCheck');
      const checkSpy = vi.spyOn(manager, 'checkOnOpen');
      manager.init();
      expect(startSpy).toHaveBeenCalled();
      expect(checkSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // 9. startReminderCheck()
  // -------------------------------------------------------
  describe('startReminderCheck()', () => {
    it('should create an interval when enabled', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.startReminderCheck();
      expect(manager.checkIntervalId).not.toBeNull();
    });

    it('should return early if not enabled', () => {
      manager = new NotificationManager();
      manager.reminderEnabled = false;
      manager.startReminderCheck();
      expect(manager.checkIntervalId).toBeNull();
    });

    it('should clear existing interval before creating new one', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.reminderEnabled = true;

      manager.startReminderCheck();
      const firstId = manager.checkIntervalId;

      manager.startReminderCheck();
      const secondId = manager.checkIntervalId;

      // The interval ids should be different (old one cleared, new one created)
      expect(secondId).not.toBeNull();
      expect(secondId).not.toBe(firstId);
    });

    it('should call checkScheduledReminder every 5 minutes', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';

      const spy = vi.spyOn(manager, 'checkScheduledReminder');
      manager.startReminderCheck();

      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(spy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------
  // 10. stopReminderCheck()
  // -------------------------------------------------------
  describe('stopReminderCheck()', () => {
    it('should clear the interval and null the id', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.startReminderCheck();
      expect(manager.checkIntervalId).not.toBeNull();

      manager.stopReminderCheck();
      expect(manager.checkIntervalId).toBeNull();
    });

    it('should do nothing if no interval is set', () => {
      manager = new NotificationManager();
      expect(manager.checkIntervalId).toBeNull();
      manager.stopReminderCheck(); // Should not throw
      expect(manager.checkIntervalId).toBeNull();
    });
  });

  // -------------------------------------------------------
  // 11. checkOnOpen()
  // -------------------------------------------------------
  describe('checkOnOpen()', () => {
    it('should return early if not enabled', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.reminderEnabled = false;
      manager.permission = 'granted';
      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkOnOpen();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should return early if not permitted', () => {
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'default';
      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkOnOpen();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should return early if user already used the app today', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';

      // Set lastSession to now (today)
      localStorage.setItem('tinnitusLastSession', Date.now().toString());

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkOnOpen();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should show reminder if past reminder time and not used today', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to 21:00 (past the default 20:00 reminder)
      vi.setSystemTime(new Date(2025, 5, 15, 21, 0, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkOnOpen();
      expect(spy).toHaveBeenCalled();
    });

    it('should not show reminder if before reminder time', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to 18:00 (before the default 20:00 reminder)
      vi.setSystemTime(new Date(2025, 5, 15, 18, 0, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkOnOpen();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not show reminder if lastSession is from a different day', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to 21:00 on June 15
      vi.setSystemTime(new Date(2025, 5, 15, 21, 0, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      // Set lastSession to yesterday
      const yesterday = new Date(2025, 5, 14, 12, 0, 0);
      localStorage.setItem('tinnitusLastSession', yesterday.getTime().toString());

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkOnOpen();
      expect(spy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // 12. checkScheduledReminder()
  // -------------------------------------------------------
  describe('checkScheduledReminder()', () => {
    it('should return early if not enabled', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.reminderEnabled = false;
      manager.permission = 'granted';
      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkScheduledReminder();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should return early if not permitted', () => {
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'default';
      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkScheduledReminder();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should show reminder when within the 5-minute window', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to exactly 20:02 (within 20:00-20:05 window)
      vi.setSystemTime(new Date(2025, 5, 15, 20, 2, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkScheduledReminder();
      expect(spy).toHaveBeenCalled();
    });

    it('should not show reminder outside the 5-minute window', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to 20:06 (outside 20:00-20:05 window)
      vi.setSystemTime(new Date(2025, 5, 15, 20, 6, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkScheduledReminder();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not show reminder if wrong hour', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to 19:02 (wrong hour)
      vi.setSystemTime(new Date(2025, 5, 15, 19, 2, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkScheduledReminder();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should skip if already notified today', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to 20:02
      vi.setSystemTime(new Date(2025, 5, 15, 20, 2, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      // Simulate already notified today
      localStorage.setItem('tinnitusLastNotified', Date.now().toString());

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkScheduledReminder();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should save timestamp after showing reminder', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to 20:02
      vi.setSystemTime(new Date(2025, 5, 15, 20, 2, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      manager.checkScheduledReminder();

      const lastNotified = localStorage.getItem('tinnitusLastNotified');
      expect(lastNotified).not.toBeNull();
      const savedDate = new Date(parseInt(lastNotified));
      expect(savedDate.getFullYear()).toBe(2025);
    });

    it('should show reminder if lastNotified is from a different day', () => {
      globalThis.Notification = createMockNotificationClass('granted');

      // Set time to 20:02 on June 15
      vi.setSystemTime(new Date(2025, 5, 15, 20, 2, 0));

      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.permission = 'granted';
      manager.reminderHour = 20;
      manager.reminderMinute = 0;

      // Last notified was yesterday
      const yesterday = new Date(2025, 5, 14, 20, 2, 0);
      localStorage.setItem('tinnitusLastNotified', yesterday.getTime().toString());

      const spy = vi.spyOn(manager, 'showReminder');
      manager.checkScheduledReminder();
      expect(spy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // 13. showReminder()
  // -------------------------------------------------------
  describe('showReminder()', () => {
    it('should return early if not permitted', () => {
      manager = new NotificationManager();
      manager.permission = 'default';
      manager.showReminder();
      expect(notificationInstances.length).toBe(0);
    });

    it('should create a Notification with correct options', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.permission = 'granted';
      manager.showReminder();

      expect(notificationInstances.length).toBe(1);
      const n = notificationInstances[0];
      expect(n.title).toBe('Tinnitussaurus');
      expect(n.body).toBe('Time for your daily therapy session! Consistency helps improve results.');
      expect(n.icon).toBe('/icons/icon-192x192.png');
      expect(n.badge).toBe('/icons/icon-96x96.png');
      expect(n.tag).toBe('daily-reminder');
    });

    it('should set onclick handler that focuses window and closes notification', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.permission = 'granted';
      manager.showReminder();

      const n = notificationInstances[0];
      expect(n.onclick).toBeTypeOf('function');

      // Trigger the onclick handler
      n.onclick();
      expect(window.focus).toHaveBeenCalled();
      expect(n.close).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // 14. isToday()
  // -------------------------------------------------------
  describe('isToday()', () => {
    it('should return true for the same day', () => {
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0));
      manager = new NotificationManager();
      const sameDay = new Date(2025, 5, 15, 8, 30, 0);
      expect(manager.isToday(sameDay)).toBe(true);
    });

    it('should return false for a different day', () => {
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0));
      manager = new NotificationManager();
      const differentDay = new Date(2025, 5, 14, 12, 0, 0);
      expect(manager.isToday(differentDay)).toBe(false);
    });

    it('should return false for a different month', () => {
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0));
      manager = new NotificationManager();
      const differentMonth = new Date(2025, 4, 15, 12, 0, 0);
      expect(manager.isToday(differentMonth)).toBe(false);
    });

    it('should return false for a different year', () => {
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0));
      manager = new NotificationManager();
      const differentYear = new Date(2024, 5, 15, 12, 0, 0);
      expect(manager.isToday(differentYear)).toBe(false);
    });

    it('should return true for same date at different times', () => {
      vi.setSystemTime(new Date(2025, 5, 15, 23, 59, 59));
      manager = new NotificationManager();
      const earlyMorning = new Date(2025, 5, 15, 0, 0, 1);
      expect(manager.isToday(earlyMorning)).toBe(true);
    });
  });

  // -------------------------------------------------------
  // 15. destroy()
  // -------------------------------------------------------
  describe('destroy()', () => {
    it('should stop the reminder check', () => {
      globalThis.Notification = createMockNotificationClass('granted');
      manager = new NotificationManager();
      manager.reminderEnabled = true;
      manager.startReminderCheck();
      expect(manager.checkIntervalId).not.toBeNull();

      manager.destroy();
      expect(manager.checkIntervalId).toBeNull();
    });

    it('should be safe to call multiple times', () => {
      manager = new NotificationManager();
      manager.destroy();
      manager.destroy(); // Should not throw
      expect(manager.checkIntervalId).toBeNull();
    });
  });
});
