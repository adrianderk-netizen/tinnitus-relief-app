import Foundation
import UIKit
import os.log

/// Manages the lifecycle of an active therapy session: start, pause, resume, stop.
///
/// **Critical fix vs. web version:** Pause time is tracked cumulatively via
/// `totalPauseDuration`. When the user pauses, `pauseStartTime` is recorded.
/// On resume, the delta is added to `totalPauseDuration`. On stop, elapsed time
/// is `(now - startTime - totalPauseDuration)`, which correctly handles any
/// number of pause/resume cycles. The web version's bug causes drift because it
/// only tracks a single pause offset rather than accumulating across cycles.
@Observable
@MainActor
final class SessionManager {

    // MARK: - Published State

    private(set) var isRunning = false
    private(set) var isPaused = false
    private(set) var startTime: Date?
    private(set) var totalPauseDuration: TimeInterval = 0
    private(set) var pauseStartTime: Date?
    private(set) var elapsedSeconds: Int = 0

    /// The target duration for this session in seconds. Zero means untimed (free run).
    var durationSeconds: Int = 0

    // MARK: - Callbacks

    /// Called on the main actor when the session timer reaches `durationSeconds`.
    var onComplete: (() -> Void)?

    // MARK: - Private

    private var timer: Timer?
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "Tinnitussaurus",
                                category: "SessionManager")

    // MARK: - Computed Properties

    /// Seconds remaining until the session target, clamped to zero for untimed sessions.
    var timeRemaining: Int {
        guard durationSeconds > 0 else { return 0 }
        return max(0, durationSeconds - elapsedSeconds)
    }

    /// Progress fraction from 0 (just started) to 1 (complete). Returns 0 for untimed sessions.
    var progress: Double {
        guard durationSeconds > 0 else { return 0 }
        return min(1.0, Double(elapsedSeconds) / Double(durationSeconds))
    }

    /// Human-readable countdown string.
    var timeRemainingFormatted: String {
        let remaining = timeRemaining
        let hours = remaining / 3600
        let minutes = (remaining % 3600) / 60
        let seconds = remaining % 60
        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    /// Human-readable elapsed string.
    var elapsedFormatted: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60
        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    // MARK: - Lifecycle

    /// Starts (or restarts) the session timer.
    func start() {
        stop()  // clean up any previous session

        startTime = .now
        totalPauseDuration = 0
        pauseStartTime = nil
        elapsedSeconds = 0
        isRunning = true
        isPaused = false

        UIApplication.shared.isIdleTimerDisabled = true
        startTimer()
        logger.info("Session started, target=\(self.durationSeconds)s")
    }

    /// Pauses the running session. Subsequent `resume()` continues where it left off.
    func pause() {
        guard isRunning, !isPaused else { return }
        isPaused = true
        pauseStartTime = .now
        timer?.invalidate()
        timer = nil
        logger.info("Session paused at \(self.elapsedSeconds)s")
    }

    /// Resumes a paused session, accumulating the paused duration.
    func resume() {
        guard isRunning, isPaused else { return }
        if let pauseStart = pauseStartTime {
            totalPauseDuration += Date.now.timeIntervalSince(pauseStart)
        }
        pauseStartTime = nil
        isPaused = false
        startTimer()
        logger.info("Session resumed, total pause=\(self.totalPauseDuration)s")
    }

    /// Stops the session and calculates the final elapsed time.
    /// Returns the accurate elapsed seconds with all pause time subtracted.
    @discardableResult
    func stop() -> Int {
        timer?.invalidate()
        timer = nil

        // If currently paused, account for the last un-resumed pause interval.
        if isPaused, let pauseStart = pauseStartTime {
            totalPauseDuration += Date.now.timeIntervalSince(pauseStart)
        }

        if let start = startTime {
            let rawElapsed = Date.now.timeIntervalSince(start)
            elapsedSeconds = max(0, Int(rawElapsed - totalPauseDuration))
        }

        let finalElapsed = elapsedSeconds
        isRunning = false
        isPaused = false
        startTime = nil
        pauseStartTime = nil
        UIApplication.shared.isIdleTimerDisabled = false
        logger.info("Session stopped, elapsed=\(finalElapsed)s")
        return finalElapsed
    }

    // MARK: - Timer

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tick()
            }
        }
    }

    private func tick() {
        guard isRunning, !isPaused, let start = startTime else { return }
        let rawElapsed = Date.now.timeIntervalSince(start)
        elapsedSeconds = max(0, Int(rawElapsed - totalPauseDuration))

        // Auto-complete if we've hit the target duration.
        if durationSeconds > 0, elapsedSeconds >= durationSeconds {
            logger.info("Session auto-completed at \(self.elapsedSeconds)s")
            stop()
            onComplete?()
        }
    }
}
