/**
 * Notification Manager - Daily therapy reminders via the Notification API
 * Requests permission, schedules local reminders, and checks on app open
 */

class NotificationManager {
    constructor() {
        this.permission = Notification.permission || 'default';
        this.reminderEnabled = false;
        this.reminderHour = 20;   // 8 PM default
        this.reminderMinute = 0;
        this.checkIntervalId = null;

        this.loadSettings();
    }

    init() {
        this.startReminderCheck();
        this.checkOnOpen();
    }

    // -- Permission --

    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('[Notifications] Not supported in this browser');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.permission = 'granted';
            return true;
        }

        if (Notification.permission === 'denied') {
            this.permission = 'denied';
            return false;
        }

        const result = await Notification.requestPermission();
        this.permission = result;
        return result === 'granted';
    }

    isSupported() {
        return 'Notification' in window;
    }

    isPermitted() {
        return this.permission === 'granted';
    }

    // -- Settings --

    loadSettings() {
        try {
            const saved = localStorage.getItem('tinnitusReminderSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.reminderEnabled = settings.enabled ?? false;
                this.reminderHour = settings.hour ?? 20;
                this.reminderMinute = settings.minute ?? 0;
            }
        } catch {
            // Use defaults
        }
    }

    saveSettings() {
        localStorage.setItem('tinnitusReminderSettings', JSON.stringify({
            enabled: this.reminderEnabled,
            hour: this.reminderHour,
            minute: this.reminderMinute
        }));
    }

    setReminder(enabled, hour, minute) {
        this.reminderEnabled = enabled;
        this.reminderHour = hour;
        this.reminderMinute = minute;
        this.saveSettings();

        if (enabled) {
            this.startReminderCheck();
        } else {
            this.stopReminderCheck();
        }
    }

    // -- Reminder Logic --

    checkOnOpen() {
        if (!this.reminderEnabled || !this.isPermitted()) return;

        const lastSession = localStorage.getItem('tinnitusLastSession');
        if (lastSession) {
            const lastDate = new Date(parseInt(lastSession));
            if (this.isToday(lastDate)) return; // Already used today
        }

        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(this.reminderHour, this.reminderMinute, 0, 0);

        // If past reminder time and haven't used today, show notification
        if (now >= reminderTime) {
            this.showReminder();
        }
    }

    startReminderCheck() {
        this.stopReminderCheck();
        if (!this.reminderEnabled) return;

        // Check every 5 minutes while app is open
        this.checkIntervalId = setInterval(() => {
            this.checkScheduledReminder();
        }, 5 * 60 * 1000);
    }

    stopReminderCheck() {
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
        }
    }

    checkScheduledReminder() {
        if (!this.reminderEnabled || !this.isPermitted()) return;

        const now = new Date();
        const targetHour = this.reminderHour;
        const targetMinute = this.reminderMinute;

        // Check if within the 5-minute window of the reminder time
        if (now.getHours() === targetHour &&
            now.getMinutes() >= targetMinute &&
            now.getMinutes() < targetMinute + 5) {

            const lastNotified = localStorage.getItem('tinnitusLastNotified');
            if (lastNotified && this.isToday(new Date(parseInt(lastNotified)))) return;

            this.showReminder();
            localStorage.setItem('tinnitusLastNotified', Date.now().toString());
        }
    }

    showReminder() {
        if (!this.isPermitted()) return;

        const notification = new Notification('Tinnitussaurus', {
            body: 'Time for your daily therapy session! Consistency helps improve results.',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            tag: 'daily-reminder',
            renotify: false
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }

    // -- Helpers --

    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    destroy() {
        this.stopReminderCheck();
    }
}
export { NotificationManager };
