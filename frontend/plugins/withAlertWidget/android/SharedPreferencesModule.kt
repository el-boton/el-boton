package com.elboton.app

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class SharedPreferencesModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SharedPreferencesModule"
        const val PREFS_NAME = "elboton_widget_prefs"
    }

    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(reactApplicationContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val sharedPreferences: SharedPreferences by lazy {
        try {
            EncryptedSharedPreferences.create(
                reactApplicationContext,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback to regular SharedPreferences if encryption fails
            reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun syncCredentials(credentials: ReadableMap, promise: Promise) {
        try {
            val editor = sharedPreferences.edit()

            // Store auth tokens
            if (credentials.hasKey("accessToken")) {
                editor.putString("access_token", credentials.getString("accessToken"))
            }
            if (credentials.hasKey("refreshToken")) {
                editor.putString("refresh_token", credentials.getString("refreshToken"))
            }
            if (credentials.hasKey("userId")) {
                editor.putString("user_id", credentials.getString("userId"))
            }
            if (credentials.hasKey("expiresAt")) {
                editor.putLong("expires_at", credentials.getDouble("expiresAt").toLong())
            }

            // Store backend config
            if (credentials.hasKey("apiUrl")) {
                editor.putString("api_url", credentials.getString("apiUrl"))
            }

            editor.apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SYNC_ERROR", "Failed to sync credentials: ${e.message}")
        }
    }

    @ReactMethod
    fun clearCredentials(promise: Promise) {
        try {
            sharedPreferences.edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", "Failed to clear credentials: ${e.message}")
        }
    }

    @ReactMethod
    fun isAuthenticated(promise: Promise) {
        try {
            val refreshToken = sharedPreferences.getString("refresh_token", null)
            val apiUrl = sharedPreferences.getString("api_url", null)

            val isAuth = refreshToken != null && apiUrl != null
            promise.resolve(isAuth)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
