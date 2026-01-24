
package com.safemobile.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.textfield.TextInputEditText;
import com.safemobile.app.database.AppDatabase;
import com.safemobile.app.database.User;

public class LoginActivity extends AppCompatActivity {
    private TextInputEditText emailInput, passwordInput;
    private AppDatabase db;

    @Override
    protected void Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        db = AppDatabase.getDatabase(this);
        emailInput = findViewById(R.id.emailInput);
        passwordInput = findViewById(R.id.passwordInput);
        Button loginBtn = findViewById(R.id.loginBtn);
        TextView registerHint = findViewById(R.id.registerHint);

        // Pre-seed admin if empty
        if (db.userDao().getAllUsers().isEmpty()) {
            db.userDao().insertUser(new User("admin@safe.mobile", "admin123", "ADMIN"));
        }

        loginBtn.setOnClickListener(v -> {
            String email = emailInput.getText().toString();
            String pass = passwordInput.getText().toString();

            User user = db.userDao().login(email, pass);
            if (user != null) {
                Intent intent;
                if (user.role.equals("ADMIN")) {
                    intent = new Intent(this, AdminActivity.class);
                } else {
                    intent = new Intent(this, MainActivity.class);
                }
                startActivity(intent);
                finish();
            } else {
                Toast.makeText(this, "Vault Access Denied", Toast.LENGTH_SHORT).show();
            }
        });

        registerHint.setOnClickListener(v -> {
            String email = emailInput.getText().toString();
            String pass = passwordInput.getText().toString();
            if (!email.isEmpty() && !pass.isEmpty()) {
                db.userDao().insertUser(new User(email, pass, "USER"));
                Toast.makeText(this, "User Vault Created", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Enter credentials first", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
