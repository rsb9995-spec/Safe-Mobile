
import React, { useState } from 'react';
import { Layout } from '../components/Layout';

interface PermissionItemProps {
  icon: string;
  title: string;
  desc: string;
  granted: boolean;
  denied: boolean;
  onGrant: () => void;
}

const PermissionItem: React.FC<PermissionItemProps> = ({ icon, title, desc, granted, denied, onGrant }) => (
  <div className={`flex items-center justify-between p-4 bg-white rounded-2xl border transition-all duration-300 mb-4 ${denied ? 'border-red-200 bg-red-50/30' : 'border-slate-100 shadow-sm'}`}>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${granted ? 'bg-green-50 text-green-600' : denied ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
        <i className={`fas ${icon} text-lg`}></i>
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
    <button 
      onClick={onGrant}
      disabled={granted}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${granted ? 'bg-green-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
    >
      {granted ? <i className="fas fa-check"></i> : denied ? 'RETRY' : 'ALLOW'}
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

  const allGranted = Object.values(grantedStates).every(Boolean);
  const anyDenied = Object.values(deniedStates).some(Boolean);

  const handleGrant = (key: keyof typeof grantedStates) => {
    // Simulate a failure for "Location" and "Admin" 50% of the time to show the error UI
    // In a real app, this would be the actual platform response
    if ((key === 'location' || key === 'admin') && !deniedStates[key] && Math.random() < 0.3) {
      setDeniedStates(prev => ({ ...prev, [key]: true }));
      return;
    }

    setGrantedStates(prev => ({ ...prev, [key]: true }));
    setDeniedStates(prev => ({ ...prev, [key]: false }));
  };

  return (
    <Layout title="Privacy & Security">
      <div className="px-6 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <i className="fas fa-shield-check text-3xl"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-900">Permissions Required</h3>
          <p className="text-slate-500 text-sm mt-2">
            Safe Mobile needs these permissions to protect your device even when offline.
          </p>
        </div>

        <PermissionItem 
          icon="fa-location-dot"
          title="Live Location"
          desc="Needed to track stolen phone in real-time"
          granted={grantedStates.location}
          denied={deniedStates.location}
          onGrant={() => handleGrant('location')}
        />
        <PermissionItem 
          icon="fa-user-gear"
          title="Device Admin"
          desc="Needed for remote locking & wiping"
          granted={grantedStates.admin}
          denied={deniedStates.admin}
          onGrant={() => handleGrant('admin')}
        />
        <PermissionItem 
          icon="fa-battery-full"
          title="Battery Optimization"
          desc="Needed to run in background reliably"
          granted={grantedStates.battery}
          denied={deniedStates.battery}
          onGrant={() => handleGrant('battery')}
        />
        <PermissionItem 
          icon="fa-bell"
          title="Critical Alerts"
          desc="Notify you instantly when threats detected"
          granted={grantedStates.notification}
          denied={deniedStates.notification}
          onGrant={() => handleGrant('notification')}
        />

        {anyDenied && (
          <div className="mt-4 bg-red-50 border border-red-200 p-5 rounded-3xl animate-in slide-in-from-top-2 duration-300">
            <div className="flex gap-3 mb-3">
              <i className="fas fa-exclamation-triangle text-red-600 mt-1"></i>
              <div>
                <h4 className="text-sm font-bold text-red-900">Permission Denied</h4>
                <p className="text-xs text-red-700 leading-relaxed mt-1">
                  Critical security features are disabled. Without these, we cannot locate your device if it is lost.
                </p>
              </div>
            </div>
            
            <div className="space-y-3 bg-white/50 p-4 rounded-xl border border-red-100">
              <h5 className="text-[10px] font-black text-red-900 uppercase">How to enable:</h5>
              <ol className="text-[10px] text-red-800 space-y-2 list-decimal ml-4">
                <li>Open device <b>Settings</b></li>
                <li>Go to <b>Apps & Notifications</b></li>
                <li>Select <b>Safe Mobile</b></li>
                <li>Tap <b>Permissions</b> and enable missing items</li>
              </ol>
              <button 
                className="w-full py-2 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition-colors"
                onClick={() => window.open('app-settings:')}
              >
                OPEN DEVICE SETTINGS
              </button>
            </div>
          </div>
        )}

        {!anyDenied && (
          <div className="mt-8 bg-blue-600/5 p-4 rounded-2xl border border-blue-600/10 mb-8">
            <p className="text-xs text-blue-800 leading-relaxed text-center">
              <i className="fas fa-info-circle mr-2"></i>
              Your data is encrypted end-to-end. We never sell your location history to third parties.
            </p>
          </div>
        )}

        <button
          onClick={onFinish}
          disabled={!allGranted}
          className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg mt-6 ${allGranted ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          {allGranted ? 'Complete Setup' : 'Grant All to Continue'}
        </button>
      </div>
    </Layout>
  );
};

export default Permissions;
