
import React from 'react';

const Splash: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-2xl opacity-20 animate-pulse-slow"></div>
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl mb-8 border border-blue-400/30">
          <i className="fas fa-shield-alt text-4xl text-white"></i>
        </div>
      </div>
      
      <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
        SAFE <span className="text-blue-500">MOBILE</span>
      </h1>
      <p className="text-slate-400 text-lg font-medium max-w-[240px]">
        Elite Security for your Digital World
      </p>
      
      <div className="mt-20 flex flex-col items-center">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-.15s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
        </div>
        <p className="mt-4 text-slate-500 text-sm font-mono uppercase tracking-widest">Initialising Secure Tunnel</p>
      </div>
    </div>
  );
};

export default Splash;
