import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceState, DeviceLocation, RemoteCommand } from '../types';
import { Layout } from '../components/Layout';
import { dbService, VaultError } from '../services/storage';
import { ToastType } from '../components/Toast';

// Access Leaflet from window as it is loaded via script tag
declare const L: any;

interface TrackingProps {
  device: DeviceState;
  onBack: () => void;
  onNotification: (message: string, type: ToastType) => void;
}

type SyncStatus = 'ACTIVE' | 'SYNCING' | 'RECONNECTING' | 'OFFLINE';

const Tracking: React.FC<TrackingProps> = ({ device: initialDevice, onBack, onNotification }) => {
  const [device, setDevice] = useState<DeviceState>(initialDevice);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [isSirenLoading, setIsSirenLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('ACTIVE');
  
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<number, any>>({});
  const accuracyCirclesRef = useRef<any[]>([]);
  const pathRef = useRef<any>(null);
  const syncErrorCountRef = useRef(0);

  /**
   * Translates technical exceptions into actionable human intelligence reports.
   */
  const parseOperationalError = (err: any, context: string): string => {
    if (err instanceof VaultError) {
      switch (err.code) {
        case 'QUOTA_EXCEEDED':
          return "Vault storage limit reached. Rotating tactical logs.";
        case 'USER_NOT_FOUND':
          return "Device signature lost. Tracking link severed.";
        case 'AUTH_NOT_FOUND':
          return "Clearance revoked. Please re-authenticate session.";
        default:
          return err.message;
      }
    }
    return `Link anomaly during ${context}. Signal bridge unstable.`;
  };

  /**
   * Haversine distance for tactical proximity calculation
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleGetDirections = useCallback((targetLoc: DeviceLocation) => {
    setLoadingDirections(true);
    onNotification("Establishing high-precision route...", "info");

    if (!navigator.geolocation) {
      setLoadingDirections(false);
      onNotification("Hardware sensor offline. Geolocation unavailable.", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Standard Google Maps Direction URL with origin and destination coordinates
        const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${targetLoc.lat},${targetLoc.lng}&travelmode=driving`;
        window.open(url, '_blank');
        setLoadingDirections(false);
        onNotification("Navigational uplink established.", "success");
      },
      (error) => {
        setLoadingDirections(false);
        onNotification("Satellite fix failed. Launching direct map view.", "warning");
        const url = `https://www.google.com/maps/search/?api=1&query=${targetLoc.lat},${targetLoc.lng}`;
        window.open(url, '_blank');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onNotification]);

  const handleToggleSiren = async () => {
    setIsSirenLoading(true);
    try {
      const db = dbService.getRawDB();
      const owner = db.users.find(u => u.devices.some(d => d.id === device.id));
      
      if (!owner) throw new VaultError("Identity record missing.", "AUTH_NOT_FOUND");

      const newCmd: RemoteCommand = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'SIREN',
        timestamp: Date.now(),
        isExecuted: false
      };

      const updatedDevice: DeviceState = {
        ...device,
        isAlarming: !device.isAlarming,
        pendingCommands: [...(device.pendingCommands || []), newCmd]
      };

      await dbService.updateDevice(owner.id, updatedDevice);
      setDevice(updatedDevice);
      onNotification(
        updatedDevice.isAlarming ? "Audible Beacon Broadcast Active" : "Tactical Silence protocol restored", 
        updatedDevice.isAlarming ? "warning" : "success"
      );
    } catch (e) {
      onNotification(parseOperationalError(e, "command dispatch"), "error");
    } finally {
      setIsSirenLoading(false);
    }
  };

  // Leaflet Map Initialization
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      try {
        const initialLoc = device.lastLocation || { lat: 0, lng: 0 };
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          tap: true 
        }).setView([initialLoc.lat, initialLoc.lng], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(mapRef.current);
      } catch (err) {
        onNotification("Tactical Map Engine initialization failed.", "error");
      }
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Map Overlays: Enhanced Accuracy Circles and Tactical Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear previous tactical layers
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    markersRef.current = {};
    accuracyCirclesRef.current.forEach((c: any) => c.remove());
    accuracyCirclesRef.current = [];
    if (pathRef.current) pathRef.current.remove();

    const history = device.locationHistory || [];
    const points: [number, number][] = history.map(h => [h.lat, h.lng]);

    // Draw Movement Breadcrumbs
    if (points.length > 1) {
      pathRef.current = L.polyline(points, {
        color: '#2563eb',
        weight: 1.5,
        opacity: 0.15,
        dashArray: '3, 10'
      }).addTo(mapRef.current);
    }

    history.forEach((loc, idx) => {
      const isLatest = idx === history.length - 1;
      
      // Precision-Based Color Gradient
      let accuracyColor = '#2563eb'; // Nominal Blue
      if (loc.accuracy <= 10) accuracyColor = '#10b981'; // Precision Lock (Green)
      else if (loc.accuracy <= 30) accuracyColor = '#3b82f6'; // Good Link (Blue)
      else if (loc.accuracy <= 70) accuracyColor = '#f59e0b'; // Signal Degradation (Amber)
      else accuracyColor = '#ef4444'; // Extreme Drift (Red)

      // Dynamic Accuracy Circle (Physical Meter Radius)
      const accuracyCircle = L.circle([loc.lat, loc.lng], {
        radius: loc.accuracy, 
        color: accuracyColor,
        weight: isLatest ? 1.5 : 0.5,
        opacity: isLatest ? 0.5 : 0.05,
        fillColor: accuracyColor,
        fillOpacity: isLatest ? 0.1 : 0.02,
        className: isLatest ? 'accuracy-circle-tactical accuracy-fill-pulse' : '',
        interactive: false
      }).addTo(mapRef.current);
      accuracyCirclesRef.current.push(accuracyCircle);

      const htmlIcon = isLatest 
        ? `<div class="relative">
            <div class="pulse-ring" style="background: ${accuracyColor}22"></div>
            <div class="custom-marker-live shadow-2xl" style="background: ${accuracyColor}; border: 3px solid white;"></div>
           </div>`
        : `<div class="w-2 h-2 bg-slate-400 border border-white rounded-full opacity-20"></div>`;

      const marker = L.marker([loc.lat, loc.lng], {
        icon: L.divIcon({
          html: htmlIcon,
          className: 'custom-div-icon',
          iconSize: [isLatest ? 32 : 8, isLatest ? 32 : 8],
          iconAnchor: [isLatest ? 16 : 4, isLatest ? 16 : 4]
        })
      }).addTo(mapRef.current);

      marker.on('click', () => {
        setFocusedIndex(idx);
        mapRef.current.flyTo([loc.lat, loc.lng], 18, { duration: 0.8 });
      });

      markersRef.current[idx] = marker;
    });
  }, [device.locationHistory]);

  // Telemetry Sync
  useEffect(() => {
    const poller = setInterval(async () => {
      try {
        const db = dbService.getRawDB();
        const owner = db.users.find(u => u.devices.some(d => d.id === initialDevice.id));
        if (owner) {
          const updated = owner.devices.find(d => d.id === initialDevice.id);
          if (updated) {
            setDevice(updated);
            syncErrorCountRef.current = 0;
            setSyncStatus('ACTIVE');
            return;
          }
        }
        throw new Error();
      } catch (e) {
        syncErrorCountRef.current += 1;
        if (syncErrorCountRef.current >= 3) setSyncStatus('OFFLINE');
      }
    }, 5000);

    return () => clearInterval(poller);
  }, [initialDevice.id]);

  // User Proximity Watch
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation(pos.coords),
      null,
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const focusedLoc = focusedIndex !== null ? device.locationHistory?.[focusedIndex] : device.lastLocation;
  const distanceKm = userLocation && focusedLoc ? calculateDistance(userLocation.latitude, userLocation.longitude, focusedLoc.lat, focusedLoc.lng) : null;

  const getAccuracyMeta = (accuracy: number) => {
    if (accuracy <= 10) return { label: 'TACTICAL LOCK', color: 'text-emerald-500', bar: 'bg-emerald-500', w: 'w-full', bg: 'bg-emerald-50' };
    if (accuracy <= 30) return { label: 'UPLINK OK', color: 'text-blue-500', bar: 'bg-blue-500', w: 'w-[75%]', bg: 'bg-blue-50' };
    if (accuracy <= 70) return { label: 'DEGRADED FIX', color: 'text-amber-500', bar: 'bg-amber-500', w: 'w-[40%]', bg: 'bg-amber-50' };
    return { label: 'ESTIMATED', color: 'text-red-500', bar: 'bg-red-500', w: 'w-[15%]', bg: 'bg-red-50' };
  };

  const accMeta = getAccuracyMeta(focusedLoc?.accuracy || 0);

  return (
    <Layout title="Tactical Tracker" onBack={onBack}>
      <div className="h-[45vh] bg-slate-200 relative overflow-hidden map-scanlines">
        <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>

        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 border border-white/10">
             <span className={`w-2 h-2 rounded-full ${syncStatus === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
             <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
               {syncStatus === 'ACTIVE' ? 'Uplink Established' : 'Telemetry Lost'}
             </span>
          </div>
          {distanceKm !== null && (
            <div className="bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 border border-white/10">
              <i className="fas fa-location-arrow text-white text-[9px]"></i>
              <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)}m` : `${distanceKm.toFixed(2)}km`} Proximity
              </span>
            </div>
          )}
        </div>

        <button 
          onClick={() => {
            setFocusedIndex(null);
            if (mapRef.current && device.lastLocation) {
              mapRef.current.flyTo([device.lastLocation.lat, device.lastLocation.lng], 17, { duration: 1.2 });
            }
          }}
          className="absolute bottom-16 right-6 z-10 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center text-blue-600 active:scale-90 transition-all border border-slate-100"
        >
          <i className="fas fa-crosshairs text-xl"></i>
        </button>
      </div>

      <div className="px-6 -mt-10 relative z-10 pb-12">
        <div className="bg-white rounded-[2.5rem] shadow-[0_30px_70px_rgba(15,23,42,0.15)] p-8 border border-slate-100">
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <h3 className="font-black text-3xl text-slate-900 tracking-tighter mb-1 leading-none">{device.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{device.model}</p>
              
              <div className="flex items-center gap-2 mt-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all duration-300 shadow-sm ${
                  device.networkStatus === 'wifi' ? 'bg-blue-50 border-blue-100' : 
                  device.networkStatus === 'cellular' ? 'bg-indigo-50 border-indigo-100' : 
                  'bg-red-50 border-red-100'
                }`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    device.networkStatus === 'wifi' ? 'bg-blue-600 text-white' : 
                    device.networkStatus === 'cellular' ? 'bg-indigo-600 text-white' : 
                    'bg-red-500 text-white'
                  }`}>
                    <i className={`fas ${
                      device.networkStatus === 'wifi' ? 'fa-wifi' : 
                      device.networkStatus === 'cellular' ? 'fa-signal-bars' : 
                      'fa-signal-slash'
                    } text-[10px]`}></i>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-0.5 ${
                      device.networkStatus === 'none' ? 'text-red-400' : 
                      device.networkStatus === 'wifi' ? 'text-blue-400' : 'text-indigo-400'
                    }`}>
                      {device.networkStatus === 'none' ? 'Bridge Offline' : 'Uplink Active'}
                    </p>
                    <h5 className={`text-[10px] font-black uppercase tracking-tight ${
                      device.networkStatus === 'none' ? 'text-red-700' : 
                      device.networkStatus === 'wifi' ? 'text-blue-900' : 'text-indigo-900'
                    }`}>
                      {device.networkStatus === 'wifi' ? 'WiFi Node' : 
                       device.networkStatus === 'cellular' ? 'Cellular Node' : 
                       'Signal Severed'}
                    </h5>
                  </div>
                  {device.networkStatus !== 'none' && (
                    <div className="ml-auto flex gap-0.5 pl-2">
                       {[1,2,3,4].map(i => <div key={i} className={`w-0.5 h-2 rounded-full ${i <= (device.networkStatus === 'wifi' ? 4 : 3) ? 'bg-blue-600' : 'bg-blue-200'}`}></div>)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tactical Accuracy HUD */}
            <div className={`${accMeta.bg} p-4 rounded-3xl border border-slate-100 text-center min-w-[130px] shadow-sm relative transition-all duration-500`}>
              <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Target Certainty</p>
              <div className="flex items-center justify-center gap-1 mb-2">
                <p className={`text-2xl font-black ${accMeta.color} leading-none`}>±{focusedLoc?.accuracy || 0}</p>
                <span className={`text-[10px] font-black ${accMeta.color}`}>M</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden mb-2">
                 <div className={`h-full ${accMeta.bar} ${accMeta.w} rounded-full transition-all duration-1000 ease-out`}></div>
              </div>
              <p className={`text-[7px] font-black uppercase tracking-[0.1em] ${accMeta.color}`}>
                {accMeta.label}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Battery</p>
               <div className="flex items-end gap-1">
                 <p className="text-xl font-black text-slate-800 leading-none">{focusedLoc?.batteryLevel || device.batteryLevel}%</p>
                 <i className="fas fa-battery-bolt text-[10px] text-emerald-500 mb-0.5"></i>
               </div>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Velocity</p>
               <div className="flex items-end gap-1">
                 <p className="text-xl font-black text-slate-800 leading-none">{(focusedLoc?.speed || 0).toFixed(0)}</p>
                 <p className="text-[8px] font-black text-slate-400 mb-0.5">KM/H</p>
               </div>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Uplink</p>
               <p className="text-[10px] font-black text-slate-800 leading-none truncate">
                 {focusedLoc ? new Date(focusedLoc.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Syncing'}
               </p>
            </div>
          </div>

          <div className="space-y-3">
             <button 
               onClick={() => focusedLoc && handleGetDirections(focusedLoc)}
               disabled={loadingDirections || !focusedLoc}
               className="group w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 shadow-xl shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50"
             >
               {loadingDirections ? (
                 <i className="fas fa-satellite-dish fa-spin"></i>
               ) : (
                 <i className="fas fa-location-arrow transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"></i>
               )}
               {loadingDirections ? 'Synthesizing Path...' : 'Get Directions'}
             </button>
             
             <button 
               onClick={handleToggleSiren}
               disabled={isSirenLoading}
               className={`w-full py-5 rounded-3xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-lg ${device.isAlarming ? 'bg-orange-600 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
             >
               {isSirenLoading ? (
                 <i className="fas fa-circle-notch fa-spin"></i>
               ) : (
                 <i className={`fas ${device.isAlarming ? 'fa-volume-slash' : 'fa-bullhorn'}`}></i>
               )}
               {device.isAlarming ? 'Terminate Audible Beacon' : 'Dispatch Remote Siren'}
             </button>
          </div>

          <div className="mt-8 bg-slate-900 p-5 rounded-3xl flex items-center gap-4 border border-white/5 relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 p-4 opacity-5">
               <i className="fas fa-radar text-4xl"></i>
             </div>
             <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-blue-400 text-lg relative z-10">
               <i className="fas fa-microchip"></i>
             </div>
             <div className="flex-1 relative z-10">
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">HDOP Telemetry Shield</p>
               <p className="text-[9px] text-slate-400 font-bold leading-tight mt-0.5">Location accuracy represents the probability radius in meters based on current satellite dilution values. The visual ring dynamically resizes to match precision.</p>
             </div>
          </div>

          <p className="text-center text-[8px] font-black text-slate-300 uppercase tracking-[0.5em] mt-10">
            Safe Mobile Intel Core • V2.6.2
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Tracking;