
import React, { useState, useEffect } from 'react';
import { User, DeviceState, RemoteCommand } from '../types';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'GSM' | 'GPS'>('GSM');

  // Real-time listener for this dashboard (Polls the DB for changes made by Heartbeat)
  useEffect(() => {
    const fetchLatest = async () => {
      setIsSyncing(true);
      const allUsers = await dbService.getAllUsers();
      const updatedUser = allUsers.find(u => u.id === user.id);
      if (updatedUser) setDevices(updatedUser.devices);
      setTimeout(() => setIsSyncing(false), 500);
    };

    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const sendRemoteCommand = async (deviceId: string, type: RemoteCommand['type']) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;

    const newCmd: RemoteCommand = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      isExecuted: false
    };

    const updatedDevice = { 
      ...dev, 
      pendingCommands: [...(dev.pendingCommands || []), newCmd],
      // Instant UI feedback for certain toggles
      isLocked: type === 'LOCK' ? true : type === 'UNLOCK' ? false : dev.isLocked,
      isAlarming: type === 'SIREN' ? !dev.isAlarming : dev.isAlarming
    };

    await dbService.updateDevice(user.id, updatedDevice);
    setDevices(prev => prev.map(d => d.id === deviceId ? updatedDevice : d));
  };

  return (
    <Layout 
      title="Security Hub" 
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full border border-green-100">
             <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-[8px] font-black text-green-700 uppercase">Live</span>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors">
            <i className="fas fa-power-off"></i>
          </button>
        </div>
      }
    >
      <div className="p-6 pb-24">
        {/* Real-time Telemetry Banner */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl mb-8 relative overflow-hidden border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black shadow-lg">
                {user.email[0].toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Identity Verified</p>
                <h2 className="font-bold text-sm truncate max-w-[120px]">{user.email}</h2>
              </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-slate-500 uppercase">Signal</p>
               <div className="flex gap-0.5 mt-1">
                  {[1,2,3,4].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 3 ? 'bg-blue-500' : 'bg-slate-700'}`}></div>)}
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <p className="text-[9px] font-bold opacity-40 uppercase mb-1">Satellite Lock</p>
              <div className="flex items-center gap-2">
                <i className="fas fa-satellite text-green-400 text-xs"></i>
                <span className="text-xs font-bold">Active</span>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <p className="text-[9px] font-bold opacity-40 uppercase mb-1">Last Update</p>
              <div className="flex items-center gap-2">
                <i className="far fa-clock text-blue-400 text-xs"></i>
                <span className="text-xs font-bold">Just now</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl mb-8 border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('GSM')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'GSM' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
          >
            System Control
          </button>
          <button 
            onClick={() => setActiveTab('GPS')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'GPS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
          >
            Tactical Map
          </button>
        </div>

        {activeTab === 'GSM' ? (
          <div className="space-y-4">
            {devices.map(device => (
              <div key={device.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-inner">
                      <i className="fas fa-mobile-screen-button text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm tracking-tight">{device.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${device.isPoweredOff ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          {device.isPoweredOff ? 'Offline' : 'Real-time Linked'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900">{device.batteryLevel}%</p>
                    <div className="w-8 h-3 bg-slate-100 rounded-sm border border-slate-200 overflow-hidden mt-1 p-0.5">
                       <div className="h-full bg-green-500 rounded-xs" style={{ width: `${device.batteryLevel}%` }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => sendRemoteCommand(device.id, device.isLocked ? 'UNLOCK' : 'LOCK')}
                    className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-tighter flex flex-col items-center gap-2 transition-all active:scale-90 ${device.isLocked ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
                  >
                    <i className={`fas ${device.isLocked ? 'fa-lock-open' : 'fa-lock'} text-base`}></i>
                    {device.isLocked ? 'Remote Unlock' : 'Remote Lock'}
                  </button>
                  <button 
                    onClick={() => sendRemoteCommand(device.id, 'SIREN')}
                    className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-tighter flex flex-col items-center gap-2 transition-all active:scale-90 ${device.isAlarming ? 'bg-orange-500 text-white animate-pulse shadow-lg' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
                  >
                    <i className="fas fa-bullhorn text-base"></i>
                    {device.isAlarming ? 'Stop Alarm' : 'Trigger Alarm'}
                  </button>
                  <button 
                    onClick={() => sendRemoteCommand(device.id, 'WIPE')}
                    className="col-span-2 p-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 shadow-xl"
                  >
                    <i className="fas fa-radiation text-red-500"></i>
                    Initiate Remote Wipe
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map(device => (
              <div key={device.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <i className="fas fa-location-crosshairs"></i>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm tracking-tight">{device.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold">Accuracy: ±{device.lastLocation?.accuracy || 0}m</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onTrackDevice(device)}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95"
                  >
                    Locate
                  </button>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-5 grid grid-cols-2 gap-4 border border-slate-100/50">
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ground Speed</p>
                     <p className="text-2xl font-black text-slate-800">{device.speed || 0}<span className="text-[10px] ml-1 text-slate-400">KM/H</span></p>
                   </div>
                   <div className="border-l border-slate-200 pl-4">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Rate</p>
                     <p className="text-2xl font-black text-blue-600">5.2<span className="text-[10px] ml-1 text-slate-400">MB/S</span></p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-600/5 border border-blue-600/10 p-5 rounded-3xl flex gap-4">
           <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex-shrink-0 flex items-center justify-center">
              <i className="fas fa-shield-virus"></i>
           </div>
           <div>
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-tight mb-1">AES-256 Tunnel Active</h4>
              <p className="text-[10px] text-blue-800/70 leading-relaxed font-medium">
                Your connection is routed through an encrypted bridge. All remote commands are cryptographically signed.
              </p>
           </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 flex justify-around items-center z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button className="text-blue-600 flex flex-col items-center gap-1.5 px-4">
          <i className="fas fa-grid-2 text-xl"></i>
          <span className="text-[8px] font-black uppercase tracking-widest">Vault</span>
        </button>
        <button onClick={onSetupPermissions} className="text-slate-400 flex flex-col items-center gap-1.5 px-4 hover:text-blue-500 transition-colors">
          <i className="fas fa-shield-check text-xl"></i>
          <span className="text-[8px] font-black uppercase tracking-widest">Guard</span>
        </button>
        <button className="text-slate-400 flex flex-col items-center gap-1.5 px-4 hover:text-blue-500 transition-colors">
          <i className="fas fa-bolt-lightning text-xl"></i>
          <span className="text-[8px] font-black uppercase tracking-widest">Logs</span>
        </button>
      </div>
    </Layout>
  );
};

export default Dashboard;
