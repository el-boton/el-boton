import Foundation

class BackendAPIClient {
    static let shared = BackendAPIClient()

    private init() {}

    func createAlert(
        credentials: WidgetCredentials,
        latitude: Double,
        longitude: Double
    ) async throws -> String {
        let url = URL(string: "\(credentials.apiUrl)/alerts")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(credentials.accessToken)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "latitude": latitude,
            "longitude": longitude
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AlertIntentError.apiError("Invalid response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw AlertIntentError.apiError("Status \(httpResponse.statusCode): \(errorBody)")
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let alertId = json["id"] as? String else {
            throw AlertIntentError.apiError("Failed to parse alert response")
        }

        return alertId
    }

    func refreshToken(credentials: WidgetCredentials) async throws -> (accessToken: String, refreshToken: String, expiresAt: TimeInterval) {
        let url = URL(string: "\(credentials.apiUrl)/auth/refresh")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let body: [String: Any] = [
            "refresh_token": credentials.refreshToken
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AlertIntentError.apiError("Token refresh failed")
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let accessToken = json["access_token"] as? String,
              let refreshToken = json["refresh_token"] as? String,
              let expiresIn = json["expires_in"] as? Int else {
            throw AlertIntentError.apiError("Failed to parse refresh response")
        }

        let expiresAt = Date().timeIntervalSince1970 + Double(expiresIn)
        return (accessToken, refreshToken, expiresAt)
    }
}
