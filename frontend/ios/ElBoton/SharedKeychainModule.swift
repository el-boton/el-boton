import Foundation
import React
import WidgetKit

@objc(SharedKeychainModule)
class SharedKeychainModule: NSObject {

    private static let appGroupIdentifier = "group.com.elboton.app"
    private static let tokenKey = "widget.auth.token"
    private static let configKey = "widget.api.config"

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc
    func syncCredentials(_ credentials: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: SharedKeychainModule.appGroupIdentifier) else {
            reject("SYNC_ERROR", "Failed to access shared UserDefaults", nil)
            return
        }

        do {
            // Extract credentials
            guard let accessToken = credentials["accessToken"] as? String,
                  let refreshToken = credentials["refreshToken"] as? String,
                  let userId = credentials["userId"] as? String,
                  let expiresAt = SharedKeychainModule.doubleValue(from: credentials["expiresAt"]),
                  let apiUrl = credentials["apiUrl"] as? String else {
                reject("SYNC_ERROR", "Invalid credentials format", nil)
                return
            }

            // Store token data
            let tokenDict: [String: Any] = [
                "access_token": accessToken,
                "refresh_token": refreshToken,
                "user_id": userId,
                "expires_at": expiresAt
            ]
            let tokenData = try JSONSerialization.data(withJSONObject: tokenDict)
            defaults.set(tokenData, forKey: SharedKeychainModule.tokenKey)

            // Store config data
            let configDict: [String: Any] = [
                "url": apiUrl
            ]
            let configData = try JSONSerialization.data(withJSONObject: configDict)
            defaults.set(configData, forKey: SharedKeychainModule.configKey)

            defaults.synchronize()

            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }

            resolve(true)
        } catch {
            reject("SYNC_ERROR", "Failed to sync credentials: \(error.localizedDescription)", error)
        }
    }

    @objc
    func clearCredentials(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: SharedKeychainModule.appGroupIdentifier) else {
            reject("CLEAR_ERROR", "Failed to access shared UserDefaults", nil)
            return
        }

        defaults.removeObject(forKey: SharedKeychainModule.tokenKey)
        defaults.removeObject(forKey: SharedKeychainModule.configKey)
        defaults.synchronize()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        resolve(true)
    }

    @objc
    func isAuthenticated(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: SharedKeychainModule.appGroupIdentifier),
              let tokenData = defaults.data(forKey: SharedKeychainModule.tokenKey),
              let configData = defaults.data(forKey: SharedKeychainModule.configKey) else {
            resolve(false)
            return
        }

        do {
            guard let tokenJson = try JSONSerialization.jsonObject(with: tokenData) as? [String: Any],
                  let refreshToken = tokenJson["refresh_token"] as? String,
                  let configJson = try JSONSerialization.jsonObject(with: configData) as? [String: Any],
                  let apiUrl = configJson["url"] as? String else {
                resolve(false)
                return
            }

            resolve(!refreshToken.isEmpty && !apiUrl.isEmpty)
        } catch {
            resolve(false)
        }
    }

    @objc
    func getPendingAction(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: SharedKeychainModule.appGroupIdentifier) else {
            resolve(nil)
            return
        }

        let action = defaults.string(forKey: "pendingAction")
        resolve(action)
    }

    @objc
    func clearPendingAction(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: SharedKeychainModule.appGroupIdentifier) else {
            resolve(false)
            return
        }

        defaults.removeObject(forKey: "pendingAction")
        defaults.synchronize()
        resolve(true)
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
}
