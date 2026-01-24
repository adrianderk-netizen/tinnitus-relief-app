class SessionManager {
    constructor() {
        this.isRunning = false; this.isPaused = false; this.startTime = null; this.pausedTime = 0;
        this.targetDuration = 60 * 60 * 1000; this.timerInterval = null; this.currentSession = null;
        this.callbacks = { onTick: null, onComplete: null, onStart: null, onStop: null };
        this.loadHistory();
    }
    loadHistory() { const saved = localStorage.getItem('tinnitusSessionHistory'); this.history = saved ? JSON.parse(saved) : []; }
    saveHistory() { localStorage.setItem('tinnitusSessionHistory', JSON.stringify(this.history)); }
    clearHistory() { this.history = []; this.saveHistory(); }
    setHistory(historyArray) { this.history = Array.isArray(historyArray) ? historyArray : []; this.saveHistory(); }
    getHistory() { return [...this.history]; }
    setDuration(ms) { this.targetDuration = ms; }
    setDurationMinutes(min) { this.targetDuration = min * 60 * 1000; }
    start(mode, freq) {
        if (this.isRunning && !this.isPaused) return;
        if (this.isPaused) { this.isPaused = false; this.startTime = Date.now() - this.pausedTime; }
        else { this.startTime = Date.now(); this.pausedTime = 0; this.currentSession = { id: Date.now(), date: new Date().toISOString(), mode, frequency: freq, duration: 0, completed: false }; }
        this.isRunning = true; this.startTimer();
        if (this.callbacks.onStart) this.callbacks.onStart(this.currentSession);
    }
    pause() { if (!this.isRunning || this.isPaused) return; this.isPaused = true; this.pausedTime = Date.now() - this.startTime; this.stopTimer(); }
    stop() {
        if (!this.isRunning) return;
        this.stopTimer();
        if (this.currentSession) {
            this.currentSession.duration = Date.now() - this.startTime;
            this.currentSession.completed = this.currentSession.duration >= this.targetDuration;
            if (this.currentSession.duration >= 60000) { this.history.push(this.currentSession); this.saveHistory(); }
            if (this.callbacks.onStop) this.callbacks.onStop(this.currentSession);
        }
        this.isRunning = false; this.isPaused = false; this.currentSession = null; this.pausedTime = 0;
    }
    startTimer() { this.stopTimer(); this.timerInterval = setInterval(() => this.tick(), 1000); }
    stopTimer() { if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; } }
    tick() {
        const elapsed = Date.now() - this.startTime, remaining = Math.max(0, this.targetDuration - elapsed);
        if (this.callbacks.onTick) this.callbacks.onTick({ elapsed, remaining, progress: Math.min(1, elapsed / this.targetDuration) });
        if (remaining === 0) { if (this.callbacks.onComplete) this.callbacks.onComplete(this.currentSession); this.stop(); }
    }
    getElapsed() { if (!this.isRunning) return 0; return this.isPaused ? this.pausedTime : Date.now() - this.startTime; }
    getRemaining() { return Math.max(0, this.targetDuration - this.getElapsed()); }
    static formatTime(ms) {
        const totalSec = Math.floor(ms / 1000), hrs = Math.floor(totalSec / 3600), mins = Math.floor((totalSec % 3600) / 60), secs = totalSec % 60;
        return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    getStats() {
        const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekAgo = today - (7 * 24 * 60 * 60 * 1000);
        const todaySessions = this.history.filter(s => new Date(s.date).getTime() >= today);
        const weekSessions = this.history.filter(s => new Date(s.date).getTime() >= weekAgo);
        const totalTime = this.history.reduce((sum, s) => sum + s.duration, 0);
        const todayTime = todaySessions.reduce((sum, s) => sum + s.duration, 0);
        const weekTime = weekSessions.reduce((sum, s) => sum + s.duration, 0);
        let streak = 0; const checkDate = new Date(today);
        while (true) {
            const dayStart = checkDate.getTime(), dayEnd = dayStart + (24*60*60*1000);
            const hasSessions = this.history.some(s => { const t = new Date(s.date).getTime(); return t >= dayStart && t < dayEnd; });
            if (hasSessions) { streak++; checkDate.setDate(checkDate.getDate() - 1); } else break;
        }
        return { totalSessions: this.history.length, totalTime, totalTimeFormatted: SessionManager.formatTime(totalTime),
            todaySessions: todaySessions.length, todayTime, todayTimeFormatted: SessionManager.formatTime(todayTime),
            weekSessions: weekSessions.length, weekTime, weekTimeFormatted: SessionManager.formatTime(weekTime), streak };
    }
    on(event, cb) { if (this.callbacks.hasOwnProperty(event)) this.callbacks[event] = cb; }
}
window.SessionManager = SessionManager;
