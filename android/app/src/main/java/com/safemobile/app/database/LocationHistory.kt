
package com.safemobile.app.database

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Safe Mobile: Permanent Location Record
 * Represents a single coordinate fix stored in the local Room Vault.
 */
@Entity(tableName = "location_history")
data class LocationHistory(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val speed: Float,
    val batteryLevel: Int,
    val timestamp: Long,
    val isSynced: Boolean = false
)
