package com.safemobile.app.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.safemobile.app.services.LocationService
import com.safemobile.app.utils.SessionManager

/**
 * Safe Mobile: Persistence Protocol
 * Automatically re-engages the tracking shield after a system reboot.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val actions = listOf(Intent.ACTION_BOOT_COMPLETED, "android.intent.action.QUICKBOOT_POWERON")
        if (actions.contains(intent.action)) {
            val sessionManager = SessionManager(context)
            if (sessionManager.isLoggedIn()) {
                val serviceIntent = Intent(context, LocationService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            }
        }
    }
}