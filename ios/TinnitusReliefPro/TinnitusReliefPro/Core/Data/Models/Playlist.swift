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
