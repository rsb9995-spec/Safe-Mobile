package com.safemobile.app.database

import android.content.Context
import androidx.room.*

@Entity(tableName = "local_users")
data class LocalUser(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val email: String,
    val passwordHash: String,
    val isAdmin: Boolean = false,
    val registrationDate: Long = System.currentTimeMillis()
)

@Entity(tableName = "local_location_history")
data class LocalLocation(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId: Int,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val speed: Float,
    val timestamp: Long = System.currentTimeMillis()
)

@Dao
interface LocalVaultDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun registerUser(user: LocalUser): Long

    @Query("SELECT * FROM local_users WHERE email = :email LIMIT 1")
    suspend fun getUserByEmail(email: String): LocalUser?

    @Insert
    suspend fun insertLocation(location: LocalLocation)

    @Query("SELECT * FROM local_location_history WHERE userId = :userId ORDER BY timestamp DESC LIMIT 1000")
    suspend fun getLocationHistory(userId: Int): List<LocalLocation>

    @Query("SELECT * FROM local_users")
    suspend fun getAllUsers(): List<LocalUser>
}

@Database(entities = [LocalUser::class, LocalLocation::class], version = 4, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun vaultDao(): LocalVaultDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "safe_mobile_local_vault"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}