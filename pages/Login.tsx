
import React, { useState } from 'react';
import { dbService } from '../services/storage';
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
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await dbService.authenticate(email, password);

      if (user) {
        if (isAdmin && !user.role.includes('ADMIN')) {
          setError('Unauthorized access to admin panel');
          setIsLoading(false);
          return;
        }
        if (user.isBlocked) {
          setError('This account has been suspended');
          setIsLoading(false);
          return;
        }
        onLogin(user);
      } else {
        setError('Invalid credentials. Check email and password.');
      }
    } catch (err) {
      setError('Database connection error. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 max-w-md mx-auto shadow-xl">
      <div className="mt-12 text-center mb-10">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-fingerprint'} text-white text-3xl`}></i>
        </div>
        <h2 className="text-3xl font-bold text-slate-900">{isAdmin ? 'Admin Portal' : 'Welcome Back'}</h2>
        <p className="text-slate-500 mt-2">Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
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
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm disabled:opacity-50"
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <button type="button" className="text-xs font-semibold text-blue-600 hover:underline">Forgot?</button>
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
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-3 border border-red-100 animate-shake">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Connecting...
            </>
          ) : (
            isAdmin ? 'Authenticate' : 'Sign In'
          )}
        </button>
      </form>

      {!isAdmin && (
        <div className="mt-10 text-center">
          <p className="text-slate-500 text-sm">
            New to Safe Mobile?{' '}
            <button onClick={onRegister} className="text-blue-600 font-bold hover:underline">
              Create an Account
            </button>
          </p>
          <button 
            onClick={onAdminLogin}
            className="mt-6 text-slate-400 hover:text-slate-600 text-xs font-medium uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
          >
            <i className="fas fa-user-shield"></i> Admin Access
          </button>
        </div>
      )}
      
      {isAdmin && (
        <div className="mt-10 text-center">
          <button 
            onClick={onAdminLogin}
            className="text-slate-500 font-bold hover:underline"
          >
            Switch to User Login
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
