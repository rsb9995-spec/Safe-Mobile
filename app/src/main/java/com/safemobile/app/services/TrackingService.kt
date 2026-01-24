package com.safemobile.app.services

import android.app.*
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.safemobile.app.R
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import com.safemobile.app.receivers.SafeAdminReceiver

class TrackingService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    
    companion object {
        private const val TAG = "SafeTrackingService"
        private const val NOTIFICATION_ID = 101
        private const val CHANNEL_ID = "tactical_tracking_channel"
        private const val ACCURACY_THRESHOLD_METERS = 50f
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        
        // Robust Foreground Notification to prevent system termination
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Safe Mobile: Tactical Shield Active")
            .setContentText("Uplink established. Monitoring device telemetry 24/7.")
            .setSmallIcon(R.drawable.ic_security)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()

        startForeground(NOTIFICATION_ID, notification)
        
        startHighAccuracyTracking()
        listenForRemoteCommands()
        
        return START_STICKY
    }

    private fun startHighAccuracyTracking() {
        // High-end location configuration for tactical precision
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000L)
            .setMinUpdateIntervalMillis(5000L)
            .setMaxUpdateDelayMillis(15000L)
            .setWaitForAccurateLocation(true)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                val userId = auth.currentUser?.uid ?: return
                val location = locationResult.lastLocation ?: return
                
                // DISCARD LOW QUALITY DATA: Discard if accuracy is worse than 50 meters
                if (location.accuracy > ACCURACY_THRESHOLD_METERS) {
                    Log.d(TAG, "Discarding low-accuracy point: ${location.accuracy}m")
                    return
                }

                val data = mapOf(
                    "lat" to location.latitude,
                    "lng" to location.longitude,
                    "accuracy" to location.accuracy,
                    "speed" to location.speed,
                    "timestamp" to System.currentTimeMillis()
                )
                
                db.collection("users").document(userId)
                    .update("lastLocation", data)
                    .addOnFailureListener { e ->
                        Log.e(TAG, "Uplink Failure: ${e.message}")
                    }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest, 
                locationCallback, 
                Looper.getMainLooper()
            )
        } catch (unlikely: SecurityException) {
            Log.e(TAG, "Lost location permission. Protocol suspended.")
        }
    }

    private fun listenForRemoteCommands() {
        val userId = auth.currentUser?.uid ?: return
        db.collection("users").document(userId).addSnapshotListener { snapshot, _ ->
            val command = snapshot?.getString("pendingCommand")
            if (command != null) {
                executeCommand(command)
                db.collection("users").document(userId).update("pendingCommand", null)
            }
        }
    }

    private fun executeCommand(cmd: String) {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminName = ComponentName(this, SafeAdminReceiver::class.java)

        when (cmd) {
            "LOCK" -> if (dpm.isAdminActive(adminName)) {
                dpm.lockNow()
            }
            "WIPE" -> if (dpm.isAdminActive(adminName)) {
                // Tactical Wipe: Permanent erasure
                dpm.wipeData(0)
            }
            "SIREN" -> {
                // Implementation for max-volume alarm toggle
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID, 
            "Tactical Tracking Service", 
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Maintains high-precision device tracking even when the app is minimized."
            setShowBadge(false)
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }
}