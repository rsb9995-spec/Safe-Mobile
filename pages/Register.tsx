
import React, { useState } from 'react';
import { dbService } from '../services/storage';
import { User } from '../types';

interface RegisterProps {
  onBack: () => void;
  onRegistered: (user: User) => void;
}

const Register: React.FC<RegisterProps> = ({ onBack, onRegistered }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const db = dbService.getRawDB();
    if (db.users.some(u => u.email === email)) {
      setError('Email already registered');
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      email,
      password,
      role: 'USER',
      devices: [
        {
          id: 'BROWSER_1',
          name: 'Primary Mobile Device',
          isLocked: false,
          isSilent: false,
          isPoweredOff: false,
          batteryLevel: 85,
          lastActive: Date.now(),
          speed: 0,
          phoneNumber: '+1 ' + Math.floor(1000000000 + Math.random() * 9000000000),
          lastLocation: { lat: 40.7128, lng: -74.0060, timestamp: Date.now(), accuracy: 15 },
          locationHistory: [{ lat: 40.7128, lng: -74.0060, timestamp: Date.now(), accuracy: 15 }]
        }
      ],
      isBlocked: false,
      isEmailVerified: false,
      createdAt: Date.now(),
      loginHistory: []
    };

    dbService.addUser(newUser);
    onRegistered(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 max-w-md mx-auto shadow-xl">
      <header className="mb-10">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-blue-600 transition-colors">
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
      </header>

      <div className="mb-10">
        <h2 className="text-3xl font-bold text-slate-900">Create Vault</h2>
        <p className="text-slate-500 mt-2">All data is permanently encrypted and stored.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vault Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            placeholder="owner@vault.com"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Master Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Verify Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95"
        >
          Initialize Secure Vault
        </button>
      </form>
    </div>
  );
};

export default Register;
