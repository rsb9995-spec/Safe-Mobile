import React, { useState, useEffect, useRef } from 'react';
import { ViewState, User, DeviceState, RemoteCommand } from './types';
import { dbService, VaultError } from './services/storage';
import { Toast, ToastType } from './components/Toast';

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
import Help from './pages/Help';

// India Bounding Box for Geofencing Compliance
const INDIA_BOUNDS = {
  latMin: 6.75,
  latMax: 37.5,
  lngMin: 68.12,
  lngMax: 97.4
};

const isInsideIndia = (lat: number, lng: number): boolean => {
  return lat >= INDIA_BOUNDS.latMin && lat <= INDIA_BOUNDS.latMax &&
         lng >= INDIA_BOUNDS.lngMin && lng <= INDIA_BOUNDS.lngMax;
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('SPLASH');
  const [helpReturnView, setHelpReturnView] = useState<ViewState>('LANDING');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceState | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isGeoblocked, setIsGeoblocked] = useState(false);
  
  const alarmAudio = useRef<HTMLAudioElement | null>(null);
  const heartbeatLock = useRef(false);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const navigateToHelp = (from: ViewState) => {
    setHelpReturnView(from);
    setView('HELP');
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
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
      } catch (e) {
        setView('LANDING');
        setIsAuthLoading(false);
      }
    };

    initAuth();
    alarmAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    alarmAudio.current.loop = true;
  }, []);

  // SECURE HEARTBEAT & COMMAND BRIDGE (TACTICAL GPS UPLINK)
  useEffect(() => {
    if (!currentUser || view === 'SPLASH' || isAuthLoading) return;

    const deviceId = 'BROWSER_PRIMARY'; 

    const runHeartbeat = async () => {
      if (heartbeatLock.current) return;
      heartbeatLock.current = true;

      let batteryLevel = 100;
      let networkStatus: 'wifi' | 'cellular' | 'none' = 'wifi';
      
      try {
        // @ts-ignore
        const battery = await navigator.getBattery();
        batteryLevel = Math.round(battery.level * 100);
        
        // @ts-ignore
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          if (connection.type === 'wifi') networkStatus = 'wifi';
          else if (['cellular', '2g', '3g', '4g'].includes(connection.type) || connection.effectiveType) networkStatus = 'cellular';
          else if (!navigator.onLine) networkStatus = 'none';
        } else if (!navigator.onLine) {
          networkStatus = 'none';
        }
      } catch(e) {
        console.warn("Telemetry: Sensor uplink sensors unavailable.");
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const { latitude, longitude, accuracy, speed } = position.coords;
            
            // GEOSPATIAL COMPLIANCE CHECK
            const inIndia = isInsideIndia(latitude, longitude);
            if (!inIndia && !currentUser.role.includes('ADMIN')) {
              setIsGeoblocked(true);
            } else {
              setIsGeoblocked(false);
            }

            // ACCURACY PRECISION FILTER (STRICT 20m for production)
            // As per latest requirement: Discard updates with accuracy margin > 20 meters
            if (accuracy > 20) {
              console.warn(`Tactical Filter: Discarding point with low precision (${Math.round(accuracy)}m). Waiting for satellite lock...`);
              heartbeatLock.current = false;
              return;
            }

            const db = dbService.getRawDB();
            const userInDb = db.users.find(u => u.id === currentUser.id);
            const myDevice = userInDb?.devices.find(d => d.id === deviceId);
            
            if (myDevice) {
              const commands = [...(myDevice.pendingCommands || [])];
              const activeCmdIdx = commands.findIndex(c => !c.isExecuted);

              if (activeCmdIdx !== -1) {
                const activeCmd = commands[activeCmdIdx];
                if (activeCmd.type === 'LOCK') setIsLocked(true);
                if (activeCmd.type === 'UNLOCK') setIsLocked(false);
                if (activeCmd.type === 'SIREN') myDevice.isAlarming = true;
                commands[activeCmdIdx] = { ...activeCmd, isExecuted: true };
                showToast(`Remote Action Executed: ${activeCmd.type}`, 'warning');
              }

              const updatedDevice: DeviceState = {
                ...myDevice,
                batteryLevel,
                speed: speed || 0,
                lastActive: Date.now(),
                pendingCommands: commands,
                model: 'Safe Mobile Web-Secure',
                os: navigator.platform,
                networkStatus: networkStatus,
                lastLocation: {
                  lat: latitude,
                  lng: longitude,
                  timestamp: Date.now(),
                  accuracy: Math.round(accuracy)
                }
              };

              setIsLocked(updatedDevice.isLocked);

              if (updatedDevice.isAlarming) {
                alarmAudio.current?.play().catch(() => {
                  console.warn("Telemetry: Audio alarm blocked by browser policy.");
                });
              } else {
                alarmAudio.current?.pause();
              }

              // PERSISTENCE LAYER: Saves to local storage (simulated Room) and updates global sync (simulated Firestore)
              await dbService.updateDevice(currentUser.id, updatedDevice);
              
              if (inIndia) {
                await dbService.updateUserMetadata(currentUser.id, { lastKnownCity: 'Indian Territory' });
              } else {
                await dbService.updateUserMetadata(currentUser.id, { lastKnownCity: 'Restricted Region' });
              }
            }
          } catch (e) {
            console.error("Telemetry Sync: Handshake failure.", e);
          } finally {
            heartbeatLock.current = false;
          }
        }, (err) => {
          console.warn(`Telemetry Sync: Geolocation acquisition failed (${err.message})`);
          heartbeatLock.current = false;
        }, { enableHighAccuracy: true, timeout: 8000 });
      } else {
        heartbeatLock.current = false;
      }
    };

    const interval = setInterval(runHeartbeat, 15000); // 15s heartbeat for web to ensure responsiveness
    return () => clearInterval(interval);
  }, [currentUser, view, isAuthLoading]);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await dbService.setCurrentUser(user);
    if (user.role.includes('ADMIN')) setView('ADMIN_DASHBOARD');
    else setView('DASHBOARD');
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    await dbService.setCurrentUser(null);
    setView('LOGIN');
    setIsGeoblocked(false);
    showToast("Session Securely Closed.", "info");
  };

  if (isGeoblocked) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="w-24 h-24 bg-blue-600/20 rounded-[2rem] border border-blue-500 flex items-center justify-center mb-10 shadow-2xl">
          <i className="fas fa-globe-asia text-4xl text-blue-400"></i>
        </div>
        <h1 className="text-3xl font-black mb-4 tracking-tighter uppercase">REGIONAL RESTRICTION</h1>
        <p className="text-slate-400 mb-12 text-sm leading-relaxed max-w-xs font-medium">
          Safe Mobile security services are currently restricted to the Indian Subcontinent. Access from your current coordinates is unauthorized.
        </p>
        <button 
          onClick={handleLogout}
          className="w-full max-w-xs py-5 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-xs border border-white/5"
        >
          Exit Protocol
        </button>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center mb-10 animate-pulse shadow-[0_0_60px_rgba(220,38,38,0.4)] border border-red-500">
          <i className="fas fa-lock text-4xl"></i>
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase">ACCESS DENIED</h1>
        <p className="text-slate-400 mb-12 text-sm leading-relaxed max-w-xs font-medium">
          This device has been remotely neutralized via Safe Mobile Secure Hub.
        </p>
        <button 
          onClick={() => showToast("Distress Beacon Sent", "warning")}
          className="w-full max-w-xs py-5 bg-red-600 rounded-3xl font-black uppercase tracking-widest text-xs"
        >
          Broadcast SOS Signal
        </button>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <>
      {view === 'SPLASH' && <Splash />}
      {view === 'LANDING' && (
        <Landing 
          onLogin={() => setView('LOGIN')} 
          onSignup={() => setView('REGISTER')} 
          onViewHelp={() => navigateToHelp('LANDING')}
        />
      )}
      {view === 'LOGIN' && <Login onLogin={handleLogin} onRegister={() => setView('REGISTER')} onAdminLogin={() => setView('ADMIN_LOGIN')} />}
      {view === 'REGISTER' && <Register onBack={() => setView('LOGIN')} onRegistered={() => setView('VERIFY_EMAIL')} />}
      {view === 'VERIFY_EMAIL' && <VerifyEmail onConfirmed={() => setView('LOGIN')} />}
      {view === 'PERMISSIONS' && <Permissions onFinish={() => setView('DASHBOARD')} />}
      {view === 'HELP' && <Help onBack={() => setView(helpReturnView)} />}
      {view === 'DASHBOARD' && currentUser && (
        <Dashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          onTrackDevice={(d) => { setSelectedDevice(d); setView('TRACKING'); }} 
          onSetupPermissions={() => setView('PERMISSIONS')}
          onViewHelp={() => navigateToHelp('DASHBOARD')}
          onNotification={(msg, type) => showToast(msg, type)}
        />
      )}
      {view === 'TRACKING' && selectedDevice && (
        <Tracking 
          device={selectedDevice} 
          onBack={() => setView('DASHBOARD')} 
          onNotification={(msg, type) => showToast(msg, type)}
        />
      )}
      {view === 'ADMIN_LOGIN' && <Login isAdmin onLogin={handleLogin} onRegister={() => setView('LOGIN')} onAdminLogin={() => setView('LOGIN')} />}
      {view === 'ADMIN_DASHBOARD' && currentUser && (
        <AdminDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          onNotification={(msg, type) => showToast(msg, type)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};

export default App;