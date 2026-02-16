/**
 * Dashboard Manager Tests
 * Tests status updates, stats display, quick actions, tips, and DOM creation
 * using the REAL DashboardManager class from ../js/dashboard-manager.js
 */

import { DashboardManager } from '../js/dashboard-manager.js';

describe('DashboardManager', () => {
  let dashboard;
  let mockApp;

  beforeEach(() => {
    // Clean the DOM between tests
    document.body.innerHTML = '';

    // Build the minimal DOM structure that createDashboard() expects:
    // a .container with a <header> child (and optionally a .subscription-status)
    const container = document.createElement('div');
    container.className = 'container';

    const header = document.createElement('header');
    header.textContent = 'App Header';
    container.appendChild(header);

    const subStatus = document.createElement('div');
    subStatus.className = 'subscription-status';
    container.appendChild(subStatus);

    // Add a placeholder element after subscription-status so that
    // subStatus.nextSibling is non-null, which is what the real
    // createDashboard() checks before inserting after it.
    const placeholder = document.createElement('div');
    placeholder.className = 'content-placeholder';
    container.appendChild(placeholder);

    document.body.appendChild(container);

    // Create a mock app object with the properties the real class reads
    mockApp = {
      noiseState: { isPlaying: false },
      musicState: { isPlaying: false },
      toneState: { isPlaying: false },
      matchedFrequencies: { left: null, right: null },
      sessionManager: {
        isRunning: false,
        getStats: () => ({
          todayTime: 0,
          weekTime: 0,
          totalTime: 0,
          streak: 0,
          todayTimeFormatted: '0:00',
          weekTimeFormatted: '0:00',
          totalTimeFormatted: '0:00'
        })
      },
      switchMode: vi.fn(),
      journalManager: { showDailyCheckIn: vi.fn() },
      guidedMatching: null
    };

    dashboard = new DashboardManager(mockApp);
  });

  describe('Construction', () => {
    it('should store the app reference', () => {
      expect(dashboard.app).toBe(mockApp);
    });

    it('should default currentStatus to idle', () => {
      expect(dashboard.currentStatus).toBe('idle');
    });
  });

  describe('Dashboard Creation (init + createDashboard)', () => {
    it('should insert a .hero-dashboard element into the DOM on init', () => {
      dashboard.init();
      const heroDashboard = document.querySelector('.hero-dashboard');
      expect(heroDashboard).not.toBeNull();
    });

    it('should not create a duplicate dashboard if init is called twice', () => {
      dashboard.init();
      dashboard.init();
      const dashboards = document.querySelectorAll('.hero-dashboard');
      expect(dashboards.length).toBe(1);
    });

    it('should create quick action buttons', () => {
      dashboard.init();
      expect(document.getElementById('quickStartTherapy')).not.toBeNull();
      expect(document.getElementById('quickFindFrequency')).not.toBeNull();
      expect(document.getElementById('quickJournal')).not.toBeNull();
    });

    it('should create mini-stat elements', () => {
      dashboard.init();
      expect(document.getElementById('streakMini')).not.toBeNull();
      expect(document.getElementById('todayMini')).not.toBeNull();
      expect(document.getElementById('totalMini')).not.toBeNull();
    });

    it('should create status indicator and text elements', () => {
      dashboard.init();
      expect(document.getElementById('statusIndicator')).not.toBeNull();
      expect(document.getElementById('statusText')).not.toBeNull();
    });

    it('should create the matched frequency container (hidden by default)', () => {
      dashboard.init();
      const freqContainer = document.getElementById('matchedFreqDashboard');
      expect(freqContainer).not.toBeNull();
      expect(freqContainer.style.display).toBe('none');
    });

    it('should create the tip text element', () => {
      dashboard.init();
      expect(document.getElementById('tipText')).not.toBeNull();
    });

    it('should insert after subscription-status when it exists', () => {
      dashboard.init();
      const subStatus = document.querySelector('.subscription-status');
      const heroDashboard = document.querySelector('.hero-dashboard');
      // The hero-dashboard should be the next sibling of subscription-status
      expect(subStatus.nextSibling).toBe(heroDashboard);
    });

    it('should insert after header when no subscription-status exists', () => {
      // Remove subscription-status
      const subStatus = document.querySelector('.subscription-status');
      subStatus.remove();

      dashboard.init();
      const header = document.querySelector('header');
      const heroDashboard = document.querySelector('.hero-dashboard');
      expect(header.nextSibling).toBe(heroDashboard);
    });
  });

  describe('Status Updates (updateStatus)', () => {
    beforeEach(() => {
      dashboard.init();
    });

    it('should show Ready to Start when idle', () => {
      dashboard.updateDashboard();
      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toContain('Ready to Start');
    });

    it('should add status-idle class when idle', () => {
      dashboard.updateDashboard();
      const indicator = document.getElementById('statusIndicator');
      expect(indicator.classList.contains('status-idle')).toBe(true);
    });

    it('should show Therapy Active when noise is playing', () => {
      mockApp.noiseState.isPlaying = true;
      dashboard.updateDashboard();
      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toContain('Therapy Active');
    });

    it('should add status-therapy class when noise is playing', () => {
      mockApp.noiseState.isPlaying = true;
      dashboard.updateDashboard();
      const indicator = document.getElementById('statusIndicator');
      expect(indicator.classList.contains('status-therapy')).toBe(true);
    });

    it('should show Music Therapy Active when music is playing', () => {
      mockApp.musicState.isPlaying = true;
      dashboard.updateDashboard();
      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toContain('Music Therapy Active');
    });

    it('should show Frequency Matching when tone is playing', () => {
      mockApp.toneState.isPlaying = true;
      dashboard.updateDashboard();
      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toContain('Frequency Matching');
    });

    it('should add status-matching class when tone is playing', () => {
      mockApp.toneState.isPlaying = true;
      dashboard.updateDashboard();
      const indicator = document.getElementById('statusIndicator');
      expect(indicator.classList.contains('status-matching')).toBe(true);
    });

    it('should show Session Paused when session is running but nothing playing', () => {
      mockApp.sessionManager.isRunning = true;
      dashboard.updateDashboard();
      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toContain('Session Paused');
    });

    it('should add status-paused class when session is paused', () => {
      mockApp.sessionManager.isRunning = true;
      dashboard.updateDashboard();
      const indicator = document.getElementById('statusIndicator');
      expect(indicator.classList.contains('status-paused')).toBe(true);
    });

    it('should prioritize noise therapy over tone matching', () => {
      mockApp.noiseState.isPlaying = true;
      mockApp.toneState.isPlaying = true;
      dashboard.updateDashboard();
      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toContain('Therapy Active');
      expect(statusText.textContent).not.toContain('Frequency Matching');
    });

    it('should remove previous status classes when status changes', () => {
      mockApp.noiseState.isPlaying = true;
      dashboard.updateDashboard();
      const indicator = document.getElementById('statusIndicator');
      expect(indicator.classList.contains('status-therapy')).toBe(true);

      mockApp.noiseState.isPlaying = false;
      dashboard.updateDashboard();
      expect(indicator.classList.contains('status-therapy')).toBe(false);
      expect(indicator.classList.contains('status-idle')).toBe(true);
    });
  });

  describe('Stats Display (updateStats)', () => {
    beforeEach(() => {
      dashboard.init();
    });

    it('should populate stat elements after init', () => {
      // todayMini and totalMini are set from formatted strings
      expect(document.getElementById('todayMini').textContent).toBe('0:00');
      expect(document.getElementById('totalMini').textContent).toBe('0:00');
      // streakMini is set from the numeric streak value (0)
      // Verify the element exists and was updated by updateStats
      expect(document.getElementById('streakMini')).not.toBeNull();
    });

    it('should update stat values when session data changes', () => {
      mockApp.sessionManager.getStats = () => ({
        todayTime: 1800000,
        weekTime: 7200000,
        totalTime: 36000000,
        streak: 5,
        todayTimeFormatted: '30:00',
        weekTimeFormatted: '2:00:00',
        totalTimeFormatted: '10:00:00'
      });

      dashboard.updateDashboard();

      expect(document.getElementById('streakMini').textContent).toBe('5');
      expect(document.getElementById('todayMini').textContent).toBe('30:00');
      expect(document.getElementById('totalMini').textContent).toBe('10:00:00');
    });

    it('should not throw when sessionManager is null', () => {
      mockApp.sessionManager = null;
      expect(() => dashboard.updateDashboard()).not.toThrow();
    });
  });

  describe('Matched Frequency Display (updateMatchedFrequency)', () => {
    beforeEach(() => {
      dashboard.init();
    });

    it('should hide matched frequency container when no frequency is matched', () => {
      dashboard.updateDashboard();
      const container = document.getElementById('matchedFreqDashboard');
      expect(container.style.display).toBe('none');
    });

    it('should show matched frequency container when left frequency is set', () => {
      mockApp.matchedFrequencies.left = 4000;
      dashboard.updateDashboard();
      const container = document.getElementById('matchedFreqDashboard');
      expect(container.style.display).toBe('block');
    });

    it('should display the left frequency value in Hz', () => {
      mockApp.matchedFrequencies.left = 4000;
      dashboard.updateDashboard();
      const freqValue = document.getElementById('dashboardFreqValue');
      expect(freqValue.textContent).toBe('4000 Hz');
    });

    it('should display right frequency when no left frequency is set', () => {
      mockApp.matchedFrequencies.right = 6000;
      dashboard.updateDashboard();
      const freqValue = document.getElementById('dashboardFreqValue');
      expect(freqValue.textContent).toBe('6000 Hz');
    });

    it('should prefer left frequency over right', () => {
      mockApp.matchedFrequencies.left = 4000;
      mockApp.matchedFrequencies.right = 6000;
      dashboard.updateDashboard();
      const freqValue = document.getElementById('dashboardFreqValue');
      expect(freqValue.textContent).toBe('4000 Hz');
    });

    it('should hide the container again when frequencies are cleared', () => {
      mockApp.matchedFrequencies.left = 4000;
      dashboard.updateDashboard();
      expect(document.getElementById('matchedFreqDashboard').style.display).toBe('block');

      mockApp.matchedFrequencies.left = null;
      dashboard.updateDashboard();
      expect(document.getElementById('matchedFreqDashboard').style.display).toBe('none');
    });
  });

  describe('Tips Generation (getTips)', () => {
    it('should suggest finding frequency when none is matched', () => {
      const tips = dashboard.getTips();
      expect(tips.some(t => t.includes('finding your tinnitus frequency'))).toBe(true);
    });

    it('should suggest guided frequency sweep when none is matched', () => {
      const tips = dashboard.getTips();
      expect(tips.some(t => t.includes('Guided Frequency Sweep'))).toBe(true);
    });

    it('should suggest therapy duration when frequency is matched but todayTime is low', () => {
      mockApp.matchedFrequencies.left = 4000;
      const tips = dashboard.getTips();
      expect(tips.some(t => t.includes('30-60 minutes'))).toBe(true);
    });

    it('should include consistency tip when frequency is matched', () => {
      mockApp.matchedFrequencies.left = 4000;
      const tips = dashboard.getTips();
      expect(tips.some(t => t.includes('Consistency is key'))).toBe(true);
    });

    it('should include improvement timeline tip when frequency is matched', () => {
      mockApp.matchedFrequencies.left = 4000;
      const tips = dashboard.getTips();
      expect(tips.some(t => t.includes('4-8 weeks'))).toBe(true);
    });

    it('should include pink noise tip when frequency is matched', () => {
      mockApp.matchedFrequencies.left = 4000;
      const tips = dashboard.getTips();
      expect(tips.some(t => t.includes('pink noise'))).toBe(true);
    });

    it('should celebrate high streak (>= 7 days)', () => {
      mockApp.matchedFrequencies.left = 4000;
      mockApp.sessionManager.getStats = () => ({
        todayTime: 0,
        streak: 10,
        totalTime: 0
      });

      const tips = dashboard.getTips();
      expect(tips.some(t => t.includes('10-day streak'))).toBe(true);
    });

    it('should not celebrate low streak (< 7 days)', () => {
      mockApp.matchedFrequencies.left = 4000;
      mockApp.sessionManager.getStats = () => ({
        todayTime: 0,
        streak: 3,
        totalTime: 0
      });

      const tips = dashboard.getTips();
      expect(tips.every(t => !t.includes('streak!'))).toBe(true);
    });

    it('should not include 30-60 minute tip when todayTime exceeds threshold', () => {
      mockApp.matchedFrequencies.left = 4000;
      mockApp.sessionManager.getStats = () => ({
        todayTime: 60 * 60 * 1000, // 1 hour in ms
        streak: 0,
        totalTime: 0
      });

      const tips = dashboard.getTips();
      expect(tips.some(t => t.includes('30-60 minutes'))).toBe(false);
    });

    it('should always return at least one tip', () => {
      const tips = dashboard.getTips();
      expect(tips.length).toBeGreaterThan(0);
    });
  });

  describe('Missing DOM Elements (early returns)', () => {
    it('should not throw when statusIndicator and statusText are missing', () => {
      // Remove the DOM elements that updateStatus needs
      document.getElementById('statusIndicator')?.remove();
      document.getElementById('statusText')?.remove();
      expect(() => dashboard.updateStatus()).not.toThrow();
    });

    it('should not throw when matchedFreqDashboard container is missing', () => {
      document.getElementById('matchedFreqDashboard')?.remove();
      document.getElementById('dashboardFreqValue')?.remove();
      expect(() => dashboard.updateMatchedFrequency()).not.toThrow();
    });

    it('should not throw when tipText element is missing', () => {
      document.getElementById('tipText')?.remove();
      expect(() => dashboard.updateTips()).not.toThrow();
    });

  });

  describe('ScrollIntoView on quick actions', () => {
    beforeEach(() => {
      dashboard.init();
    });

    it('should scrollIntoView notched-noise element when quickStartTherapy clicked and element exists', () => {
      const target = document.createElement('div');
      target.id = 'notched-noise';
      target.scrollIntoView = vi.fn();
      document.body.appendChild(target);

      const btn = document.getElementById('quickStartTherapy');
      btn.click();
      expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('should scrollIntoView tone-matcher element when quickFindFrequency clicked and no guidedMatching', () => {
      const target = document.createElement('div');
      target.id = 'tone-matcher';
      target.scrollIntoView = vi.fn();
      document.body.appendChild(target);

      const btn = document.getElementById('quickFindFrequency');
      btn.click();
      expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });

  describe('Tips Display (updateTips)', () => {
    beforeEach(() => {
      dashboard.init();
    });

    it('should set tipText to one of the available tips', () => {
      dashboard.updateDashboard();
      const tipText = document.getElementById('tipText').textContent;
      const allTips = dashboard.getTips();
      expect(allTips).toContain(tipText);
    });
  });

  describe('Quick Action Handlers (bindEvents)', () => {
    beforeEach(() => {
      dashboard.init();
    });

    it('should call switchMode with notched-noise when Start Therapy is clicked', () => {
      const btn = document.getElementById('quickStartTherapy');
      btn.click();
      expect(mockApp.switchMode).toHaveBeenCalledWith('notched-noise');
    });

    it('should call switchMode with tone-matcher when Find Frequency is clicked and no guidedMatching', () => {
      const btn = document.getElementById('quickFindFrequency');
      btn.click();
      expect(mockApp.switchMode).toHaveBeenCalledWith('tone-matcher');
    });

    it('should call guidedMatching.launch when Find Frequency is clicked and guidedMatching exists', () => {
      mockApp.guidedMatching = { launch: vi.fn() };
      // Re-init to rebind events with the new guidedMatching reference
      // But since bindEvents reads app.guidedMatching at click-time (not bind-time),
      // we just need to set it before clicking.
      const btn = document.getElementById('quickFindFrequency');
      btn.click();
      expect(mockApp.guidedMatching.launch).toHaveBeenCalled();
      expect(mockApp.switchMode).not.toHaveBeenCalledWith('tone-matcher');
    });

    it('should call journalManager.showDailyCheckIn when Journal is clicked', () => {
      const btn = document.getElementById('quickJournal');
      btn.click();
      expect(mockApp.journalManager.showDailyCheckIn).toHaveBeenCalled();
    });

    it('should not throw when journalManager is null and Journal is clicked', () => {
      mockApp.journalManager = null;
      const btn = document.getElementById('quickJournal');
      expect(() => btn.click()).not.toThrow();
    });
  });

  describe('setStatus', () => {
    beforeEach(() => {
      dashboard.init();
    });

    it('should update currentStatus to the given value', () => {
      dashboard.setStatus('custom-status');
      expect(dashboard.currentStatus).toBe('custom-status');
    });

    it('should call updateStatus (which updates DOM)', () => {
      // After setStatus, the DOM status indicator gets updated
      // Since 'custom-status' matches no known state, it falls into idle branch
      dashboard.setStatus('custom-status');
      const indicator = document.getElementById('statusIndicator');
      expect(indicator.classList.contains('status-idle')).toBe(true);
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      dashboard.init();
    });

    it('should update dashboard state when refresh is called', () => {
      mockApp.noiseState.isPlaying = true;
      mockApp.matchedFrequencies.left = 8000;
      mockApp.sessionManager.getStats = () => ({
        todayTime: 900000,
        weekTime: 3600000,
        totalTime: 18000000,
        streak: 3,
        todayTimeFormatted: '15:00',
        weekTimeFormatted: '1:00:00',
        totalTimeFormatted: '5:00:00'
      });

      dashboard.refresh();

      const statusText = document.getElementById('statusText');
      expect(statusText.textContent).toContain('Therapy Active');

      expect(document.getElementById('streakMini').textContent).toBe('3');
      expect(document.getElementById('todayMini').textContent).toBe('15:00');
      expect(document.getElementById('totalMini').textContent).toBe('5:00:00');

      const freqContainer = document.getElementById('matchedFreqDashboard');
      expect(freqContainer.style.display).toBe('block');
      expect(document.getElementById('dashboardFreqValue').textContent).toBe('8000 Hz');
    });
  });
});
