
import React, { useState, useEffect } from 'react';
import { ViewState, User, DeviceState } from './types';
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
  }, []);

  // Background Geolocation Sync for the "Current" Device
  useEffect(() => {
    if (!currentUser || view === 'SPLASH' || isAuthLoading) return;

    const syncLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          const users = await dbService.getAllUsers();
          const user = users.find(u => u.id === currentUser.id);
          const myDevice = user?.devices.find(d => d.id === 'BROWSER_1');
          
          if (myDevice) {
            const updatedDevice = {
              ...myDevice,
              lastActive: Date.now(),
              lastLocation: {
                lat: latitude,
                lng: longitude,
                timestamp: Date.now(),
                accuracy: Math.round(accuracy)
              }
            };
            await dbService.updateDevice(currentUser.id, updatedDevice);
          }
        }, (err) => console.debug("Geolocation sync error:", err), {
          enableHighAccuracy: true
        });
      }
    };

    syncLocation();
    const locInterval = setInterval(syncLocation, 30000);

    const commandInterval = setInterval(async () => {
      const users = await dbService.getAllUsers();
      const user = users.find(u => u.id === currentUser.id);
      const myDevice = user?.devices.find(d => d.id === 'BROWSER_1');
      if (myDevice) {
        setIsLocked(myDevice.isLocked);
        setIsPoweredOff(myDevice.isPoweredOff);
      }
    }, 3000);

    return () => {
      clearInterval(locInterval);
      clearInterval(commandInterval);
    };
  }, [currentUser, view, isAuthLoading]);

  const handleLogin = async (user: User) => {
    if (user.isBlocked) {
      alert("ACCOUNT LOCKED: Please contact support.");
      return;
    }
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

  const handleTrackDevice = (device: DeviceState) => {
    setSelectedDevice(device);
    setView('TRACKING');
  };

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <i className="fas fa-lock text-4xl"></i>
        </div>
        <h1 className="text-3xl font-bold mb-4">ACCOUNT LOCKED</h1>
        <p className="text-slate-400 mb-8">This device has been remotely locked. Unauthorized access is restricted.</p>
        <div className="w-full max-w-xs space-y-4">
          <button className="w-full py-4 bg-white/10 rounded-xl font-medium border border-white/20">
            Emergency Call
          </button>
        </div>
      </div>
    );
  }

  if (isPoweredOff) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-slate-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-mono text-sm">Safe Mobile: GSM/GPS Shutdown Complete</p>
      </div>
    );
  }

  return (
    <>
      {view === 'SPLASH' && <Splash />}
      {view === 'LANDING' && (
        <Landing onLogin={() => setView('LOGIN')} onSignup={() => setView('REGISTER')} />
      )}
      {view === 'LOGIN' && (
        <Login 
          onLogin={handleLogin} 
          onRegister={() => setView('REGISTER')} 
          onAdminLogin={() => setView('ADMIN_LOGIN')} 
        />
      )}
      {view === 'REGISTER' && (
        <Register 
          onBack={() => setView('LOGIN')} 
          onRegistered={() => setView('VERIFY_EMAIL')} 
        />
      )}
      {view === 'VERIFY_EMAIL' && (
        <VerifyEmail onConfirmed={() => setView('LOGIN')} />
      )}
      {view === 'PERMISSIONS' && (
        <Permissions onFinish={() => setView('DASHBOARD')} />
      )}
      {view === 'DASHBOARD' && currentUser && (
        <Dashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          onTrackDevice={handleTrackDevice} 
          onSetupPermissions={() => setView('PERMISSIONS')}
        />
      )}
      {view === 'TRACKING' && selectedDevice && (
        <Tracking 
          device={selectedDevice} 
          onBack={() => setView('DASHBOARD')} 
        />
      )}
      {view === 'ADMIN_LOGIN' && (
        <Login 
          isAdmin 
          onLogin={handleLogin} 
          onRegister={() => setView('LOGIN')}
          onAdminLogin={() => setView('LOGIN')}
        />
      )}
      {view === 'ADMIN_DASHBOARD' && currentUser && (
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      )}
    </>
  );
};

export default App;
