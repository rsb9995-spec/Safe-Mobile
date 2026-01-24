import React, { useState, useEffect } from 'react';
import { User, DeviceState, RemoteCommand } from '../types';
import { Layout } from '../components/Layout';
import { dbService, VaultError } from '../services/storage';
import { ToastType } from '../components/Toast';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onTrackDevice: (device: DeviceState) => void;
  onSetupPermissions: () => void;
  onViewHelp: () => void;
  onNotification: (message: string, type: ToastType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onTrackDevice, onSetupPermissions, onViewHelp, onNotification }) => {
  const [devices, setDevices] = useState<DeviceState[]>(user.devices || []);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'GSM' | 'GPS'>('GSM');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [syncFailureCount, setSyncFailureCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        setIsSyncing(true);
        const allUsers = await dbService.getAllUsers();
        const updatedUser = allUsers.find(u => u.id === user.id);
        if (!updatedUser) throw new VaultError("Operational sync failure.", "PROFILE_MISSING");
        setDevices(updatedUser.devices);
        setSyncFailureCount(0); 
      } catch (e) {
        setSyncFailureCount(prev => prev + 1);
      } finally {
        setTimeout(() => setIsSyncing(false), 800);
      }
    };
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const sendRemoteCommand = async (deviceId: string, type: RemoteCommand['type']) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;

    if (type === 'WIPE' && !window.confirm("CRITICAL: Permanently erase all data on the target handset?")) return;

    try {
      const newCmd: RemoteCommand = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        timestamp: Date.now(),
        isExecuted: false
      };
      const updatedDevice = { 
        ...dev, 
        pendingCommands: [...(dev.pendingCommands || []), newCmd],
        isLocked: type === 'LOCK' ? true : type === 'UNLOCK' ? false : dev.isLocked,
        isAlarming: type === 'SIREN' ? !dev.isAlarming : dev.isAlarming
      };
      await dbService.updateDevice(user.id, updatedDevice);
      onNotification(`Command [${type}] Dispatched via AES-256 Tunnel.`, type === 'WIPE' ? 'warning' : 'success');
    } catch (e) {
      onNotification("Uplink Failure.", "error");
    }
  };

  const getStatus = (lastActive: number) => {
    const isOnline = (currentTime - lastActive) < 300000;
    return {
      label: isOnline ? 'LINK ACTIVE' : 'STALE',
      color: isOnline ? 'text-green-500' : 'text-slate-400',
      dot: isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
    };
  };

  return (
    <Layout 
      title="Safe Mobile Hub" 
      actions={
        <div className="flex gap-2">
          <div className="bg-blue-600/10 px-3 py-1 rounded-full border border-blue-600/20 flex items-center gap-2">
            <i className="fas fa-shield-check text-blue-600 text-[10px]"></i>
            <span className="text-[8px] font-black text-blue-700 uppercase">Uplink: Optimal</span>
          </div>
          <button onClick={onLogout} className="text-slate-400 p-2"><i className="fas fa-power-off"></i></button>
        </div>
      }
    >
      <div className="p-6 pb-24">
        {/* Precision Shield Status */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-8 relative overflow-hidden border border-white/5 shadow-2xl">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Protection Protocol</p>
              <h2 className="text-2xl font-black tracking-tight uppercase">High Accuracy Lock</h2>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg border border-blue-500">
               <i className="fas fa-satellite-dish text-xl text-white"></i>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Precision Filter</p>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                   <span className="text-[10px] font-black text-green-400 uppercase">30M Strict Lock</span>
                </div>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Heartbeat</p>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                   <span className="text-[10px] font-black text-blue-400 uppercase">24/7 Persistent</span>
                </div>
             </div>
          </div>

          <button 
            onClick={onSetupPermissions}
            className="w-full mt-6 py-4 bg-white/10 hover:bg-white/15 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-white/5"
          >
            <i className="fas fa-battery-bolt text-orange-400"></i>
            Disable Battery Optimization
          </button>
        </div>

        {/* Action Tabs */}
        <div className="flex bg-white p-1.5 rounded-3xl mb-8 border border-slate-100 shadow-sm">
          {(['GSM', 'GPS'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}
            >
              {tab === 'GSM' ? 'Command Hub' : 'Live Tracking'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {devices.map(device => {
            const status = getStatus(device.lastActive);
            return (
              <div key={device.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
                      <i className="fas fa-mobile-screen text-2xl"></i>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base leading-none mb-1.5">{device.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${status.color}`}>{status.label}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-800 leading-none">{device.batteryLevel}%</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Telemetry</p>
                  </div>
                </div>

                {activeTab === 'GSM' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => sendRemoteCommand(device.id, device.isLocked ? 'UNLOCK' : 'LOCK')}
                      className={`py-5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 ${device.isLocked ? 'bg-red-600 text-white shadow-xl shadow-red-200' : 'bg-slate-900 text-white shadow-lg'}`}
                    >
                      <i className={`fas ${device.isLocked ? 'fa-lock-open' : 'fa-lock'}`}></i>
                      {device.isLocked ? 'Revoke Lock' : 'Enforce Lock'}
                    </button>
                    <button 
                      onClick={() => sendRemoteCommand(device.id, 'SIREN')}
                      className={`py-5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 border-2 ${device.isAlarming ? 'bg-orange-500 border-orange-400 text-white animate-pulse' : 'bg-white border-slate-100 text-slate-700'}`}
                    >
                      <i className="fas fa-bullhorn"></i>
                      Siren Beacon
                    </button>
                    <button 
                      onClick={() => sendRemoteCommand(device.id, 'WIPE')}
                      className="col-span-2 py-5 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      <i className="fas fa-radiation mr-2"></i> Initialise Wipe Protocol
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-3xl p-6 flex items-center justify-between border border-slate-100">
                     <div className="flex flex-col gap-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Uplink Precision</p>
                        <h5 className="text-xl font-black text-slate-900">±{device.lastLocation?.accuracy || 0}m</h5>
                     </div>
                     <button 
                      onClick={() => onTrackDevice(device)}
                      className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-95"
                     >
                       Track Live
                     </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
