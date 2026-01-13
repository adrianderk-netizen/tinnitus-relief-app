/**
 * Tinnitus Relief Pro - Main Application
 * Integrates tone matching, notched noise therapy, and notched music
 */

class TinnitusReliefApp {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.sessionManager = new SessionManager();
        this.visualizers = {};
        
        // Matched frequencies for each ear
        this.matchedFrequencies = { left: null, right: null };
        
        // Current mode and state
        this.currentMode = 'tone-matcher';
        this.masterVolume = 0.2;
        
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
        
        this.init();
    }

    init() {
        this.bindElements();
        this.bindTabEvents();
        this.bindToneMatcherEvents();
        this.bindNotchedNoiseEvents();
        this.bindNotchedMusicEvents();
        this.bindSessionEvents();
        this.bindProfileEvents();
        this.initVisualizers();
        this.updateUI();
        this.updateStats();
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
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });

        document.getElementById('masterVolume').addEventListener('input', (e) => {
            this.masterVolume = e.target.value / 100;
            this.els.masterVolumeDisplay.textContent = `${e.target.value}%`;
            this.updateAllVolumes();
        });

        // Match buttons in frequency panel
        document.getElementById('matchLeftBtn').addEventListener('click', () => this.switchMode('tone-matcher'));
        document.getElementById('matchRightBtn').addEventListener('click', () => this.switchMode('tone-matcher'));
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
        });
        document.getElementById(`${prefix}Waveform`).addEventListener('change', (e) => {
            this.toneState[ear].waveform = e.target.value;
            if (this.toneState[ear].osc) this.toneState[ear].osc.type = e.target.value;
            this.visualizers[ear]?.setParams(this.toneState[ear].frequency, e.target.value, 1, this.toneState[ear].phaseInverted);
        });
        document.getElementById(`${prefix}FineTune`).addEventListener('input', (e) => {
            this.toneState[ear].fineTune = parseFloat(e.target.value);
            document.getElementById(`${prefix}FineTuneDisplay`).textContent = `${e.target.value} Hz`;
            this.updateToneFrequencyValue(ear);
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
    }

    // === NOTCHED NOISE ===
    bindNotchedNoiseEvents() {
        document.getElementById('startNoise').addEventListener('click', () => this.startNoise());
        document.getElementById('stopNoise').addEventListener('click', () => this.stopNoise());
        document.getElementById('noiseType').addEventListener('change', (e) => { this.noiseState.type = e.target.value; if (this.noiseState.isPlaying) { this.stopNoise(); this.startNoise(); } });
        document.getElementById('noiseVolume').addEventListener('input', (e) => { this.noiseState.volume = e.target.value / 100; document.getElementById('noiseVolumeDisplay').textContent = `${e.target.value}%`; if (this.noiseState.gain) this.noiseState.gain.gain.setTargetAtTime(this.noiseState.volume * this.masterVolume, this.audioEngine.currentTime, 0.01); });
        document.getElementById('notchFreq').addEventListener('input', (e) => this.setNoiseNotchFreq(parseInt(e.target.value)));
        document.getElementById('notchFreqInput').addEventListener('change', (e) => this.setNoiseNotchFreq(Math.max(100, Math.min(15000, parseInt(e.target.value)))));
        document.getElementById('notchWidth').addEventListener('change', (e) => { this.noiseState.notchWidth = parseFloat(e.target.value); this.updateNoiseNotch(); });
        document.getElementById('notchDepth').addEventListener('change', (e) => { this.noiseState.notchDepth = parseFloat(e.target.value); this.updateNoiseNotch(); });
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
        document.getElementById('musicVolume').addEventListener('input', (e) => { this.musicState.volume = e.target.value / 100; document.getElementById('musicVolumeDisplay').textContent = `${e.target.value}%`; if (audioEl) audioEl.volume = this.musicState.volume * this.masterVolume; });
        document.getElementById('musicNotchFreq').addEventListener('input', (e) => this.setMusicNotchFreq(parseInt(e.target.value)));
        document.getElementById('musicNotchFreqInput').addEventListener('change', (e) => this.setMusicNotchFreq(Math.max(100, Math.min(15000, parseInt(e.target.value)))));
        document.getElementById('musicNotchWidth').addEventListener('change', (e) => { this.musicState.notchWidth = parseFloat(e.target.value); this.updateMusicNotch(); });
        document.getElementById('musicNotchEnabled').addEventListener('change', (e) => { this.musicState.notchEnabled = e.target.checked; this.updateMusicNotch(); });
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
        });
        this.sessionManager.on('onTick', (data) => {
            document.getElementById('timerRemaining').textContent = SessionManager.formatTime(data.remaining);
            document.getElementById('timerProgressBar').style.width = `${data.progress * 100}%`;
        });
        this.sessionManager.on('onComplete', () => { this.resetTimerUI(); this.updateStats(); alert('🎉 Session complete! Great job!'); });
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
        document.getElementById('saveProfile').addEventListener('click', () => this.saveCurrentProfile());
        document.getElementById('loadProfile').addEventListener('change', (e) => this.loadSelectedProfile(e.target.value));
        document.getElementById('deleteProfile').addEventListener('click', () => this.deleteSelectedProfile());
        this.updateProfileDropdown();
    }

    saveCurrentProfile() {
        const name = document.getElementById('profileName').value.trim();
        if (!name) { alert('Please enter a profile name'); return; }
        this.profiles[name] = { masterVolume: this.masterVolume, matchedFrequencies: { ...this.matchedFrequencies }, toneState: JSON.parse(JSON.stringify(this.toneState)), noiseState: { type: this.noiseState.type, volume: this.noiseState.volume, notchFreq: this.noiseState.notchFreq, notchWidth: this.noiseState.notchWidth, notchDepth: this.noiseState.notchDepth }, musicState: { volume: this.musicState.volume, notchFreq: this.musicState.notchFreq, notchWidth: this.musicState.notchWidth } };
        this.saveProfiles();
        this.updateProfileDropdown();
        document.getElementById('profileName').value = '';
        alert(`Profile "${name}" saved!`);
    }

    loadSelectedProfile(name) {
        if (!name || !this.profiles[name]) return;
        const p = this.profiles[name];
        this.masterVolume = p.masterVolume;
        document.getElementById('masterVolume').value = this.masterVolume * 100;
        this.els.masterVolumeDisplay.textContent = `${Math.round(this.masterVolume * 100)}%`;
        this.matchedFrequencies = { ...p.matchedFrequencies };
        if (this.matchedFrequencies.left) this.els.leftMatchedFreq.textContent = `${this.matchedFrequencies.left} Hz`;
        if (this.matchedFrequencies.right) this.els.rightMatchedFreq.textContent = `${this.matchedFrequencies.right} Hz`;
        document.getElementById('loadProfile').value = '';
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
        this.visualizers.left = new WaveformVisualizer('leftToneWave');
        this.visualizers.right = new WaveformVisualizer('rightToneWave');
        this.visualizers.noiseSpectrum = new SpectrumVisualizer('noiseSpectrum');
        this.visualizers.musicSpectrum = new SpectrumVisualizer('musicSpectrum');
        ['left', 'right'].forEach(ear => { this.visualizers[ear]?.setParams(this.toneState[ear].frequency, this.toneState[ear].waveform, 1, false); this.visualizers[ear]?.start(); });
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
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => { window.tinnitusApp = new TinnitusReliefApp(); });
window.addEventListener('beforeunload', () => { if (window.tinnitusApp) { window.tinnitusApp.stopTone(); window.tinnitusApp.stopNoise(); } });
