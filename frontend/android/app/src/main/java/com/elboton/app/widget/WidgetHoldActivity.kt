package com.elboton.app.widget

import android.Manifest
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class WidgetHoldActivity : AppCompatActivity() {

    companion object {
        private const val HOLD_DURATION = 3000L // 3 seconds
        private const val LOCATION_PERMISSION_REQUEST = 1001
    }

    private var holdStartTime: Long = 0
    private var isHolding = false
    private var progressAnimator: ObjectAnimator? = null
    private var alertJob: Job? = null

    private lateinit var progressBar: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var buttonContainer: FrameLayout
    private lateinit var vibrator: Vibrator

    private val handler = Handler(Looper.getMainLooper())
    private val holdCompleteRunnable = Runnable { onHoldComplete() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        vibrator = getSystemService(Vibrator::class.java)

        // Create UI programmatically
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#80000000")) // Semi-transparent black
            isClickable = true
            isFocusable = true

            setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        startHold()
                        true
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        cancelHold()
                        true
                    }
                    else -> false
                }
            }

            // Tap outside to dismiss
            setOnClickListener {
                if (!isHolding) {
                    finish()
                }
            }
        }

        // Button container
        buttonContainer = FrameLayout(this).apply {
            val size = (200 * resources.displayMetrics.density).toInt()
            layoutParams = FrameLayout.LayoutParams(size, size).apply {
                gravity = Gravity.CENTER
            }
        }

        // Background circle
        val backgroundCircle = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#DC2626"))
            }
        }

        // Progress bar (circular)
        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            isIndeterminate = false
            max = 100
            progress = 0
            progressDrawable = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setStroke(8, Color.WHITE)
            }
        }

        // Status text
        statusText = TextView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.CENTER
            }
            text = "HOLD\nTO ALERT"
            textSize = 18f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setTypeface(null, android.graphics.Typeface.BOLD)
        }

        buttonContainer.addView(backgroundCircle)
        buttonContainer.addView(progressBar)
        buttonContainer.addView(statusText)
        rootLayout.addView(buttonContainer)

        setContentView(rootLayout)
    }

    private fun startHold() {
        isHolding = true
        holdStartTime = System.currentTimeMillis()

        // Vibrate on start
        vibrate(30)

        // Start progress animation
        progressAnimator = ObjectAnimator.ofInt(progressBar, "progress", 0, 100).apply {
            duration = HOLD_DURATION
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }

        // Update status text periodically
        updateStatusText()

        // Schedule completion
        handler.postDelayed(holdCompleteRunnable, HOLD_DURATION)
    }

    private fun cancelHold() {
        if (!isHolding) return

        isHolding = false
        handler.removeCallbacks(holdCompleteRunnable)
        progressAnimator?.cancel()
        progressBar.progress = 0

        statusText.text = "HOLD\nTO ALERT"

        // Vibrate on cancel
        vibrate(15)

        // Close activity after brief delay
        handler.postDelayed({ finish() }, 200)
    }

    private fun updateStatusText() {
        if (!isHolding) return

        val elapsed = System.currentTimeMillis() - holdStartTime
        val progress = (elapsed.toFloat() / HOLD_DURATION * 100).toInt()

        statusText.text = when {
            progress < 33 -> "HOLD\nTO ALERT"
            progress < 66 -> "KEEP\nHOLDING"
            progress < 95 -> "ALMOST\nTHERE"
            else -> "SENDING..."
        }

        if (isHolding) {
            handler.postDelayed({ updateStatusText() }, 100)
        }
    }

    private fun onHoldComplete() {
        if (!isHolding) return

        // Success vibration pattern
        vibrate(longArrayOf(0, 80, 50, 80, 50, 120))

        statusText.text = "SENDING..."

        // Check location permission
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            // Open app for permission
            openAppWithError("location")
            return
        }

        // Trigger alert
        triggerAlert()
    }

    private fun triggerAlert() {
        alertJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                val credentialManager = CredentialManager(this@WidgetHoldActivity)
                var credentials = credentialManager.getCredentials()

                if (credentials == null) {
                    withContext(Dispatchers.Main) {
                        openAppWithError("auth")
                    }
                    return@launch
                }

                // Get location
                val locationHelper = LocationHelper(this@WidgetHoldActivity)
                val location = locationHelper.getCurrentLocation()

                if (location == null) {
                    withContext(Dispatchers.Main) {
                        openAppWithError("location")
                    }
                    return@launch
                }

                val backendApiClient = BackendApiClient()
                val now = System.currentTimeMillis() / 1000

                if (credentials.expiresAt <= now) {
                    val refreshed = backendApiClient.refreshToken(credentials)
                    if (refreshed == null) {
                        withContext(Dispatchers.Main) {
                            openAppWithError("auth")
                        }
                        return@launch
                    }

                    credentialManager.saveCredentials(
                        accessToken = refreshed.accessToken,
                        refreshToken = refreshed.refreshToken,
                        userId = credentials.userId,
                        expiresAt = refreshed.expiresAt,
                        apiUrl = credentials.apiUrl
                    )

                    credentials = credentials.copy(
                        accessToken = refreshed.accessToken,
                        refreshToken = refreshed.refreshToken,
                        expiresAt = refreshed.expiresAt
                    )
                }

                // Create alert
                val alertId = backendApiClient.createAlert(
                    credentials,
                    location.latitude,
                    location.longitude
                )

                withContext(Dispatchers.Main) {
                    if (alertId != null) {
                        // Success - open app to alert detail
                        openAlertDetail(alertId)
                    } else {
                        openAppWithError("api")
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    openAppWithError("api")
                }
            }
        }
    }

    private fun openAlertDetail(alertId: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("elboton://alert/$alertId")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(intent)
        finish()
    }

    private fun openAppWithError(errorType: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("elboton://error?type=$errorType")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(intent)
        finish()
    }

    private fun vibrate(duration: Long) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(duration)
        }
    }

    private fun vibrate(pattern: LongArray) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
        progressAnimator?.cancel()
        alertJob?.cancel()
    }

    override fun onBackPressed() {
        if (isHolding) {
            cancelHold()
        } else {
            super.onBackPressed()
        }
    }
}
