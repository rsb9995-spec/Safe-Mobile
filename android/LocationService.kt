package com.safemobile.app.services

import android.app.*
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.safemobile.app.R
import com.safemobile.app.database.AppDatabase
import com.safemobile.app.database.LocationHistory
import com.safemobile.app.receivers.SafeAdminReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Safe Mobile: Tactical Location & Command Service
 * 24/7 Foreground tracking with Dual-Layer Permanent Storage.
 */
class LocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private lateinit var roomDb: AppDatabase
    
    private val serviceScope = CoroutineScope(Dispatchers.IO)
    private val CHANNEL_ID = "safe_mobile_tactical_shield"
    private val NOTIFICATION_ID = 999
    private val ACCURACY_THRESHOLD = 30f // Strict 30-meter precision filter

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        roomDb = AppDatabase.getDatabase(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createServiceNotification()
        startForeground(NOTIFICATION_ID, notification)

        startHighAccuracyGPS()
        listenForCloudCommands()

        // Restart service if system kills it
        return START_STICKY
    }

    private fun startHighAccuracyGPS() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000L) 
            .setMinUpdateIntervalMillis(5000L)
            .setWaitForAccurateLocation(true)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                val userId = auth.currentUser?.uid ?: return
                val location = locationResult.lastLocation ?: return

                // REPLACEMENT: Only accept location updates if accuracy < 30 meters
                if (location.accuracy > ACCURACY_THRESHOLD) {
                    Log.d("SafeMobile", "Point Filtered: Low accuracy fix (${location.accuracy}m).")
                    return
                }

                // DUAL-LAYER PERSISTENCE
                saveToLocalRoom(userId, location)
                pushToFirestoreVault(userId, location)
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            Log.e("SafeMobile", "Security Breach: GPS permission revoked.")
        }
    }

    private fun saveToLocalRoom(userId: String, location: Location) {
        serviceScope.launch {
            val record = LocationHistory(
                userId = userId,
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracy,
                speed = location.speed,
                batteryLevel = 100, // Replace with battery service fetch
                timestamp = System.currentTimeMillis()
            )
            roomDb.locationDao().insertLocation(record)
        }
    }

    private fun pushToFirestoreVault(userId: String, location: Location) {
        val telemetry = hashMapOf(
            "lat" to location.latitude,
            "lng" to location.longitude,
            "accuracy" to location.accuracy,
            "timestamp" to System.currentTimeMillis(),
            "uplink" to "SECURE"
        )

        db.collection("users").document(userId)
            .collection("locationData").document("current")
            .set(telemetry)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) Log.d("SafeMobile", "Cloud Uplink Success.")
                else Log.e("SafeMobile", "Cloud Uplink Error: ${task.exception?.message}")
            }
            
        // Also log to permanent history
        db.collection("users").document(userId)
            .collection("locationHistory").document(System.currentTimeMillis().toString())
            .set(telemetry)
    }

    private fun listenForCloudCommands() {
        val userId = auth.currentUser?.uid ?: return
        db.collection("users").document(userId).addSnapshotListener { snapshot, e ->
            if (e != null) return@addSnapshotListener
            
            val isLocked = snapshot?.getBoolean("isLocked") ?: false
            val pendingAction = snapshot?.getString("pendingAction")
            
            if (isLocked) executeHardwareLock()
            if (pendingAction == "WIPE") executeHardwareWipe()
        }
    }

    private fun executeHardwareLock() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminName = ComponentName(this, SafeAdminReceiver::class.java)
        if (dpm.isAdminActive(adminName)) dpm.lockNow()
    }

    private fun executeHardwareWipe() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminName = ComponentName(this, SafeAdminReceiver::class.java)
        if (dpm.isAdminActive(adminName)) dpm.wipeData(0)
    }

    private fun createServiceNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Safe Mobile: Shield Active")
            .setContentText("Monitoring device telemetry for high-precision recovery.")
            .setSmallIcon(R.drawable.ic_security)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Safe Mobile Tactical Bridge",
                NotificationManager.IMPORTANCE_HIGH
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