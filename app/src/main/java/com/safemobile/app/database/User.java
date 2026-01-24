
package com.safemobile.app.database;

import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "users")
public class User {
    @PrimaryKey(autoGenerate = true)
    public int id;
    public String email;
    public String password;
    public String role; // "USER" or "ADMIN"
    public boolean isLocked;
    public float lastLat;
    public float lastLng;
    public int batteryLevel;

    public User(String email, String password, String role) {
        this.email = email;
        this.password = password;
        this.role = role;
        this.isLocked = false;
        this.batteryLevel = 100;
    }
}
