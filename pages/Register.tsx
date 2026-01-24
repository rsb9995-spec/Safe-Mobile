import React, { useState, useEffect } from 'react';
import { dbService } from '../services/storage';
import { User } from '../types';

interface RegisterProps {
  onBack: () => void;
  onRegistered: (user: User) => void;
}

const Register: React.FC<RegisterProps> = ({ onBack, onRegistered }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validateEmail = (emailStr: string) => {
    return EMAIL_REGEX.test(emailStr);
  };

  useEffect(() => {
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid format (e.g., name@domain.com)');
    } else {
      setEmailError('');
    }
  }, [email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setEmailError('Identity registration requires a valid email format.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const db = dbService.getRawDB();
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError('Email already registered');
      return;
    }

    // INITIALIZATION: Real GPS data will populate here on heartbeat
    const newUser: User = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      email,
      password,
      role: 'USER',
      devices: [
        {
          id: 'BROWSER_PRIMARY',
          name: 'Primary Security Node',
          model: 'Safe Mobile Secure Web',
          os: navigator.platform,
          isLocked: false,
          isSilent: false,
          isPoweredOff: false,
          isAlarming: false,
          pendingCommands: [],
          networkStatus: 'wifi',
          batteryLevel: 100,
          lastActive: Date.now(),
          speed: 0,
          phoneNumber: 'Pending...',
          lastLocation: undefined,
          locationHistory: []
        }
      ],
      isBlocked: false,
      isEmailVerified: false,
      createdAt: Date.now(),
      loginHistory: [],
      metadata: {
        accountStatus: 'ACTIVE',
        primaryDeviceOS: navigator.platform,
        totalCommandsIssued: 0
      }
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
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Initialize Vault</h2>
        <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed">
          Create your cryptographic identity. All telemetry data is stored in your private encrypted vault.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vault Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-5 py-4 bg-white border ${emailError ? 'border-red-500' : 'border-slate-200'} rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all`}
            placeholder="owner@vault.com"
          />
          {emailError && <p className="mt-1.5 text-[10px] text-red-500 font-bold uppercase tracking-tight">{emailError}</p>}
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Master Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
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
            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!!emailError}
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
        >
          Provision Secure Guard
        </button>
      </form>
    </div>
  );
};

export default Register;