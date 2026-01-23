
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, User, DeviceState, RemoteCommand } from './types';
import { dbService } from './services/storage';

// Pages
import Splash from './pages/Splash';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Permissions from './pages/Permissions';
import Dashboard from './pages/Dashboard';
import Tracking from './pages/Tracking';
import AdminDashboard from './pages/AdminDashboard';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('SPLASH');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceState | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isPoweredOff, setIsPoweredOff] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const alarmAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const user = await dbService.getCurrentUser();
      if (user) setCurrentUser(user);
      setIsAuthLoading(false);

      const timer = setTimeout(() => {
        if (user) {
          if (user.role.includes('ADMIN')) setView('ADMIN_DASHBOARD');
          else setView('DASHBOARD');
        } else {
          setView('LANDING');
        }
      }, 2500);
      return () => clearTimeout(timer);
    };

    initAuth();
    
    // Preload Alarm
    alarmAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    alarmAudio.current.loop = true;
  }, []);

  // REAL-TIME HEARTBEAT & COMMAND LISTENER
  useEffect(() => {
    if (!currentUser || view === 'SPLASH' || isAuthLoading) return;

    const deviceId = 'BROWSER_1'; // This device's ID in the vault

    const runHeartbeat = async () => {
      // 1. Fetch Latest Telemetry (Real Android APIs)
      let batteryLevel = 85;
      try {
        // @ts-ignore
        const battery = await navigator.getBattery();
        batteryLevel = Math.round(battery.level * 100);
      } catch(e) {}

      // 2. Fetch Location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude, accuracy, speed } = position.coords;
          
          const db = dbService.getRawDB();
          const userInDb = db.users.find(u => u.id === currentUser.id);
          const myDevice = userInDb?.devices.find(d => d.id === deviceId);
          
          if (myDevice) {
            // Check for incoming commands (The "Real-Time" trigger)
            const commands = myDevice.pendingCommands || [];
            const activeCmd = commands.find(c => !c.isExecuted);

            if (activeCmd) {
              handleRemoteCommand(activeCmd, myDevice);
              activeCmd.isExecuted = true;
            }

            const updatedDevice: DeviceState = {
              ...myDevice,
              batteryLevel,
              speed: speed || 0,
              lastActive: Date.now(),
              lastLocation: {
                lat: latitude,
                lng: longitude,
                timestamp: Date.now(),
                accuracy: Math.round(accuracy)
              }
            };

            // Global Lock State Sync
            setIsLocked(updatedDevice.isLocked);
            setIsPoweredOff(updatedDevice.isPoweredOff);

            if (updatedDevice.isAlarming) {
              alarmAudio.current?.play().catch(() => {});
              if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            } else {
              alarmAudio.current?.pause();
              if (navigator.vibrate) navigator.vibrate(0);
            }

            await dbService.updateDevice(currentUser.id, updatedDevice);
          }
        }, null, { enableHighAccuracy: true });
      }
    };

    const handleRemoteCommand = (cmd: RemoteCommand, device: DeviceState) => {
      console.log("RECEIVING REMOTE COMMAND:", cmd.type);
      switch(cmd.type) {
        case 'LOCK': device.isLocked = true; break;
        case 'UNLOCK': device.isLocked = false; break;
        case 'SIREN': device.isAlarming = true; break;
        case 'WIPE': alert("CRITICAL: Device Wipe Initiated!"); break;
      }
    };

    const interval = setInterval(runHeartbeat, 5000); // 5s Real-time resolution
    return () => clearInterval(interval);
  }, [currentUser, view, isAuthLoading]);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await dbService.setCurrentUser(user);
    const updated = { ...user, lastLogin: Date.now() };
    await dbService.updateUser(updated);

    if (user.role.includes('ADMIN')) setView('ADMIN_DASHBOARD');
    else setView('DASHBOARD');
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    await dbService.setCurrentUser(null);
    setView('LOGIN');
  };

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]">
          <i className="fas fa-lock text-4xl"></i>
        </div>
        <h1 className="text-3xl font-black mb-4 tracking-tighter">DEVICE SECURED</h1>
        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
          This handset has been remotely locked by Safe Mobile Security Protocol 2.5. <br/>
          <b>Location tracking is active.</b>
        </p>
        <div className="w-full max-w-xs space-y-4">
          <button className="w-full py-4 bg-red-600 rounded-2xl font-bold border border-red-500 shadow-lg shadow-red-900/20 active:scale-95">
            Emergency SOS
          </button>
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Auth ID: {currentUser?.id}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'SPLASH' && <Splash />}
      {view === 'LANDING' && <Landing onLogin={() => setView('LOGIN')} onSignup={() => setView('REGISTER')} />}
      {view === 'LOGIN' && <Login onLogin={handleLogin} onRegister={() => setView('REGISTER')} onAdminLogin={() => setView('ADMIN_LOGIN')} />}
      {view === 'REGISTER' && <Register onBack={() => setView('LOGIN')} onRegistered={() => setView('VERIFY_EMAIL')} />}
      {view === 'VERIFY_EMAIL' && <VerifyEmail onConfirmed={() => setView('LOGIN')} />}
      {view === 'PERMISSIONS' && <Permissions onFinish={() => setView('DASHBOARD')} />}
      {view === 'DASHBOARD' && currentUser && (
        <Dashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          onTrackDevice={(d) => { setSelectedDevice(d); setView('TRACKING'); }} 
          onSetupPermissions={() => setView('PERMISSIONS')}
        />
      )}
      {view === 'TRACKING' && selectedDevice && <Tracking device={selectedDevice} onBack={() => setView('DASHBOARD')} />}
      {view === 'ADMIN_LOGIN' && <Login isAdmin onLogin={handleLogin} onRegister={() => setView('LOGIN')} onAdminLogin={() => setView('LOGIN')} />}
      {view === 'ADMIN_DASHBOARD' && currentUser && <AdminDashboard user={currentUser} onLogout={handleLogout} />}
    </>
  );
};

export default App;
