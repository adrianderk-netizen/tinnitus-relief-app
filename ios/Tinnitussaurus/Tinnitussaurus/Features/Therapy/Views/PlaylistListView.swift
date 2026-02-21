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
