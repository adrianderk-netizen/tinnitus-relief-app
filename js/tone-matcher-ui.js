/**
 * Tone Matcher UI - Consolidated Interface Controller
 * Manages unified tone controls with ear selection
 */

class ToneMatcherUI {
    constructor(app) {
        this.app = app;
        this.selectedEar = 'both'; // 'both', 'left', 'right'
        this.isPlaying = false;
        
        // Separate settings for each ear
        this.leftSettings = {
            frequency: 4000,
            fineTune: 0,
            volume: 0.5,
            waveform: 'sine',
            phaseInverted: false,
            enabled: true
        };
        
        this.rightSettings = {
            frequency: 4000,
            fineTune: 0,
            volume: 0.5,
            waveform: 'sine',
            phaseInverted: false,
            enabled: true
        };
        
        console.log('[ToneMatcherUI] Initializing...');
        this.init();
    }
    
    init() {
        this.bindSectionToggles();
        this.bindEarSelector();
        this.bindControls();
        this.bindAdvancedToggle();
        this.moveFrequencySweep();
        this.createUnifiedVisualizer();
        console.log('[ToneMatcherUI] Initialized successfully');
    }
    
    bindSectionToggles() {
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.tuning-section');
                const content = section.querySelector('.section-content');
                
                if (section.classList.contains('expanded')) {
                    // Collapse
                    content.style.display = 'none';
                    section.classList.remove('expanded');
                } else {
                    // Expand
                    content.style.display = 'block';
                    section.classList.add('expanded');
                }
            });
        });
    }
    
    bindEarSelector() {
        document.querySelectorAll('.btn-ear').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ear = e.currentTarget.dataset.ear;
                this.selectEar(ear);
            });
        });
    }
    
    selectEar(ear) {
        this.selectedEar = ear;
        
        // Update button states
        document.querySelectorAll('.btn-ear').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.ear === ear);
        });
        
        // Update indicator
        const earText = {
            'both': 'Both Ears',
            'left': 'Left Ear Only',
            'right': 'Right Ear Only'
        };
        const indicator = document.getElementById('earStatusText');
        if (indicator) {
            indicator.textContent = `Adjusting: ${earText[ear]}`;
        }
        
        // Load appropriate settings into UI
        this.loadSettingsToUI();
    }
    
    loadSettingsToUI() {
        let settings;
        
        if (this.selectedEar === 'both') {
            // Show left ear settings (or averaged)
            settings = this.leftSettings;
        } else if (this.selectedEar === 'left') {
            settings = this.leftSettings;
        } else {
            settings = this.rightSettings;
        }
        
        // Update UI controls
        const freqSlider = document.getElementById('unifiedToneFreq');
        const freqInput = document.getElementById('unifiedToneFreqInput');
        const volumeSlider = document.getElementById('unifiedToneVolume');
        const volumeDisplay = document.getElementById('unifiedToneVolumeDisplay');
        const waveformSelect = document.getElementById('unifiedToneWaveform');
        const fineTuneSlider = document.getElementById('unifiedToneFineTune');
        const fineTuneDisplay = document.getElementById('unifiedToneFineTuneDisplay');
        
        if (freqSlider) freqSlider.value = settings.frequency;
        if (freqInput) freqInput.value = settings.frequency;
        if (volumeSlider) volumeSlider.value = settings.volume * 100;
        if (volumeDisplay) volumeDisplay.textContent = `${Math.round(settings.volume * 100)}%`;
        if (waveformSelect) waveformSelect.value = settings.waveform;
        if (fineTuneSlider) fineTuneSlider.value = settings.fineTune;
        if (fineTuneDisplay) fineTuneDisplay.textContent = `${settings.fineTune} Hz`;
        
        // Update visualizer if it exists
        if (this.app.visualizers && this.app.visualizers.unified) {
            this.app.visualizers.unified.setParams(
                settings.frequency, 
                settings.waveform, 
                1, 
                settings.phaseInverted
            );
        }
    }
    
    bindControls() {
        // Frequency slider
        const freqSlider = document.getElementById('unifiedToneFreq');
        if (freqSlider) {
            freqSlider.addEventListener('input', (e) => {
                this.updateSetting('frequency', parseInt(e.target.value));
            });
        }
        
        // Frequency input
        const freqInput = document.getElementById('unifiedToneFreqInput');
        if (freqInput) {
            freqInput.addEventListener('change', (e) => {
                const value = Math.max(100, Math.min(15000, parseInt(e.target.value)));
                this.updateSetting('frequency', value);
            });
        }
        
        // Volume
        const volumeSlider = document.getElementById('unifiedToneVolume');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.updateSetting('volume', e.target.value / 100);
                const volumeDisplay = document.getElementById('unifiedToneVolumeDisplay');
                if (volumeDisplay) {
                    volumeDisplay.textContent = `${e.target.value}%`;
                }
            });
        }
        
        // Waveform
        const waveformSelect = document.getElementById('unifiedToneWaveform');
        if (waveformSelect) {
            waveformSelect.addEventListener('change', (e) => {
                this.updateSetting('waveform', e.target.value);
            });
        }
        
        // Fine Tune
        const fineTuneSlider = document.getElementById('unifiedToneFineTune');
        if (fineTuneSlider) {
            fineTuneSlider.addEventListener('input', (e) => {
                this.updateSetting('fineTune', parseFloat(e.target.value));
                const fineTuneDisplay = document.getElementById('unifiedToneFineTuneDisplay');
                if (fineTuneDisplay) {
                    fineTuneDisplay.textContent = `${e.target.value} Hz`;
                }
            });
        }
        
        // Start/Stop buttons
        const startBtn = document.getElementById('startToneUnified');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startTone());
        }
        
        const stopBtn = document.getElementById('stopToneUnified');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopTone());
        }
        
        // Mark button
        const markBtn = document.getElementById('unifiedToneMark');
        if (markBtn) {
            markBtn.addEventListener('click', () => this.markFrequency());
        }
        
        // Phase Inversion
        const invertBtn = document.getElementById('unifiedToneInvert');
        if (invertBtn) {
            invertBtn.addEventListener('click', () => this.togglePhaseInversion());
        }
        
        // Per-ear enable checkboxes in advanced
        const leftEnable = document.getElementById('leftToneEnabled');
        if (leftEnable) {
            leftEnable.addEventListener('change', (e) => {
                this.leftSettings.enabled = e.target.checked;
                if (this.isPlaying) this.applyAudioSettings();
            });
        }
        
        const rightEnable = document.getElementById('rightToneEnabled');
        if (rightEnable) {
            rightEnable.addEventListener('change', (e) => {
                this.rightSettings.enabled = e.target.checked;
                if (this.isPlaying) this.applyAudioSettings();
            });
        }
    }
    
    updateSetting(setting, value) {
        if (this.selectedEar === 'both') {
            // Update both ears
            this.leftSettings[setting] = value;
            this.rightSettings[setting] = value;
        } else if (this.selectedEar === 'left') {
            this.leftSettings[setting] = value;
        } else {
            this.rightSettings[setting] = value;
        }
        
        // Update UI display for frequency
        if (setting === 'frequency') {
            const freqSlider = document.getElementById('unifiedToneFreq');
            const freqInput = document.getElementById('unifiedToneFreqInput');
            if (freqSlider) freqSlider.value = value;
            if (freqInput) freqInput.value = value;
        }
        
        // Apply to audio engine if playing
        if (this.isPlaying) {
            this.applyAudioSettings();
        }
        
        // Update visualizer
        if (setting === 'frequency' || setting === 'waveform') {
            const settings = this.selectedEar === 'right' ? this.rightSettings : this.leftSettings;
            if (this.app.visualizers && this.app.visualizers.unified) {
                this.app.visualizers.unified.setParams(
                    settings.frequency, 
                    settings.waveform, 
                    1, 
                    settings.phaseInverted
                );
            }
        }
        
        // Auto-save
        if (this.app.autoSaveState) {
            this.app.autoSaveState();
        }
    }
    
    startTone() {
        console.log('[ToneMatcherUI] Starting tone...');
        
        // Update app's toneState with our settings
        this.app.toneState.left = { 
            ...this.leftSettings, 
            osc: null, 
            gain: null, 
            panner: null, 
            phaseGain: null 
        };
        
        this.app.toneState.right = { 
            ...this.rightSettings, 
            osc: null, 
            gain: null, 
            panner: null, 
            phaseGain: null 
        };
        
        // Call app's startTone method
        this.app.startTone();
        this.isPlaying = true;
        
        // Update button states
        const startBtn = document.getElementById('startToneUnified');
        const stopBtn = document.getElementById('stopToneUnified');
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
    }
    
    stopTone() {
        console.log('[ToneMatcherUI] Stopping tone...');
        this.app.stopTone();
        this.isPlaying = false;
        
        // Update button states
        const startBtn = document.getElementById('startToneUnified');
        const stopBtn = document.getElementById('stopToneUnified');
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
    }
    
    applyAudioSettings() {
        // Update the existing audio nodes with new settings
        if (this.isPlaying) {
            this.stopTone();
            setTimeout(() => this.startTone(), 50);
        }
    }
    
    markFrequency() {
        console.log('[ToneMatcherUI] Marking frequency...');
        
        if (this.selectedEar === 'both') {
            // Mark both
            const freq = this.leftSettings.frequency + this.leftSettings.fineTune;
            this.app.matchedFrequencies.left = freq;
            this.app.matchedFrequencies.right = freq;
            
            const leftDisplay = document.getElementById('leftMatchedFreq');
            const rightDisplay = document.getElementById('rightMatchedFreq');
            if (leftDisplay) leftDisplay.textContent = `${freq.toFixed(1)} Hz`;
            if (rightDisplay) rightDisplay.textContent = `${freq.toFixed(1)} Hz`;
        } else if (this.selectedEar === 'left') {
            const freq = this.leftSettings.frequency + this.leftSettings.fineTune;
            this.app.matchedFrequencies.left = freq;
            const leftDisplay = document.getElementById('leftMatchedFreq');
            if (leftDisplay) leftDisplay.textContent = `${freq.toFixed(1)} Hz`;
        } else {
            const freq = this.rightSettings.frequency + this.rightSettings.fineTune;
            this.app.matchedFrequencies.right = freq;
            const rightDisplay = document.getElementById('rightMatchedFreq');
            if (rightDisplay) rightDisplay.textContent = `${freq.toFixed(1)} Hz`;
        }
        
        // Visual feedback
        const btn = document.getElementById('unifiedToneMark');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✅ Marked!';
            setTimeout(() => btn.textContent = originalText, 1500);
        }
        
        // Trigger wizard step completion if active
        if (this.app.wizard && this.app.wizard.isWizardMode) {
            this.app.wizard.completeCurrentStep('frequency-marked');
        }
        
        // Auto-save
        if (this.app.autoSaveState) {
            this.app.autoSaveState();
        }
    }
    
    togglePhaseInversion() {
        const settings = this.selectedEar === 'right' ? this.rightSettings : this.leftSettings;
        settings.phaseInverted = !settings.phaseInverted;
        
        if (this.selectedEar === 'both') {
            this.leftSettings.phaseInverted = settings.phaseInverted;
            this.rightSettings.phaseInverted = settings.phaseInverted;
        }
        
        // Update UI
        const statusEl = document.getElementById('unifiedTonePhaseStatus');
        const invertBtn = document.getElementById('unifiedToneInvert');
        if (statusEl) {
            if (settings.phaseInverted) {
                statusEl.innerHTML = 'Phase: <span class="inverted">INVERTED (180°)</span>';
                if (invertBtn) invertBtn.classList.add('active');
            } else {
                statusEl.innerHTML = 'Phase: <span class="normal">Normal</span>';
                if (invertBtn) invertBtn.classList.remove('active');
            }
        }
        
        // Apply if playing
        if (this.isPlaying) {
            this.applyAudioSettings();
        }
    }
    
    bindAdvancedToggle() {
        const toggleBtn = document.getElementById('toggleAdvanced');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const content = document.getElementById('advancedContent');
                if (content) {
                    if (content.style.display === 'none' || !content.style.display) {
                        content.style.display = 'block';
                        this.classList.add('expanded');
                    } else {
                        content.style.display = 'none';
                        this.classList.remove('expanded');
                    }
                }
            });
        }
    }
    
    moveFrequencySweep() {
        // Move frequency sweep UI to Auto Tuning section
        const sweepPanel = document.querySelector('.sweep-panel');
        const autoContainer = document.getElementById('frequencySweepContainer');
        
        if (sweepPanel && autoContainer) {
            autoContainer.appendChild(sweepPanel);
            console.log('[ToneMatcherUI] Moved frequency sweep to Auto Tuning section');
        } else {
            console.warn('[ToneMatcherUI] Could not find sweep panel or container');
        }
    }
    
    createUnifiedVisualizer() {
        // Create unified visualizer if it doesn't exist
        if (window.WaveformVisualizer) {
            this.app.visualizers.unified = new WaveformVisualizer('unifiedToneWave');
            this.app.visualizers.unified.setParams(4000, 'sine', 1, false);
            this.app.visualizers.unified.start();
            console.log('[ToneMatcherUI] Created unified visualizer');
        }
    }
}

// Export for use in app.js
window.ToneMatcherUI = ToneMatcherUI;
