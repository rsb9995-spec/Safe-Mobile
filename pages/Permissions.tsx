import React, { useState } from 'react';
import { Layout } from '../components/Layout';

interface PermissionItemProps {
  icon: string;
  title: string;
  desc: string;
  granted: boolean;
  denied: boolean;
  onGrant: () => void;
  requirementInfo: string;
}

const PermissionItem: React.FC<PermissionItemProps> = ({ 
  icon, title, desc, granted, denied, onGrant, requirementInfo 
}) => (
  <div className={`group relative flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-500 mb-4 ${
    granted 
      ? 'border-green-100 bg-white shadow-sm' 
      : denied 
        ? 'border-red-200 bg-red-50/40 shadow-inner' 
        : 'border-slate-100 bg-white shadow-sm hover:border-blue-200'
  }`}>
    <div className="flex items-center gap-5 flex-1">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${
        granted 
          ? 'bg-green-500 text-white rotate-[360deg]' 
          : denied 
            ? 'bg-red-600 text-white animate-pulse' 
            : 'bg-slate-50 text-slate-400'
      }`}>
        <i className={`fas ${granted ? 'fa-check' : icon} text-xl`}></i>
      </div>
      <div className="flex-1">
        <h4 className={`font-black text-sm tracking-tight ${denied ? 'text-red-900' : 'text-slate-800'}`}>
          {title}
        </h4>
        <p className={`text-[11px] leading-tight mt-1 ${denied ? 'text-red-700/70 font-bold' : 'text-slate-500 font-medium'}`}>
          {denied ? 'PERMISSION DENIED' : desc}
        </p>
      </div>
    </div>
    <button 
      onClick={onGrant}
      disabled={granted}
      className={`ml-4 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-90 ${
        granted 
          ? 'bg-green-100 text-green-700 cursor-default opacity-0' 
          : denied 
            ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100' 
            : 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700'
      }`}
    >
      {granted ? 'ACTIVE' : denied ? 'FIX' : 'ENABLE'}
    </button>
  </div>
);

const Permissions: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [grantedStates, setGrantedStates] = useState({
    location: false,
    admin: false,
    battery: false,
    notification: false
  });

  const [deniedStates, setDeniedStates] = useState({
    location: false,
    admin: false,
    battery: false,
    notification: false
  });

  const [rationale, setRationale] = useState<{title: string, msg: string, key: keyof typeof grantedStates} | null>(null);

  const allGranted = Object.values(grantedStates).every(Boolean);

  const handleGrant = (key: keyof typeof grantedStates) => {
    // Show rationale if not yet granted
    if (!grantedStates[key]) {
      const data = {
        location: { title: "Satellite Link", msg: "We need precise GPS access to locate your device in India with ±30m accuracy." },
        admin: { title: "Admin Bridge", msg: "Safe Mobile requires authority to lock the screen and wipe data remotely via the cloud." },
        battery: { title: "24/7 Persistence", msg: "To ensure tracking works even when the app is closed, you must disable battery optimization." },
        notification: { title: "Alert Pulse", msg: "Receive critical security notifications and dispatch audible sirens instantly." }
      };
      setRationale({ ...data[key], key });
    }
  };

  const confirmRationale = () => {
    if (!rationale) return;
    const key = rationale.key;
    
    // Simulate real native permission bridge
    setGrantedStates(prev => ({ ...prev, [key]: true }));
    setDeniedStates(prev => ({ ...prev, [key]: false }));
    setRationale(null);
  };

  return (
    <Layout title="Protocol Setup">
      <div className="px-6 py-10">
        <div className="text-center mb-10">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-10 animate-pulse"></div>
             <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 relative z-10 shadow-sm">
               <i className="fas fa-key-skeleton text-3xl"></i>
             </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Access Authorization</h3>
          <p className="text-slate-500 text-xs mt-3 leading-relaxed max-w-[280px] mx-auto font-medium">
            Authorization is required to initialize high-accuracy hardware tracking and remote command bridges.
          </p>
        </div>

        <div className="space-y-1">
          <PermissionItem 
            icon="fa-location-dot"
            title="Live GPS Tracking"
            desc="Required for high-precision India tracking."
            requirementInfo="Enables ±30m accuracy telemetry."
            granted={grantedStates.location}
            denied={deniedStates.location}
            onGrant={() => handleGrant('location')}
          />
          <PermissionItem 
            icon="fa-user-shield"
            title="Remote Admin Bridge"
            desc="Enables cloud-based lock and wipe."
            requirementInfo="Grants authority to secure the device remotely."
            granted={grantedStates.admin}
            denied={deniedStates.admin}
            onGrant={() => handleGrant('admin')}
          />
          <PermissionItem 
            icon="fa-battery-bolt"
            title="Persistent Background"
            desc="Ensures tracking never disconnects."
            requirementInfo="Ensures 24/7 background execution."
            granted={grantedStates.battery}
            denied={deniedStates.battery}
            onGrant={() => handleGrant('battery')}
          />
          <PermissionItem 
            icon="fa-bell-on"
            title="Security Pulse"
            desc="Dispatch instant siren and lock alerts."
            requirementInfo="Required for Android 13+ status alerts."
            granted={grantedStates.notification}
            denied={deniedStates.notification}
            onGrant={() => handleGrant('notification')}
          />
        </div>

        <button
          onClick={onFinish}
          disabled={!allGranted}
          className={`w-full py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-2xl mt-10 flex items-center justify-center gap-3 ${
            allGranted 
              ? 'bg-slate-900 text-white shadow-slate-200' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {allGranted && <i className="fas fa-shield-check text-blue-400"></i>}
          {allGranted ? 'Initialize Tactical Shield' : 'Complete Setup to Start'}
        </button>
      </div>

      {/* Rationale Dialog System */}
      {rationale && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
             <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <i className="fas fa-shield-halved text-2xl"></i>
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">{rationale.title}</h3>
             <p className="text-xs text-slate-500 leading-relaxed font-bold mb-8 uppercase tracking-tight">
               {rationale.msg}
             </p>
             <div className="space-y-3">
               <button 
                onClick={confirmRationale}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-100"
               >
                 Authorize Protocol
               </button>
               <button 
                onClick={() => setRationale(null)}
                className="w-full py-5 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
               >
                 Decline
               </button>
             </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Permissions;