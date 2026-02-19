# Waveform Oscilloscope & Named Playlists Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a live waveform visualization to the therapy screen and a playlist system for the notched music feature.

**Architecture:** Two independent features sharing the same therapy tab. The waveform taps into the existing audio engine buffer. Playlists use SwiftData for persistence and a sheet-based UI for management.

**Tech Stack:** SwiftUI Canvas, AVAudioEngine tap, SwiftData, NavigationStack

---

## Feature 1: Live Waveform Oscilloscope

### Component

New file: `SharedViews/Components/WaveformCanvas.swift`

A Canvas-based SwiftUI view that draws a real-time audio waveform.

**Interface:**
```swift
struct WaveformCanvas: View {
    var samples: [Float]  // normalized -1.0 to 1.0
    var isActive: Bool
}
```

### Audio Data Pipeline

`AudioEngineManager` already installs an audio tap for FFT analysis. We add a waveform sample buffer:

- New published property: `var waveformSamples: [Float] = []`
- In the existing `installTap` callback (or a new tap on `mainMixerNode`), capture the last ~1024 samples from the audio buffer
- Downsample to ~200 display points for the Canvas
- Update rate: ~30fps (throttle via frame count in the tap callback)

### Drawing Layers

1. Background: `Color.bgPrimary`
2. Center line: `Color.textMuted.opacity(0.15)`, 0.5pt horizontal at y-center
3. Waveform stroke: `Color.accentCyan`, 1.5pt line connecting sample points
4. Glow layer (active only): `Color.accentCyan.opacity(0.3)`, 4pt stroke behind main line
5. When inactive: flat line at center, 0.5 opacity

### Placement

- `NotchedNoiseSection`: above NotchShapeCanvas, 80pt height
- `NotchedMusicSection`: above NotchShapeCanvas (inside `if notchEnabled`), 80pt height
- Both pass `audioEngine.waveformSamples` and the respective `isPlaying` flag

---

## Feature 2: Named Playlists

### Data Models

New SwiftData models in `Core/Data/Models/`:

**Playlist.swift:**
```swift
@Model
final class Playlist {
    @Attribute(.unique) var id: UUID
    var name: String
    var createdAt: Date
    @Relationship(deleteRule: .cascade, inverse: \PlaylistTrack.playlist)
    var tracks: [PlaylistTrack]
}
```

**PlaylistTrack.swift:**
```swift
@Model
final class PlaylistTrack {
    @Attribute(.unique) var id: UUID
    var fileName: String         // display name
    var relativePath: String     // path within Documents/ImportedMusic/
    var sortOrder: Int
    var playlist: Playlist?
}
```

Register both models in the app's `ModelContainer` configuration.

### File Storage

Imported audio files live in `Documents/ImportedMusic/`. Playlist tracks reference files by `relativePath` relative to that directory. The existing file import code already copies files there.

### UI Views

All new views in `Features/Therapy/Views/`:

**PlaylistSheetView.swift** — Sheet container with NavigationStack. Entry point presented from NotchedMusicSection.

**PlaylistListView.swift** — List of all playlists.
- Each row shows: playlist name, track count, total duration
- Tap to navigate to detail
- "New Playlist" button at top
- Swipe to delete

**PlaylistDetailView.swift** — Single playlist view.
- Editable playlist name (inline)
- List of tracks with drag-to-reorder handles
- "Add Tracks" button (opens file picker, imports to ImportedMusic/, adds PlaylistTrack)
- Swipe to remove individual track
- "Play All" button

### Audio Engine Changes

New properties/methods on `AudioEngineManager`:

```swift
// Queue state
var playlistQueue: [URL] = []
var currentTrackIndex: Int = 0
var currentTrackName: String?
var isPlayingPlaylist: Bool { !playlistQueue.isEmpty && isMusicPlaying }

// Methods
func loadPlaylist(_ urls: [URL])     // sets queue, loads first track
func playNextTrack()                  // advance index, load + play
func playPreviousTrack()              // go back (if index > 0)
```

The existing `scheduleFile` completion handler calls `playNextTrack()` when the current track finishes.

### NotchedMusicSection Changes

- Add "Playlists" button next to "Choose Audio File"
- When a playlist is active, show current track name and "Track X of Y"
- The existing play/pause/seek controls work on the current track
- Notch filter applies equally to all tracks

### Playback Behavior

- Playing a playlist: sets `playlistQueue` with file URLs, starts from track 0
- Track finishes: auto-advances to next track via completion handler
- Last track finishes: stops playback, resets to track 0
- Single file import: clears any active playlist queue
- No shuffle/repeat in v1

---

## What's NOT Included (v1)

- Skip forward/back buttons (tracks auto-advance only)
- Shuffle / repeat modes
- Album art display
- Background playback controls (lock screen)
- Playlist import/export
