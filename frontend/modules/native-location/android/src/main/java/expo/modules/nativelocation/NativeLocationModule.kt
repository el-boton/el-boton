package expo.modules.nativelocation

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class NativeLocationModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw Exception("React context is null")

    private val locationManager: LocationManager
        get() = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager

    override fun definition() = ModuleDefinition {
        Name("NativeLocation")

        AsyncFunction("getCurrentPosition") { timeoutMs: Int, promise: Promise ->
            getCurrentPosition(timeoutMs.toLong(), promise)
        }

        AsyncFunction("getLastKnownPosition") { promise: Promise ->
            getLastKnownPosition(promise)
        }
    }

    private fun getCurrentPosition(timeoutMs: Long, promise: Promise) {
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted", null)
            return
        }

        val handler = Handler(Looper.getMainLooper())
        var resolved = false

        val timeoutRunnable = Runnable {
            if (!resolved) {
                resolved = true
                // Try last known as fallback on timeout
                val lastKnown = getLastKnownLocationInternal()
                if (lastKnown != null) {
                    promise.resolve(locationToMap(lastKnown))
                } else {
                    promise.reject("TIMEOUT", "Location request timed out", null)
                }
            }
        }

        handler.postDelayed(timeoutRunnable, timeoutMs)

        val locationListener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                if (!resolved) {
                    resolved = true
                    handler.removeCallbacks(timeoutRunnable)
                    promise.resolve(locationToMap(location))
                    try {
                        locationManager.removeUpdates(this)
                    } catch (e: Exception) {}
                }
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        try {
            // Try GPS first
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                handler.post {
                    try {
                        locationManager.requestLocationUpdates(
                            LocationManager.GPS_PROVIDER,
                            0L,
                            0f,
                            locationListener,
                            Looper.getMainLooper()
                        )
                    } catch (e: SecurityException) {
                        if (!resolved) {
                            resolved = true
                            handler.removeCallbacks(timeoutRunnable)
                            promise.reject("PERMISSION_DENIED", e.message, e)
                        }
                    }
                }
            }
            // Also try network provider as backup
            else if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                handler.post {
                    try {
                        locationManager.requestLocationUpdates(
                            LocationManager.NETWORK_PROVIDER,
                            0L,
                            0f,
                            locationListener,
                            Looper.getMainLooper()
                        )
                    } catch (e: SecurityException) {
                        if (!resolved) {
                            resolved = true
                            handler.removeCallbacks(timeoutRunnable)
                            promise.reject("PERMISSION_DENIED", e.message, e)
                        }
                    }
                }
            } else {
                // No providers, try last known
                handler.removeCallbacks(timeoutRunnable)
                val lastKnown = getLastKnownLocationInternal()
                if (lastKnown != null && !resolved) {
                    resolved = true
                    promise.resolve(locationToMap(lastKnown))
                } else if (!resolved) {
                    resolved = true
                    promise.reject("NO_PROVIDER", "No location provider available", null)
                }
            }
        } catch (e: Exception) {
            if (!resolved) {
                resolved = true
                handler.removeCallbacks(timeoutRunnable)
                promise.reject("ERROR", e.message, e)
            }
        }
    }

    private fun getLastKnownPosition(promise: Promise) {
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted", null)
            return
        }

        val location = getLastKnownLocationInternal()
        if (location != null) {
            promise.resolve(locationToMap(location))
        } else {
            promise.resolve(null)
        }
    }

    private fun getLastKnownLocationInternal(): Location? {
        try {
            var bestLocation: Location? = null

            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                val gpsLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                if (gpsLocation != null) {
                    bestLocation = gpsLocation
                }
            }

            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                val networkLocation = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                if (networkLocation != null) {
                    if (bestLocation == null || networkLocation.time > bestLocation.time) {
                        bestLocation = networkLocation
                    }
                }
            }

            // Try passive provider too
            val passiveLocation = locationManager.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER)
            if (passiveLocation != null) {
                if (bestLocation == null || passiveLocation.time > bestLocation.time) {
                    bestLocation = passiveLocation
                }
            }

            return bestLocation
        } catch (e: SecurityException) {
            return null
        }
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
               ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    private fun locationToMap(location: Location): Map<String, Any?> {
        return mapOf(
            "latitude" to location.latitude,
            "longitude" to location.longitude,
            "altitude" to location.altitude,
            "accuracy" to location.accuracy.toDouble(),
            "speed" to location.speed.toDouble(),
            "timestamp" to location.time
        )
    }
}
