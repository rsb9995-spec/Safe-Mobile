package com.safemobile.app.utils

import android.location.Location
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions

/**
 * Safe Mobile: Firebase Integration Layer (Production Ready)
 * Handles encrypted tactical uplink to permanent cloud storage with server-side timestamps.
 */
object FirebaseHelper {
    private val db = FirebaseFirestore.getInstance()

    /**
     * Updates the live tracking point and appends to permanent history.
     * Accuracy filter must be applied before calling this.
     */
    fun updateLiveLocation(userId: String, location: Location) {
        val telemetry = hashMapOf(
            "lat" to location.latitude,
            "lng" to location.longitude,
            "accuracy" to location.accuracy,
            "speed" to location.speed,
            "timestamp" to FieldValue.serverTimestamp(), // Crucial for permanent searchable history
            "uplinkStatus" to "ENCRYPTED_GPS_LOCK"
        )

        // Update current status for Admin Dashboard real-time map
        db.collection("users").document(userId)
            .collection("locationData").document("current")
            .set(telemetry, SetOptions.merge())

        // Create permanent searchable location entry
        val historyId = "LOC_${System.currentTimeMillis()}"
        db.collection("users").document(userId)
            .collection("locationHistory").document(historyId)
            .set(telemetry)
    }

    /**
     * Clears the pending action and logs the execution success for admin visibility.
     */
    fun acknowledgeCommand(userId: String, commandId: String) {
        db.collection("users").document(userId).update(
            "pendingAction", null, 
            "lastCommandExecuted", commandId,
            "lastCommandTimestamp", FieldValue.serverTimestamp()
        )
    }
}