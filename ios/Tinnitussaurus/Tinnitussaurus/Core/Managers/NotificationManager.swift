import UserNotifications
import Observation
import os.log

/// Handles local notification permissions and scheduling for daily therapy reminders.
@Observable
@MainActor
final class NotificationManager {

    private let center = UNUserNotificationCenter.current()
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "Tinnitussaurus",
                                category: "NotificationManager")

    /// Identifier used for the repeating daily reminder so it can be cancelled/updated.
    private static let dailyReminderID = "daily_therapy_reminder"

    // MARK: - Permission

    /// Requests notification authorization. Returns `true` if the user granted permission.
    @discardableResult
    func requestPermission() async -> Bool {
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            logger.info("Notification permission \(granted ? "granted" : "denied")")
            return granted
        } catch {
            logger.error("Notification permission request failed: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - Scheduling

    /// Schedules (or reschedules) a daily repeating notification at the specified time.
    func scheduleDailyReminder(hour: Int, minute: Int) {
        // Remove any existing reminder first so we don't stack duplicates.
        cancelReminders()

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let content = UNMutableNotificationContent()
        content.title = "Time for your therapy session"
        content.body = "A few minutes of therapy each day can make a real difference. Tap to start."
        content.sound = .default

        let request = UNNotificationRequest(identifier: Self.dailyReminderID,
                                            content: content,
                                            trigger: trigger)

        center.add(request) { [logger] error in
            if let error {
                logger.error("Failed to schedule reminder: \(error.localizedDescription)")
            } else {
                logger.info("Daily reminder scheduled for \(hour):\(String(format: "%02d", minute))")
            }
        }
    }

    /// Cancels all pending therapy reminder notifications.
    func cancelReminders() {
        center.removePendingNotificationRequests(withIdentifiers: [Self.dailyReminderID])
        logger.info("Daily reminder cancelled")
    }
}
