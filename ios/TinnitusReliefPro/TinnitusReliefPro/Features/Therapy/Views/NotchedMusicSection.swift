import SwiftUI
import UniformTypeIdentifiers

/// Notched music therapy section allowing users to import their own audio files
/// and apply a spectral notch filter around their tinnitus frequency.
struct NotchedMusicSection: View {

    @Environment(AudioEngineManager.self) private var audioEngine

    @State private var showFilePicker = false
    @State private var selectedFileName: String?
    @State private var selectedFileURL: URL?
    @State private var isPlaying = false
    @State private var currentTime: Double = 0
    @State private var duration: Double = 180 // placeholder
    @State private var musicVolume: Double = 70
    @State private var notchEnabled = true
    @State private var musicNotchFrequencyText: String = "4000"

    private var timeFormatter: DateComponentsFormatter {
        let f = DateComponentsFormatter()
        f.allowedUnits = [.minute, .second]
        f.zeroFormattingBehavior = .pad
        return f
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // MARK: - Header
            HStack {
                Image(systemName: "music.note.list")
                    .foregroundStyle(Color.accentCyan)
                Text("Notched Music")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                Spacer()
            }

            // MARK: - File Picker
            Button {
                showFilePicker = true
            } label: {
                Label("Choose Audio File", systemImage: "folder.badge.plus")
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.accentCyan)
            .fileImporter(
                isPresented: $showFilePicker,
                allowedContentTypes: [.audio],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    if let url = urls.first {
                        selectedFileURL = url
                        selectedFileName = url.lastPathComponent
                    }
                case .failure:
                    break
                }
            }

            if let fileName = selectedFileName {
                HStack {
                    Image(systemName: "music.note")
                        .foregroundStyle(Color.accentCyan)
                    Text(fileName)
                        .font(.subheadline)
                        .foregroundStyle(Color.textPrimary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.bgPrimary, in: RoundedRectangle(cornerRadius: 8))
            }

            // MARK: - Play / Pause
            if selectedFileURL != nil {
                HStack(spacing: 16) {
                    Button {
                        isPlaying.toggle()
                    } label: {
                        Label(
                            isPlaying ? "Pause" : "Play",
                            systemImage: isPlaying ? "pause.fill" : "play.fill"
                        )
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(isPlaying ? Color.accentAmber : Color.accentGreen)
                }

                // MARK: - Seek
                VStack(spacing: 4) {
                    Slider(value: $currentTime, in: 0...max(duration, 1))
                        .tint(Color.accentCyan)
                    HStack {
                        Text(timeFormatter.string(from: currentTime) ?? "0:00")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                        Spacer()
                        Text(timeFormatter.string(from: duration) ?? "0:00")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                    }
                }

                // MARK: - Music Volume
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Volume")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                        Spacer()
                        Text("\(Int(musicVolume))%")
                            .font(.system(.body, design: .monospaced))
                            .foregroundStyle(Color.accentCyan)
                    }
                    Slider(value: $musicVolume, in: 0...100, step: 1)
                        .tint(Color.accentCyan)
                        .onChange(of: musicVolume) { _, newVal in
                            audioEngine.musicVolume = Float(newVal / 100.0)
                        }
                }

                // MARK: - Notch Toggle
                Toggle(isOn: $notchEnabled) {
                    Text("Apply Notch Filter")
                        .font(.subheadline)
                        .foregroundStyle(Color.textPrimary)
                }
                .tint(Color.accentCyan)

                if notchEnabled {
                    // MARK: - Notch Controls
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Notch Frequency")
                                .font(.subheadline)
                                .foregroundStyle(Color.textSecondary)
                            Spacer()
                            TextField("Hz", text: $musicNotchFrequencyText)
                                .font(.system(.body, design: .monospaced))
                                .multilineTextAlignment(.trailing)
                                .textFieldStyle(.roundedBorder)
                                .keyboardType(.numberPad)
                                .frame(width: 80)
                            Text("Hz")
                                .font(.caption)
                                .foregroundStyle(Color.textMuted)
                        }

                        Slider(
                            value: Binding(
                                get: { Double(audioEngine.notchFrequency) },
                                set: { newVal in
                                    audioEngine.notchFrequency = Float(newVal)
                                    musicNotchFrequencyText = "\(Int(newVal))"
                                }
                            ),
                            in: 100...15000,
                            step: 10
                        )
                        .tint(Color.accentCyan)
                    }
                }
            }
        }
        .padding()
        .background(Color.bgCard, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    ScrollView {
        NotchedMusicSection()
            .padding()
    }
    .background(Color.bgPrimary)
    .environment(AudioEngineManager())
    .preferredColorScheme(.dark)
}
