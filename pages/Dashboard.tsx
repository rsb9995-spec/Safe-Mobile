
import React, { useState, useEffect } from 'react';
import { User, DeviceState } from '../types';
import { Layout } from '../components/Layout';
import { dbService } from '../services/storage';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onTrackDevice: (device: DeviceState) => void;
  onSetupPermissions: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onTrackDevice, onSetupPermissions }) => {
  const [devices, setDevices] = useState<DeviceState[]>(user.devices || []);
  const [activeTab, setActiveTab] = useState<'GSM' | 'GPS'>('GSM');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const fetchDevices = async () => {
      setIsSyncing(true);
      const allUsers = await dbService.getAllUsers();
      const updatedUser = allUsers.find(u => u.id === user.id);
      if (updatedUser) setDevices(updatedUser.devices);
      setTimeout(() => setIsSyncing(false), 800);
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // Sync with DB every 10s
    return () => clearInterval(interval);
  }, [user.id]);

  const toggleRemoteAction = async (deviceId: string, action: 'isLocked' | 'isSilent' | 'isPoweredOff') => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;

    const updatedDevice = { ...dev, [action]: !dev[action] };
    await dbService.updateDevice(user.id, updatedDevice);
    setDevices(prev => prev.map(d => d.id === deviceId ? updatedDevice : d));
  };

  return (
    <Layout 
      title="Security Hub" 
      actions={
        <div className="flex items-center gap-3">
          {isSyncing && <i className="fas fa-sync fa-spin text-xs text-blue-500"></i>}
          <button onClick={onLogout} className="text-slate-500 hover:text-red-500 transition-colors">
            <i className="fas fa-sign-out-alt text-lg"></i>
          </button>
        </div>
      }
    >
      <div className="p-6 pb-24">
        {/* Profile Card */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-600 rounded-full opacity-20 blur-3xl"></div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg border-2 border-white/20">
              {user.email[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-lg">Owner ID: {user.id}</h2>
              <p className="text-xs text-blue-300">Database Status: SECURE</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold opacity-60 uppercase">Last Login</p>
              <p className="text-sm font-bold">{user.lastLogin ? new Date(user.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'First login'}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold opacity-60 uppercase">Connection</p>
              <p className="text-sm font-bold text-green-400">ENCRYPTED</p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white p-1 rounded-2xl mb-8 border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('GSM')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'GSM' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
          >
            GSM Monitoring
          </button>
          <button 
            onClick={() => setActiveTab('GPS')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'GPS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
          >
            GPS Tracking
          </button>
        </div>

        {activeTab === 'GSM' ? (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 px-1">Device Network Control</h3>
            {devices.map(device => (
              <div key={device.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-tower-broadcast text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{device.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{device.phoneNumber || '+1 000 000 0000'}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${device.isPoweredOff ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {device.isPoweredOff ? 'POWER OFF' : 'ONLINE'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => toggleRemoteAction(device.id, 'isLocked')}
                    className={`p-3 rounded-2xl text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${device.isLocked ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
                  >
                    <i className="fas fa-lock"></i> {device.isLocked ? 'UNLOCK' : 'LOCK'}
                  </button>
                  <button 
                    onClick={() => toggleRemoteAction(device.id, 'isPoweredOff')}
                    className={`p-3 rounded-2xl text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${device.isPoweredOff ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
                  >
                    <i className="fas fa-power-off"></i> {device.isPoweredOff ? 'POWER ON' : 'POWER OFF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 px-1">Real-time GPS Locates</h3>
            {devices.map(device => (
              <div key={device.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-location-dot"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{device.name}</h4>
                      <p className="text-[10px] text-slate-400">Accuracy: ±{device.lastLocation?.accuracy}m</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onTrackDevice(device)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-lg shadow-blue-200"
                  >
                    VIEW MAP
                  </button>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase">Current Speed</p>
                     <p className="text-xl font-black text-slate-800">{device.speed || 0} km/h</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase">Battery</p>
                     <p className="text-xl font-black text-green-600">{device.batteryLevel}%</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-100 p-5 rounded-3xl">
          <h4 className="text-xs font-bold text-blue-800 mb-2">
            <i className="fas fa-circle-info mr-2"></i> 
            Cloud Sync Status
          </h4>
          <p className="text-[10px] text-blue-700 leading-relaxed">
            All user details are stored in a secure encrypted database. GPS data is synced every 10 seconds to ensure high-accuracy tracking.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t p-4 flex justify-around items-center">
        <button className="text-blue-600 flex flex-col items-center gap-1">
          <i className="fas fa-house text-lg"></i>
          <span className="text-[8px] font-bold uppercase">Home</span>
        </button>
        <button onClick={onSetupPermissions} className="text-slate-400 flex flex-col items-center gap-1">
          <i className="fas fa-shield-halved text-lg"></i>
          <span className="text-[8px] font-bold uppercase">Security</span>
        </button>
        <button className="text-slate-400 flex flex-col items-center gap-1">
          <i className="fas fa-bell text-lg"></i>
          <span className="text-[8px] font-bold uppercase">Alerts</span>
        </button>
      </div>
    </Layout>
  );
};

export default Dashboard;
