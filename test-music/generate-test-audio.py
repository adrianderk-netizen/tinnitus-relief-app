#!/usr/bin/env python3
"""
Generate 10 test audio files for tinnitus relief app testing.
These are synthesized WAV files using only Python's standard library.
Each file contains different soothing/therapeutic sounds appropriate for tinnitus relief.

Usage:
    cd /Users/carlossmith/Documents/Vibe-Projects/Vibe-Projects/tinnitus-relief-app/test-music
    python3 generate-test-audio.py

The generated WAV files are compatible with iOS AVAudioFile.
"""

import struct
import math
import random
import os
import wave

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_RATE = 44100
DURATION = 30  # seconds per file
NUM_CHANNELS = 1
SAMPLE_WIDTH = 2  # 16-bit
MAX_AMP = 32767


def write_wav(filename, samples):
    """Write samples to a WAV file."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(NUM_CHANNELS)
        wav_file.setsampwidth(SAMPLE_WIDTH)
        wav_file.setframerate(SAMPLE_RATE)
        # Convert float samples [-1, 1] to 16-bit integers
        packed = b''
        for s in samples:
            s = max(-1.0, min(1.0, s))
            packed += struct.pack('<h', int(s * MAX_AMP))
        wav_file.writeframes(packed)
    size = os.path.getsize(filepath)
    print(f"  Created: {filename} ({size:,} bytes, {DURATION}s)")


def generate_white_noise():
    """Generate gentle white noise - classic tinnitus masking sound."""
    print("1/10: Generating white-noise.wav")
    samples = []
    for i in range(SAMPLE_RATE * DURATION):
        # Low amplitude white noise with fade in/out
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 2.0:
            envelope = t / 2.0
        elif t > DURATION - 2.0:
            envelope = (DURATION - t) / 2.0
        samples.append(random.uniform(-0.3, 0.3) * envelope)
    write_wav("white-noise.wav", samples)


def generate_pink_noise():
    """Generate pink noise (1/f noise) - more natural masking sound."""
    print("2/10: Generating pink-noise.wav")
    # Simple pink noise approximation using Voss-McCartney algorithm
    samples = []
    num_rows = 16
    rows = [0.0] * num_rows
    running_sum = 0.0

    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 2.0:
            envelope = t / 2.0
        elif t > DURATION - 2.0:
            envelope = (DURATION - t) / 2.0

        # Update one row based on bit pattern
        index = 0
        n = i
        while n > 0 and index < num_rows:
            if n & 1:
                running_sum -= rows[index]
                rows[index] = random.uniform(-1.0, 1.0)
                running_sum += rows[index]
                break
            index += 1
            n >>= 1

        sample = running_sum / num_rows * 0.3 * envelope
        samples.append(sample)
    write_wav("pink-noise.wav", samples)


def generate_binaural_beat():
    """Generate a binaural beat at alpha frequency (10 Hz) centered at 200 Hz.
    Note: Stereo would be ideal but mono still creates an interesting tone."""
    print("3/10: Generating binaural-beat-alpha.wav")
    samples = []
    base_freq = 200.0
    beat_freq = 10.0  # Alpha waves

    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 2.0:
            envelope = t / 2.0
        elif t > DURATION - 2.0:
            envelope = (DURATION - t) / 2.0

        # Create beating pattern by mixing two close frequencies
        s1 = math.sin(2 * math.pi * base_freq * t)
        s2 = math.sin(2 * math.pi * (base_freq + beat_freq) * t)
        sample = (s1 + s2) * 0.25 * envelope
        samples.append(sample)
    write_wav("binaural-beat-alpha.wav", samples)


def generate_ocean_waves():
    """Simulate ocean wave sounds using filtered noise with periodic amplitude modulation."""
    print("4/10: Generating ocean-waves.wav")
    samples = []
    wave_period = 8.0  # seconds per wave cycle

    # Pre-generate noise and apply simple low-pass filter
    raw_noise = [random.uniform(-1.0, 1.0) for _ in range(SAMPLE_RATE * DURATION)]

    # Simple moving average filter for low-pass effect
    filtered = [0.0] * len(raw_noise)
    window = 50
    running = 0.0
    for i in range(len(raw_noise)):
        running += raw_noise[i]
        if i >= window:
            running -= raw_noise[i - window]
        filtered[i] = running / min(i + 1, window)

    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 2.0:
            envelope = t / 2.0
        elif t > DURATION - 2.0:
            envelope = (DURATION - t) / 2.0

        # Wave envelope: periodic swelling
        wave_env = (math.sin(2 * math.pi * t / wave_period) + 1.0) / 2.0
        wave_env = wave_env ** 2  # Sharpen the wave shape

        # Add a secondary wave at different period
        wave_env2 = (math.sin(2 * math.pi * t / (wave_period * 1.7) + 1.0) + 1.0) / 2.0
        wave_env2 = wave_env2 ** 2

        combined_env = wave_env * 0.7 + wave_env2 * 0.3

        sample = filtered[i] * combined_env * 0.6 * envelope
        samples.append(sample)
    write_wav("ocean-waves.wav", samples)


def generate_gentle_rain():
    """Simulate gentle rain using shaped noise."""
    print("5/10: Generating gentle-rain.wav")
    samples = []

    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 2.0:
            envelope = t / 2.0
        elif t > DURATION - 2.0:
            envelope = (DURATION - t) / 2.0

        # Base rain: high-frequency noise
        noise = random.uniform(-1.0, 1.0)

        # Add occasional "droplet" sounds
        droplet = 0.0
        if random.random() < 0.001:
            droplet = math.sin(2 * math.pi * random.uniform(2000, 5000) * t) * 0.3

        # Subtle intensity variation
        intensity = 0.8 + 0.2 * math.sin(2 * math.pi * t / 15.0)

        sample = (noise * 0.2 * intensity + droplet) * envelope
        samples.append(sample)
    write_wav("gentle-rain.wav", samples)


def generate_singing_bowl():
    """Simulate a Tibetan singing bowl with harmonics and slow decay."""
    print("6/10: Generating singing-bowl.wav")
    samples = []

    # Bowl frequencies and their relative amplitudes
    fundamentals = [
        (220.0, 1.0),    # Fundamental
        (440.0, 0.6),    # 2nd harmonic
        (660.0, 0.3),    # 3rd harmonic
        (880.0, 0.15),   # 4th harmonic
        (1320.0, 0.08),  # Higher partial
    ]

    # Generate multiple "strikes" at different times
    strike_times = [0.0, 10.0, 20.0]

    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 1.0:
            envelope = t / 1.0
        elif t > DURATION - 2.0:
            envelope = (DURATION - t) / 2.0

        sample = 0.0
        for strike_t in strike_times:
            dt = t - strike_t
            if dt >= 0:
                # Exponential decay from strike
                strike_env = math.exp(-dt * 0.3) * min(dt * 20, 1.0)
                for freq, amp in fundamentals:
                    # Add slight frequency wobble for realism
                    wobble = 1.0 + 0.002 * math.sin(2 * math.pi * 5.0 * dt)
                    sample += amp * strike_env * math.sin(2 * math.pi * freq * wobble * dt)

        sample *= 0.15 * envelope
        samples.append(sample)
    write_wav("singing-bowl.wav", samples)


def generate_soft_drone():
    """Generate a soft ambient drone tone."""
    print("7/10: Generating soft-drone.wav")
    samples = []

    # Multiple detuned oscillators for rich texture
    freqs = [110.0, 110.3, 165.0, 164.7, 220.0, 220.5]

    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 3.0:
            envelope = t / 3.0
        elif t > DURATION - 3.0:
            envelope = (DURATION - t) / 3.0

        sample = 0.0
        for freq in freqs:
            # Slow LFO modulation on amplitude
            lfo = 0.7 + 0.3 * math.sin(2 * math.pi * 0.1 * t + freq)
            sample += math.sin(2 * math.pi * freq * t) * lfo

        sample = sample / len(freqs) * 0.3 * envelope
        samples.append(sample)
    write_wav("soft-drone.wav", samples)


def generate_wind_chimes():
    """Simulate gentle wind chimes."""
    print("8/10: Generating wind-chimes.wav")
    samples = [0.0] * (SAMPLE_RATE * DURATION)

    # Chime frequencies (pentatonic scale-ish)
    chime_freqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]

    # Pre-calculate random chime events
    random.seed(42)  # Reproducible
    chime_events = []
    t = 0.5
    while t < DURATION - 3.0:
        freq = random.choice(chime_freqs)
        amp = random.uniform(0.15, 0.4)
        chime_events.append((t, freq, amp))
        t += random.uniform(0.3, 2.0)

    for event_t, freq, amp in chime_events:
        start_sample = int(event_t * SAMPLE_RATE)
        decay_time = 3.0  # seconds
        decay_samples = int(decay_time * SAMPLE_RATE)

        for j in range(min(decay_samples, len(samples) - start_sample)):
            dt = j / SAMPLE_RATE
            env = math.exp(-dt * 2.0) * amp
            idx = start_sample + j
            if idx < len(samples):
                # Main tone plus a harmonic
                samples[idx] += env * math.sin(2 * math.pi * freq * dt)
                samples[idx] += env * 0.3 * math.sin(2 * math.pi * freq * 2.0 * dt)

    # Apply master envelope
    for i in range(len(samples)):
        t = i / SAMPLE_RATE
        if t < 1.0:
            samples[i] *= t / 1.0
        elif t > DURATION - 1.0:
            samples[i] *= (DURATION - t) / 1.0
        samples[i] *= 0.5  # Master volume

    random.seed()  # Reset seed
    write_wav("wind-chimes.wav", samples)


def generate_heartbeat():
    """Generate a slow, calming heartbeat rhythm."""
    print("9/10: Generating calm-heartbeat.wav")
    samples = []
    bpm = 60  # Resting heart rate
    beat_period = 60.0 / bpm

    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 2.0:
            envelope = t / 2.0
        elif t > DURATION - 2.0:
            envelope = (DURATION - t) / 2.0

        # Position within beat cycle
        beat_pos = (t % beat_period) / beat_period

        # Two "lub-dub" bumps per heartbeat
        lub = math.exp(-((beat_pos - 0.0) ** 2) / 0.001) * 0.6
        dub = math.exp(-((beat_pos - 0.15) ** 2) / 0.002) * 0.4

        beat_env = lub + dub

        # Low frequency thump
        sample = beat_env * math.sin(2 * math.pi * 50.0 * t) * envelope

        # Add subtle noise layer
        sample += random.uniform(-0.02, 0.02) * envelope

        samples.append(sample * 0.5)
    write_wav("calm-heartbeat.wav", samples)


def generate_notched_therapy():
    """Generate a notched sound therapy signal - white noise with a notch filter
    around a typical tinnitus frequency (4000 Hz). This is based on the
    'Tailor-Made Notched Music Training' approach for tinnitus."""
    print("10/10: Generating notched-therapy-4khz.wav")
    samples = []
    notch_center = 4000.0  # Hz - common tinnitus frequency
    notch_width = 500.0    # Hz bandwidth of notch

    # Generate white noise
    raw = [random.uniform(-1.0, 1.0) for _ in range(SAMPLE_RATE * DURATION)]

    # Apply a simple notch filter using a biquad approximation
    # We'll use multiple passes of a simple filter for better effect
    Q = notch_center / notch_width
    w0 = 2 * math.pi * notch_center / SAMPLE_RATE
    alpha = math.sin(w0) / (2 * Q)

    b0 = 1.0
    b1 = -2 * math.cos(w0)
    b2 = 1.0
    a0 = 1 + alpha
    a1 = -2 * math.cos(w0)
    a2 = 1 - alpha

    # Normalize
    b0 /= a0
    b1 /= a0
    b2 /= a0
    a1 /= a0
    a2 /= a0

    # Apply filter
    filtered = [0.0] * len(raw)
    x1, x2, y1, y2 = 0.0, 0.0, 0.0, 0.0
    for i in range(len(raw)):
        x0 = raw[i]
        y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        filtered[i] = y0
        x2, x1 = x1, x0
        y2, y1 = y1, y0

    for i in range(len(filtered)):
        t = i / SAMPLE_RATE
        envelope = 1.0
        if t < 2.0:
            envelope = t / 2.0
        elif t > DURATION - 2.0:
            envelope = (DURATION - t) / 2.0
        samples.append(filtered[i] * 0.25 * envelope)

    write_wav("notched-therapy-4khz.wav", samples)


def main():
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Sample rate: {SAMPLE_RATE} Hz")
    print(f"Duration: {DURATION} seconds per file")
    print(f"Format: 16-bit WAV, mono")
    print("")

    generate_white_noise()
    generate_pink_noise()
    generate_binaural_beat()
    generate_ocean_waves()
    generate_gentle_rain()
    generate_singing_bowl()
    generate_soft_drone()
    generate_wind_chimes()
    generate_heartbeat()
    generate_notched_therapy()

    print("")
    print("=== All 10 audio files generated successfully! ===")
    print("")
    print("Generated files:")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        if f.endswith('.wav'):
            size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
            print(f"  {f} ({size:,} bytes)")
    print("")
    print("These WAV files are compatible with iOS AVAudioFile.")
    print("Each file is 30 seconds of 44.1kHz 16-bit mono audio.")


if __name__ == "__main__":
    main()
