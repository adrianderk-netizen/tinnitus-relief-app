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
