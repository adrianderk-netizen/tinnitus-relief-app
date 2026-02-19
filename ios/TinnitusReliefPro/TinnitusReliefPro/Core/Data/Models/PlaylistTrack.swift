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
