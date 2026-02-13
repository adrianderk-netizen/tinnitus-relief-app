import SwiftUI

/// Primary tuning interface for finding and matching tinnitus frequencies.
/// Provides both automated sweep-based detection and manual frequency adjustment.
struct TuneView: View {

    @Environment(AudioEngineManager.self) private var audioEngine
    @State private var autoExpanded = true
    @State private var manualExpanded = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    FrequencyHeroView()
                        .padding(.top, 8)

                    // MARK: - Tone Controls
                    HStack(spacing: 16) {
                        Button {
                            audioEngine.startTone()
                        } label: {
                            Label("Start", systemImage: "play.fill")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color.accentGreen)
                        .disabled(audioEngine.isTonePlaying)

                        Button {
                            audioEngine.stopTone()
                        } label: {
                            Label("Stop", systemImage: "stop.fill")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color.accentRed)
                        .disabled(!audioEngine.isTonePlaying)
                    }
                    .padding(.horizontal)

                    // MARK: - Auto Tuning
                    DisclosureGroup(isExpanded: $autoExpanded) {
                        AutoTuningSection()
                            .padding(.top, 8)
                    } label: {
                        HStack {
                            Image(systemName: "wand.and.stars")
                                .foregroundStyle(Color.accentCyan)
                            Text("Auto-Tuning")
                                .font(.headline)
                                .foregroundStyle(Color.textPrimary)
                        }
                    }
                    .padding()
                    .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal)

                    // MARK: - Manual Tuning
                    DisclosureGroup(isExpanded: $manualExpanded) {
                        ManualTuningSection()
                            .padding(.top, 8)
                    } label: {
                        HStack {
                            Image(systemName: "slider.horizontal.3")
                                .foregroundStyle(Color.accentCyan)
                            Text("Manual Tuning")
                                .font(.headline)
                                .foregroundStyle(Color.textPrimary)
                        }
                    }
                    .padding()
                    .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal)

                    // MARK: - Presets
                    FrequencyPresetsView()
                        .padding(.horizontal)

                    Spacer(minLength: 40)
                }
            }
            .background(Color.bgPrimary)
            .navigationTitle("Frequency Tuner")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    TuneView()
        .environment(AudioEngineManager())
        .environment(SessionManager())
        .environment(SubscriptionManager())
        .preferredColorScheme(.dark)
}
