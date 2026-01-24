
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, AuditLog, DeviceState, LoginEntry, DeviceLocation } from '../types';
import { Layout } from '../components/Layout';
import { dbService, VaultError } from '../services/storage';
import { ToastType } from '../components/Toast';

declare const L: any;

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onNotification: (message: string, type: ToastType) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user: adminUser, onLogout, onNotification }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'DOSSIERS' | 'GLOBAL_MAP'>('MONITOR');
  const [search, setSearch] = useState('');
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [inspectionTab, setInspectionTab] = useState<'OVERVIEW' | 'TELEMETRY' | 'LOGINS'>('OVERVIEW');

  const globalLevelMapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  
  const inspectionMapContainerRef = useRef<HTMLDivElement>(null);
  const inspectionMapRef = useRef<any>(null);

  const loadData = async () => {
    try {
      const allUsers = await dbService.getAllUsers();
      const allLogs = await dbService.getAuditLogs();
      const telemetry = dbService.getGlobalTelemetry();
      setUsers(allUsers);
      setAuditLogs(allLogs);
      setStats(telemetry);
      
      // If we are currently inspecting a user, update their data
      if (inspectingUser) {
        const updated = allUsers.find(u => u.id === inspectingUser.id);
        if (updated) setInspectingUser(updated);
      }
    } catch (e) {
      onNotification("Operational feed disconnected.", "error");
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Global Map Logic
  useEffect(() => {
    if (activeTab === 'GLOBAL_MAP' && globalLevelMapRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(globalLevelMapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([20.5937, 78.9629], 5); // Center on India
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMapRef.current);
    }
    
    if (activeTab === 'GLOBAL_MAP' && leafletMapRef.current && stats?.allDevices) {
      // Clear existing markers if any (Leaflet marker management can be complex, for simplicity we rely on manual cleanup or layers)
      stats.allDevices.forEach((d: any) => {
        if (d.lastLocation) {
          const marker = L.marker([d.lastLocation.lat, d.lastLocation.lng], {
            icon: L.divIcon({
              html: `<div class="w-8 h-8 ${d.isLocked ? 'bg-red-600' : 'bg-blue-600'} rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-[8px] font-black">${d.ownerEmail[0].toUpperCase()}</div>`,
              className: 'custom-div-icon',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(leafletMapRef.current);
          marker.bindPopup(`<div class="p-2 font-black text-xs text-white">Owner: ${d.ownerEmail}<br/>Device: ${d.name}<br/>Status: ${d.isLocked ? 'LOCKED' : 'ACTIVE'}</div>`);
        }
      });
    }

    return () => {
      if (activeTab !== 'GLOBAL_MAP' && leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [activeTab, stats]);

  // Inspection Map Logic
  useEffect(() => {
    if (inspectingUser && inspectionTab === 'TELEMETRY' && inspectionMapContainerRef.current) {
      const primaryDevice = inspectingUser.devices[0];
      const loc = primaryDevice?.lastLocation;

      if (!inspectionMapRef.current) {
        inspectionMapRef.current = L.map(inspectionMapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(inspectionMapRef.current);
      }

      if (loc) {
        inspectionMapRef.current.setView([loc.lat, loc.lng], 15);
        L.marker([loc.lat, loc.lng], {
          icon: L.divIcon({
            html: `<div class="pulse-ring bg-blue-500/30"></div><div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>`,
            className: 'relative',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(inspectionMapRef.current);
      } else {
        inspectionMapRef.current.setView([20.5937, 78.9629], 5);
      }
    }

    return () => {
      if (inspectionMapRef.current) {
        inspectionMapRef.current.remove();
        inspectionMapRef.current = null;
      }
    };
  }, [inspectingUser, inspectionTab]);

  const handleToggleBlock = async (u: User) => {
    const actionStr = u.isBlocked ? "Restore Access" : "Suspend Access";
    if (!window.confirm(`CONFIRM: ${actionStr} for identity [${u.email}]?`)) return;

    try {
      const updated = { ...u, isBlocked: !u.isBlocked };
      await dbService.updateUser(updated, adminUser);
      onNotification(updated.isBlocked ? "Identity Suspended" : "Identity Restored", "info");
      loadData();
    } catch (e) {
      onNotification("Failed to toggle access.", "error");
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`CRITICAL: Permanently expunge identity [${u.email}] and all associated device records? This action is irreversible.`)) return;

    try {
      await dbService.deleteUser(u.id, adminUser);
      onNotification("User dossier expunged.", "success");
      loadData();
    } catch (e) {
      onNotification("Expunge operation failed.", "error");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase()));
  }, [users, search]);

  return (
    <Layout 
      title="Tactical Command" 
      actions={
        <button onClick={onLogout} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
          <i className="fas fa-power-off"></i>
        </button>
      }
    >
      <div className="bg-slate-950 border-b border-white/5 flex sticky top-0 z-20 shadow-xl">
        {(['MONITOR', 'DOSSIERS', 'GLOBAL_MAP'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-500'}`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="p-6 pb-24">
        {activeTab === 'MONITOR' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Vault Capacitance</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-slate-900">{stats.totalUsers}</p>
                  <p className="text-[10px] font-bold text-slate-400">Identities</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Active Links</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-blue-600">{stats.activeDevices}</p>
                  <p className="text-[10px] font-bold text-blue-400">Pinging</p>
                </div>
              </div>
              <div className="bg-slate-900 p-6 rounded-[2rem] col-span-2 shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <i className="fas fa-radiation text-6xl"></i>
                </div>
                <p className="text-[9px] font-black text-blue-400 uppercase mb-1 tracking-widest">Neutralized Units</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-red-500">{stats.lockedDevices}</p>
                  <p className="text-[10px] font-bold text-red-400">Remotely Secured</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tactical Audit Feed</h4>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {auditLogs.length > 0 ? auditLogs.map(log => (
                  <div key={log.id} className="group relative pl-6 border-l-2 border-slate-100 py-1 transition-all hover:border-blue-400">
                    <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors"></div>
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-black uppercase tracking-tight text-slate-800">{log.action}</p>
                      <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${
                        log.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' : 
                        log.severity === 'HIGH' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                      }`}>{log.severity}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">
                      <span className="text-slate-600">{log.actorEmail}</span> • {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                    {log.targetId && <p className="text-[8px] text-slate-300 mt-0.5">Target: {log.targetId}</p>}
                  </div>
                )) : (
                  <p className="text-[10px] text-slate-400 font-bold text-center py-10 italic">No tactical events recorded.</p>
                )}
              </div>
            </div>

            <button onClick={() => dbService.exportDatabase(adminUser)} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
              <i className="fas fa-file-export text-blue-400"></i> Archive Entire User Database
            </button>
          </div>
        )}

        {activeTab === 'DOSSIERS' && (
          <div className="space-y-6">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400">
                <i className="fas fa-magnifying-glass text-xs"></i>
              </span>
              <input 
                type="text" 
                placeholder="Query Dossier Vault (Email / ID / Meta)..." 
                className="w-full pl-12 pr-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-xs font-bold transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              {filteredUsers.length > 0 ? filteredUsers.map(u => (
                <div key={u.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group">
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-inner ${u.isBlocked ? 'bg-red-50 text-red-400' : 'bg-blue-50 text-blue-600'}`}>
                           <i className={`fas ${u.isBlocked ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                        </div>
                        <div className="min-w-0">
                           <h4 className="font-black text-slate-900 text-sm truncate">{u.email}</h4>
                           <div className="flex items-center gap-2 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${u.isBlocked ? 'bg-red-500' : 'bg-green-500'}`}></span>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Vault: {u.id}</p>
                           </div>
                        </div>
                     </div>
                     <div className={`shrink-0 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter border ${u.isBlocked ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {u.role}
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50/50 p-4 rounded-3xl border border-slate-50">
                     <div>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Interaction</p>
                       <p className="text-[10px] text-slate-800 font-black">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</p>
                     </div>
                     <div className="border-l border-slate-200 pl-4">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Device Count</p>
                       <p className="text-[10px] text-slate-800 font-black">{u.devices.length} Units Connected</p>
                     </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setInspectingUser(u); setInspectionTab('OVERVIEW'); }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-800">
                       Open Dossier
                    </button>
                    <button onClick={() => handleToggleBlock(u)} className={`px-5 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${u.isBlocked ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                      <i className={`fas ${u.isBlocked ? 'fa-unlock' : 'fa-ban'}`}></i>
                    </button>
                    <button onClick={() => handleDeleteUser(u)} className="px-5 py-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">
                      <i className="fas fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                     <i className="fas fa-database text-3xl"></i>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No matching user records.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'GLOBAL_MAP' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
               <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Satellite Global View</h3>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Regional Geolocation Monitor</p>
            </div>
            <div className="bg-slate-200 rounded-[3rem] overflow-hidden h-[60vh] relative border-4 border-white shadow-2xl">
               <div ref={globalLevelMapRef} className="absolute inset-0 z-0"></div>
               <div className="absolute top-6 right-6 z-10 bg-slate-950/80 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 shadow-2xl">
                 <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></span>
                 Real-Time Grid Feed
               </div>
            </div>
          </div>
        )}
      </div>

      {inspectingUser && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-t-[3rem] sm:rounded-[3rem] h-[92vh] sm:h-[80vh] overflow-hidden flex flex-col relative shadow-[0_-20px_100px_rgba(0,0,0,0.5)] border-t border-white/10">
            <button onClick={() => setInspectingUser(null)} className="absolute top-6 right-8 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors z-50 shadow-sm">
              <i className="fas fa-times text-lg"></i>
            </button>
            
            <div className="p-10 pb-4">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">Deep Inspection Tool</p>
              <h3 className="text-2xl font-black text-slate-900 truncate pr-16 tracking-tight">{inspectingUser.email}</h3>
            </div>

            {/* Inspection Tabs */}
            <div className="flex px-10 gap-6 border-b border-slate-100">
               {(['OVERVIEW', 'TELEMETRY', 'LOGINS'] as const).map(tab => (
                 <button 
                  key={tab} 
                  onClick={() => setInspectionTab(tab)}
                  className={`pb-4 text-[9px] font-black uppercase tracking-widest transition-all relative ${inspectionTab === tab ? 'text-blue-600' : 'text-slate-400'}`}
                 >
                   {tab}
                   {inspectionTab === tab && <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full"></span>}
                 </button>
               ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              {inspectionTab === 'OVERVIEW' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Created</p>
                         <p className="text-[11px] font-black text-slate-800">{new Date(inspectingUser.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                         <p className={`text-[11px] font-black uppercase ${inspectingUser.isBlocked ? 'text-red-500' : 'text-green-600'}`}>
                           {inspectingUser.isBlocked ? 'Suspended' : 'Operational'}
                         </p>
                      </div>
                   </div>

                   <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Metadata Analysis</h4>
                      <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                         <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                         <div className="grid grid-cols-2 gap-6 relative z-10">
                            <div>
                               <p className="text-[8px] font-black text-blue-200 uppercase mb-1">Region</p>
                               <p className="text-[11px] font-black">{inspectingUser.metadata.lastKnownCity || 'Unknown Sector'}</p>
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-blue-200 uppercase mb-1">OS Signature</p>
                               <p className="text-[11px] font-black truncate">{inspectingUser.metadata.primaryDeviceOS || 'Standard'}</p>
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-blue-200 uppercase mb-1">Commands</p>
                               <p className="text-[11px] font-black">{inspectingUser.metadata.totalCommandsIssued} Dispatched</p>
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-blue-200 uppercase mb-1">IP Log</p>
                               <p className="text-[11px] font-black">{inspectingUser.loginHistory?.[0]?.ip || '127.0.0.1'}</p>
                            </div>
                         </div>
                      </div>
                   </section>

                   <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Target Fleet ({inspectingUser.devices.length})</h4>
                      <div className="space-y-4">
                        {inspectingUser.devices.map(d => (
                          <div key={d.id} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                <i className="fas fa-mobile-screen-button"></i>
                              </div>
                              <div>
                                <p className="text-[13px] font-black text-slate-900 leading-none">{d.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1.5">{d.model} • {d.batteryLevel}%</p>
                              </div>
                            </div>
                            <div className="text-right">
                               <div className="flex items-center gap-1.5 justify-end">
                                  <span className={`w-2 h-2 rounded-full ${Date.now() - d.lastActive < 300000 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    {Date.now() - d.lastActive < 300000 ? 'Live' : 'Stale'}
                                  </span>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                   </section>
                </div>
              )}

              {inspectionTab === 'TELEMETRY' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                   <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Satellite Lock</h4>
                      <div className="bg-slate-100 rounded-[2.5rem] overflow-hidden h-60 relative border border-slate-200 shadow-inner">
                        <div ref={inspectionMapContainerRef} className="absolute inset-0 z-0"></div>
                        {!inspectingUser.devices[0]?.lastLocation && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 backdrop-blur-sm z-10 text-center p-8">
                             <div>
                                <i className="fas fa-satellite-dish text-2xl text-slate-300 mb-3"></i>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active GPS uplink found for this identity.</p>
                             </div>
                          </div>
                        )}
                      </div>
                   </section>

                   <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Coordinate History Logs</h4>
                      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-slate-50">
                                  <th className="px-6 py-4 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Timestamp</th>
                                  <th className="px-6 py-4 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Coords</th>
                                  <th className="px-6 py-4 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Prec.</th>
                               </tr>
                            </thead>
                            <tbody>
                               {inspectingUser.devices[0]?.locationHistory?.slice(0, 10).map((loc: DeviceLocation, idx: number) => (
                                 <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/20 transition-colors">
                                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{new Date(loc.timestamp).toLocaleTimeString()}</td>
                                    <td className="px-6 py-4 text-[9px] font-black text-slate-900">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</td>
                                    <td className="px-6 py-4">
                                       <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">±{loc.accuracy}m</span>
                                    </td>
                                 </tr>
                               ))}
                               {!inspectingUser.devices[0]?.locationHistory?.length && (
                                 <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-[10px] font-bold text-slate-400 italic">No historical traces found.</td>
                                 </tr>
                               )}
                            </tbody>
                         </table>
                      </div>
                   </section>
                </div>
              )}

              {inspectionTab === 'LOGINS' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
                   <section>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Authentication Audit Trail</h4>
                      <div className="space-y-4">
                         {inspectingUser.loginHistory?.length ? inspectingUser.loginHistory.map((login: LoginEntry, idx: number) => (
                           <div key={idx} className={`p-6 rounded-[2rem] border flex items-center justify-between transition-all ${login.status === 'SUCCESS' ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-100'}`}>
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${login.status === 'SUCCESS' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    <i className={`fas ${login.status === 'SUCCESS' ? 'fa-shield-check' : 'fa-shield-xmark'}`}></i>
                                 </div>
                                 <div>
                                    <p className="text-[11px] font-black text-slate-900 leading-none mb-1">{login.status === 'SUCCESS' ? 'Authenticated' : 'Login Failure'}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">{new Date(login.timestamp).toLocaleString()}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-black text-slate-900">{login.ip || 'Local Node'}</p>
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">IP SIGNATURE</p>
                              </div>
                           </div>
                         )) : (
                           <div className="p-10 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                             <p className="text-[10px] font-black text-slate-400 uppercase">No login activity records.</p>
                           </div>
                         )}
                      </div>
                   </section>

                   <section className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                      <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
                      <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Identity Integrity Score</h5>
                      <div className="flex items-center gap-6">
                         <div className="relative w-24 h-24">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                               <circle cx="18" cy="18" r="16" fill="none" stroke="#ffffff11" strokeWidth="4"></circle>
                               <circle cx="18" cy="18" r="16" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="100" strokeDashoffset={inspectingUser.isBlocked ? 90 : 15} strokeLinecap="round" className="transition-all duration-1000"></circle>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                               <p className="text-xl font-black text-white">{inspectingUser.isBlocked ? '10' : '95'}</p>
                            </div>
                         </div>
                         <div className="flex-1">
                            <p className="text-xs text-white font-bold leading-relaxed">
                               {inspectingUser.isBlocked 
                                 ? "IDENTITY SUSPENDED: All cryptographic anchors have been severed. Access is administratively denied." 
                                 : "Identity profile matches known behavioral patterns. Security posture is optimal."}
                            </p>
                         </div>
                      </div>
                   </section>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 flex gap-4">
               <button onClick={() => handleToggleBlock(inspectingUser)} className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${inspectingUser.isBlocked ? 'bg-green-600 text-white shadow-xl shadow-green-100' : 'bg-orange-600 text-white shadow-xl shadow-orange-100'}`}>
                 {inspectingUser.isBlocked ? 'Restore Full Access' : 'Suspend Identity'}
               </button>
               <button onClick={() => setInspectingUser(null)} className="px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                 Exit Dossier
               </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
    