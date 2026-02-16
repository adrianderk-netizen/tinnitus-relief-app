/**
 * Dashboard Manager - Hero section with quick actions and status
 * Provides at-a-glance view of therapy progress and quick access to features
 */

class DashboardManager {
    constructor(app) {
        this.app = app;
        this.currentStatus = 'idle'; // idle, matching, therapy-active
    }

    init() {
        this.createDashboard();
        this.bindEvents();
        this.updateDashboard();
    }

    createDashboard() {
        const existing = document.querySelector('.hero-dashboard');
        if (existing) return;

        const dashboard = document.createElement('div');
        dashboard.className = 'hero-dashboard';
        dashboard.innerHTML = `
            <div class="dashboard-content">
                <div class="dashboard-status">
                    <div class="status-indicator" id="statusIndicator">
                        <span class="status-dot"></span>
                        <span class="status-text" id="statusText">Ready to Start</span>
                    </div>
                </div>
                
                <div class="dashboard-hero">
                    <h2 id="heroTitle">Welcome Back!</h2>
                    <p id="heroSubtitle">Continue your tinnitus relief journey</p>
                </div>
                
                <div class="quick-actions">
                    <button class="quick-action-btn primary" id="quickStartTherapy">
                        <span class="action-icon">▶️</span>
                        <div class="action-content">
                            <span class="action-title">Start Therapy</span>
                            <span class="action-subtitle">Resume last session</span>
                        </div>
                    </button>
                    
                    <button class="quick-action-btn" id="quickFindFrequency">
                        <span class="action-icon">🎵</span>
                        <div class="action-content">
                            <span class="action-title">Find Frequency</span>
                            <span class="action-subtitle">Match your tinnitus</span>
                        </div>
                    </button>
                    
                    <button class="quick-action-btn" id="quickJournal">
                        <span class="action-icon">📊</span>
                        <div class="action-content">
                            <span class="action-title">Daily Check-In</span>
                            <span class="action-subtitle">Track progress</span>
                        </div>
                    </button>
                </div>
                
                <div class="dashboard-stats-mini">
                    <div class="stat-mini">
                        <span class="stat-mini-icon">🔥</span>
                        <div class="stat-mini-content">
                            <span class="stat-mini-value" id="streakMini">0</span>
                            <span class="stat-mini-label">Day Streak</span>
                        </div>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-icon">⏱️</span>
                        <div class="stat-mini-content">
                            <span class="stat-mini-value" id="todayMini">0:00</span>
                            <span class="stat-mini-label">Today</span>
                        </div>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-icon">📈</span>
                        <div class="stat-mini-content">
                            <span class="stat-mini-value" id="totalMini">0:00</span>
                            <span class="stat-mini-label">Total Time</span>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-matched-freq" id="matchedFreqDashboard" style="display: none;">
                    <div class="matched-freq-badge">
                        <span class="freq-icon">🎯</span>
                        <div class="freq-info">
                            <span class="freq-label">Your Tinnitus Frequency</span>
                            <span class="freq-value" id="dashboardFreqValue">-- Hz</span>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-tips" id="dashboardTips">
                    <div class="tip-content">
                        <span class="tip-icon">💡</span>
                        <span class="tip-text" id="tipText">Start by finding your tinnitus frequency</span>
                    </div>
                </div>
            </div>
        `;

        // Insert at the top of the container, after subscription status
        const container = document.querySelector('.container');
        const subStatus = document.querySelector('.subscription-status');
        if (subStatus && subStatus.nextSibling) {
            container.insertBefore(dashboard, subStatus.nextSibling);
        } else {
            const header = document.querySelector('header');
            container.insertBefore(dashboard, header.nextSibling);
        }
    }

    bindEvents() {
        document.getElementById('quickStartTherapy')?.addEventListener('click', () => {
            this.app.switchMode('notched-noise');
            // Scroll to controls
            document.getElementById('notched-noise')?.scrollIntoView({ behavior: 'smooth' });
        });

        document.getElementById('quickFindFrequency')?.addEventListener('click', () => {
            if (this.app.guidedMatching) {
                this.app.guidedMatching.launch();
            } else {
                this.app.switchMode('tone-matcher');
                document.getElementById('tone-matcher')?.scrollIntoView({ behavior: 'smooth' });
            }
        });

        document.getElementById('quickJournal')?.addEventListener('click', () => {
            if (this.app.journalManager) {
                this.app.journalManager.showDailyCheckIn();
            }
        });
    }

    updateDashboard() {
        this.updateStatus();
        this.updateStats();
        this.updateMatchedFrequency();
        this.updateTips();
    }

    updateStatus() {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (!indicator || !statusText) return;

        // Remove all status classes
        indicator.classList.remove('status-idle', 'status-matching', 'status-therapy', 'status-paused');

        if (this.app.noiseState?.isPlaying) {
            indicator.classList.add('status-therapy');
            statusText.textContent = '🟢 Therapy Active';
        } else if (this.app.musicState?.isPlaying) {
            indicator.classList.add('status-therapy');
            statusText.textContent = '🟢 Music Therapy Active';
        } else if (this.app.toneState?.isPlaying) {
            indicator.classList.add('status-matching');
            statusText.textContent = '🟡 Frequency Matching';
        } else if (this.app.sessionManager?.isRunning) {
            indicator.classList.add('status-paused');
            statusText.textContent = '⏸️ Session Paused';
        } else {
            indicator.classList.add('status-idle');
            statusText.textContent = '⚪ Ready to Start';
        }
    }

    updateStats() {
        if (!this.app.sessionManager) return;

        const stats = this.app.sessionManager.getStats();
        
        const streakEl = document.getElementById('streakMini');
        const todayEl = document.getElementById('todayMini');
        const totalEl = document.getElementById('totalMini');

        if (streakEl) streakEl.textContent = stats.streak;
        if (todayEl) todayEl.textContent = stats.todayTimeFormatted;
        if (totalEl) totalEl.textContent = stats.totalTimeFormatted;
    }

    updateMatchedFrequency() {
        const container = document.getElementById('matchedFreqDashboard');
        const freqValue = document.getElementById('dashboardFreqValue');
        
        if (!container || !freqValue) return;

        const leftFreq = this.app.matchedFrequencies?.left;
        const rightFreq = this.app.matchedFrequencies?.right;

        if (leftFreq || rightFreq) {
            container.style.display = 'block';
            const freq = leftFreq || rightFreq;
            freqValue.textContent = `${freq} Hz`;
        } else {
            container.style.display = 'none';
        }
    }

    updateTips() {
        const tipText = document.getElementById('tipText');
        if (!tipText) return;

        const tips = this.getTips();
        if (tips.length > 0) {
            tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
        }
    }

    getTips() {
        const tips = [];
        
        // Check what the user needs to do
        const hasMatchedFreq = this.app.matchedFrequencies?.left || this.app.matchedFrequencies?.right;
        const stats = this.app.sessionManager?.getStats();
        const todayTime = stats?.todayTime || 0;
        const streak = stats?.streak || 0;

        if (!hasMatchedFreq) {
            tips.push('Start by finding your tinnitus frequency in the Tone Matcher');
            tips.push('Try the Guided Frequency Sweep for easier matching');
        } else {
            if (todayTime < 30 * 60 * 1000) {
                tips.push('Aim for 30-60 minutes of therapy daily for best results');
            }
            
            tips.push('Consistency is key - try to use the app daily');
            tips.push('Most users notice improvement after 4-8 weeks');
            tips.push('Use pink noise for a natural, soothing sound');
            
            if (streak >= 7) {
                tips.push(`Amazing! You've maintained a ${streak}-day streak!`);
            }
        }

        return tips;
    }

    setStatus(status) {
        this.currentStatus = status;
        this.updateStatus();
    }

    refresh() {
        this.updateDashboard();
    }
}
export { DashboardManager };
