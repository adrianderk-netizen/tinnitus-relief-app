/**
 * Tinnitus Relief Pro - Main Application
 * Integrates tone matching, notched noise therapy, and notched music
 */

class TinnitusReliefApp {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.sessionManager = new SessionManager();
        this.subscriptionManager = new SubscriptionManager();
        this.visualizers = {};
        
        // New managers for Phase 1 enhancements
        this.wizardManager = null;
        this.frequencySweep = null;
        this.journalManager = null;
        this.dashboardManager = null;
        
        // Matched frequencies for each ear
        this.matchedFrequencies = { left: null, right: null };
        
        // Current mode and state
        this.currentMode = 'tone-matcher';
        this.masterVolume = 0.5;
        
        // Tone Matcher State
        this.toneState = {
            isPlaying: false,
            left: { enabled: true, frequency: 4000, fineTune: 0, volume: 0.5, waveform: 'sine', phaseInverted: false, osc: null, gain: null, panner: null, phaseGain: null },
            right: { enabled: true, frequency: 4000, fineTune: 0, volume: 0.5, waveform: 'sine', phaseInverted: false, osc: null, gain: null, panner: null, phaseGain: null }
        };
        
        // Notched Noise State
        this.noiseState = {
            isPlaying: false,
            type: 'pink',
            volume: 0.5,
            notchFreq: 4000,
            notchWidth: 1,
            notchDepth: 1,
            source: null,
            gain: null,
            filterBank: null,
            analyzer: null
        };
        
        // Notched Music State
        this.musicState = {
            isPlaying: false,
            volume: 0.7,
            notchFreq: 4000,
            notchWidth: 1,
            notchEnabled: true,
            source: null,
            gain: null,
            filterBank: null,
            analyzer: null,
            audioElement: null
        };
        
        // Profiles
        this.profiles = this.loadProfiles();
        this.currentProfile = null; // Track currently active profile
        
        this.init();
    }

    async init() {
        // Initialize subscription manager first
        await this.subscriptionManager.init();
        
        this.bindElements();
        this.bindTabEvents();
        this.bindToneMatcherEvents();
        this.bindNotchedNoiseEvents();
        this.bindNotchedMusicEvents();
        this.bindSessionEvents();
        this.bindProfileEvents();
        this.bindSubscriptionEvents(); // NEW: Subscription event handlers
        this.initVisualizers();
        this.initOnboarding();
        this.autoLoadLastProfile(); // Load last used profile FIRST
        this.autoRestoreState(); // Then restore last session settings (overrides profile if needed)
        this.updateUI();
        this.updateStats();
        this.updateActiveProfileIndicator();
        
        // Set up subscription change callback
        this.subscriptionManager.onSubscriptionChange = () => {
            console.log('[App] Subscription changed, updating UI');
            this.updateUI();
        };
        
        // Initialize Phase 1 enhancements after onboarding
        this.initPhase1Enhancements();
    }
    
    initPhase1Enhancements() {
        // Wait for DOM to be fully ready
        setTimeout(() => {
            // Initialize wizard manager
            this.wizardManager = new WizardManager(this);
            
            // Initialize frequency sweep
            this.frequencySweep = new FrequencySweepManager(this.audioEngine);
            this.frequencySweep.init();
            
            // Initialize journal manager
            this.journalManager = new ReliefJournalManager();
            this.journalManager.init();
            
            // Initialize dashboard
            this.dashboardManager = new DashboardManager(this);
            this.dashboardManager.init();
            
            // Connect frequency sweep callbacks
            this.frequencySweep.on('onMatch', (freq, confidence) => {
                this.matchedFrequencies.left = freq;
                this.matchedFrequencies.right = freq;
                this.els.leftMatchedFreq.textContent = `${freq} Hz`;
                this.els.rightMatchedFreq.textContent = `${freq} Hz`;
                this.autoSaveState();
                this.dashboardManager?.updateMatchedFrequency();
                
                // Notify wizard if active
                if (this.wizardManager?.isWizardMode) {
                    this.wizardManager.completeCurrentStep('frequency-marked');
                }
            });
            
            console.log('Phase 1 enhancements initialized');
        }, 100);
    }

    bindElements() {
        // Master
        this.els = {
            masterVolume: document.getElementById('masterVolume'),
            masterVolumeDisplay: document.getElementById('masterVolumeDisplay'),
            leftMatchedFreq: document.getElementById('leftMatchedFreq'),
            rightMatchedFreq: document.getElementById('rightMatchedFreq')
        };
    }

    // === TAB NAVIGATION ===
    bindTabEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                if (mode) this.switchMode(mode);
            });
        });

        document.getElementById('masterVolume').addEventListener('input', (e) => {
            this.masterVolume = e.target.value / 100;
            this.els.masterVolumeDisplay.textContent = `${e.target.value}%`;
            this.updateAllVolumes();
            this.autoSaveState();
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(mode).classList.add('active');
    }

    // === TONE MATCHER ===
    bindToneMatcherEvents() {
        document.getElementById('startTone').addEventListener('click', () => this.startTone());
        document.getElementById('stopTone').addEventListener('click', () => this.stopTone());
        this.bindEarControls('left');
        this.bindEarControls('right');
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const freq = parseInt(e.target.dataset.freq);
                this.setToneFrequency('left', freq);
                this.setToneFrequency('right', freq);
            });
        });
    }

    bindEarControls(ear) {
        const prefix = ear + 'Tone';
        document.getElementById(`${prefix}Enabled`).addEventListener('change', (e) => {
            this.toneState[ear].enabled = e.target.checked;
            this.updateToneVolume(ear);
        });
        document.getElementById(`${prefix}Freq`).addEventListener('input', (e) => this.setToneFrequency(ear, parseInt(e.target.value)));
        document.getElementById(`${prefix}FreqInput`).addEventListener('change', (e) => this.setToneFrequency(ear, Math.max(100, Math.min(15000, parseInt(e.target.value)))));
        document.getElementById(`${prefix}Volume`).addEventListener('input', (e) => {
            this.toneState[ear].volume = e.target.value / 100;
            document.getElementById(`${prefix}VolumeDisplay`).textContent = `${e.target.value}%`;
            this.updateToneVolume(ear);
            this.autoSaveState();
        });
        document.getElementById(`${prefix}Waveform`).addEventListener('change', (e) => {
            this.toneState[ear].waveform = e.target.value;
            if (this.toneState[ear].osc) this.toneState[ear].osc.type = e.target.value;
            this.visualizers[ear]?.setParams(this.toneState[ear].frequency, e.target.value, 1, this.toneState[ear].phaseInverted);
            this.autoSaveState();
        });
        document.getElementById(`${prefix}FineTune`).addEventListener('input', (e) => {
            this.toneState[ear].fineTune = parseFloat(e.target.value);
            document.getElementById(`${prefix}FineTuneDisplay`).textContent = `${e.target.value} Hz`;
            this.updateToneFrequencyValue(ear);
            this.autoSaveState();
        });
        document.getElementById(`${prefix}Mark`).addEventListener('click', () => this.markFrequency(ear));
        document.getElementById(`${prefix}Invert`).addEventListener('click', () => this.togglePhaseInversion(ear));
    }

    setToneFrequency(ear, freq) {
        this.toneState[ear].frequency = freq;
        document.getElementById(`${ear}ToneFreq`).value = freq;
        document.getElementById(`${ear}ToneFreqInput`).value = freq;
        this.updateToneFrequencyValue(ear);
        this.visualizers[ear]?.setParams(freq, this.toneState[ear].waveform, 1, this.toneState[ear].phaseInverted);
        this.autoSaveState();
    }

    updateToneFrequencyValue(ear) {
        const state = this.toneState[ear];
        if (state.osc && this.toneState.isPlaying) {
            state.osc.frequency.setTargetAtTime(state.frequency + state.fineTune, this.audioEngine.currentTime, 0.01);
        }
    }

    updateToneVolume(ear) {
        const state = this.toneState[ear];
        if (state.gain && this.toneState.isPlaying) {
            const vol = state.enabled ? state.volume * this.masterVolume : 0;
            state.gain.gain.setTargetAtTime(vol, this.audioEngine.currentTime, 0.01);
        }
    }

    startTone() {
        // Guard: prevent starting if already playing
        if (this.toneState.isPlaying) {
            return;
        }
        
        try {
            this.audioEngine.init();
            
            ['left', 'right'].forEach(ear => {
                const state = this.toneState[ear];
                state.osc = this.audioEngine.createOscillator(state.frequency + state.fineTune, state.waveform);
                state.phaseGain = this.audioEngine.createGain(state.phaseInverted ? -1 : 1);
                state.gain = this.audioEngine.createGain(state.enabled ? state.volume * this.masterVolume : 0);
                state.panner = this.audioEngine.createPanner(ear === 'left' ? -1 : 1);
                state.osc.connect(state.phaseGain);
                state.phaseGain.connect(state.gain);
                state.gain.connect(state.panner);
                this.audioEngine.connectToMaster(state.panner);
                state.osc.start();
            });
            
            this.toneState.isPlaying = true;
            document.getElementById('startTone').disabled = true;
            document.getElementById('stopTone').disabled = false;
        } catch(e) {
            console.error('Error in startTone:', e);
        }
    }

    stopTone() {
        ['left', 'right'].forEach(ear => {
            const state = this.toneState[ear];
            if (state.osc) { state.osc.stop(); state.osc.disconnect(); state.osc = null; }
            state.gain = null; state.panner = null; state.phaseGain = null;
        });
        this.toneState.isPlaying = false;
        document.getElementById('startTone').disabled = false;
        document.getElementById('stopTone').disabled = true;
    }

    markFrequency(ear) {
        const state = this.toneState[ear];
        const freq = state.frequency + state.fineTune;
        this.matchedFrequencies[ear] = freq;
        const display = ear === 'left' ? this.els.leftMatchedFreq : this.els.rightMatchedFreq;
        display.textContent = `${freq.toFixed(1)} Hz`;
        const btn = document.getElementById(`${ear}ToneMark`);
        btn.textContent = '✅ Marked!';
        setTimeout(() => btn.textContent = '📌 Mark as Tinnitus Frequency', 1500);
        this.autoSaveState();
    }

    togglePhaseInversion(ear) {
        const state = this.toneState[ear];
        state.phaseInverted = !state.phaseInverted;
        if (state.phaseGain && this.toneState.isPlaying) {
            state.phaseGain.gain.setTargetAtTime(state.phaseInverted ? -1 : 1, this.audioEngine.currentTime, 0.01);
        }
        const statusEl = document.getElementById(`${ear}TonePhaseStatus`);
        const invertBtn = document.getElementById(`${ear}ToneInvert`);
        if (state.phaseInverted) {
            statusEl.innerHTML = 'Phase: <span class="inverted">INVERTED (180°)</span>';
            invertBtn.classList.add('active');
        } else {
            statusEl.innerHTML = 'Phase: <span class="normal">Normal</span>';
            invertBtn.classList.remove('active');
        }
        this.visualizers[ear]?.setParams(state.frequency, state.waveform, 1, state.phaseInverted);
        this.autoSaveState();
    }

    // === NOTCHED NOISE ===
    bindNotchedNoiseEvents() {
        document.getElementById('startNoise').addEventListener('click', () => this.startNoise());
        document.getElementById('stopNoise').addEventListener('click', () => this.stopNoise());
        document.getElementById('noiseType').addEventListener('change', (e) => { this.noiseState.type = e.target.value; if (this.noiseState.isPlaying) { this.stopNoise(); this.startNoise(); } this.autoSaveState(); });
        document.getElementById('noiseVolume').addEventListener('input', (e) => { this.noiseState.volume = e.target.value / 100; document.getElementById('noiseVolumeDisplay').textContent = `${e.target.value}%`; if (this.noiseState.gain) this.noiseState.gain.gain.setTargetAtTime(this.noiseState.volume * this.masterVolume, this.audioEngine.currentTime, 0.01); this.autoSaveState(); });
        document.getElementById('notchFreq').addEventListener('input', (e) => this.setNoiseNotchFreq(parseInt(e.target.value)));
        document.getElementById('notchFreqInput').addEventListener('change', (e) => this.setNoiseNotchFreq(Math.max(100, Math.min(15000, parseInt(e.target.value)))));
        document.getElementById('notchWidth').addEventListener('change', (e) => { this.noiseState.notchWidth = e.target.value; this.updateNoiseNotch(); this.autoSaveState(); });
        document.getElementById('notchDepth').addEventListener('change', (e) => { this.noiseState.notchDepth = parseFloat(e.target.value); this.updateNoiseNotch(); this.autoSaveState(); });
        document.getElementById('useMatchedFreqNoise').addEventListener('click', () => { const freq = this.matchedFrequencies.left || this.matchedFrequencies.right || 4000; this.setNoiseNotchFreq(freq); });
    }

    setNoiseNotchFreq(freq) {
        this.noiseState.notchFreq = freq;
        document.getElementById('notchFreq').value = freq;
        document.getElementById('notchFreqInput').value = freq;
        this.updateNoiseNotch();
        this.visualizers.noiseSpectrum?.setNotch(freq, this.noiseState.notchWidth);
    }

    updateNoiseNotch() {
        if (this.noiseState.filterBank) {
            this.noiseState.filterBank.update(this.noiseState.notchFreq, this.noiseState.notchWidth, this.noiseState.notchDepth);
        }
    }

    startNoise() {
        // Guard: prevent starting if already playing
        if (this.noiseState.isPlaying) {
            return;
        }
        
        this.audioEngine.init();
        const state = this.noiseState;
        state.source = this.audioEngine.createNoiseSource(state.type);
        state.filterBank = this.audioEngine.createNotchFilterBank(state.notchFreq, state.notchWidth, state.notchDepth);
        state.gain = this.audioEngine.createGain(state.volume * this.masterVolume);
        state.analyzer = this.audioEngine.createAnalyzer(2048);
        state.source.connect(state.filterBank.input);
        state.filterBank.output.connect(state.gain);
        state.gain.connect(state.analyzer);
        this.audioEngine.connectToMaster(state.analyzer);
        state.source.start();
        state.isPlaying = true;
        this.visualizers.noiseSpectrum?.setAnalyzer(state.analyzer);
        this.visualizers.noiseSpectrum?.setNotch(state.notchFreq, state.notchWidth);
        this.visualizers.noiseSpectrum?.start();
        document.getElementById('startNoise').disabled = true;
        document.getElementById('stopNoise').disabled = false;
    }

    stopNoise() {
        const state = this.noiseState;
        if (state.source) { state.source.stop(); state.source.disconnect(); state.source = null; }
        state.filterBank = null; state.gain = null; state.analyzer = null;
        state.isPlaying = false;
        this.visualizers.noiseSpectrum?.stop();
        document.getElementById('startNoise').disabled = false;
        document.getElementById('stopNoise').disabled = true;
    }

    // === NOTCHED MUSIC ===
    bindNotchedMusicEvents() {
        const audioEl = document.getElementById('audioPlayer');
        this.musicState.audioElement = audioEl;
        
        document.getElementById('musicFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('musicFileName').textContent = file.name;
                const url = URL.createObjectURL(file);
                audioEl.src = url;
                document.getElementById('playMusic').disabled = false;
                document.getElementById('musicSeek').disabled = false;
            }
        });
        document.getElementById('playMusic').addEventListener('click', () => this.playMusic());
        document.getElementById('pauseMusic').addEventListener('click', () => this.pauseMusic());
        document.getElementById('musicVolume').addEventListener('input', (e) => { this.musicState.volume = e.target.value / 100; document.getElementById('musicVolumeDisplay').textContent = `${e.target.value}%`; if (audioEl) audioEl.volume = this.musicState.volume * this.masterVolume; this.autoSaveState(); });
        document.getElementById('musicNotchFreq').addEventListener('input', (e) => this.setMusicNotchFreq(parseInt(e.target.value)));
        document.getElementById('musicNotchFreqInput').addEventListener('change', (e) => this.setMusicNotchFreq(Math.max(100, Math.min(15000, parseInt(e.target.value)))));
        document.getElementById('musicNotchWidth').addEventListener('change', (e) => { this.musicState.notchWidth = e.target.value; this.updateMusicNotch(); this.autoSaveState(); });
        document.getElementById('musicNotchEnabled').addEventListener('change', (e) => { this.musicState.notchEnabled = e.target.checked; this.updateMusicNotch(); this.autoSaveState(); });
        document.getElementById('useMatchedFreqMusic').addEventListener('click', () => { const freq = this.matchedFrequencies.left || this.matchedFrequencies.right || 4000; this.setMusicNotchFreq(freq); });
        
        audioEl.addEventListener('timeupdate', () => {
            document.getElementById('musicCurrentTime').textContent = SessionManager.formatTime(audioEl.currentTime * 1000);
            document.getElementById('musicSeek').value = (audioEl.currentTime / audioEl.duration) * 100 || 0;
        });
        audioEl.addEventListener('loadedmetadata', () => {
            document.getElementById('musicDuration').textContent = SessionManager.formatTime(audioEl.duration * 1000);
        });
        document.getElementById('musicSeek').addEventListener('input', (e) => {
            audioEl.currentTime = (e.target.value / 100) * audioEl.duration;
        });
    }

    setMusicNotchFreq(freq) {
        this.musicState.notchFreq = freq;
        document.getElementById('musicNotchFreq').value = freq;
        document.getElementById('musicNotchFreqInput').value = freq;
        this.updateMusicNotch();
        this.visualizers.musicSpectrum?.setNotch(freq, this.musicState.notchWidth);
    }

    updateMusicNotch() {
        if (this.musicState.filterBank) {
            const depth = this.musicState.notchEnabled ? 1 : 0;
            this.musicState.filterBank.update(this.musicState.notchFreq, this.musicState.notchWidth, depth);
        }
    }

    playMusic() {
        this.audioEngine.init();
        const state = this.musicState;
        const audioEl = state.audioElement;
        if (!state.source) {
            state.source = this.audioEngine.createMediaElementSource(audioEl);
            state.filterBank = this.audioEngine.createNotchFilterBank(state.notchFreq, state.notchWidth, state.notchEnabled ? 1 : 0);
            state.analyzer = this.audioEngine.createAnalyzer(2048);
            state.source.connect(state.filterBank.input);
            state.filterBank.output.connect(state.analyzer);
            this.audioEngine.connectToMaster(state.analyzer);
            this.visualizers.musicSpectrum?.setAnalyzer(state.analyzer);
            this.visualizers.musicSpectrum?.setNotch(state.notchFreq, state.notchWidth);
            this.visualizers.musicSpectrum?.start();
        }
        audioEl.volume = state.volume * this.masterVolume;
        audioEl.play();
        state.isPlaying = true;
        document.getElementById('playMusic').disabled = true;
        document.getElementById('pauseMusic').disabled = false;
    }

    pauseMusic() {
        this.musicState.audioElement.pause();
        this.musicState.isPlaying = false;
        document.getElementById('playMusic').disabled = false;
        document.getElementById('pauseMusic').disabled = true;
    }

    // === SESSION MANAGEMENT ===
    bindSessionEvents() {
        document.getElementById('timerDuration').addEventListener('change', (e) => {
            this.sessionManager.setDurationMinutes(parseInt(e.target.value));
            document.getElementById('timerRemaining').textContent = SessionManager.formatTime(this.sessionManager.targetDuration);
        });
        document.getElementById('timerStart').addEventListener('click', () => {
            this.sessionManager.start(this.currentMode, this.matchedFrequencies.left || this.matchedFrequencies.right);
            document.getElementById('timerStart').disabled = true;
            document.getElementById('timerPause').disabled = false;
            document.getElementById('timerStop').disabled = false;
        });
        document.getElementById('timerPause').addEventListener('click', () => {
            if (this.sessionManager.isPaused) { this.sessionManager.start(); document.getElementById('timerPause').textContent = 'Pause'; }
            else { this.sessionManager.pause(); document.getElementById('timerPause').textContent = 'Resume'; }
        });
        document.getElementById('timerStop').addEventListener('click', () => {
            this.sessionManager.stop();
            this.resetTimerUI();
            this.updateStats();
            this.saveSessionToProfile(); // Save progress to active profile
        });
        this.sessionManager.on('onTick', (data) => {
            document.getElementById('timerRemaining').textContent = SessionManager.formatTime(data.remaining);
            document.getElementById('timerProgressBar').style.width = `${data.progress * 100}%`;
        });
        this.sessionManager.on('onComplete', () => { 
            this.resetTimerUI(); 
            this.updateStats(); 
            this.saveSessionToProfile(); // Save progress to active profile
            alert('🎉 Session complete! Great job!'); 
        });
    }

    resetTimerUI() {
        document.getElementById('timerStart').disabled = false;
        document.getElementById('timerPause').disabled = true;
        document.getElementById('timerStop').disabled = true;
        document.getElementById('timerPause').textContent = 'Pause';
        document.getElementById('timerProgressBar').style.width = '0%';
        document.getElementById('timerRemaining').textContent = SessionManager.formatTime(this.sessionManager.targetDuration);
    }

    updateStats() {
        const stats = this.sessionManager.getStats();
        document.getElementById('statToday').textContent = stats.todayTimeFormatted;
        document.getElementById('statWeek').textContent = stats.weekTimeFormatted;
        document.getElementById('statStreak').textContent = stats.streak;
        document.getElementById('statTotal').textContent = stats.totalTimeFormatted;
    }

    // === PROFILES ===
    loadProfiles() { const saved = localStorage.getItem('tinnitusProfiles'); return saved ? JSON.parse(saved) : {}; }
    saveProfiles() { localStorage.setItem('tinnitusProfiles', JSON.stringify(this.profiles)); }

    bindProfileEvents() {
        const saveBtn = document.getElementById('saveProfile');
        const loadSelect = document.getElementById('loadProfile');
        const deleteBtn = document.getElementById('deleteProfile');
        
        // Add null checks to prevent crashes if elements don't exist
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentProfile());
        } else {
            console.warn('[App] Save profile button not found');
        }
        
        if (loadSelect) {
            loadSelect.addEventListener('change', (e) => this.loadSelectedProfile(e.target.value));
        } else {
            console.warn('[App] Load profile select not found');
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteSelectedProfile());
        } else {
            console.warn('[App] Delete profile button not found');
        }
        
        this.updateProfileDropdown();
    }

    saveCurrentProfile() {
        let name = document.getElementById('profileName').value.trim();
        
        // If no name entered, use currently active profile
        if (!name && this.currentProfile) {
            name = this.currentProfile;
        }
        
        if (!name) { alert('Please enter a profile name'); return; }
        
        // Check if this is a new profile (not updating an existing one)
        const isNewProfile = !this.profiles[name];
        
        // If it's a new profile, start with empty session history; otherwise save the current session history
        const sessionHistory = isNewProfile ? [] : this.sessionManager.getHistory();
        
        this.profiles[name] = { 
            masterVolume: this.masterVolume, 
            matchedFrequencies: { ...this.matchedFrequencies }, 
            toneState: JSON.parse(JSON.stringify(this.toneState)), 
            noiseState: { type: this.noiseState.type, volume: this.noiseState.volume, notchFreq: this.noiseState.notchFreq, notchWidth: this.noiseState.notchWidth, notchDepth: this.noiseState.notchDepth }, 
            musicState: { volume: this.musicState.volume, notchFreq: this.musicState.notchFreq, notchWidth: this.musicState.notchWidth },
            sessionHistory: sessionHistory
        };
        this.saveProfiles();
        this.updateProfileDropdown();
        document.getElementById('profileName').value = '';
        
        // Set as current profile
        this.currentProfile = name;
        
        // If new profile, reset the session history and update stats display
        if (isNewProfile) {
            this.sessionManager.setHistory([]);
            this.updateStats();
        }
        
        alert(`Profile "${name}" saved!`);
    }

    loadSelectedProfile(name) {
        if (!name || !this.profiles[name]) return;
        const p = this.profiles[name];
        
        // Set as currently active profile
        this.currentProfile = name;
        
        // Master Volume
        this.masterVolume = p.masterVolume;
        document.getElementById('masterVolume').value = this.masterVolume * 100;
        this.els.masterVolumeDisplay.textContent = `${Math.round(this.masterVolume * 100)}%`;
        
        // Matched Frequencies
        this.matchedFrequencies = { ...p.matchedFrequencies };
        if (this.matchedFrequencies.left) this.els.leftMatchedFreq.textContent = `${this.matchedFrequencies.left} Hz`;
        else this.els.leftMatchedFreq.textContent = '-- Hz';
        if (this.matchedFrequencies.right) this.els.rightMatchedFreq.textContent = `${this.matchedFrequencies.right} Hz`;
        else this.els.rightMatchedFreq.textContent = '-- Hz';
        
        // Tone Matcher State - restore for each ear
        if (p.toneState) {
            ['left', 'right'].forEach(ear => {
                if (p.toneState[ear]) {
                    const saved = p.toneState[ear];
                    const state = this.toneState[ear];
                    
                    // Restore state values
                    state.enabled = saved.enabled;
                    state.frequency = saved.frequency;
                    state.fineTune = saved.fineTune;
                    state.volume = saved.volume;
                    state.waveform = saved.waveform;
                    state.phaseInverted = saved.phaseInverted;
                    
                    // Update UI elements
                    const prefix = ear + 'Tone';
                    document.getElementById(`${prefix}Enabled`).checked = state.enabled;
                    document.getElementById(`${prefix}Freq`).value = state.frequency;
                    document.getElementById(`${prefix}FreqInput`).value = state.frequency;
                    document.getElementById(`${prefix}Volume`).value = state.volume * 100;
                    document.getElementById(`${prefix}VolumeDisplay`).textContent = `${Math.round(state.volume * 100)}%`;
                    document.getElementById(`${prefix}Waveform`).value = state.waveform;
                    document.getElementById(`${prefix}FineTune`).value = state.fineTune;
                    document.getElementById(`${prefix}FineTuneDisplay`).textContent = `${state.fineTune} Hz`;
                    
                    // Update phase inversion UI
                    const statusEl = document.getElementById(`${prefix}PhaseStatus`);
                    const invertBtn = document.getElementById(`${prefix}Invert`);
                    if (state.phaseInverted) {
                        statusEl.innerHTML = 'Phase: <span class="inverted">INVERTED (180°)</span>';
                        invertBtn.classList.add('active');
                    } else {
                        statusEl.innerHTML = 'Phase: <span class="normal">Normal</span>';
                        invertBtn.classList.remove('active');
                    }
                    
                    // Update visualizer
                    this.visualizers[ear]?.setParams(state.frequency, state.waveform, 1, state.phaseInverted);
                }
            });
        }
        
        // Notched Noise State
        if (p.noiseState) {
            this.noiseState.type = p.noiseState.type;
            this.noiseState.volume = p.noiseState.volume;
            this.noiseState.notchFreq = p.noiseState.notchFreq;
            this.noiseState.notchWidth = p.noiseState.notchWidth;
            this.noiseState.notchDepth = p.noiseState.notchDepth;
            
            // Update UI elements
            document.getElementById('noiseType').value = this.noiseState.type;
            document.getElementById('noiseVolume').value = this.noiseState.volume * 100;
            document.getElementById('noiseVolumeDisplay').textContent = `${Math.round(this.noiseState.volume * 100)}%`;
            document.getElementById('notchFreq').value = this.noiseState.notchFreq;
            document.getElementById('notchFreqInput').value = this.noiseState.notchFreq;
            document.getElementById('notchWidth').value = this.noiseState.notchWidth;
            document.getElementById('notchDepth').value = this.noiseState.notchDepth;
        }
        
        // Notched Music State
        if (p.musicState) {
            this.musicState.volume = p.musicState.volume;
            this.musicState.notchFreq = p.musicState.notchFreq;
            this.musicState.notchWidth = p.musicState.notchWidth;
            
            // Update UI elements
            document.getElementById('musicVolume').value = this.musicState.volume * 100;
            document.getElementById('musicVolumeDisplay').textContent = `${Math.round(this.musicState.volume * 100)}%`;
            document.getElementById('musicNotchFreq').value = this.musicState.notchFreq;
            document.getElementById('musicNotchFreqInput').value = this.musicState.notchFreq;
            document.getElementById('musicNotchWidth').value = this.musicState.notchWidth;
        }
        
        // Load profile-specific session history
        // For backward compatibility: if profile doesn't have sessionHistory, try to use the global history
        let profileHistory = p.sessionHistory;
        if (!profileHistory) {
            // This is an old profile without session history - try to recover from global localStorage
            const globalHistory = localStorage.getItem('tinnitusSessionHistory');
            profileHistory = globalHistory ? JSON.parse(globalHistory) : [];
            
            // Migrate this profile to include the session history
            this.profiles[name].sessionHistory = profileHistory;
            this.saveProfiles();
            console.log(`Migrated session history to profile "${name}"`);
        }
        this.sessionManager.setHistory(profileHistory);
        this.updateStats();
        
        // Save as last profile for auto-load next time
        localStorage.setItem('tinnitusLastProfile', name);
        this.updateActiveProfileIndicator();
        
        alert(`Profile "${name}" loaded!`);
    }

    deleteSelectedProfile() {
        const name = document.getElementById('loadProfile').value;
        if (!name) { alert('Select a profile to delete'); return; }
        if (confirm(`Delete "${name}"?`)) { delete this.profiles[name]; this.saveProfiles(); this.updateProfileDropdown(); }
    }

    updateProfileDropdown() {
        const sel = document.getElementById('loadProfile');
        sel.innerHTML = '<option value="">-- Load Profile --</option>';
        Object.keys(this.profiles).forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
    }

    // === VISUALIZERS ===
    initVisualizers() {
        // Add delay to ensure canvas elements are fully rendered in DOM
        setTimeout(() => {
            try {
                console.log('[App] Initializing visualizers...');
                this.visualizers.left = new WaveformVisualizer('leftToneWave');
                this.visualizers.right = new WaveformVisualizer('rightToneWave');
                this.visualizers.noiseSpectrum = new SpectrumVisualizer('noiseSpectrum');
                this.visualizers.musicSpectrum = new SpectrumVisualizer('musicSpectrum');
                
                // Configure and start waveform visualizers
                ['left', 'right'].forEach(ear => { 
                    if (this.visualizers[ear]) {
                        this.visualizers[ear].setParams(this.toneState[ear].frequency, this.toneState[ear].waveform, 1, false);
                        this.visualizers[ear].start();
                        console.log(`[App] ${ear} visualizer started`);
                    } else {
                        console.error(`[App] ${ear} visualizer failed to initialize`);
                    }
                });
                console.log('[App] Visualizers initialized successfully');
            } catch (e) {
                console.error('[App] Error initializing visualizers:', e);
            }
        }, 500); // Increased delay for better canvas rendering
    }

    updateAllVolumes() {
        this.updateToneVolume('left');
        this.updateToneVolume('right');
        if (this.noiseState.gain) this.noiseState.gain.gain.setTargetAtTime(this.noiseState.volume * this.masterVolume, this.audioEngine.currentTime, 0.01);
        if (this.musicState.audioElement) this.musicState.audioElement.volume = this.musicState.volume * this.masterVolume;
    }

    updateUI() {
        document.getElementById('masterVolume').value = this.masterVolume * 100;
        this.els.masterVolumeDisplay.textContent = `${Math.round(this.masterVolume * 100)}%`;
    }

    // === AUTO-SAVE/RESTORE LAST SESSION ===
    autoSaveState() {
        const state = {
            masterVolume: this.masterVolume,
            matchedFrequencies: { ...this.matchedFrequencies },
            toneState: {
                left: {
                    enabled: this.toneState.left.enabled,
                    frequency: this.toneState.left.frequency,
                    fineTune: this.toneState.left.fineTune,
                    volume: this.toneState.left.volume,
                    waveform: this.toneState.left.waveform,
                    phaseInverted: this.toneState.left.phaseInverted
                },
                right: {
                    enabled: this.toneState.right.enabled,
                    frequency: this.toneState.right.frequency,
                    fineTune: this.toneState.right.fineTune,
                    volume: this.toneState.right.volume,
                    waveform: this.toneState.right.waveform,
                    phaseInverted: this.toneState.right.phaseInverted
                }
            },
            noiseState: {
                type: this.noiseState.type,
                volume: this.noiseState.volume,
                notchFreq: this.noiseState.notchFreq,
                notchWidth: this.noiseState.notchWidth,
                notchDepth: this.noiseState.notchDepth
            },
            musicState: {
                volume: this.musicState.volume,
                notchFreq: this.musicState.notchFreq,
                notchWidth: this.musicState.notchWidth,
                notchEnabled: this.musicState.notchEnabled
            }
        };
        localStorage.setItem('tinnitusLastSession', JSON.stringify(state));
    }

    autoRestoreState() {
        const saved = localStorage.getItem('tinnitusLastSession');
        if (!saved) return;
        
        try {
            const state = JSON.parse(saved);
            
            // Restore master volume
            if (state.masterVolume !== undefined) {
                this.masterVolume = state.masterVolume;
                document.getElementById('masterVolume').value = this.masterVolume * 100;
                this.els.masterVolumeDisplay.textContent = `${Math.round(this.masterVolume * 100)}%`;
            }
            
            // Restore matched frequencies
            if (state.matchedFrequencies) {
                this.matchedFrequencies = { ...state.matchedFrequencies };
                if (this.matchedFrequencies.left) {
                    this.els.leftMatchedFreq.textContent = `${this.matchedFrequencies.left} Hz`;
                }
                if (this.matchedFrequencies.right) {
                    this.els.rightMatchedFreq.textContent = `${this.matchedFrequencies.right} Hz`;
                }
            }
            
            // Restore tone state for each ear
            if (state.toneState) {
                ['left', 'right'].forEach(ear => {
                    if (state.toneState[ear]) {
                        const saved = state.toneState[ear];
                        const earState = this.toneState[ear];
                        
                        earState.enabled = saved.enabled;
                        earState.frequency = saved.frequency;
                        earState.fineTune = saved.fineTune;
                        earState.volume = saved.volume;
                        earState.waveform = saved.waveform;
                        earState.phaseInverted = saved.phaseInverted;
                        
                        // Update UI
                        const prefix = ear + 'Tone';
                        document.getElementById(`${prefix}Enabled`).checked = earState.enabled;
                        document.getElementById(`${prefix}Freq`).value = earState.frequency;
                        document.getElementById(`${prefix}FreqInput`).value = earState.frequency;
                        document.getElementById(`${prefix}Volume`).value = earState.volume * 100;
                        document.getElementById(`${prefix}VolumeDisplay`).textContent = `${Math.round(earState.volume * 100)}%`;
                        document.getElementById(`${prefix}Waveform`).value = earState.waveform;
                        document.getElementById(`${prefix}FineTune`).value = earState.fineTune;
                        document.getElementById(`${prefix}FineTuneDisplay`).textContent = `${earState.fineTune} Hz`;
                        
                        // Update phase inversion UI
                        const statusEl = document.getElementById(`${prefix}PhaseStatus`);
                        const invertBtn = document.getElementById(`${prefix}Invert`);
                        if (earState.phaseInverted) {
                            statusEl.innerHTML = 'Phase: <span class="inverted">INVERTED (180°)</span>';
                            invertBtn.classList.add('active');
                        } else {
                            statusEl.innerHTML = 'Phase: <span class="normal">Normal</span>';
                            invertBtn.classList.remove('active');
                        }
                        
                        // Update visualizer
                        this.visualizers[ear]?.setParams(earState.frequency, earState.waveform, 1, earState.phaseInverted);
                    }
                });
            }
            
            // Restore noise state
            if (state.noiseState) {
                this.noiseState.type = state.noiseState.type;
                this.noiseState.volume = state.noiseState.volume;
                this.noiseState.notchFreq = state.noiseState.notchFreq;
                this.noiseState.notchWidth = state.noiseState.notchWidth;
                this.noiseState.notchDepth = state.noiseState.notchDepth;
                
                document.getElementById('noiseType').value = this.noiseState.type;
                document.getElementById('noiseVolume').value = this.noiseState.volume * 100;
                document.getElementById('noiseVolumeDisplay').textContent = `${Math.round(this.noiseState.volume * 100)}%`;
                document.getElementById('notchFreq').value = this.noiseState.notchFreq;
                document.getElementById('notchFreqInput').value = this.noiseState.notchFreq;
                document.getElementById('notchWidth').value = this.noiseState.notchWidth;
                document.getElementById('notchDepth').value = this.noiseState.notchDepth;
            }
            
            // Restore music state
            if (state.musicState) {
                this.musicState.volume = state.musicState.volume;
                this.musicState.notchFreq = state.musicState.notchFreq;
                this.musicState.notchWidth = state.musicState.notchWidth;
                this.musicState.notchEnabled = state.musicState.notchEnabled !== undefined ? state.musicState.notchEnabled : true;
                
                document.getElementById('musicVolume').value = this.musicState.volume * 100;
                document.getElementById('musicVolumeDisplay').textContent = `${Math.round(this.musicState.volume * 100)}%`;
                document.getElementById('musicNotchFreq').value = this.musicState.notchFreq;
                document.getElementById('musicNotchFreqInput').value = this.musicState.notchFreq;
                document.getElementById('musicNotchWidth').value = this.musicState.notchWidth;
                document.getElementById('musicNotchEnabled').checked = this.musicState.notchEnabled;
            }
            
            console.log('Last session settings restored');
        } catch(e) {
            console.error('Error restoring last session:', e);
        }
    }

    // === ONBOARDING ===
    initOnboarding() {
        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem('tinnitusOnboardingComplete');
        if (hasSeenOnboarding) return;
        
        this.currentOnboardingSlide = 0;
        this.showOnboarding();
        this.bindOnboardingEvents();
    }

    showOnboarding() {
        const modal = document.getElementById('onboardingModal');
        if (modal) modal.classList.add('active');
    }

    hideOnboarding() {
        const modal = document.getElementById('onboardingModal');
        if (modal) modal.classList.remove('active');
        localStorage.setItem('tinnitusOnboardingComplete', 'true');
    }

    bindOnboardingEvents() {
        const nextBtn = document.getElementById('onboardingNext');
        const prevBtn = document.getElementById('onboardingPrev');
        const skipBtn = document.getElementById('onboardingSkip');
        const dots = document.querySelectorAll('.onboarding-dots .dot');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentOnboardingSlide < 2) {
                    this.goToOnboardingSlide(this.currentOnboardingSlide + 1);
                } else {
                    this.hideOnboarding();
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentOnboardingSlide > 0) {
                    this.goToOnboardingSlide(this.currentOnboardingSlide - 1);
                }
            });
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.hideOnboarding());
        }

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                const slideIndex = parseInt(e.target.dataset.slide);
                this.goToOnboardingSlide(slideIndex);
            });
        });
    }

    goToOnboardingSlide(index) {
        this.currentOnboardingSlide = index;
        
        // Update slides
        document.querySelectorAll('.onboarding-slide').forEach(slide => {
            slide.classList.remove('active');
        });
        const activeSlide = document.querySelector(`.onboarding-slide[data-slide="${index}"]`);
        if (activeSlide) activeSlide.classList.add('active');

        // Update dots
        document.querySelectorAll('.onboarding-dots .dot').forEach(dot => {
            dot.classList.remove('active');
        });
        const activeDot = document.querySelector(`.onboarding-dots .dot[data-slide="${index}"]`);
        if (activeDot) activeDot.classList.add('active');

        // Update buttons
        const prevBtn = document.getElementById('onboardingPrev');
        const nextBtn = document.getElementById('onboardingNext');
        
        if (prevBtn) {
            prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        }
        
        if (nextBtn) {
            nextBtn.textContent = index === 2 ? 'Get Started! 🚀' : 'Next →';
        }
    }

    // === AUTO-LOAD LAST PROFILE ===
    autoLoadLastProfile() {
        const lastProfileName = localStorage.getItem('tinnitusLastProfile');
        if (lastProfileName && this.profiles[lastProfileName]) {
            // Silently load the profile without alert
            this.loadProfileSilently(lastProfileName);
        }
    }

    loadProfileSilently(name) {
        if (!name || !this.profiles[name]) return;
        const p = this.profiles[name];
        
        this.currentProfile = name;
        
        // Master Volume
        this.masterVolume = p.masterVolume;
        document.getElementById('masterVolume').value = this.masterVolume * 100;
        this.els.masterVolumeDisplay.textContent = `${Math.round(this.masterVolume * 100)}%`;
        
        // Matched Frequencies
        this.matchedFrequencies = { ...p.matchedFrequencies };
        if (this.matchedFrequencies.left) this.els.leftMatchedFreq.textContent = `${this.matchedFrequencies.left} Hz`;
        if (this.matchedFrequencies.right) this.els.rightMatchedFreq.textContent = `${this.matchedFrequencies.right} Hz`;
        
        // Tone Matcher State
        if (p.toneState) {
            ['left', 'right'].forEach(ear => {
                if (p.toneState[ear]) {
                    const saved = p.toneState[ear];
                    const state = this.toneState[ear];
                    state.enabled = saved.enabled;
                    state.frequency = saved.frequency;
                    state.fineTune = saved.fineTune;
                    state.volume = saved.volume;
                    state.waveform = saved.waveform;
                    state.phaseInverted = saved.phaseInverted;
                    
                    const prefix = ear + 'Tone';
                    document.getElementById(`${prefix}Enabled`).checked = state.enabled;
                    document.getElementById(`${prefix}Freq`).value = state.frequency;
                    document.getElementById(`${prefix}FreqInput`).value = state.frequency;
                    document.getElementById(`${prefix}Volume`).value = state.volume * 100;
                    document.getElementById(`${prefix}VolumeDisplay`).textContent = `${Math.round(state.volume * 100)}%`;
                    document.getElementById(`${prefix}Waveform`).value = state.waveform;
                    document.getElementById(`${prefix}FineTune`).value = state.fineTune;
                    document.getElementById(`${prefix}FineTuneDisplay`).textContent = `${state.fineTune} Hz`;
                    
                    this.visualizers[ear]?.setParams(state.frequency, state.waveform, 1, state.phaseInverted);
                }
            });
        }
        
        // Noise State
        if (p.noiseState) {
            Object.assign(this.noiseState, { type: p.noiseState.type, volume: p.noiseState.volume, notchFreq: p.noiseState.notchFreq, notchWidth: p.noiseState.notchWidth, notchDepth: p.noiseState.notchDepth });
            document.getElementById('noiseType').value = this.noiseState.type;
            document.getElementById('noiseVolume').value = this.noiseState.volume * 100;
            document.getElementById('noiseVolumeDisplay').textContent = `${Math.round(this.noiseState.volume * 100)}%`;
            document.getElementById('notchFreq').value = this.noiseState.notchFreq;
            document.getElementById('notchFreqInput').value = this.noiseState.notchFreq;
            document.getElementById('notchWidth').value = this.noiseState.notchWidth;
            document.getElementById('notchDepth').value = this.noiseState.notchDepth;
        }
        
        // Music State
        if (p.musicState) {
            Object.assign(this.musicState, { volume: p.musicState.volume, notchFreq: p.musicState.notchFreq, notchWidth: p.musicState.notchWidth });
            document.getElementById('musicVolume').value = this.musicState.volume * 100;
            document.getElementById('musicVolumeDisplay').textContent = `${Math.round(this.musicState.volume * 100)}%`;
            document.getElementById('musicNotchFreq').value = this.musicState.notchFreq;
            document.getElementById('musicNotchFreqInput').value = this.musicState.notchFreq;
            document.getElementById('musicNotchWidth').value = this.musicState.notchWidth;
        }
        
        // Session history
        let profileHistory = p.sessionHistory || [];
        this.sessionManager.setHistory(profileHistory);
        
        // Set dropdown to show current profile
        document.getElementById('loadProfile').value = name;
        
        console.log(`Auto-loaded profile: ${name}`);
    }

    // === ACTIVE PROFILE INDICATOR ===
    updateActiveProfileIndicator() {
        // Remove existing indicator
        const existingIndicator = document.querySelector('.active-profile-indicator');
        if (existingIndicator) existingIndicator.remove();
        
        if (this.currentProfile) {
            const profilesSection = document.querySelector('.profiles-section h3');
            if (profilesSection) {
                const indicator = document.createElement('div');
                indicator.className = 'active-profile-indicator';
                indicator.innerHTML = `📌 Active Profile: <strong>${this.currentProfile}</strong>`;
                profilesSection.after(indicator);
            }
        }
    }

    // === SAVE SESSION TO ACTIVE PROFILE ===
    saveSessionToProfile() {
        if (this.currentProfile && this.profiles[this.currentProfile]) {
            this.profiles[this.currentProfile].sessionHistory = this.sessionManager.getHistory();
            this.saveProfiles();
            console.log(`Session saved to profile: ${this.currentProfile}`);
        }
    }

    // === SUBSCRIPTION EVENTS ===
    bindSubscriptionEvents() {
        // Onboarding slide 4: Start trial button
        const startTrialBtn = document.getElementById('startTrialBtn');
        if (startTrialBtn) {
            startTrialBtn.addEventListener('click', async () => {
                // Default to annual plan (best value)
                const success = await this.subscriptionManager.subscribe('annual');
                if (success) {
                    this.hideOnboarding();
                }
            });
        }

        // Onboarding slide 4: Restore purchases button
        const restorePurchasesBtn = document.getElementById('restorePurchasesBtn');
        if (restorePurchasesBtn) {
            restorePurchasesBtn.addEventListener('click', async () => {
                await this.subscriptionManager.restorePurchases();
            });
        }

        // Paywall: Close button
        const paywallClose = document.getElementById('paywallClose');
        if (paywallClose) {
            paywallClose.addEventListener('click', () => {
                this.subscriptionManager.hidePaywall();
            });
        }

        // Paywall: Subscribe monthly button
        const subscribeMonthly = document.getElementById('subscribeMonthly');
        if (subscribeMonthly) {
            subscribeMonthly.addEventListener('click', async () => {
                await this.subscriptionManager.subscribe('monthly');
            });
        }

        // Paywall: Subscribe annual button
        const subscribeAnnual = document.getElementById('subscribeAnnual');
        if (subscribeAnnual) {
            subscribeAnnual.addEventListener('click', async () => {
                await this.subscriptionManager.subscribe('annual');
            });
        }

        // Paywall: Restore purchases button
        const paywallRestore = document.getElementById('paywallRestore');
        if (paywallRestore) {
            paywallRestore.addEventListener('click', async () => {
                await this.subscriptionManager.restorePurchases();
            });
        }

        // Feature gating for tab switching
        document.querySelector('[data-mode="notched-noise"]')?.addEventListener('click', (e) => {
            if (!this.subscriptionManager.lockFeature('All Noise Types')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true); // Use capture phase

        document.querySelector('[data-mode="notched-music"]')?.addEventListener('click', (e) => {
            if (!this.subscriptionManager.lockFeature('Music Notching')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true); // Use capture phase

        // Feature gating for noise type selection
        const noiseTypeSelect = document.getElementById('noiseType');
        if (noiseTypeSelect) {
            noiseTypeSelect.addEventListener('change', (e) => {
                if ((e.target.value === 'white' || e.target.value === 'brown')) {
                    if (!this.subscriptionManager.lockFeature('All Noise Types')) {
                        e.target.value = 'pink'; // Revert to pink
                        return;
                    }
                }
            });
        }

        // Feature gating for advanced controls (fine-tune and phase inversion)
        ['left', 'right'].forEach(ear => {
            const fineTuneInput = document.getElementById(`${ear}ToneFineTune`);
            const invertBtn = document.getElementById(`${ear}ToneInvert`);

            if (fineTuneInput) {
                fineTuneInput.addEventListener('input', (e) => {
                    if (!this.subscriptionManager.hasFeature('advancedControls')) {
                        e.target.value = 0;
                        document.getElementById(`${ear}ToneFineTuneDisplay`).textContent = '0 Hz';
                        this.subscriptionManager.lockFeature('Advanced Controls');
                    }
                });
            }

            if (invertBtn) {
                invertBtn.addEventListener('click', (e) => {
                    if (!this.subscriptionManager.hasFeature('advancedControls')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.subscriptionManager.lockFeature('Advanced Controls');
                    }
                }, true); // Use capture phase to intercept before existing handler
            }
        });

        // Click outside paywall to close
        const paywallModal = document.getElementById('paywallModal');
        if (paywallModal) {
            paywallModal.addEventListener('click', (e) => {
                if (e.target === paywallModal) {
                    this.subscriptionManager.hidePaywall();
                }
            });
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => { 
    try {
        window.tinnitusApp = new TinnitusReliefApp(); 
    } catch(e) {
        console.error('Error initializing app:', e);
    }
});
window.addEventListener('beforeunload', () => { if (window.tinnitusApp) { window.tinnitusApp.stopTone(); window.tinnitusApp.stopNoise(); } });
