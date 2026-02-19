# Waveform Oscilloscope & Named Playlists Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a live waveform oscilloscope to the therapy screen and a named-playlist system for notched music therapy.

**Architecture:** The waveform taps into the audio engine's main mixer to capture samples and draws them on a Canvas at ~30fps. Playlists are SwiftData models referencing imported audio files, managed via a sheet UI, with auto-advance playback in AudioEngineManager.

**Tech Stack:** SwiftUI Canvas, AVAudioEngine installTap, SwiftData `@Model`, NavigationStack, FileManager

All paths relative to `ios/TinnitusReliefPro/TinnitusReliefPro/`.

---

## Task 1: Add waveform sample capture to AudioEngineManager

**Files:**
- Modify: `Core/Audio/AudioEngineManager.swift`

**Step 1: Add waveform property and constants**

After the existing `var frequencyData: [Float] = []` (around line 108), add:

```swift
var waveformSamples: [Float] = Array(repeating: 0, count: 200)
private let waveformSampleCount = 200
```

**Step 2: Add waveform tap in startAnalysis()**

In `startAnalysis()`, after the `analyzer.attachToNode(engine.mainMixerNode)` line, install a tap on the main mixer to capture waveform samples:

```swift
private func startAnalysis() {
    guard analysisTimer == nil else { return }
    analyzer.attachToNode(engine.mainMixerNode)

    // Install waveform tap on main mixer
    let bufferSize: AVAudioFrameCount = 1024
    let sampleCount = waveformSampleCount
    engine.mainMixerNode.installTap(onBus: 0, bufferSize: bufferSize, format: nil) { [weak self] buffer, _ in
        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frameCount = Int(buffer.frameLength)
        let stride = max(1, frameCount / sampleCount)
        var samples = [Float](repeating: 0, count: sampleCount)
        for i in 0..<sampleCount {
            let idx = min(i * stride, frameCount - 1)
            samples[i] = channelData[idx]
        }
        Task { @MainActor in
            self?.waveformSamples = samples
        }
    }

    analysisTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
        Task { @MainActor in
            self?.frequencyData = self?.analyzer.magnitudeSpectrum ?? []
        }
    }
}
```

**Step 3: Remove tap in stopAnalysisIfIdle()**

In `stopAnalysisIfIdle()`, add the tap removal before `analyzer.detach()`:

```swift
private func stopAnalysisIfIdle() {
    guard !isTonePlaying, !isNoisePlaying, !isMusicPlaying else { return }
    analysisTimer?.invalidate()
    analysisTimer = nil
    engine.mainMixerNode.removeTap(onBus: 0)
    analyzer.detach()
    frequencyData = []
    waveformSamples = Array(repeating: 0, count: waveformSampleCount)
}
```

**Step 4: Build and verify**

Run:
```bash
cd ios/TinnitusReliefPro && xcodebuild -project TinnitusReliefPro.xcodeproj -scheme TinnitusReliefPro -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

**Step 5: Commit**

```bash
git add TinnitusReliefPro/Core/Audio/AudioEngineManager.swift
git commit -m "Add waveform sample capture tap to audio engine"
```

---

## Task 2: Create WaveformCanvas component

**Files:**
- Create: `SharedViews/Components/WaveformCanvas.swift`

**Step 1: Create the Canvas view**

```swift
import SwiftUI

/// Real-time audio waveform drawn on a Canvas.
/// Displays a rolling oscilloscope-style visualization of the audio output.
struct WaveformCanvas: View {

    var samples: [Float]
    var isActive: Bool

    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            let midY = h / 2

            // Background
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color.bgPrimary))

            // Center line
            var centerLine = Path()
            centerLine.move(to: CGPoint(x: 0, y: midY))
            centerLine.addLine(to: CGPoint(x: w, y: midY))
            context.stroke(centerLine, with: .color(Color.textMuted.opacity(0.15)), style: StrokeStyle(lineWidth: 0.5))

            // Waveform path
            guard !samples.isEmpty else { return }

            var wavePath = Path()
            let pointCount = samples.count
            let xStep = w / CGFloat(max(pointCount - 1, 1))
            let amplitude = midY * 0.85  // leave some padding

            for i in 0..<pointCount {
                let x = CGFloat(i) * xStep
                let sample = CGFloat(samples[i]).clamped(to: -1...1)
                let y = midY - sample * amplitude

                if i == 0 {
                    wavePath.move(to: CGPoint(x: x, y: y))
                } else {
                    wavePath.addLine(to: CGPoint(x: x, y: y))
                }
            }

            let opacity: CGFloat = isActive ? 1.0 : 0.5

            // Glow layer (active only)
            if isActive {
                context.stroke(
                    wavePath,
                    with: .color(Color.accentCyan.opacity(0.3)),
                    style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round)
                )
            }

            // Primary stroke
            context.stroke(
                wavePath,
                with: .color(Color.accentCyan.opacity(opacity)),
                style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)
            )
        }
    }
}

private extension CGFloat {
    func clamped(to range: ClosedRange<CGFloat>) -> CGFloat {
        min(max(self, range.lowerBound), range.upperBound)
    }
}

#Preview {
    VStack {
        WaveformCanvas(
            samples: (0..<200).map { Float(sin(Double($0) * 0.1) * 0.5) },
            isActive: true
        )
        .frame(height: 80)
        .clipShape(RoundedRectangle(cornerRadius: 10))

        WaveformCanvas(samples: Array(repeating: 0, count: 200), isActive: false)
        .frame(height: 80)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
    .padding()
    .background(Color.bgPrimary)
    .preferredColorScheme(.dark)
}
```

**Step 2: Build and verify**

```bash
xcodegen generate && xcodebuild ... build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

**Step 3: Commit**

```bash
git add TinnitusReliefPro/SharedViews/Components/WaveformCanvas.swift
git commit -m "Add WaveformCanvas oscilloscope component"
```

---

## Task 3: Add WaveformCanvas to therapy sections

**Files:**
- Modify: `Features/Therapy/Views/NotchedNoiseSection.swift`
- Modify: `Features/Therapy/Views/NotchedMusicSection.swift`

**Step 1: Add to NotchedNoiseSection**

Insert above the existing `NotchShapeCanvas` block (before line 55's `// MARK: - Spectrum Placeholder`):

```swift
// MARK: - Waveform
WaveformCanvas(
    samples: audioEngine.waveformSamples,
    isActive: audioEngine.isNoisePlaying
)
.frame(height: 80)
.clipShape(RoundedRectangle(cornerRadius: 10))
```

**Step 2: Add to NotchedMusicSection**

Inside the `if notchEnabled {` block, insert above the existing `NotchShapeCanvas`:

```swift
// MARK: - Waveform
WaveformCanvas(
    samples: audioEngine.waveformSamples,
    isActive: audioEngine.isMusicPlaying
)
.frame(height: 80)
.clipShape(RoundedRectangle(cornerRadius: 10))
```

**Step 3: Build, install, and visually verify**

Build, install on simulator, start noise or music playback, confirm the waveform oscillates in real time above the notch shape diagram.

**Step 4: Commit**

```bash
git add TinnitusReliefPro/Features/Therapy/Views/NotchedNoiseSection.swift \
       TinnitusReliefPro/Features/Therapy/Views/NotchedMusicSection.swift
git commit -m "Add live waveform visualization to noise and music sections"
```

---

## Task 4: Create Playlist and PlaylistTrack SwiftData models

**Files:**
- Create: `Core/Data/Models/Playlist.swift`
- Create: `Core/Data/Models/PlaylistTrack.swift`
- Modify: `App/TinnitusReliefProApp.swift`

**Step 1: Create Playlist model**

```swift
import Foundation
import SwiftData

@Model
final class Playlist {
    @Attribute(.unique) var id: UUID
    var name: String
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \PlaylistTrack.playlist)
    var tracks: [PlaylistTrack]

    init(name: String) {
        self.id = UUID()
        self.name = name
        self.createdAt = Date()
        self.tracks = []
    }

    /// Tracks sorted by their sort order.
    var sortedTracks: [PlaylistTrack] {
        tracks.sorted { $0.sortOrder < $1.sortOrder }
    }
}
```

**Step 2: Create PlaylistTrack model**

```swift
import Foundation
import SwiftData

@Model
final class PlaylistTrack {
    @Attribute(.unique) var id: UUID
    var fileName: String
    var relativePath: String
    var sortOrder: Int
    var playlist: Playlist?

    init(fileName: String, relativePath: String, sortOrder: Int) {
        self.id = UUID()
        self.fileName = fileName
        self.relativePath = relativePath
        self.sortOrder = sortOrder
    }

    /// Resolves the full file URL within the app's Documents/ImportedMusic/ directory.
    var fileURL: URL? {
        guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return nil }
        return docs.appendingPathComponent("ImportedMusic").appendingPathComponent(relativePath)
    }
}
```

**Step 3: Register models in ModelContainer**

In `TinnitusReliefProApp.swift`, add `Playlist.self` and `PlaylistTrack.self` to the Schema array:

```swift
let schema = Schema([
    TinnitusSession.self,
    UserProfile.self,
    JournalEntry.self,
    Playlist.self,
    PlaylistTrack.self
])
```

**Step 4: Regenerate Xcode project, build, verify**

```bash
xcodegen generate && xcodebuild ... build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add TinnitusReliefPro/Core/Data/Models/Playlist.swift \
       TinnitusReliefPro/Core/Data/Models/PlaylistTrack.swift \
       TinnitusReliefPro/App/TinnitusReliefProApp.swift
git commit -m "Add Playlist and PlaylistTrack SwiftData models"
```

---

## Task 5: Add playlist queue playback to AudioEngineManager

**Files:**
- Modify: `Core/Audio/AudioEngineManager.swift`

**Step 1: Add playlist queue properties**

After the existing music properties (around line 95), add:

```swift
// Playlist queue
var playlistQueue: [URL] = []
var currentTrackIndex: Int = 0
var currentTrackName: String?
```

**Step 2: Add loadPlaylist method**

After `seekMusic(to:)`, add:

```swift
/// Loads a playlist queue and starts playback from the first track.
func loadPlaylist(_ urls: [URL]) {
    guard !urls.isEmpty else { return }
    playlistQueue = urls
    currentTrackIndex = 0
    loadTrackAt(index: 0)
    playMusic()
}

/// Advances to the next track in the playlist queue.
func playNextTrack() {
    guard !playlistQueue.isEmpty else { return }
    let nextIndex = currentTrackIndex + 1
    if nextIndex < playlistQueue.count {
        currentTrackIndex = nextIndex
        loadTrackAt(index: nextIndex)
        playMusic()
    } else {
        // End of playlist
        playlistQueue = []
        currentTrackIndex = 0
        currentTrackName = nil
        isMusicPlaying = false
        stopAnalysisIfIdle()
        Self.logger.info("Playlist finished")
    }
}

private func loadTrackAt(index: Int) {
    let url = playlistQueue[index]
    do {
        try loadAudioFile(url)
        currentTrackName = url.lastPathComponent
    } catch {
        Self.logger.error("Failed to load track: \(url.lastPathComponent)")
    }
}
```

**Step 3: Update scheduleFile completion to auto-advance**

In `playMusic()`, change the completion handler:

```swift
musicPlayer.scheduleFile(file, at: nil) { [weak self] in
    Task { @MainActor in
        guard let self else { return }
        if !self.playlistQueue.isEmpty {
            self.playNextTrack()
        } else {
            self.isMusicPlaying = false
            self.stopAnalysisIfIdle()
        }
    }
}
```

**Step 4: Clear playlist queue on single-file import**

In `loadAudioFile(_:)`, clear the queue so single imports reset playlist state:

```swift
func loadAudioFile(_ url: URL) throws {
    musicFile = try AVAudioFile(forReading: url)
    currentTrackName = url.lastPathComponent
    playlistQueue = []
    currentTrackIndex = 0
    Self.logger.info("Audio file loaded: \(url.lastPathComponent)")
}
```

**Step 5: Build, verify**

**Step 6: Commit**

```bash
git add TinnitusReliefPro/Core/Audio/AudioEngineManager.swift
git commit -m "Add playlist queue playback to audio engine"
```

---

## Task 6: Create playlist management views

**Files:**
- Create: `Features/Therapy/Views/PlaylistListView.swift`
- Create: `Features/Therapy/Views/PlaylistDetailView.swift`
- Create: `Features/Therapy/Views/PlaylistSheetView.swift`

**Step 1: Create PlaylistListView**

```swift
import SwiftUI
import SwiftData

/// List of all saved playlists.
struct PlaylistListView: View {

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Playlist.createdAt, order: .reverse) private var playlists: [Playlist]

    @State private var newPlaylistName = ""
    @State private var showNewPlaylist = false

    var onPlay: (Playlist) -> Void

    var body: some View {
        List {
            ForEach(playlists) { playlist in
                NavigationLink(value: playlist) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(playlist.name)
                                .font(.headline)
                                .foregroundStyle(Color.textPrimary)
                            Text("\(playlist.tracks.count) track\(playlist.tracks.count == 1 ? "" : "s")")
                                .font(.caption)
                                .foregroundStyle(Color.textMuted)
                        }
                        Spacer()
                        Button {
                            onPlay(playlist)
                        } label: {
                            Image(systemName: "play.circle.fill")
                                .font(.title2)
                                .foregroundStyle(Color.accentGreen)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .onDelete { indexSet in
                for index in indexSet {
                    modelContext.delete(playlists[index])
                }
            }
        }
        .listStyle(.plain)
        .overlay {
            if playlists.isEmpty {
                ContentUnavailableView(
                    "No Playlists",
                    systemImage: "music.note.list",
                    description: Text("Create a playlist to organize your therapy music.")
                )
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showNewPlaylist = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .alert("New Playlist", isPresented: $showNewPlaylist) {
            TextField("Playlist name", text: $newPlaylistName)
            Button("Create") {
                guard !newPlaylistName.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                let playlist = Playlist(name: newPlaylistName.trimmingCharacters(in: .whitespaces))
                modelContext.insert(playlist)
                newPlaylistName = ""
            }
            Button("Cancel", role: .cancel) { newPlaylistName = "" }
        }
    }
}
```

**Step 2: Create PlaylistDetailView**

```swift
import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// Detail view for a single playlist showing its tracks.
struct PlaylistDetailView: View {

    @Environment(\.modelContext) private var modelContext
    @Bindable var playlist: Playlist

    @State private var showFilePicker = false
    @State private var showImportError = false
    @State private var importErrorMessage = ""

    var onPlay: (Playlist) -> Void

    var body: some View {
        List {
            Section {
                if playlist.sortedTracks.isEmpty {
                    Text("No tracks yet. Add some music files.")
                        .foregroundStyle(Color.textMuted)
                        .font(.subheadline)
                } else {
                    ForEach(playlist.sortedTracks) { track in
                        HStack {
                            Image(systemName: "music.note")
                                .foregroundStyle(Color.accentCyan)
                            Text(track.fileName)
                                .foregroundStyle(Color.textPrimary)
                                .lineLimit(1)
                                .truncationMode(.middle)
                        }
                    }
                    .onDelete { indexSet in
                        let sorted = playlist.sortedTracks
                        for index in indexSet {
                            modelContext.delete(sorted[index])
                        }
                    }
                    .onMove { source, destination in
                        var sorted = playlist.sortedTracks
                        sorted.move(fromOffsets: source, toOffset: destination)
                        for (i, track) in sorted.enumerated() {
                            track.sortOrder = i
                        }
                    }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle(playlist.name)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                EditButton()
            }
            ToolbarItem(placement: .bottomBar) {
                HStack {
                    Button {
                        showFilePicker = true
                    } label: {
                        Label("Add Tracks", systemImage: "plus.circle")
                    }
                    Spacer()
                    Button {
                        onPlay(playlist)
                    } label: {
                        Label("Play All", systemImage: "play.fill")
                    }
                    .disabled(playlist.tracks.isEmpty)
                }
            }
        }
        .fileImporter(
            isPresented: $showFilePicker,
            allowedContentTypes: [.audio],
            allowsMultipleSelection: true
        ) { result in
            switch result {
            case .success(let urls):
                let currentMax = playlist.tracks.map(\.sortOrder).max() ?? -1
                for (i, url) in urls.enumerated() {
                    let hasAccess = url.startAccessingSecurityScopedResource()
                    defer { if hasAccess { url.stopAccessingSecurityScopedResource() } }
                    do {
                        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
                        let importDir = docs.appendingPathComponent("ImportedMusic")
                        try FileManager.default.createDirectory(at: importDir, withIntermediateDirectories: true)
                        let localURL = importDir.appendingPathComponent(url.lastPathComponent)
                        let data = try Data(contentsOf: url)
                        try data.write(to: localURL, options: .atomic)

                        let track = PlaylistTrack(
                            fileName: url.lastPathComponent,
                            relativePath: url.lastPathComponent,
                            sortOrder: currentMax + 1 + i
                        )
                        track.playlist = playlist
                        modelContext.insert(track)
                    } catch {
                        importErrorMessage = "Failed to import \(url.lastPathComponent): \(error.localizedDescription)"
                        showImportError = true
                    }
                }
            case .failure(let error):
                importErrorMessage = "File selection failed: \(error.localizedDescription)"
                showImportError = true
            }
        }
        .alert("Import Failed", isPresented: $showImportError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(importErrorMessage)
        }
    }
}
```

**Step 3: Create PlaylistSheetView**

```swift
import SwiftUI
import SwiftData

/// Sheet container for playlist browsing and management.
struct PlaylistSheetView: View {

    @Environment(\.dismiss) private var dismiss
    @Environment(AudioEngineManager.self) private var audioEngine

    var body: some View {
        NavigationStack {
            PlaylistListView { playlist in
                playPlaylist(playlist)
            }
            .navigationTitle("Playlists")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
            .navigationDestination(for: Playlist.self) { playlist in
                PlaylistDetailView(playlist: playlist) { pl in
                    playPlaylist(pl)
                }
            }
        }
    }

    private func playPlaylist(_ playlist: Playlist) {
        let urls = playlist.sortedTracks.compactMap(\.fileURL)
        guard !urls.isEmpty else { return }
        audioEngine.loadPlaylist(urls)
        dismiss()
    }
}
```

**Step 4: Regenerate, build, verify**

```bash
xcodegen generate && xcodebuild ... build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add TinnitusReliefPro/Features/Therapy/Views/PlaylistListView.swift \
       TinnitusReliefPro/Features/Therapy/Views/PlaylistDetailView.swift \
       TinnitusReliefPro/Features/Therapy/Views/PlaylistSheetView.swift
git commit -m "Add playlist management views (list, detail, sheet)"
```

---

## Task 7: Integrate playlists into NotchedMusicSection

**Files:**
- Modify: `Features/Therapy/Views/NotchedMusicSection.swift`

**Step 1: Add state for playlist sheet**

Add to the existing `@State` properties:

```swift
@State private var showPlaylistSheet = false
```

**Step 2: Add Playlists button next to Choose Audio File**

After the "Choose Audio File" button and its `.fileImporter`, add:

```swift
Button {
    showPlaylistSheet = true
} label: {
    Label("Playlists", systemImage: "music.note.list")
        .font(.subheadline.bold())
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
}
.buttonStyle(.borderedProminent)
.tint(Color.accentAmber)
.sheet(isPresented: $showPlaylistSheet) {
    PlaylistSheetView()
}
```

**Step 3: Update track name display**

Replace the existing `if let fileName = selectedFileName` block with one that also shows playlist info:

```swift
if let trackName = audioEngine.currentTrackName ?? selectedFileName {
    HStack {
        Image(systemName: "music.note")
            .foregroundStyle(Color.accentCyan)
        Text(trackName)
            .font(.subheadline)
            .foregroundStyle(Color.textPrimary)
            .lineLimit(1)
            .truncationMode(.middle)
        Spacer()
        if !audioEngine.playlistQueue.isEmpty {
            Text("\(audioEngine.currentTrackIndex + 1)/\(audioEngine.playlistQueue.count)")
                .font(.caption)
                .foregroundStyle(Color.textMuted)
        }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(Color.bgPrimary, in: RoundedRectangle(cornerRadius: 8))
}
```

**Step 4: Update the play controls guard**

Change `if selectedFileURL != nil` to also show controls when a playlist is active:

```swift
if selectedFileURL != nil || !audioEngine.playlistQueue.isEmpty {
```

**Step 5: Build, install, test end-to-end**

Verify: create a playlist in the sheet, add tracks, tap "Play All", confirm tracks auto-advance.

**Step 6: Commit**

```bash
git add TinnitusReliefPro/Features/Therapy/Views/NotchedMusicSection.swift
git commit -m "Integrate playlist sheet and queue display into music section"
```

---

## Task 8: Regenerate Xcode project and final verification

**Step 1: Run xcodegen**

```bash
cd ios/TinnitusReliefPro && xcodegen generate
```

**Step 2: Full build**

```bash
xcodebuild -project TinnitusReliefPro.xcodeproj -scheme TinnitusReliefPro -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build build 2>&1 | tail -5
```

**Step 3: Install and test on simulator**

```bash
xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/TinnitusReliefPro.app
xcrun simctl launch booted com.paulabac.tinnitusreliefpro
```

**Verification checklist:**
1. Therapy tab → Start noise → waveform oscillates above notch diagram
2. Stop noise → waveform goes flat
3. Notched Music → Choose Audio File → file loads and plays → waveform shows
4. Notched Music → Playlists → Create new playlist → Add tracks → Play All
5. Tracks auto-advance when one finishes
6. Track name and "X/Y" indicator update during playlist playback
7. Single file import clears playlist queue

**Step 4: Commit any fixes**

---

## Summary

| Task | Component | Files |
|------|-----------|-------|
| 1 | Waveform capture in AudioEngine | AudioEngineManager.swift |
| 2 | WaveformCanvas component | WaveformCanvas.swift (new) |
| 3 | Wire waveform into therapy views | NotchedNoiseSection, NotchedMusicSection |
| 4 | SwiftData playlist models | Playlist.swift, PlaylistTrack.swift (new), App |
| 5 | Playlist queue in AudioEngine | AudioEngineManager.swift |
| 6 | Playlist management views | 3 new view files |
| 7 | Integrate playlists into music section | NotchedMusicSection.swift |
| 8 | Final build and verification | All |
