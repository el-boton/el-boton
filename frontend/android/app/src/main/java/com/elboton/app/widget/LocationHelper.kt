package com.elboton.app.widget

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.app.ActivityCompat
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class LocationHelper(private val context: Context) {

    private val locationManager: LocationManager =
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager

    suspend fun getCurrentLocation(): Location? {
        // Check permissions
        if (ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }

        return suspendCancellableCoroutine { continuation ->
            val handler = Handler(Looper.getMainLooper())
            var resolved = false
            val timeoutMs = 15000L

            val timeoutRunnable = Runnable {
                if (!resolved) {
                    resolved = true
                    // Return last known on timeout
                    continuation.resume(getLastKnownLocation())
                }
            }

            handler.postDelayed(timeoutRunnable, timeoutMs)

            val locationListener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    if (!resolved) {
                        resolved = true
                        handler.removeCallbacks(timeoutRunnable)
                        continuation.resume(location)
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
                // Try GPS provider first
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
                                continuation.resume(null)
                            }
                        }
                    }
                }
                // Also try network provider
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
                                continuation.resume(null)
                            }
                        }
                    }
                } else {
                    // No providers available, return last known
                    handler.removeCallbacks(timeoutRunnable)
                    if (!resolved) {
                        resolved = true
                        continuation.resume(getLastKnownLocation())
                    }
                }
            } catch (e: Exception) {
                if (!resolved) {
                    resolved = true
                    handler.removeCallbacks(timeoutRunnable)
                    continuation.resume(null)
                }
            }

            continuation.invokeOnCancellation {
                handler.removeCallbacks(timeoutRunnable)
                try {
                    locationManager.removeUpdates(locationListener)
                } catch (e: Exception) {}
            }
        }
    }

    private fun getLastKnownLocation(): Location? {
        if (ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }

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
}
