import React, { useState, useEffect } from 'react';
import { dbService, VaultError } from '../services/storage';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  onRegister: () => void;
  onAdminLogin: () => void;
  isAdmin?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, onAdminLogin, isAdmin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot Password States
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailError, setResetEmailError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validateEmail = (emailStr: string) => {
    return EMAIL_REGEX.test(emailStr);
  };

  useEffect(() => {
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address (e.g., name@domain.com)');
    } else {
      setEmailError('');
    }
  }, [email]);

  useEffect(() => {
    if (resetEmail && !validateEmail(resetEmail)) {
      setResetEmailError('Please enter a valid recovery email format');
    } else {
      setResetEmailError('');
    }
  }, [resetEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setEmailError('Valid email format is required to access the vault.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await dbService.authenticate(email, password);

      if (user) {
        if (isAdmin && !user.role.includes('ADMIN')) {
          setError('Security Violation: Your identity lacks administrative authorization.');
          setIsLoading(false);
          return;
        }
        onLogin(user);
      }
    } catch (err) {
      if (err instanceof VaultError) {
        setError(err.message);
      } else {
        setError('Uplink failed: Unable to connect to the secure vault. Check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateEmail(resetEmail)) {
      setResetEmailError('Invalid recovery email format.');
      return;
    }

    setIsLoading(true);
    
    setTimeout(async () => {
      try {
        const db = dbService.getRawDB();
        const userExists = db.users.some(u => u.email.toLowerCase() === resetEmail.toLowerCase());
        
        if (userExists) {
          setResetSuccess(true);
        } else {
          setError('No secure vault associated with this identity signature.');
        }
      } catch (err) {
        setError('Recovery protocol failed: Signal timeout during vault lookup.');
      } finally {
        setIsLoading(false);
      }
    }, 1500);
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-8 max-w-md mx-auto shadow-xl animate-in fade-in slide-in-from-right-4 duration-300">
        <header className="mt-4 mb-10">
          <button 
            onClick={() => { setIsResetMode(false); setResetSuccess(false); setError(''); setResetEmailError(''); }} 
            className="p-2 -ml-2 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
        </header>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm border border-blue-100">
            <i className={`fas ${resetSuccess ? 'fa-envelope-circle-check' : 'fa-key'} text-2xl`}></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {resetSuccess ? 'Link Dispatched' : 'Vault Recovery'}
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            {resetSuccess 
              ? 'Check your secure inbox for reset instructions.' 
              : 'Enter your email to receive a secure recovery link.'}
          </p>
        </div>

        {!resetSuccess ? (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Recovery Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <i className="fas fa-at"></i>
                </span>
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={`w-full pl-11 pr-4 py-4 bg-white border ${resetEmailError ? 'border-red-500' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm disabled:opacity-50`}
                  placeholder="vault-owner@identity.com"
                />
              </div>
              {resetEmailError && <p className="mt-1.5 text-[10px] text-red-500 font-bold uppercase tracking-tight">{resetEmailError}</p>}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 animate-shake">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !!resetEmailError}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  Verifying Identity...
                </>
              ) : (
                'Send Recovery Link'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-100 p-6 rounded-3xl">
              <p className="text-green-800 text-xs font-bold leading-relaxed">
                A cryptographic recovery token has been generated and sent to <span className="underline">{resetEmail}</span>. Please verify within 15 minutes.
              </p>
            </div>
            <button
              onClick={() => { setIsResetMode(false); setResetSuccess(false); }}
              className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 max-w-md mx-auto shadow-xl">
      <div className="mt-12 text-center mb-10">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-blue-500">
          <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-fingerprint'} text-white text-3xl`}></i>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{isAdmin ? 'Admin Portal' : 'Welcome Back'}</h2>
        <p className="text-slate-500 mt-2 text-sm font-medium">Identity verification required</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vault Email</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <i className="fas fa-envelope"></i>
            </span>
            <input
              type="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-11 pr-4 py-4 bg-white border ${emailError ? 'border-red-500' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm disabled:opacity-50`}
              placeholder="name@company.com"
            />
          </div>
          {emailError && <p className="mt-1.5 text-[10px] text-red-500 font-bold uppercase tracking-tight">{emailError}</p>}
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
            <button 
              type="button" 
              onClick={() => setIsResetMode(true)}
              className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tighter"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <i className="fas fa-lock"></i>
            </span>
            <input
              type="password"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3 border border-red-100 animate-shake">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !!emailError}
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <i className="fas fa-circle-notch fa-spin"></i>
              Authenticating...
            </>
          ) : (
            isAdmin ? 'Authorize Access' : 'Sign In to Vault'
          )}
        </button>
      </form>

      {!isAdmin && (
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm font-medium">
            New to Safe Mobile?{' '}
            <button onClick={onRegister} className="text-blue-600 font-black hover:underline">
              Create Vault
            </button>
          </p>
          <button 
            onClick={onAdminLogin}
            className="mt-8 text-slate-300 hover:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            <i className="fas fa-user-shield"></i> Tactical Admin Access
          </button>
        </div>
      )}
      
      {isAdmin && (
        <div className="mt-10 text-center">
          <button 
            onClick={onAdminLogin}
            className="text-slate-500 font-black text-xs hover:underline uppercase tracking-widest"
          >
            Return to User Login
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;