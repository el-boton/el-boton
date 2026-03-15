import Foundation
import Security

struct WidgetCredentials {
    let accessToken: String
    let refreshToken: String
    let userId: String
    let expiresAt: Date
    let apiUrl: String
}

class SharedCredentials {
    private static let appGroupIdentifier = "group.com.elboton.app"
    private static let tokenKey = "widget.auth.token"
    private static let configKey = "widget.api.config"

    static func isAuthenticated() -> Bool {
        return getCredentials() != nil
    }

    static func getCredentials() -> WidgetCredentials? {
        guard let tokenData = getFromSharedDefaults(key: tokenKey),
              let configData = getFromSharedDefaults(key: configKey) else {
            return nil
        }

        do {
            guard let tokenJson = try JSONSerialization.jsonObject(with: tokenData) as? [String: Any],
                  let configJson = try JSONSerialization.jsonObject(with: configData) as? [String: Any] else {
                return nil
            }

            guard let accessToken = tokenJson["access_token"] as? String,
                  let refreshToken = tokenJson["refresh_token"] as? String,
                  let userId = tokenJson["user_id"] as? String,
                  let expiresAtTimestamp = doubleValue(from: tokenJson["expires_at"]),
                  let apiUrl = configJson["url"] as? String else {
                return nil
            }

            let expiresAt = Date(timeIntervalSince1970: expiresAtTimestamp)

            return WidgetCredentials(
                accessToken: accessToken,
                refreshToken: refreshToken,
                userId: userId,
                expiresAt: expiresAt,
                apiUrl: apiUrl
            )
        } catch {
            print("Error parsing credentials: \(error)")
            return nil
        }
    }

    private static func doubleValue(from value: Any?) -> Double? {
        switch value {
        case let number as NSNumber:
            return number.doubleValue
        case let double as Double:
            return double
        case let int as Int:
            return Double(int)
        case let string as String:
            return Double(string)
        default:
            return nil
        }
    }

    private static func getFromSharedDefaults(key: String) -> Data? {
        guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
            return nil
        }
        return defaults.data(forKey: key)
    }

    static func saveCredentials(
        accessToken: String,
        refreshToken: String,
        userId: String,
        expiresAt: TimeInterval,
        apiUrl: String
    ) -> Bool {
        guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
            return false
        }

        do {
            let tokenDict: [String: Any] = [
                "access_token": accessToken,
                "refresh_token": refreshToken,
                "user_id": userId,
                "expires_at": expiresAt
            ]
            let tokenData = try JSONSerialization.data(withJSONObject: tokenDict)
            defaults.set(tokenData, forKey: tokenKey)

            let configDict: [String: Any] = [
                "url": apiUrl
            ]
            let configData = try JSONSerialization.data(withJSONObject: configDict)
            defaults.set(configData, forKey: configKey)

            defaults.synchronize()
            return true
        } catch {
            print("Error saving credentials: \(error)")
            return false
        }
    }

    static func clearCredentials() {
        guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
            return
        }
        defaults.removeObject(forKey: tokenKey)
        defaults.removeObject(forKey: configKey)
        defaults.synchronize()
    }
}
