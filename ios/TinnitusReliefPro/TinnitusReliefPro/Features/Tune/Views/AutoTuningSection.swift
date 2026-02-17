import SwiftUI

/// Automated frequency sweep section that scans through a range of frequencies
/// so the user can identify their tinnitus pitch by pressing "That's My Tinnitus!".
struct AutoTuningSection: View {

    @Environment(AudioEngineManager.self) private var audioEngine

    @State private var sweepSpeed: Double = 100       // Hz per second
    @State private var rangeStart: Double = 2000
    @State private var rangeEnd: Double = 12000
    @State private var earSelection: EarSelection = .both
    @State private var volumePercent: Double = 50
    private var isSweeping: Bool { audioEngine.isSweeping }
    private var sweepProgress: Double { audioEngine.sweepProgress }
    @State private var matchedFrequencies: [MatchedFrequency] = []

    struct MatchedFrequency: Identifiable {
        let id = UUID()
        let ear: EarSelection
        let frequency: Double
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // MARK: - Recommended Badge
            HStack {
                Text("Recommended")
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.accentCyan, in: Capsule())
                Spacer()
            }

            // MARK: - Speed Picker
            VStack(alignment: .leading, spacing: 6) {
                Text("Sweep Speed")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                Picker("Speed", selection: $sweepSpeed) {
                    Text("50 Hz/s").tag(50.0)
                    Text("100 Hz/s").tag(100.0)
                    Text("200 Hz/s").tag(200.0)
                }
                .pickerStyle(.segmented)
            }

            // MARK: - Frequency Range
            VStack(alignment: .leading, spacing: 6) {
                Text("Frequency Range")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                HStack {
                    VStack(alignment: .leading) {
                        Text("Start")
                            .font(.caption)
                            .foregroundStyle(Color.textMuted)
                        TextField("Start", value: $rangeStart, format: .number)
                            .font(.system(.body, design: .monospaced))
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.numberPad)
                            .frame(width: 100)
                    }
                    Spacer()
                    Text("to")
                        .foregroundStyle(Color.textMuted)
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text("End")
                            .font(.caption)
                            .foregroundStyle(Color.textMuted)
                        TextField("End", value: $rangeEnd, format: .number)
                            .font(.system(.body, design: .monospaced))
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.numberPad)
                            .frame(width: 100)
                    }
                }
            }

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
            }

            // MARK: - Volume
            HStack(spacing: 8) {
                Image(systemName: "speaker")
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
                Slider(value: $volumePercent, in: 0...100, step: 1)
                    .tint(Color.accentCyan)
                    .onChange(of: volumePercent) { _, newVal in
                        audioEngine.volume = Float(newVal / 100.0)
                    }
                Image(systemName: "speaker.wave.3")
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
                Text("\(Int(volumePercent))%")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(Color.accentCyan)
                    .frame(width: 36, alignment: .trailing)
            }

            // MARK: - Sweep Controls
            Button {
                if isSweeping {
                    audioEngine.stopSweep()
                } else {
                    audioEngine.earSelection = earSelection
                    audioEngine.startSweep(
                        startFreq: Float(rangeStart),
                        endFreq: Float(rangeEnd),
                        speedHzPerSec: Float(sweepSpeed)
                    )
                }
            } label: {
                Label(
                    isSweeping ? "Stop Sweep" : "Start Sweep",
                    systemImage: isSweeping ? "stop.fill" : "play.fill"
                )
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(isSweeping ? Color.accentRed : Color.accentGreen)

            // MARK: - Mark Button
            Button {
                let impact = UIImpactFeedbackGenerator(style: .heavy)
                impact.impactOccurred()
                let matched = MatchedFrequency(
                    ear: earSelection,
                    frequency: Double(audioEngine.frequency)
                )
                matchedFrequencies.append(matched)
                audioEngine.earSelection = earSelection
                audioEngine.setMatchedFrequency(audioEngine.frequency)
            } label: {
                Label("That's My Tinnitus!", systemImage: "pin.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.accentPurple)
            .disabled(!isSweeping)

            // MARK: - Progress
            if isSweeping {
                VStack(alignment: .leading, spacing: 4) {
                    ProgressView(value: sweepProgress)
                        .tint(Color.accentCyan)
                    Text("\(Int(audioEngine.frequency)) Hz")
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(Color.textMuted)
                }
            }

            // MARK: - Matched Frequencies
            if !matchedFrequencies.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Matched Frequencies")
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.textPrimary)

                    ForEach(matchedFrequencies) { match in
                        HStack {
                            Image(systemName: "pin.fill")
                                .foregroundStyle(Color.accentPurple)
                                .font(.caption)
                            Text("\(match.ear.rawValue.capitalized)")
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                            Spacer()
                            Text("\(Int(match.frequency)) Hz")
                                .font(.system(.body, design: .monospaced))
                                .foregroundStyle(Color.accentCyan)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding()
                .background(Color.bgPrimary, in: RoundedRectangle(cornerRadius: 12))
            }
        }
        .onChange(of: earSelection) { _, newVal in
            audioEngine.earSelection = newVal
        }
    }
}

#Preview {
    AutoTuningSection()
        .padding()
        .background(Color.bgCard)
        .environment(AudioEngineManager())
        .preferredColorScheme(.dark)
}
