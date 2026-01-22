
import React from 'react';

interface LandingProps {
  onLogin: () => void;
  onSignup: () => void;
}

const Landing: React.FC<LandingProps> = ({ onLogin, onSignup }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl mb-8 relative">
           <div className="absolute inset-0 bg-blue-400 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
           <i className="fas fa-shield-alt text-white text-3xl relative z-10"></i>
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
          Protect What <br/><span className="text-blue-600">Matters</span>
        </h1>
        <p className="text-slate-500 text-lg mb-12">
          Your personal GSM and GPS security companion. Track, lock, and secure your devices anywhere.
        </p>

        <div className="w-full space-y-4">
          <button 
            onClick={onLogin}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all"
          >
            Login to Account
          </button>
          <button 
            onClick={onSignup}
            className="w-full py-4 bg-white text-blue-600 font-bold rounded-2xl border-2 border-blue-50 active:scale-95 transition-all shadow-sm"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </div>
      
      <div className="p-8 text-center flex flex-col gap-4">
        <button 
          onClick={onLogin} 
          className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-blue-500 transition-colors"
        >
          Secure Admin Entrance
        </button>
        <p className="text-xs text-slate-400">
          By continuing, you agree to our Terms of Service <br/> and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Landing;
