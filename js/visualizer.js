class SpectrumVisualizer {
    constructor(canvasId, analyzerNode = null) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.analyzer = analyzerNode;
        this.animationId = null;
        this.notchFrequency = null;
        this.notchWidth = 1;
        this.initCanvas();
    }
    initCanvas() { 
        if (!this.canvas) {
            console.warn('[SpectrumVisualizer] Canvas element not found');
            return;
        }
        const r = this.canvas.getBoundingClientRect(); 
        // If canvas has no dimensions yet, use defaults
        if (r.width === 0 || r.height === 0) {
            this.canvas.width = 800;
            this.canvas.height = 200;
            console.warn('[SpectrumVisualizer] Canvas has no dimensions, using defaults:', this.canvas.id);
        } else {
            this.canvas.width = r.width * 2;
            this.canvas.height = r.height * 2;
        }
        console.log('[SpectrumVisualizer] Canvas initialized:', this.canvas.id, `${this.canvas.width}x${this.canvas.height}`);
    }
    setAnalyzer(a) { this.analyzer = a; if (this.analyzer) this.analyzer.smoothingTimeConstant = 0.8; }
    setNotch(f, w = 1) { this.notchFrequency = f; this.notchWidth = w; }
    clearNotch() { this.notchFrequency = null; }
    freqToX(f) { const minLog = Math.log10(20), maxLog = Math.log10(20000); return ((Math.log10(f) - minLog) / (maxLog - minLog)) * this.canvas.width; }
    draw() {
        if (!this.ctx || !this.canvas) return;
        const w = this.canvas.width, h = this.canvas.height;
        this.ctx.fillStyle = 'rgba(0,0,0,0.4)'; this.ctx.fillRect(0, 0, w, h);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)'; this.ctx.lineWidth = 1;
        [100,500,1000,2000,5000,10000].forEach(f => { const x = this.freqToX(f); this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, h); this.ctx.stroke(); });
        
        // Draw notch indicator if set
        if (this.notchFrequency) {
            const lower = this.notchFrequency / Math.pow(2, this.notchWidth / 2);
            const upper = this.notchFrequency * Math.pow(2, this.notchWidth / 2);
            const x1 = this.freqToX(lower), x2 = this.freqToX(upper), cx = this.freqToX(this.notchFrequency);
            this.ctx.fillStyle = 'rgba(255,82,82,0.2)'; this.ctx.fillRect(x1, 0, x2 - x1, h);
            this.ctx.strokeStyle = '#ff5252'; this.ctx.lineWidth = 2; this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath(); this.ctx.moveTo(cx, 0); this.ctx.lineTo(cx, h); this.ctx.stroke(); this.ctx.setLineDash([]);
            this.ctx.fillStyle = '#ff5252'; this.ctx.font = 'bold 24px sans-serif'; this.ctx.textAlign = 'center';
            this.ctx.fillText(`${Math.round(this.notchFrequency)} Hz`, cx, 30);
        }
        
        // Draw spectrum data if analyzer available
        if (this.analyzer) {
            const bufLen = this.analyzer.frequencyBinCount, data = new Uint8Array(bufLen);
            this.analyzer.getByteFrequencyData(data);
            
            // Check if we're getting any data
            const hasData = data.some(val => val > 0);
            
            if (hasData) {
                const sr = this.analyzer.context.sampleRate;
                const gradient = this.ctx.createLinearGradient(0, h, 0, 0);
                gradient.addColorStop(0, '#00d9ff'); gradient.addColorStop(0.5, '#00ff88'); gradient.addColorStop(1, '#ff6b6b');
                for (let i = 0; i < bufLen; i++) {
                    const f = (i * sr) / (this.analyzer.fftSize);
                    if (f < 20 || f > 20000) continue;
                    const x = this.freqToX(f), barH = (data[i] / 255) * h * 0.9;
                    let inNotch = false;
                    if (this.notchFrequency) {
                        const lower = this.notchFrequency / Math.pow(2, this.notchWidth / 2);
                        const upper = this.notchFrequency * Math.pow(2, this.notchWidth / 2);
                        inNotch = f >= lower && f <= upper;
                    }
                    this.ctx.fillStyle = inNotch ? 'rgba(255,82,82,0.5)' : gradient;
                    this.ctx.fillRect(x - 2, h - barH, 4, barH);
                }
            } else {
                // No data yet - show "listening" message
                this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
                this.ctx.font = 'bold 32px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('🎧 Listening for audio...', w / 2, h / 2);
            }
        } else {
            // No analyzer - show instruction
            this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
            this.ctx.font = 'bold 32px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('▶️ Start audio to see spectrum', w / 2, h / 2);
        }
    }
    start() { if (this.animationId) return; const animate = () => { this.draw(); this.animationId = requestAnimationFrame(animate); }; animate(); }
    stop() { if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; } }
}
class WaveformVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.animationId = null; this.time = 0;
        this.waveParams = { frequency: 1000, waveform: 'sine', amplitude: 1, inverted: false };
        this.initCanvas();
    }
    initCanvas() { 
        if (!this.canvas) {
            console.warn('[WaveformVisualizer] Canvas element not found');
            return;
        }
        const r = this.canvas.getBoundingClientRect(); 
        // If canvas has no dimensions yet, use defaults
        if (r.width === 0 || r.height === 0) {
            this.canvas.width = 600;
            this.canvas.height = 120;
            console.warn('[WaveformVisualizer] Canvas has no dimensions, using defaults:', this.canvas.id);
        } else {
            this.canvas.width = r.width * 2;
            this.canvas.height = r.height * 2;
        }
        console.log('[WaveformVisualizer] Canvas initialized:', this.canvas.id, `${this.canvas.width}x${this.canvas.height}`);
    }
    setParams(f, w, a = 1, inv = false) { this.waveParams = { frequency: f, waveform: w, amplitude: a, inverted: inv }; }
    getWaveformValue(wf, phase) {
        const p = ((phase % 1) + 1) % 1;
        switch (wf) { case 'sine': return Math.sin(p * Math.PI * 2); case 'square': return p < 0.5 ? 1 : -1; case 'sawtooth': return 2 * p - 1; case 'triangle': return 1 - 4 * Math.abs(p - 0.5); default: return Math.sin(p * Math.PI * 2); }
    }
    draw() {
        if (!this.ctx || !this.canvas) return;
        const { frequency, waveform, amplitude, inverted } = this.waveParams;
        const w = this.canvas.width, h = this.canvas.height, cy = h / 2;
        this.ctx.fillStyle = 'rgba(0,0,0,0.4)'; this.ctx.fillRect(0, 0, w, h);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)'; this.ctx.lineWidth = 1;
        this.ctx.beginPath(); this.ctx.moveTo(0, cy); this.ctx.lineTo(w, cy); this.ctx.stroke();
        this.ctx.strokeStyle = inverted ? '#ff6b6b' : '#00d9ff'; this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        const cycles = Math.min(Math.max(frequency / 500, 2), 8);
        for (let x = 0; x < w; x++) {
            const phase = (x / w) * cycles + this.time * 2;
            let v = this.getWaveformValue(waveform, phase);
            if (inverted) v = -v; v *= amplitude;
            const y = cy - v * (h * 0.35);
            x === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
        this.ctx.shadowColor = inverted ? '#ff6b6b' : '#00d9ff'; this.ctx.shadowBlur = 10; this.ctx.stroke(); this.ctx.shadowBlur = 0;
    }
    animate() { this.time += 0.016; this.draw(); this.animationId = requestAnimationFrame(() => this.animate()); }
    start() { if (!this.animationId) this.animate(); }
    stop() { if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; } }
}
window.SpectrumVisualizer = SpectrumVisualizer;
window.WaveformVisualizer = WaveformVisualizer;
