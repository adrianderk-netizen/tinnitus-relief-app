import Foundation
import SwiftData

/// A named profile that stores a user's tinnitus calibration, preferred settings,
/// and therapy history. Supports multiple profiles so family members can share a device.
@Model
final class UserProfile {

    /// Display name, also used as a stable lookup key.
    @Attribute(.unique) var name: String

    /// Global volume multiplier applied to all audio output (0 = muted, 1 = full).
    var masterVolume: Float

    /// Calibrated tinnitus frequency for the left ear in Hz.
    var matchedFrequencyLeft: Float?

    /// Calibrated tinnitus frequency for the right ear in Hz.
    var matchedFrequencyRight: Float?

    // MARK: - Tone Therapy Settings

    /// Waveform shape: "sine", "triangle", "sawtooth", "square".
    var toneWaveform: String

    /// Fine-tune offset in Hz applied on top of the matched frequency.
    var toneFinetuneHz: Float

    /// Whether the tone in the right channel is phase-inverted relative to the left.
    var tonePhaseInverted: Bool

    // MARK: - Noise Therapy Settings

    /// Background noise color: "white", "pink", "brown".
    var noiseType: String

    /// Volume multiplier for the background noise layer (0-1).
    var noiseVolume: Float

    /// Center frequency (Hz) of the notch filter applied to noise/music.
    var notchFrequency: Float

    /// Notch bandwidth as an octave fraction string: "0.5", "1", "1.5", "2".
    var notchWidth: String

    /// Depth of the notch filter (0 = no notch, 1 = full suppression).
    var notchDepth: Float

    // MARK: - Metadata

    var createdDate: Date
    var lastModified: Date

    // MARK: - Relationships

    /// All therapy sessions recorded under this profile, ordered newest-first.
    @Relationship(deleteRule: .cascade, inverse: \TinnitusSession.profile)
    var sessions: [TinnitusSession]

    // MARK: - Initializer

    init(
        name: String,
        masterVolume: Float = 0.5,
        matchedFrequencyLeft: Float? = nil,
        matchedFrequencyRight: Float? = nil,
        toneWaveform: String = "sine",
        toneFinetuneHz: Float = 0,
        tonePhaseInverted: Bool = false,
        noiseType: String = "pink",
        noiseVolume: Float = 0.5,
        notchFrequency: Float = 4000,
        notchWidth: String = "1",
        notchDepth: Float = 1.0,
        createdDate: Date = .now,
        lastModified: Date = .now,
        sessions: [TinnitusSession] = []
    ) {
        self.name = name
        self.masterVolume = masterVolume
        self.matchedFrequencyLeft = matchedFrequencyLeft
        self.matchedFrequencyRight = matchedFrequencyRight
        self.toneWaveform = toneWaveform
        self.toneFinetuneHz = toneFinetuneHz
        self.tonePhaseInverted = tonePhaseInverted
        self.noiseType = noiseType
        self.noiseVolume = noiseVolume
        self.notchFrequency = notchFrequency
        self.notchWidth = notchWidth
        self.notchDepth = notchDepth
        self.createdDate = createdDate
        self.lastModified = lastModified
        self.sessions = sessions
    }

    // MARK: - Computed Properties

    /// Aggregate duration in seconds across all sessions for this profile.
    var totalDurationSeconds: Int {
        sessions.reduce(0) { $0 + $1.durationSeconds }
    }

    /// Number of therapy sessions recorded for this profile.
    var sessionCount: Int {
        sessions.count
    }
}
