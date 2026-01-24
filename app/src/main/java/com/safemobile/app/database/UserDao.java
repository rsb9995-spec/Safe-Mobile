
package com.safemobile.app.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Update;
import java.util.List;

@Dao
public interface UserDao {
    @Query("SELECT * FROM users WHERE email = :email AND password = :password LIMIT 1")
    User login(String email, String password);

    @Query("SELECT * FROM users")
    List<User> getAllUsers();

    @Insert
    void insertUser(User user);

    @Update
    void updateUser(User user);
}
