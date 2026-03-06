package com.elboton.app.widget

import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class BackendApiClient {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    fun createAlert(credentials: Credentials, latitude: Double, longitude: Double): String? {
        val body = mapOf(
            "latitude" to latitude,
            "longitude" to longitude
        )

        val jsonBody = gson.toJson(body)
        val mediaType = "application/json".toMediaType()
        val requestBody = jsonBody.toRequestBody(mediaType)

        val request = Request.Builder()
            .url("${credentials.apiUrl}/alerts")
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("Accept", "application/json")
            .addHeader("Authorization", "Bearer ${credentials.accessToken}")
            .build()

        return try {
            val response = httpClient.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                if (responseBody != null) {
                    val alertObj = gson.fromJson(responseBody, JsonObject::class.java)
                    alertObj.get("id")?.asString
                } else {
                    null
                }
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun refreshToken(credentials: Credentials): RefreshTokenResult? {
        val body = mapOf(
            "refresh_token" to credentials.refreshToken
        )

        val jsonBody = gson.toJson(body)
        val mediaType = "application/json".toMediaType()
        val requestBody = jsonBody.toRequestBody(mediaType)

        val request = Request.Builder()
            .url("${credentials.apiUrl}/auth/refresh")
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("Accept", "application/json")
            .build()

        return try {
            val response = httpClient.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                if (responseBody != null) {
                    val result = gson.fromJson(responseBody, RefreshTokenResponse::class.java)
                    RefreshTokenResult(
                        accessToken = result.access_token,
                        refreshToken = result.refresh_token,
                        expiresAt = System.currentTimeMillis() / 1000 + result.expires_in
                    )
                } else {
                    null
                }
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    data class RefreshTokenResponse(
        val access_token: String,
        val refresh_token: String,
        val expires_in: Long
    )

    data class RefreshTokenResult(
        val accessToken: String,
        val refreshToken: String,
        val expiresAt: Long
    )
}
