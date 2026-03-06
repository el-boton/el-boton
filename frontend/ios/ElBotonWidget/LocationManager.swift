import CoreLocation

class LocationManager: NSObject, CLLocationManagerDelegate {
    static let shared = LocationManager()

    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<CLLocation, Error>?
    private var timeoutTask: Task<Void, Never>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func getCurrentLocation() async throws -> CLLocation {
        // Check authorization status
        let status = manager.authorizationStatus

        switch status {
        case .notDetermined:
            throw AlertIntentError.locationUnavailable
        case .restricted, .denied:
            throw AlertIntentError.locationUnavailable
        case .authorizedAlways, .authorizedWhenInUse:
            break
        @unknown default:
            throw AlertIntentError.locationUnavailable
        }

        // Try to get last known location first (faster)
        if let lastLocation = manager.location,
           lastLocation.timestamp.timeIntervalSinceNow > -60 { // Within last minute
            return lastLocation
        }

        // Request fresh location
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation

            // Set timeout
            self.timeoutTask = Task {
                try? await Task.sleep(nanoseconds: 10_000_000_000) // 10 seconds
                if self.continuation != nil {
                    self.continuation?.resume(throwing: AlertIntentError.locationUnavailable)
                    self.continuation = nil
                    self.manager.stopUpdatingLocation()
                }
            }

            manager.requestLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else { return }

        timeoutTask?.cancel()
        timeoutTask = nil

        continuation?.resume(returning: location)
        continuation = nil
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        timeoutTask?.cancel()
        timeoutTask = nil

        continuation?.resume(throwing: AlertIntentError.locationUnavailable)
        continuation = nil
    }
}
