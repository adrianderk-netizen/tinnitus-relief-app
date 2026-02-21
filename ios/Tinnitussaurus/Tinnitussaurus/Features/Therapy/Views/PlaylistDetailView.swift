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
