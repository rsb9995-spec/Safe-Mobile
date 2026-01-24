
package com.safemobile.app.database

import androidx.room.*

@Dao
interface LocationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLocation(location: LocationHistory)

    @Query("SELECT * FROM location_history WHERE userId = :userId ORDER BY timestamp DESC LIMIT 100")
    suspend fun getRecentHistory(userId: String): List<LocationHistory>

    @Query("SELECT * FROM location_history WHERE isSynced = 0")
    suspend fun getUnsyncedLocations(): List<LocationHistory>

    @Update
    suspend fun updateSyncStatus(locations: List<LocationHistory>)

    @Query("DELETE FROM location_history WHERE timestamp < :threshold")
    suspend fun purgeOldRecords(threshold: Long)
}
