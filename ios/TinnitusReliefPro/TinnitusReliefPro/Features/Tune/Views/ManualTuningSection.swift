import SwiftUI

/// Manual frequency adjustment controls with sliders, waveform selection,
/// and advanced options for fine-tuning and phase inversion.
struct ManualTuningSection: View {

    @Environment(AudioEngineManager.self) private var audioEngine

    @State private var earSelection: EarSelection = .both
    @State private var frequencyText: String = "440"
    @State private var sliderFrequency: Double = 440
    @State private var isEditingFrequency = false
    @State private var volumePercent: Double = 50
    @State private var advancedExpanded = false

    var body: some View {
        @Bindable var engine = audioEngine

        VStack(alignment: .leading, spacing: 20) {
            // MARK: - Ear Selector
            VStack(alignment: .leading, spacing: 6) {
                Text("Ear")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                Picker("Ear", selection: $earSelection) {
                    Text("Both").tag(EarSelection.both)
                    Text("Left").tag(EarSelection.left)
                    Text("Right").tag(EarSelection.right)
                }
                .pickerStyle(.segmented)

                HStack(spacing: 4) {
                    Text("L: \(Int(audioEngine.leftFrequency)) Hz")
                        .foregroundStyle(earSelection == .right ? Color.textMuted : Color.accentCyan)
                    Text("|")
                        .foregroundStyle(Color.textMuted)
                    Text("R: \(Int(audioEngine.rightFrequency)) Hz")
                        .foregroundStyle(earSelection == .left ? Color.textMuted : Color.accentCyan)
                }
                .font(.system(.title3, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .center)
            }

            // MARK: - Frequency Slider
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Frequency")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                    Spacer()
                    TextField("Hz", text: $frequencyText)
                        .font(.system(.body, design: .monospaced))
                        .multilineTextAlignment(.trailing)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.numberPad)
                        .frame(width: 80)
                        .onChange(of: frequencyText) { _, newVal in
                            let filtered = newVal.filter(\.isNumber)
                            if filtered != newVal { frequencyText = filtered }
                        }
                        .onSubmit { applyFrequencyText() }
                    Text("Hz")
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                }

                Slider(
                    value: $sliderFrequency,
                    in: 100...15000,
                    step: 1,
                    onEditingChanged: { editing in
                        isEditingFrequency = editing
                    }
                )
                .tint(Color.accentCyan)
                .onChange(of: sliderFrequency) { _, newVal in
                    guard !audioEngine.isSweeping else { return }
                    audioEngine.frequency = Float(newVal)
                    frequencyText = "\(Int(newVal))"
                }
                .onChange(of: audioEngine.frequency) { _, newVal in
                    frequencyText = "\(Int(newVal))"
                    if !isEditingFrequency && !audioEngine.isSweeping {
                        sliderFrequency = Double(newVal)
                    }
                }
                .onChange(of: audioEngine.isSweeping) { _, sweeping in
                    if !sweeping {
                        sliderFrequency = Double(audioEngine.frequency)
                        frequencyText = "\(Int(audioEngine.frequency))"
                    }
                }
                .onAppear {
                    sliderFrequency = Double(audioEngine.frequency)
                    frequencyText = "\(Int(audioEngine.frequency))"
                }

                HStack {
                    Text("100 Hz")
                        .font(.system(.caption2, design: .monospaced))
                        .foregroundStyle(Color.textMuted)
                    Spacer()
                    Text("15,000 Hz")
                        .font(.system(.caption2, design: .monospaced))
                        .foregroundStyle(Color.textMuted)
                }
            }

            // MARK: - Volume Slider
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Volume")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                    Spacer()
                    Text("\(Int(volumePercent))%")
                        .font(.system(.body, design: .monospaced))
                        .foregroundStyle(Color.accentCyan)
                }
                Slider(value: $volumePercent, in: 0...100, step: 1) {
                    Text("Volume")
                } minimumValueLabel: {
                    Image(systemName: "speaker")
                        .font(.caption2)
                        .foregroundStyle(Color.textMuted)
                } maximumValueLabel: {
                    Image(systemName: "speaker.wave.3")
                        .font(.caption2)
                        .foregroundStyle(Color.textMuted)
                }
                .tint(Color.accentCyan)
                .onChange(of: volumePercent) { _, newVal in
                    audioEngine.volume = Float(newVal / 100.0)
                }
            }

            // MARK: - Waveform Picker
            VStack(alignment: .leading, spacing: 6) {
                Text("Waveform")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                Picker("Waveform", selection: $engine.waveform) {
                    Text("Sine").tag(Waveform.sine)
                    Text("Square").tag(Waveform.square)
                    Text("Triangle").tag(Waveform.triangle)
                    Text("Sawtooth").tag(Waveform.sawtooth)
                }
                .pickerStyle(.segmented)
            }

            // MARK: - Mark Button
            Button {
                let impact = UIImpactFeedbackGenerator(style: .heavy)
                impact.impactOccurred()
                audioEngine.earSelection = earSelection
                audioEngine.setMatchedFrequency(audioEngine.frequency)
            } label: {
                Label("Mark as Tinnitus Frequency", systemImage: "pin.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.accentPurple)

            // MARK: - Advanced Options
            DisclosureGroup(isExpanded: $advancedExpanded) {
                VStack(alignment: .leading, spacing: 16) {
                    // Fine Tune
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Fine Tune")
                                .font(.subheadline)
                                .foregroundStyle(Color.textSecondary)
                            Spacer()
                            Text(String(format: "%+.1f Hz", audioEngine.fineTune))
                                .font(.system(.body, design: .monospaced))
                                .foregroundStyle(Color.accentCyan)
                        }
                        Slider(
                            value: $engine.fineTune,
                            in: -10...10,
                            step: 0.1
                        )
                        .tint(Color.accentCyan)
                    }

                    // Phase Inversion
                    Button {
                        let impact = UIImpactFeedbackGenerator(style: .medium)
                        impact.impactOccurred()
                        audioEngine.phaseInverted.toggle()
                    } label: {
                        HStack {
                            Image(systemName: audioEngine.phaseInverted
                                  ? "waveform.path.ecg.rectangle.fill"
                                  : "waveform.path.ecg.rectangle")
                            Text("Phase Inversion")
                            Spacer()
                            Text(audioEngine.phaseInverted ? "ON" : "OFF")
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(
                                    audioEngine.phaseInverted
                                        ? Color.accentCyan
                                        : Color.textMuted
                                )
                        }
                        .padding(.vertical, 8)
                    }
                    .tint(Color.textPrimary)

                    // Per-Ear Enable
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Enabled Ears")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                        Toggle(isOn: $engine.leftEarEnabled) {
                            Label("Left Ear", systemImage: "ear")
                        }
                        .tint(Color.accentCyan)
                        Toggle(isOn: $engine.rightEarEnabled) {
                            Label("Right Ear", systemImage: "ear")
                        }
                        .tint(Color.accentCyan)
                    }
                }
                .padding(.top, 8)
            } label: {
                HStack {
                    Image(systemName: "gearshape")
                        .foregroundStyle(Color.accentCyan)
                    Text("Advanced Options")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .onChange(of: earSelection) { _, newVal in
            audioEngine.earSelection = newVal
            let activeFreq = Double(audioEngine.frequency)
            sliderFrequency = activeFreq
            frequencyText = "\(Int(activeFreq))"
        }
    }

    private func applyFrequencyText() {
        if let val = Double(frequencyText), (100...15000).contains(val) {
            audioEngine.frequency = Float(val)
        }
        frequencyText = "\(Int(audioEngine.frequency))"
    }
}

#Preview {
    ScrollView {
        ManualTuningSection()
            .padding()
    }
    .background(Color.bgCard)
    .environment(AudioEngineManager())
    .preferredColorScheme(.dark)
}
