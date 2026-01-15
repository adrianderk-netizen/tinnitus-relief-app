class AudioEngine {
    constructor() { this.audioContext = null; this.masterGain = null; }
    init() {
        if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        if (!this.masterGain) { this.masterGain = this.audioContext.createGain(); this.masterGain.connect(this.audioContext.destination); }
        return this.audioContext;
    }
    get currentTime() { return this.audioContext ? this.audioContext.currentTime : 0; }
    createGain(v = 1) { const g = this.audioContext.createGain(); g.gain.setValueAtTime(v, this.currentTime); return g; }
    createPanner(p = 0) { const n = this.audioContext.createStereoPanner(); n.pan.setValueAtTime(p, this.currentTime); return n; }
    createOscillator(f = 440, t = 'sine') { const o = this.audioContext.createOscillator(); o.type = t; o.frequency.setValueAtTime(f, this.currentTime); return o; }
    createNotchFilter(f = 1000, Q = 10) { const n = this.audioContext.createBiquadFilter(); n.type = 'notch'; n.frequency.setValueAtTime(f, this.currentTime); n.Q.setValueAtTime(Q, this.currentTime); return n; }
    // Parse notch width - can be Hz-based (e.g., "hz50", "hz100") or octave-based (e.g., 0.5, 1)
    parseNotchWidth(widthValue, centerFreq) {
        if (typeof widthValue === 'string' && widthValue.startsWith('hz')) {
            // Hz-based width (e.g., "hz50" = ±50 Hz)
            const hzWidth = parseInt(widthValue.substring(2));
            return { lowerFreq: centerFreq - hzWidth, upperFreq: centerFreq + hzWidth, isNarrow: true, hzWidth };
        } else {
            // Octave-based width
            const octaveWidth = parseFloat(widthValue) || 1;
            return { 
                lowerFreq: centerFreq / Math.pow(2, octaveWidth / 2), 
                upperFreq: centerFreq * Math.pow(2, octaveWidth / 2), 
                isNarrow: false, 
                octaveWidth 
            };
        }
    }
    createNotchFilterBank(centerFreq, widthValue = 1, depth = 1) {
        const filters = [];
        const parsed = this.parseNotchWidth(widthValue, centerFreq);
        const lowerFreq = parsed.lowerFreq;
        const upperFreq = parsed.upperFreq;
        // For narrow Hz-based notches, use fewer filters with higher Q; for octave-based, use more filters
        const numFilters = parsed.isNarrow ? Math.max(2, Math.ceil(parsed.hzWidth / 25)) : Math.ceil((parsed.octaveWidth || 1) * 4);
        const freqStep = (upperFreq - lowerFreq) / Math.max(1, numFilters);
        const baseQ = parsed.isNarrow ? 50 : 30; // Higher Q for narrower notches
        for (let i = 0; i <= numFilters; i++) { const f = lowerFreq + (freqStep * i); filters.push(this.createNotchFilter(f, baseQ * depth)); }
        for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
        const self = this;
        return {
            input: filters[0], output: filters[filters.length - 1], filters,
            update: (newCenterFreq, newWidth, newDepth) => {
                const newParsed = self.parseNotchWidth(newWidth, newCenterFreq);
                const newLower = newParsed.lowerFreq;
                const newUpper = newParsed.upperFreq;
                const newStep = (newUpper - newLower) / Math.max(1, numFilters);
                const newBaseQ = newParsed.isNarrow ? 50 : 30;
                filters.forEach((f, i) => { 
                    f.frequency.setTargetAtTime(newLower + (newStep * i), self.currentTime, 0.01); 
                    f.Q.setTargetAtTime(newBaseQ * newDepth, self.currentTime, 0.01); 
                });
            }
        };
    }
    createWhiteNoiseBuffer(dur = 2) {
        const sr = this.audioContext.sampleRate, len = sr * dur, buf = this.audioContext.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
        return buf;
    }
    createPinkNoiseBuffer(dur = 2) {
        const sr = this.audioContext.sampleRate, len = sr * dur, buf = this.audioContext.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch); let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
            for (let i = 0; i < len; i++) {
                const w = Math.random() * 2 - 1;
                b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759; b2 = 0.96900*b2 + w*0.1538520;
                b3 = 0.86650*b3 + w*0.3104856; b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
                d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6 = w*0.115926;
            }
        }
        return buf;
    }
    createBrownNoiseBuffer(dur = 2) {
        const sr = this.audioContext.sampleRate, len = sr * dur, buf = this.audioContext.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let lastOut = 0; for (let i = 0; i < len; i++) { const w = Math.random()*2-1; d[i] = (lastOut + (0.02*w))/1.02; lastOut = d[i]; d[i] *= 3.5; } }
        return buf;
    }
    createNoiseSource(type = 'white') {
        let buf; switch(type) { case 'pink': buf = this.createPinkNoiseBuffer(2); break; case 'brown': buf = this.createBrownNoiseBuffer(2); break; default: buf = this.createWhiteNoiseBuffer(2); }
        const src = this.audioContext.createBufferSource(); src.buffer = buf; src.loop = true; return src;
    }
    createAnalyzer(fftSize = 2048) { const a = this.audioContext.createAnalyser(); a.fftSize = fftSize; a.smoothingTimeConstant = 0.8; return a; }
    createMediaElementSource(el) { return this.audioContext.createMediaElementSource(el); }
    setMasterVolume(v) { if (this.masterGain) this.masterGain.gain.setTargetAtTime(v, this.currentTime, 0.01); }
    connectToMaster(node) { node.connect(this.masterGain); }
}
window.AudioEngine = AudioEngine;
