package com.safemobile.app.services

import android.app.*
import android.content.Intent
import android.location.Location
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.safemobile.app.R
import com.safemobile.app.database.AppDatabase
import com.safemobile.app.database.LocalLocation
import com.safemobile.app.utils.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Safe Mobile: 24/7 Tactical Tracking Engine
 * Fetches hardware GPS data and persists to Room Database.
 */
class LocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var sessionManager: SessionManager
    private lateinit var db: AppDatabase
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private val CHANNEL_ID = "local_shield_service"
    private val NOTIFICATION_ID = 1001
    private val ACCURACY_THRESHOLD = 30f // Meters: Production filter for precision pathing

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        sessionManager = SessionManager(this)
        db = AppDatabase.getDatabase(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Safe Mobile: Shield Engaged")
            .setContentText("Continuous local telemetry monitoring active.")
            .setSmallIcon(R.drawable.ic_security)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
        initHardwareTelemetry()

        return START_STICKY // Survive system memory pressure
    }

    private fun initHardwareTelemetry() {
        val userId = sessionManager.getUserId()
        if (userId == -1) {
            Log.e("SafeMobile", "Service Failure: No authenticated session found.")
            stopSelf()
            return
        }

        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 30000L)
            .setMinUpdateIntervalMillis(15000L)
            .setWaitForAccurateLocation(true)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                
                // Hardware-level Precision Filter
                if (location.accuracy <= ACCURACY_THRESHOLD) {
                    commitToVault(userId, location)
                } else {
                    Log.d("SafeMobile", "Point Discarded: Accuracy gap (${location.accuracy}m > 30m)")
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            Log.e("SafeMobile", "Hardware Access Error: Permissions revoked during runtime.")
        }
    }

    private fun commitToVault(userId: Int, location: Location) {
        serviceScope.launch {
            val point = LocalLocation(
                userId = userId,
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracy,
                speed = location.speed,
                timestamp = System.currentTimeMillis()
            )
            db.vaultDao().insertLocation(point)
            Log.d("SafeMobile", "Vault Update: Precise coordinate logged.")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Tactical Security Monitoring", NotificationManager.IMPORTANCE_HIGH
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}