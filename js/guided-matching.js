/**
 * Guided Frequency Matching Wizard
 * Simplified step-by-step flow: Select Ear → Sweep → Confirm → Save
 * Launched from the dashboard "Find My Frequency" quick action
 */

class GuidedMatchingWizard {
    constructor(app) {
        this.app = app;
        this.audioEngine = app.audioEngine;

        this.currentStep = 0;
        this.selectedEar = 'both';
        this.isActive = false;

        // Sweep state
        this.oscillator = null;
        this.gainNode = null;
        this.pannerNode = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentFreq = 1000;
        this.sweepSpeed = 100;
        this.startFreq = 1000;
        this.endFreq = 12000;
        this.volume = 0.3;
        this.matchedFrequencies = [];
        this.animationId = null;
        this.lastUpdateTime = 0;

        this.onComplete = null;
    }

    launch() {
        this.isActive = true;
        this.currentStep = 0;
        this.matchedFrequencies = [];
        this.stopSweep();
        this.createModal();
        this.showStep(0);
    }

    close() {
        this.stopSweep();
        this.isActive = false;
        const modal = document.getElementById('guidedMatchingModal');
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        }
    }

    createModal() {
        // Remove existing if any
        document.getElementById('guidedMatchingModal')?.remove();

        const modal = document.createElement('div');
        modal.className = 'guided-modal';
        modal.id = 'guidedMatchingModal';
        modal.innerHTML = `
            <div class="guided-modal-content">
                <button class="guided-modal-close" id="guidedClose">&times;</button>
                <div class="guided-progress-bar">
                    <div class="guided-progress-dots">
                        <span class="gp-dot active" data-step="0">1</span>
                        <span class="gp-line"></span>
                        <span class="gp-dot" data-step="1">2</span>
                        <span class="gp-line"></span>
                        <span class="gp-dot" data-step="2">3</span>
                        <span class="gp-line"></span>
                        <span class="gp-dot" data-step="3">4</span>
                    </div>
                </div>
                <div class="guided-body" id="guidedBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('open'));

        document.getElementById('guidedClose').addEventListener('click', () => this.close());
    }

    showStep(step) {
        this.currentStep = step;
        const body = document.getElementById('guidedBody');
        if (!body) return;

        // Update dots
        document.querySelectorAll('.gp-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i <= step);
            dot.classList.toggle('done', i < step);
        });
        document.querySelectorAll('.gp-line').forEach((line, i) => {
            line.classList.toggle('active', i < step);
        });

        switch (step) {
            case 0: this.renderWelcome(body); break;
            case 1: this.renderEarSelect(body); break;
            case 2: this.renderSweep(body); break;
            case 3: this.renderConfirm(body); break;
        }
    }

    // -- Step 0: Welcome --
    renderWelcome(el) {
        el.innerHTML = `
            <div class="guided-step">
                <div class="gs-icon">🎧</div>
                <h2>Find Your Tinnitus Frequency</h2>
                <p class="gs-desc">We'll play a tone that slowly sweeps from low to high pitch. Tap the button when it matches your tinnitus.</p>
                <div class="gs-checklist">
                    <div class="gs-check"><span class="gs-check-icon">✓</span> Put on headphones</div>
                    <div class="gs-check"><span class="gs-check-icon">✓</span> Find a quiet place</div>
                    <div class="gs-check"><span class="gs-check-icon">✓</span> Set volume to a comfortable level</div>
                </div>
                <button class="gs-btn primary" id="gsNext">I'm Ready</button>
            </div>
        `;
        document.getElementById('gsNext').addEventListener('click', () => this.showStep(1));
    }

    // -- Step 1: Ear Selection --
    renderEarSelect(el) {
        el.innerHTML = `
            <div class="guided-step">
                <div class="gs-icon">👂</div>
                <h2>Which ear do you hear tinnitus in?</h2>
                <p class="gs-desc">This helps us target the correct side for therapy.</p>
                <div class="gs-ear-options">
                    <button class="gs-ear-btn ${this.selectedEar === 'left' ? 'selected' : ''}" data-ear="left">
                        <span class="gs-ear-label">Left</span>
                    </button>
                    <button class="gs-ear-btn ${this.selectedEar === 'both' ? 'selected' : ''}" data-ear="both">
                        <span class="gs-ear-label">Both</span>
                    </button>
                    <button class="gs-ear-btn ${this.selectedEar === 'right' ? 'selected' : ''}" data-ear="right">
                        <span class="gs-ear-label">Right</span>
                    </button>
                </div>
                <div class="gs-nav">
                    <button class="gs-btn secondary" id="gsBack">Back</button>
                    <button class="gs-btn primary" id="gsNext">Next</button>
                </div>
            </div>
        `;
        document.querySelectorAll('.gs-ear-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedEar = e.currentTarget.dataset.ear;
                document.querySelectorAll('.gs-ear-btn').forEach(b => b.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
            });
        });
        document.getElementById('gsBack').addEventListener('click', () => this.showStep(0));
        document.getElementById('gsNext').addEventListener('click', () => this.showStep(2));
    }

    // -- Step 2: Sweep --
    renderSweep(el) {
        el.innerHTML = `
            <div class="guided-step gs-sweep">
                <h2>Listen & Match</h2>
                <p class="gs-desc">Tap the button below when the tone matches your tinnitus. You can mark multiple times.</p>
                <div class="gs-freq-display">
                    <span class="gs-freq-val" id="gsFreqVal">${Math.round(this.currentFreq)} Hz</span>
                </div>
                <div class="gs-sweep-bar">
                    <div class="gs-sweep-fill" id="gsSweepFill"></div>
                </div>
                <div class="gs-sweep-labels">
                    <span>${this.startFreq} Hz</span>
                    <span>${this.endFreq} Hz</span>
                </div>
                <button class="gs-btn match-btn" id="gsMatchBtn" disabled>
                    🎯 That's My Tinnitus!
                </button>
                <div class="gs-match-info" id="gsMatchInfo" style="display:none;">
                    <span id="gsMatchCount">0</span> match(es) recorded
                </div>
                <div class="gs-sweep-actions">
                    <button class="gs-btn primary" id="gsStartSweep">▶ Start Sweep</button>
                    <button class="gs-btn secondary" id="gsPauseSweep" style="display:none;">⏸ Pause</button>
                </div>
                <div class="gs-nav">
                    <button class="gs-btn secondary" id="gsBack">Back</button>
                    <button class="gs-btn primary" id="gsNext" ${this.matchedFrequencies.length === 0 ? 'disabled' : ''}>Next</button>
                </div>
            </div>
        `;
        this.bindSweepEvents();
    }

    bindSweepEvents() {
        const startBtn = document.getElementById('gsStartSweep');
        const pauseBtn = document.getElementById('gsPauseSweep');
        const matchBtn = document.getElementById('gsMatchBtn');

        startBtn?.addEventListener('click', () => {
            this.startSweep();
            startBtn.style.display = 'none';
            pauseBtn.style.display = '';
        });

        pauseBtn?.addEventListener('click', () => {
            this.togglePause();
            pauseBtn.textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
        });

        matchBtn?.addEventListener('click', () => this.markFrequency());

        document.getElementById('gsBack')?.addEventListener('click', () => {
            this.stopSweep();
            this.showStep(1);
        });
        document.getElementById('gsNext')?.addEventListener('click', () => {
            this.stopSweep();
            this.showStep(3);
        });
    }

    // -- Step 3: Confirm --
    renderConfirm(el) {
        const avg = this.matchedFrequencies.length > 0
            ? Math.round(this.matchedFrequencies.reduce((a, b) => a + b, 0) / this.matchedFrequencies.length)
            : 0;
        const confidence = this.calculateConfidence();

        const confLabel = confidence < 30 ? 'Low' : confidence < 70 ? 'Medium' : 'High';
        const confColor = confidence < 30 ? '#ff4444' : confidence < 70 ? '#ffaa00' : '#00cc66';

        el.innerHTML = `
            <div class="guided-step">
                <div class="gs-icon">✅</div>
                <h2>Your Tinnitus Frequency</h2>
                <div class="gs-result-card">
                    <div class="gs-result-freq">${avg} Hz</div>
                    <div class="gs-result-ear">${this.selectedEar === 'both' ? 'Both Ears' : this.selectedEar === 'left' ? 'Left Ear' : 'Right Ear'}</div>
                    <div class="gs-confidence">
                        <div class="gs-conf-bar">
                            <div class="gs-conf-fill" style="width:${confidence}%; background:${confColor};"></div>
                        </div>
                        <span class="gs-conf-label">${confLabel} Confidence (${confidence}%)</span>
                    </div>
                    <div class="gs-result-matches">${this.matchedFrequencies.length} match(es): ${this.matchedFrequencies.map(f => f + ' Hz').join(', ')}</div>
                </div>
                <p class="gs-desc">This frequency will be used as the notch center for your therapy sessions.</p>
                <div class="gs-nav">
                    <button class="gs-btn secondary" id="gsBack">Try Again</button>
                    <button class="gs-btn primary" id="gsSave">Save & Start Therapy</button>
                </div>
            </div>
        `;

        document.getElementById('gsBack')?.addEventListener('click', () => {
            this.matchedFrequencies = [];
            this.currentFreq = this.startFreq;
            this.showStep(2);
        });

        document.getElementById('gsSave')?.addEventListener('click', () => {
            this.saveResult(avg);
        });
    }

    // -- Sweep Engine --
    startSweep() {
        if (this.isPlaying && !this.isPaused) return;

        this.audioEngine.init();

        if (this.isPaused) {
            this.isPaused = false;
        } else {
            this.currentFreq = this.startFreq;
            this.oscillator = this.audioEngine.createOscillator(this.currentFreq, 'sine');
            this.gainNode = this.audioEngine.createGain(this.volume);

            const panValue = this.selectedEar === 'left' ? -1 : this.selectedEar === 'right' ? 1 : 0;
            this.pannerNode = this.audioEngine.createPanner(panValue);

            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.pannerNode);
            this.audioEngine.connectToMaster(this.pannerNode);
            this.oscillator.start();
        }

        this.isPlaying = true;
        this.lastUpdateTime = performance.now();
        this.animateSweep();

        const matchBtn = document.getElementById('gsMatchBtn');
        if (matchBtn) matchBtn.disabled = false;
    }

    togglePause() {
        if (!this.isPlaying) return;
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastUpdateTime = performance.now();
            this.animateSweep();
        }
    }

    stopSweep() {
        this.isPlaying = false;
        this.isPaused = false;

        if (this.oscillator) {
            try { this.oscillator.stop(); } catch {}
            try { this.oscillator.disconnect(); } catch {}
            this.oscillator = null;
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.gainNode = null;
        this.pannerNode = null;
    }

    animateSweep() {
        if (!this.isPlaying || this.isPaused) return;

        const now = performance.now();
        const dt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        this.currentFreq += this.sweepSpeed * dt;

        if (this.currentFreq >= this.endFreq) {
            this.currentFreq = this.endFreq;
            this.onSweepComplete();
            return;
        }

        if (this.oscillator) {
            this.oscillator.frequency.setTargetAtTime(
                this.currentFreq,
                this.audioEngine.currentTime,
                0.01
            );
        }

        this.updateSweepDisplay();
        this.animationId = requestAnimationFrame(() => this.animateSweep());
    }

    updateSweepDisplay() {
        const freqVal = document.getElementById('gsFreqVal');
        const fill = document.getElementById('gsSweepFill');

        if (freqVal) freqVal.textContent = `${Math.round(this.currentFreq)} Hz`;

        const pct = ((this.currentFreq - this.startFreq) / (this.endFreq - this.startFreq)) * 100;
        if (fill) fill.style.width = `${pct}%`;
    }

    markFrequency() {
        if (!this.isPlaying) return;
        const freq = Math.round(this.currentFreq);
        this.matchedFrequencies.push(freq);

        if (navigator.vibrate) navigator.vibrate(50);

        // Visual pulse
        const btn = document.getElementById('gsMatchBtn');
        if (btn) {
            btn.classList.add('pulse');
            setTimeout(() => btn.classList.remove('pulse'), 400);
        }

        // Update count
        const info = document.getElementById('gsMatchInfo');
        const count = document.getElementById('gsMatchCount');
        if (info) info.style.display = '';
        if (count) count.textContent = this.matchedFrequencies.length;

        // Enable next
        const nextBtn = document.getElementById('gsNext');
        if (nextBtn) nextBtn.disabled = false;
    }

    onSweepComplete() {
        this.stopSweep();
        if (this.matchedFrequencies.length > 0) {
            this.showStep(3);
        } else {
            // Reset and let user try again
            this.currentFreq = this.startFreq;
            this.renderSweep(document.getElementById('guidedBody'));
        }
    }

    calculateConfidence() {
        const freqs = this.matchedFrequencies;
        if (freqs.length === 0) return 0;
        if (freqs.length === 1) return 30;

        const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length;
        const variance = freqs.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / freqs.length;
        const stdDev = Math.sqrt(variance);

        return Math.round(Math.max(0, Math.min(100, 100 - (stdDev / 10))));
    }

    saveResult(freq) {
        // Save to app's matched frequencies
        const ear = this.selectedEar;
        if (ear === 'left' || ear === 'both') {
            this.app.matchedFrequencies.left = freq;
        }
        if (ear === 'right' || ear === 'both') {
            this.app.matchedFrequencies.right = freq;
        }

        // Update UI elements
        if (this.app.els?.leftMatchedFreq && (ear === 'left' || ear === 'both')) {
            this.app.els.leftMatchedFreq.textContent = `${freq} Hz`;
        }
        if (this.app.els?.rightMatchedFreq && (ear === 'right' || ear === 'both')) {
            this.app.els.rightMatchedFreq.textContent = `${freq} Hz`;
        }

        // Update notch filter frequency
        this.app.noiseState.notchFreq = freq;
        this.app.musicState.notchFreq = freq;

        this.app.autoSaveState();
        this.app.dashboardManager?.updateMatchedFrequency();

        // Notify wizard if active
        if (this.app.wizardManager?.isWizardMode) {
            this.app.wizardManager.completeCurrentStep('frequency-marked');
        }

        if (this.onComplete) this.onComplete(freq, ear);

        this.close();

        // Switch to therapy mode
        this.app.switchMode('notched-noise');
    }
}
export { GuidedMatchingWizard };
