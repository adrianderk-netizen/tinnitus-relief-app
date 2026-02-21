import AVFoundation
import os.log

/// Configures and manages the AVAudioSession for tinnitus therapy playback.
/// Handles interruptions (phone calls, Siri) and audio route changes (AirPods connect/disconnect).
enum AudioSessionConfig {

    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TinnitusReliefPro",
                                       category: "AudioSession")

    /// Call once at app launch to configure the shared audio session.
    static func configure() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, options: .duckOthers)
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification,
                                               object: session, queue: .main, using: handleInterruption)
        NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification,
                                               object: session, queue: .main, using: handleRouteChange)
        logger.info("Audio session configured: category=playback, options=duckOthers")
    }

    private static func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

        switch type {
        case .began:
            logger.info("Audio session interrupted")
            NotificationCenter.default.post(name: .audioSessionInterrupted, object: nil)
        case .ended:
            let optionsValue = (info[AVAudioSessionInterruptionOptionKey] as? UInt) ?? 0
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            let shouldResume = options.contains(.shouldResume)
            logger.info("Audio interruption ended, shouldResume=\(shouldResume)")
            NotificationCenter.default.post(name: .audioSessionInterruptionEnded,
                                            object: nil, userInfo: ["shouldResume": shouldResume])
        @unknown default:
            break
        }
    }

    private static func handleRouteChange(_ notification: Notification) {
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else { return }
        logger.info("Audio route changed: reason=\(reason.rawValue)")
        NotificationCenter.default.post(name: .audioRouteChanged, object: nil,
                                        userInfo: ["reason": reason])
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let audioSessionInterrupted = Notification.Name("audioSessionInterrupted")
    static let audioSessionInterruptionEnded = Notification.Name("audioSessionInterruptionEnded")
    static let audioRouteChanged = Notification.Name("audioRouteChanged")
}
