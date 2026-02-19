import SwiftUI
import UniformTypeIdentifiers

/// Notched music therapy section allowing users to import their own audio files
/// and apply a spectral notch filter around their tinnitus frequency.
struct NotchedMusicSection: View {

    @Environment(AudioEngineManager.self) private var audioEngine

    @State private var showFilePicker = false
    @State private var selectedFileName: String?
    @State private var selectedFileURL: URL?
    @State private var currentTime: Double = 0
    @State private var isSeeking = false
    @State private var musicVolume: Double = 70
    @State private var notchEnabled = true
    @State private var musicNotchFrequencyText: String = "4000"
    @State private var showImportError = false
    @State private var importErrorMessage = ""

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
                        let hasAccess = url.startAccessingSecurityScopedResource()
                        defer { if hasAccess { url.stopAccessingSecurityScopedResource() } }
                        do {
                            // Read file data into memory while we have access,
                            // then write a local copy so playback works after
                            // the security-scoped resource is released.
                            let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
                            let importDir = docs.appendingPathComponent("ImportedMusic")
                            try FileManager.default.createDirectory(at: importDir, withIntermediateDirectories: true)
                            let localURL = importDir.appendingPathComponent(url.lastPathComponent)
                            let data = try Data(contentsOf: url)
                            try data.write(to: localURL, options: .atomic)
                            try audioEngine.loadAudioFile(localURL)
                            selectedFileURL = localURL
                            selectedFileName = url.lastPathComponent
                        } catch {
                            selectedFileURL = nil
                            selectedFileName = nil
                            importErrorMessage = "This audio file couldn't be loaded. It may be in an unsupported format."
                            showImportError = true
                        }
                    }
                case .failure(let error):
                    importErrorMessage = "File selection failed: \(error.localizedDescription)"
                    showImportError = true
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
                        if audioEngine.isMusicPlaying {
                            audioEngine.pauseMusic()
                        } else {
                            audioEngine.playMusic()
                        }
                    } label: {
                        Label(
                            audioEngine.isMusicPlaying ? "Pause" : "Play",
                            systemImage: audioEngine.isMusicPlaying ? "pause.fill" : "play.fill"
                        )
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(audioEngine.isMusicPlaying ? Color.accentAmber : Color.accentGreen)
                }

                // MARK: - Seek
                VStack(spacing: 4) {
                    Slider(
                        value: $currentTime,
                        in: 0...max(audioEngine.musicDuration, 1),
                        onEditingChanged: { editing in
                            isSeeking = editing
                            if !editing && audioEngine.isMusicPlaying {
                                audioEngine.seekMusic(to: currentTime)
                            }
                        }
                    )
                        .tint(Color.accentCyan)
                    HStack {
                        Text(timeFormatter.string(from: currentTime) ?? "0:00")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                        Spacer()
                        Text(timeFormatter.string(from: audioEngine.musicDuration) ?? "0:00")
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
                    // MARK: - Notch Shape Diagram
                    NotchShapeCanvas(
                        notchFrequency: audioEngine.notchFrequency,
                        notchWidth: audioEngine.notchWidth,
                        notchDepth: audioEngine.notchDepth,
                        isActive: audioEngine.isMusicPlaying && notchEnabled
                    )
                    .frame(height: 120)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .animation(.easeInOut(duration: 0.3), value: audioEngine.notchFrequency)
                    .animation(.easeInOut(duration: 0.3), value: audioEngine.notchWidth)
                    .animation(.easeInOut(duration: 0.3), value: audioEngine.notchDepth)

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
                                .onChange(of: musicNotchFrequencyText) { _, newVal in
                                    let filtered = newVal.filter(\.isNumber)
                                    if filtered != newVal { musicNotchFrequencyText = filtered }
                                }
                                .onSubmit {
                                    if let val = Float(musicNotchFrequencyText), (100...15000).contains(val) {
                                        audioEngine.notchFrequency = val
                                    }
                                    musicNotchFrequencyText = "\(Int(audioEngine.notchFrequency))"
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
        .onReceive(Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()) { _ in
            if audioEngine.isMusicPlaying && !isSeeking {
                currentTime = audioEngine.musicCurrentTime
            }
        }
        .alert("Import Failed", isPresented: $showImportError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(importErrorMessage)
        }
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
