import AppIntents
import CoreLocation
import WidgetKit

@available(iOS 17.0, *)
struct TriggerAlertIntent: AppIntent {
    static var title: LocalizedStringResource = "Trigger Emergency Alert"
    static var description = IntentDescription("Sends an emergency alert to your circle")

    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        // 1. Check authentication
        guard let credentials = SharedCredentials.getCredentials() else {
            // Store state for app to handle on open
            UserDefaults(suiteName: "group.com.elboton.app")?.set("login", forKey: "pendingAction")
            return .result()
        }

        // 2. Get current location
        let location: CLLocation
        do {
            location = try await LocationManager.shared.getCurrentLocation()
        } catch {
            UserDefaults(suiteName: "group.com.elboton.app")?.set("error_location", forKey: "pendingAction")
            return .result()
        }

        var nextCredentials = credentials
        let apiClient = BackendAPIClient.shared

        if nextCredentials.expiresAt < Date() {
            do {
                let refreshed = try await apiClient.refreshToken(credentials: nextCredentials)
                let didSave = SharedCredentials.saveCredentials(
                    accessToken: refreshed.accessToken,
                    refreshToken: refreshed.refreshToken,
                    userId: nextCredentials.userId,
                    expiresAt: refreshed.expiresAt,
                    apiUrl: nextCredentials.apiUrl
                )

                guard didSave else {
                    UserDefaults(suiteName: "group.com.elboton.app")?.set("login", forKey: "pendingAction")
                    return .result()
                }

                nextCredentials = WidgetCredentials(
                    accessToken: refreshed.accessToken,
                    refreshToken: refreshed.refreshToken,
                    userId: nextCredentials.userId,
                    expiresAt: Date(timeIntervalSince1970: refreshed.expiresAt),
                    apiUrl: nextCredentials.apiUrl
                )
            } catch {
                UserDefaults(suiteName: "group.com.elboton.app")?.set("login", forKey: "pendingAction")
                return .result()
            }
        }

        // 3. Create alert via backend API
        let alertId: String
        do {
            alertId = try await apiClient.createAlert(
                credentials: nextCredentials,
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude
            )
        } catch {
            UserDefaults(suiteName: "group.com.elboton.app")?.set("error_api", forKey: "pendingAction")
            return .result()
        }

        // 4. Store alert ID for app to navigate to on open
        UserDefaults(suiteName: "group.com.elboton.app")?.set("alert_\(alertId)", forKey: "pendingAction")
        return .result()
    }
}

enum AlertIntentError: Error, LocalizedError {
    case notAuthenticated
    case locationUnavailable
    case apiError(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Please sign in to the app first"
        case .locationUnavailable:
            return "Unable to get your location"
        case .apiError(let message):
            return "Failed to create alert: \(message)"
        }
    }
}
