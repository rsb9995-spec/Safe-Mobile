
import React, { useState, useEffect } from 'react';
import { DeviceState } from '../types';
import { Layout } from '../components/Layout';
import { dbService } from '../services/storage';

interface TrackingProps {
  device: DeviceState;
  onBack: () => void;
}

const Tracking: React.FC<TrackingProps> = ({ device: initialDevice, onBack }) => {
  const [device, setDevice] = useState<DeviceState>(initialDevice);
  const [pulse, setPulse] = useState(true);
  const [isAlarming, setIsAlarming] = useState(false);
  const [loadingDirections, setLoadingDirections] = useState(false);

  // Auto-refresh the tracked device data to see live movements
  useEffect(() => {
    const interval = setInterval(async () => {
      setPulse(p => !p);
      const db = dbService.getRawDB();
      // Find the user who owns this device
      const owner = db.users.find(u => u.devices.some(d => d.id === initialDevice.id));
      if (owner) {
        const updatedDevice = owner.devices.find(d => d.id === initialDevice.id);
        if (updatedDevice) {
          setDevice(updatedDevice);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [initialDevice.id]);

  const handleTriggerAlarm = () => {
    setIsAlarming(true);
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    audio.play().catch(() => {
      alert("Remote Alarm Triggered on " + device.name);
    });
    setTimeout(() => setIsAlarming(false), 3000);
  };

  const handleGetDirections = () => {
    setLoadingDirections(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const destLat = device.lastLocation?.lat || 40.7128;
          const destLng = device.lastLocation?.lng || -74.0060;
          
          const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=driving`;
          window.open(url, '_blank');
          setLoadingDirections(false);
        },
        (error) => {
          console.error("Error getting location: ", error);
          const destLat = device.lastLocation?.lat || 40.7128;
          const destLng = device.lastLocation?.lng || -74.0060;
          const url = `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
          window.open(url, '_blank');
          setLoadingDirections(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setLoadingDirections(false);
    }
  };

  const lat = device.lastLocation?.lat || 40.7128;
  const lng = device.lastLocation?.lng || -74.0060;
  const accuracy = device.lastLocation?.accuracy || 0;
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed&t=m`;

  // Determine accuracy quality
  const getAccuracyStatus = (acc: number) => {
    if (acc === 0) return { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-100' };
    if (acc < 20) return { label: 'High Precision', color: 'text-green-600', bg: 'bg-green-100' };
    if (acc < 50) return { label: 'Fair Precision', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Low Precision', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const accStatus = getAccuracyStatus(accuracy);

  return (
    <Layout title="Locate Device" onBack={onBack}>
      <div className="h-[50vh] bg-slate-200 relative overflow-hidden">
        {/* Real Live Map Iframe */}
        <iframe
          title="Google Map"
          className="absolute inset-0 w-full h-full border-0"
          src={mapUrl}
          allowFullScreen
          loading="lazy"
        ></iframe>

        {/* Floating Tracking Indicator */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 border border-blue-100">
           <span className="flex h-2 w-2">
             <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
           </span>
           <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Live Sync Active</span>
        </div>
      </div>

      <div className="p-6 -mt-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
          <div className="flex items-start justify-between mb-4 border-b border-slate-50 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">{device.name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <i className="far fa-clock"></i>
                Synced: {new Date(device.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase mb-1 ${accStatus.bg} ${accStatus.color}`}>
                {accStatus.label}
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none">
                {accuracy}<span className="text-sm font-bold ml-0.5 text-slate-400 uppercase">m</span>
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Location Radius</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Latitude</p>
              <p className="text-sm font-mono font-bold text-slate-700">{lat.toFixed(6)}</p>
            </div>
            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Longitude</p>
              <p className="text-sm font-mono font-bold text-slate-700">{lng.toFixed(6)}</p>
            </div>
          </div>

          <div className="space-y-3">
             <button 
               onClick={handleTriggerAlarm}
               disabled={isAlarming}
               className={`w-full py-4 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${isAlarming ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 shadow-red-200 hover:bg-red-700'}`}
             >
               <i className={`fas ${isAlarming ? 'fa-spinner fa-spin' : 'fa-bell'}`}></i>
               {isAlarming ? 'Triggering Alarm...' : 'Trigger Remote Alarm'}
             </button>
             <button 
               onClick={handleGetDirections}
               disabled={loadingDirections}
               className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-[0.98]"
             >
               {loadingDirections ? (
                 <i className="fas fa-spinner fa-spin"></i>
               ) : (
                 <i className="fas fa-route text-blue-400"></i>
               )}
               {loadingDirections ? 'Calculating Route...' : 'Get Directions'}
             </button>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-4 border-t border-slate-50 pt-4">
            <div className="flex items-center gap-2">
              <i className="fas fa-battery-three-quarters text-green-500 text-xs"></i>
              <span className="text-[10px] font-bold text-slate-500">{device.batteryLevel}% Charge</span>
            </div>
            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
            <div className="flex items-center gap-2">
              <i className="fas fa-gauge-high text-blue-500 text-xs"></i>
              <span className="text-[10px] font-bold text-slate-500">{device.speed} km/h</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Tracking;
