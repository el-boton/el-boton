package com.elboton.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.elboton.app.R

class AlertWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget added for the first time
    }

    override fun onDisabled(context: Context) {
        // Last widget instance removed
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val credentialManager = CredentialManager(context)
            val isAuthenticated = credentialManager.isAuthenticated()

            if (isAuthenticated) {
                val views = RemoteViews(context.packageName, R.layout.widget_alert_button)

                val intent = Intent(context, WidgetHoldActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                }

                val pendingIntent = PendingIntent.getActivity(
                    context,
                    appWidgetId,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                views.setOnClickPendingIntent(R.id.alert_button, pendingIntent)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } else {
                val views = RemoteViews(context.packageName, R.layout.widget_alert_unauthenticated)

                val packageManager = context.packageManager
                val launchIntent = packageManager.getLaunchIntentForPackage(context.packageName)
                launchIntent?.let {
                    it.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    val pendingIntent = PendingIntent.getActivity(
                        context,
                        appWidgetId,
                        it,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.login_button, pendingIntent)
                }

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
    }
}
