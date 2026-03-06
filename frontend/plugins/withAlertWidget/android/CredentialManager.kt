package com.elboton.app.widget

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

data class Credentials(
    val accessToken: String,
    val refreshToken: String,
    val userId: String,
    val expiresAt: Long,
    val apiUrl: String
)

class CredentialManager(private val context: Context) {

    companion object {
        private const val PREFS_NAME = "elboton_widget_prefs"
    }

    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val sharedPreferences: SharedPreferences by lazy {
        try {
            EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback to regular SharedPreferences
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }
    }

    fun isAuthenticated(): Boolean {
        val refreshToken = sharedPreferences.getString("refresh_token", null)
        val userId = sharedPreferences.getString("user_id", null)
        val apiUrl = sharedPreferences.getString("api_url", null)

        return refreshToken != null && userId != null && apiUrl != null
    }

    fun getCredentials(): Credentials? {
        val accessToken = sharedPreferences.getString("access_token", null) ?: return null
        val refreshToken = sharedPreferences.getString("refresh_token", null) ?: return null
        val userId = sharedPreferences.getString("user_id", null) ?: return null
        val expiresAt = sharedPreferences.getLong("expires_at", 0)
        val apiUrl = sharedPreferences.getString("api_url", null) ?: return null

        return Credentials(
            accessToken = accessToken,
            refreshToken = refreshToken,
            userId = userId,
            expiresAt = expiresAt,
            apiUrl = apiUrl
        )
    }

    fun saveCredentials(
        accessToken: String,
        refreshToken: String,
        userId: String,
        expiresAt: Long,
        apiUrl: String
    ) {
        sharedPreferences.edit().apply {
            putString("access_token", accessToken)
            putString("refresh_token", refreshToken)
            putString("user_id", userId)
            putLong("expires_at", expiresAt)
            putString("api_url", apiUrl)
            apply()
        }
    }

    fun clearCredentials() {
        sharedPreferences.edit().clear().apply()
    }
}
