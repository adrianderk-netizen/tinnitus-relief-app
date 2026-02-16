/**
 * Frequency Sweep Manager - Automated frequency finding
 * Slowly sweeps through frequencies for easier tinnitus matching
 */

class FrequencySweepManager {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.isRunning = false;
        this.isPaused = false;
        
        // Sweep parameters
        this.startFreq = 1000;
        this.endFreq = 12000;
        this.currentFreq = this.startFreq;
        this.sweepSpeed = 100; // Hz per second
        this.volume = 0.3;
        
        // Audio nodes
        this.oscillator = null;
        this.gainNode = null;
        this.pannerNode = null;
        
        // Confidence tracking
        this.confidenceLevel = 0;
        this.matchedFrequencies = [];
        
        // Animation
        this.animationId = null;
        this.lastUpdateTime = 0;
        
        this.callbacks = {
            onFrequencyUpdate: null,
            onSweepComplete: null,
            onMatch: null
        };
    }

    init() {
        this.showSweepUI();
        this.bindEvents();
    }

    showSweepUI() {
        // Check if sweep UI already exists
        if (document.querySelector('.sweep-panel')) return;

        const sweepPanel = document.createElement('div');
        sweepPanel.className = 'sweep-panel';
        sweepPanel.innerHTML = `
            <div class="sweep-header">
                <h3>🎯 Guided Frequency Sweep</h3>
                <p>Let the app find your tinnitus frequency automatically</p>
            </div>
            
            <div class="sweep-controls">
                <div class="sweep-range">
                    <label>Sweep Range</label>
                    <div class="range-inputs">
                        <div class="range-input-group">
                            <input type="number" id="sweepStartFreq" value="1000" min="100" max="15000">
                            <span>Hz</span>
                        </div>
                        <span class="range-separator">to</span>
                        <div class="range-input-group">
                            <input type="number" id="sweepEndFreq" value="12000" min="100" max="15000">
                            <span>Hz</span>
                        </div>
                    </div>
                </div>
                
                <div class="sweep-speed">
                    <label>Sweep Speed</label>
                    <select id="sweepSpeed">
                        <option value="50">Slow (50 Hz/sec)</option>
                        <option value="100" selected>Medium (100 Hz/sec)</option>
                        <option value="200">Fast (200 Hz/sec)</option>
                    </select>
                </div>
                
                <div class="sweep-ear">
                    <label>Listen With</label>
                    <select id="sweepEar">
                        <option value="both">Both Ears</option>
                        <option value="left">Left Ear Only</option>
                        <option value="right">Right Ear Only</option>
                    </select>
                </div>
            </div>
            
            <div class="sweep-visualizer">
                <div class="sweep-frequency-display">
                    <span class="freq-label">Current Frequency</span>
                    <span class="freq-value" id="sweepCurrentFreq">1000 Hz</span>
                </div>
                <div class="sweep-progress-bar">
                    <div class="sweep-progress-fill" id="sweepProgressFill"></div>
                    <div class="sweep-marker" id="sweepMarker"></div>
                </div>
                <div class="sweep-range-labels">
                    <span id="sweepStartLabel">1000 Hz</span>
                    <span id="sweepEndLabel">12000 Hz</span>
                </div>
            </div>
            
            <div class="sweep-match-button">
                <button class="btn btn-match-large" id="matchThisFreq" disabled>
                    <span class="match-icon">🎯</span>
                    <span class="match-text">That's My Tinnitus!</span>
                </button>
                <p class="match-instruction">Press when you hear a tone that matches your tinnitus</p>
            </div>
            
            <div class="sweep-confidence">
                <label>Match Confidence</label>
                <div class="confidence-meter">
                    <div class="confidence-fill" id="confidenceFill"></div>
                </div>
                <span class="confidence-label" id="confidenceLabel">No matches yet</span>
            </div>
            
            <div class="sweep-actions">
                <button class="btn btn-start" id="startSweep">▶️ Start Sweep</button>
                <button class="btn" id="pauseSweep" disabled>⏸️ Pause</button>
                <button class="btn btn-stop" id="stopSweep" disabled>⏹️ Stop</button>
                <button class="btn btn-small" id="resetSweep">🔄 Reset</button>
            </div>
            
            <div class="sweep-matches" id="sweepMatches" style="display: none;">
                <h4>Matched Frequencies</h4>
                <div class="matches-list" id="matchesList"></div>
            </div>
            
            <div class="sweep-tips">
                <strong>💡 Tips:</strong>
                <ul>
                    <li>Listen carefully as the tone slowly increases</li>
                    <li>Press "That's My Tinnitus!" when you hear a match</li>
                    <li>You can mark multiple frequencies if unsure</li>
                    <li>The app will calculate confidence based on consistency</li>
                </ul>
            </div>
        `;

        // Insert after tone matcher header
        const toneMatcherPane = document.getElementById('tone-matcher');
        const modeHeader = toneMatcherPane.querySelector('.mode-header');
        modeHeader.after(sweepPanel);
    }

    bindEvents() {
        document.getElementById('sweepStartFreq')?.addEventListener('change', (e) => {
            this.startFreq = Math.max(100, Math.min(15000, parseInt(e.target.value)));
            this.updateRangeLabels();
        });

        document.getElementById('sweepEndFreq')?.addEventListener('change', (e) => {
            this.endFreq = Math.max(100, Math.min(15000, parseInt(e.target.value)));
            this.updateRangeLabels();
        });

        document.getElementById('sweepSpeed')?.addEventListener('change', (e) => {
            this.sweepSpeed = parseInt(e.target.value);
        });

        document.getElementById('startSweep')?.addEventListener('click', () => this.start());
        document.getElementById('pauseSweep')?.addEventListener('click', () => this.togglePause());
        document.getElementById('stopSweep')?.addEventListener('click', () => this.stop());
        document.getElementById('resetSweep')?.addEventListener('click', () => this.reset());
        document.getElementById('matchThisFreq')?.addEventListener('click', () => this.markCurrentFrequency());
    }

    start() {
        if (this.isRunning && !this.isPaused) return;

        this.audioEngine.init();

        if (this.isPaused) {
            // Resume from pause
            this.isPaused = false;
        } else {
            // Start fresh
            this.currentFreq = this.startFreq;
            this.oscillator = this.audioEngine.createOscillator(this.currentFreq, 'sine');
            this.gainNode = this.audioEngine.createGain(this.volume);
            
            const ear = document.getElementById('sweepEar')?.value || 'both';
            const panValue = ear === 'left' ? -1 : ear === 'right' ? 1 : 0;
            this.pannerNode = this.audioEngine.createPanner(panValue);
            
            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.pannerNode);
            this.audioEngine.connectToMaster(this.pannerNode);
            this.oscillator.start();
        }

        this.isRunning = true;
        this.lastUpdateTime = performance.now();
        this.animate();
        this.updateButtons();

        // Enable match button
        document.getElementById('matchThisFreq').disabled = false;
    }

    togglePause() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseSweep');
        if (btn) {
            btn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
        }

        if (!this.isPaused) {
            this.lastUpdateTime = performance.now();
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;

        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
        }

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.gainNode = null;
        this.pannerNode = null;

        this.updateButtons();
        document.getElementById('matchThisFreq').disabled = true;
    }

    reset() {
        this.stop();
        this.currentFreq = this.startFreq;
        this.matchedFrequencies = [];
        this.confidenceLevel = 0;
        this.updateDisplay();
        this.updateConfidence();
        this.updateMatchesList();
    }

    animate() {
        if (!this.isRunning || this.isPaused) return;

        const now = performance.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000; // seconds
        this.lastUpdateTime = now;

        // Increment frequency
        this.currentFreq += this.sweepSpeed * deltaTime;

        // Check if sweep is complete
        if (this.currentFreq >= this.endFreq) {
            this.currentFreq = this.endFreq;
            this.onSweepComplete();
            return;
        }

        // Update oscillator frequency
        if (this.oscillator) {
            this.oscillator.frequency.setTargetAtTime(
                this.currentFreq,
                this.audioEngine.currentTime,
                0.01
            );
        }

        this.updateDisplay();

        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateDisplay() {
        const freqDisplay = document.getElementById('sweepCurrentFreq');
        const progressFill = document.getElementById('sweepProgressFill');
        const marker = document.getElementById('sweepMarker');

        if (freqDisplay) {
            freqDisplay.textContent = `${Math.round(this.currentFreq)} Hz`;
        }

        const progress = ((this.currentFreq - this.startFreq) / (this.endFreq - this.startFreq)) * 100;
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (marker) {
            marker.style.left = `${progress}%`;
        }

        if (this.callbacks.onFrequencyUpdate) {
            this.callbacks.onFrequencyUpdate(this.currentFreq);
        }
    }

    updateButtons() {
        const startBtn = document.getElementById('startSweep');
        const pauseBtn = document.getElementById('pauseSweep');
        const stopBtn = document.getElementById('stopSweep');

        if (startBtn) startBtn.disabled = this.isRunning;
        if (pauseBtn) pauseBtn.disabled = !this.isRunning;
        if (stopBtn) stopBtn.disabled = !this.isRunning;
    }

    updateRangeLabels() {
        const startLabel = document.getElementById('sweepStartLabel');
        const endLabel = document.getElementById('sweepEndLabel');

        if (startLabel) startLabel.textContent = `${this.startFreq} Hz`;
        if (endLabel) endLabel.textContent = `${this.endFreq} Hz`;
    }

    markCurrentFrequency() {
        if (!this.isRunning) return;

        const matchedFreq = Math.round(this.currentFreq);
        this.matchedFrequencies.push(matchedFreq);

        // Provide haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Visual feedback
        const btn = document.getElementById('matchThisFreq');
        if (btn) {
            btn.classList.add('matched');
            setTimeout(() => btn.classList.remove('matched'), 500);
        }

        // Calculate confidence
        this.calculateConfidence();
        this.updateMatchesList();

        // Get which ear(s) the user was listening with
        const earSelection = document.getElementById('sweepEar')?.value || 'both';

        if (this.callbacks.onMatch) {
            this.callbacks.onMatch(matchedFreq, this.confidenceLevel, earSelection);
        }
    }

    calculateConfidence() {
        if (this.matchedFrequencies.length === 0) {
            this.confidenceLevel = 0;
            this.updateConfidence();
            return;
        }

        if (this.matchedFrequencies.length === 1) {
            this.confidenceLevel = 30;
            this.updateConfidence();
            return;
        }

        // Calculate standard deviation of matches
        const mean = this.matchedFrequencies.reduce((a, b) => a + b, 0) / this.matchedFrequencies.length;
        const squareDiffs = this.matchedFrequencies.map(freq => Math.pow(freq - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.sqrt(avgSquareDiff);

        // Confidence inversely proportional to standard deviation
        // Lower stdDev = higher confidence
        let confidence = 100 - (stdDev / 10);
        confidence = Math.max(0, Math.min(100, confidence));

        this.confidenceLevel = Math.round(confidence);
        this.updateConfidence();
    }

    updateConfidence() {
        const confidenceFill = document.getElementById('confidenceFill');
        const confidenceLabel = document.getElementById('confidenceLabel');

        if (confidenceFill) {
            confidenceFill.style.width = `${this.confidenceLevel}%`;
            
            // Color coding
            if (this.confidenceLevel < 30) {
                confidenceFill.style.background = '#ff4444';
            } else if (this.confidenceLevel < 70) {
                confidenceFill.style.background = '#ffaa00';
            } else {
                confidenceFill.style.background = '#00cc66';
            }
        }

        if (confidenceLabel) {
            if (this.matchedFrequencies.length === 0) {
                confidenceLabel.textContent = 'No matches yet';
            } else {
                const level = this.confidenceLevel < 30 ? 'Low' : 
                              this.confidenceLevel < 70 ? 'Medium' : 'High';
                confidenceLabel.textContent = `${level} Confidence (${this.confidenceLevel}%)`;
            }
        }
    }

    updateMatchesList() {
        const matchesContainer = document.getElementById('sweepMatches');
        const matchesList = document.getElementById('matchesList');

        if (!matchesList || !matchesContainer) return;

        if (this.matchedFrequencies.length === 0) {
            matchesContainer.style.display = 'none';
            return;
        }

        matchesContainer.style.display = 'block';
        
        // Calculate average
        const avg = Math.round(
            this.matchedFrequencies.reduce((a, b) => a + b, 0) / this.matchedFrequencies.length
        );

        matchesList.innerHTML = `
            <div class="match-summary">
                <div class="match-avg">
                    <span class="match-label">Suggested Frequency:</span>
                    <span class="match-value">${avg} Hz</span>
                </div>
                <button class="btn btn-small btn-use-freq" data-freq="${avg}">
                    Use This Frequency
                </button>
            </div>
            <div class="match-details">
                <span class="match-count">${this.matchedFrequencies.length} match(es):</span>
                ${this.matchedFrequencies.map(f => `<span class="match-chip">${f} Hz</span>`).join('')}
            </div>
        `;

        // Bind use frequency button
        matchesList.querySelector('.btn-use-freq')?.addEventListener('click', (e) => {
            const freq = parseInt(e.target.dataset.freq);
            this.useFrequency(freq);
        });
    }

    useFrequency(freq) {
        // Get which ear(s) the user was listening with
        const earSelection = document.getElementById('sweepEar')?.value || 'both';
        
        // This will be called by the app to set the matched frequency
        if (this.callbacks.onMatch) {
            this.callbacks.onMatch(freq, this.confidenceLevel, earSelection);
        }
    }

    onSweepComplete() {
        this.stop();
        
        if (this.matchedFrequencies.length === 0) {
            alert('Sweep complete! No frequencies were marked. Try again with a different range or speed.');
        } else {
            const avg = Math.round(
                this.matchedFrequencies.reduce((a, b) => a + b, 0) / this.matchedFrequencies.length
            );
            alert(`Sweep complete! Suggested frequency: ${avg} Hz (Confidence: ${this.confidenceLevel}%)`);
        }

        if (this.callbacks.onSweepComplete) {
            this.callbacks.onSweepComplete(this.matchedFrequencies, this.confidenceLevel);
        }
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }
}
window.FrequencySweepManager = FrequencySweepManager;
export { FrequencySweepManager };
