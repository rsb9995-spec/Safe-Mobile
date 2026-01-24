package com.safemobile.app.services

import android.app.*
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.safemobile.app.R
import com.safemobile.app.receivers.SafeAdminReceiver
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class TacticalService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val httpClient = OkHttpClient()
    private val handler = Handler(Looper.getMainLooper())
    
    private val API_BASE = "https://your-domain.com/api"
    private val ACCURACY_LIMIT = 20f // Strict 20m filter

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val channelId = "SAFE_MOBILE_TACTICAL"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Tactical Link", NotificationManager.IMPORTANCE_HIGH)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Safe Mobile: Shield Active")
            .setContentText("Continuous high-precision monitoring enabled.")
            .setSmallIcon(R.drawable.ic_security)
            .build()

        startForeground(1, notification)
        initUplink()
        startCommandPolling()

        return START_STICKY
    }

    private fun initUplink() {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 30000L)
            .setWaitForAccurateLocation(true)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(res: LocationResult) {
                val loc = res.lastLocation ?: return
                // Filter for High Accuracy (India GPS Fix)
                if (loc.accuracy <= ACCURACY_LIMIT) {
                    uplinkTelemetry(loc.latitude, loc.longitude, loc.accuracy)
                }
            }
        }
        
        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) { Log.e("SafeMobile", "Permission lost") }
    }

    private fun uplinkTelemetry(lat: Double, lng: Double, acc: Float) {
        val json = JSONObject().apply {
            put("session_token", getSessionToken())
            put("lat", lat)
            put("lng", lng)
            put("accuracy", acc)
            put("battery", 85) // Placeholder for simplicity
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val req = Request.Builder().url("$API_BASE/update_location.php").post(body).build()
        
        httpClient.newCall(req).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}
            override fun onResponse(call: Call, response: Response) { response.close() }
        })
    }

    private fun startCommandPolling() {
        handler.postDelayed(object : Runnable {
            override fun run() {
                checkRemoteCommands()
                handler.postDelayed(this, 10000) // Poll every 10s
            }
        }, 10000)
    }

    private fun checkRemoteCommands() {
        val req = Request.Builder().url("$API_BASE/get_command.php?token=${getSessionToken()}").build()
        httpClient.newCall(req).enqueue(object : Callback {
            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: return
                val json = JSONObject(body)
                if (json.optString("status") == "command_found") {
                    executeAction(json.getString("command"))
                }
                response.close()
            }
            override fun onFailure(call: Call, e: IOException) {}
        })
    }

    private fun executeAction(cmd: String) {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(this, SafeAdminReceiver::class.java)
        when(cmd) {
            "LOCK" -> if (dpm.isAdminActive(admin)) dpm.lockNow()
            "WIPE" -> if (dpm.isAdminActive(admin)) dpm.wipeData(0)
        }
    }

    private fun getSessionToken(): String = "user_secure_token_abc123" // In production, fetch from EncryptedSharedPreferences

    override fun onBind(intent: Intent?): IBinder? = null
}