
import React, { useState } from 'react';
import { Layout } from '../components/Layout';

interface PermissionItemProps {
  icon: string;
  title: string;
  desc: string;
  granted: boolean;
  onGrant: () => void;
}

const PermissionItem: React.FC<PermissionItemProps> = ({ icon, title, desc, granted, onGrant }) => (
  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${granted ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
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
      {granted ? <i className="fas fa-check"></i> : 'ALLOW'}
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

  const allGranted = Object.values(grantedStates).every(Boolean);

  const toggle = (key: keyof typeof grantedStates) => {
    setGrantedStates(prev => ({ ...prev, [key]: true }));
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
          onGrant={() => toggle('location')}
        />
        <PermissionItem 
          icon="fa-user-gear"
          title="Device Admin"
          desc="Needed for remote locking & wiping"
          granted={grantedStates.admin}
          onGrant={() => toggle('admin')}
        />
        <PermissionItem 
          icon="fa-battery-full"
          title="Battery Optimization"
          desc="Needed to run in background reliably"
          granted={grantedStates.battery}
          onGrant={() => toggle('battery')}
        />
        <PermissionItem 
          icon="fa-bell"
          title="Critical Alerts"
          desc="Notify you instantly when threats detected"
          granted={grantedStates.notification}
          onGrant={() => toggle('notification')}
        />

        <div className="mt-12 bg-blue-600/5 p-4 rounded-2xl border border-blue-600/10 mb-8">
          <p className="text-xs text-blue-800 leading-relaxed text-center">
            <i className="fas fa-info-circle mr-2"></i>
            Your data is encrypted end-to-end. We never sell your location history to third parties.
          </p>
        </div>

        <button
          onClick={onFinish}
          disabled={!allGranted}
          className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${allGranted ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          {allGranted ? 'Complete Setup' : 'Grant All to Continue'}
        </button>
      </div>
    </Layout>
  );
};

export default Permissions;
