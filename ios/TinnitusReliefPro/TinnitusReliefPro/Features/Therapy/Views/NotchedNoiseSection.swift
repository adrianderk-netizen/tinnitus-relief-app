import SwiftUI

/// Notched noise therapy controls allowing the user to play colored noise
/// with a configurable spectral notch centered on their tinnitus frequency.
struct NotchedNoiseSection: View {

    @Environment(AudioEngineManager.self) private var audioEngine

    @State private var noiseVolume: Double = 50
    @State private var notchFrequencyText: String = "4000"
    @State private var showEarPicker = false

    var body: some View {
        @Bindable var engine = audioEngine

        VStack(alignment: .leading, spacing: 16) {
            // MARK: - Header
            HStack {
                Image(systemName: "waveform.path")
                    .foregroundStyle(Color.accentCyan)
                Text("Notched Noise")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                Spacer()
            }

            // MARK: - Start / Stop
            HStack(spacing: 16) {
                Button {
                    audioEngine.startNoise()
                } label: {
                    Label("Start", systemImage: "play.fill")
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.accentGreen)
                .disabled(audioEngine.isNoisePlaying)

                Button {
                    audioEngine.stopNoise()
                } label: {
                    Label("Stop", systemImage: "stop.fill")
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.accentRed)
                .disabled(!audioEngine.isNoisePlaying)
            }

            // MARK: - Spectrum Placeholder
            SpectrumCanvas(
                frequencyData: audioEngine.frequencyData,
                notchFrequency: Double(audioEngine.notchFrequency),
                notchWidth: audioEngine.notchWidth.hzValue(
                    centerFrequency: Double(audioEngine.notchFrequency)
                )
            )
            .frame(height: 120)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // MARK: - Noise Type
            VStack(alignment: .leading, spacing: 6) {
                Text("Noise Type")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                Picker("Noise Type", selection: $engine.noiseType) {
                    Text("White").tag(NoiseType.white)
                    Text("Pink").tag(NoiseType.pink)
                    Text("Brown").tag(NoiseType.brown)
                }
                .pickerStyle(.segmented)
            }

            // MARK: - Volume
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Volume")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                    Spacer()
                    Text("\(Int(noiseVolume))%")
                        .font(.system(.body, design: .monospaced))
                        .foregroundStyle(Color.accentCyan)
                }
                Slider(value: $noiseVolume, in: 0...100, step: 1)
                    .tint(Color.accentCyan)
                    .onChange(of: noiseVolume) { _, newVal in
                        audioEngine.noiseVolume = Float(newVal / 100.0)
                    }
            }

            // MARK: - Notch Frequency
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Notch Frequency")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                    Spacer()
                    TextField("Hz", text: $notchFrequencyText)
                        .font(.system(.body, design: .monospaced))
                        .multilineTextAlignment(.trailing)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.numberPad)
                        .frame(width: 80)
                        .onChange(of: notchFrequencyText) { _, newVal in
                            let filtered = newVal.filter(\.isNumber)
                            if filtered != newVal { notchFrequencyText = filtered }
                        }
                        .onSubmit {
                            if let val = Float(notchFrequencyText), (100...15000).contains(val) {
                                audioEngine.notchFrequency = val
                            }
                            notchFrequencyText = "\(Int(audioEngine.notchFrequency))"
                        }
                    Text("Hz")
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                }
                Slider(
                    value: Binding(
                        get: { Double(audioEngine.notchFrequency) },
                        set: { newVal in
                            audioEngine.notchFrequency = Float(newVal)
                            notchFrequencyText = "\(Int(newVal))"
                        }
                    ),
                    in: 100...15000,
                    step: 10
                )
                .tint(Color.accentCyan)

                Button {
                    let hasLeft = audioEngine.leftMatchedFrequency != nil
                    let hasRight = audioEngine.rightMatchedFrequency != nil
                    if hasLeft && hasRight {
                        if audioEngine.leftMatchedFrequency == audioEngine.rightMatchedFrequency {
                            applyMatchedFrequency(audioEngine.leftMatchedFrequency!)
                        } else {
                            showEarPicker = true
                        }
                    } else if let freq = audioEngine.leftMatchedFrequency ?? audioEngine.rightMatchedFrequency {
                        applyMatchedFrequency(freq)
                    }
                } label: {
                    Label("Use Matched Frequency", systemImage: "arrow.uturn.left")
                        .font(.subheadline)
                }
                .tint(Color.accentCyan)
                .disabled(audioEngine.leftMatchedFrequency == nil && audioEngine.rightMatchedFrequency == nil)
                .confirmationDialog("Which ear's matched frequency?", isPresented: $showEarPicker, titleVisibility: .visible) {
                    if let leftFreq = audioEngine.leftMatchedFrequency {
                        Button("Left Ear — \(Int(leftFreq)) Hz") {
                            applyMatchedFrequency(leftFreq)
                        }
                    }
                    if let rightFreq = audioEngine.rightMatchedFrequency {
                        Button("Right Ear — \(Int(rightFreq)) Hz") {
                            applyMatchedFrequency(rightFreq)
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                }
            }

            // MARK: - Notch Width
            VStack(alignment: .leading, spacing: 6) {
                Text("Notch Width")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                Menu {
                    ForEach(NotchWidth.allPresets, id: \.self) { preset in
                        Button(preset.label) {
                            audioEngine.notchWidth = preset
                        }
                    }
                } label: {
                    HStack {
                        Text(audioEngine.notchWidth.label)
                            .foregroundStyle(Color.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .foregroundStyle(Color.accentCyan)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.bgPrimary, in: RoundedRectangle(cornerRadius: 8))
                }
            }

            // MARK: - Notch Depth
            VStack(alignment: .leading, spacing: 6) {
                Text("Notch Depth")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                Picker("Depth", selection: Binding(
                    get: { Double(audioEngine.notchDepth) },
                    set: { audioEngine.notchDepth = Float($0) }
                )) {
                    Text("50%").tag(0.5)
                    Text("75%").tag(0.75)
                    Text("100%").tag(1.0)
                }
                .pickerStyle(.segmented)
            }
        }
        .padding()
        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 16))
    }

    private func applyMatchedFrequency(_ freq: Float) {
        let impact = UIImpactFeedbackGenerator(style: .medium)
        impact.impactOccurred()
        notchFrequencyText = "\(Int(freq))"
        audioEngine.notchFrequency = freq
    }
}

#Preview {
    ScrollView {
        NotchedNoiseSection()
            .padding()
    }
    .background(Color.bgPrimary)
    .environment(AudioEngineManager())
    .preferredColorScheme(.dark)
}
