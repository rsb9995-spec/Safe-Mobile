
import React, { useState, useEffect, useRef } from 'react';
import { User, DeviceLocation, LoginEntry } from '../types';
import { Layout } from '../components/Layout';
import { dbService, STORAGE_KEY } from '../services/storage';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'USERS' | 'AUDIT_LOG' | 'VAULT'>('MONITOR');
  const [selectedAuditUser, setSelectedAuditUser] = useState<User | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [rawDB, setRawDB] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user.role === 'SUPER_ADMIN' || user.email === 'admin@safe.mobile';

  const loadUsers = async () => {
    const allUsers = await dbService.getAllUsers();
    setUsers(allUsers.filter(u => u.role === 'USER'));
    setRawDB(JSON.stringify(dbService.getRawDB(), null, 2));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleBlockUser = async (userId: string) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    const updated = { ...userToUpdate, isBlocked: !userToUpdate.isBlocked };
    await dbService.updateUser(updated);
    loadUsers();
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      dbService.exportDatabase();
      setIsExporting(false);
      loadUsers();
    }, 1000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = dbService.importDatabase(content);
      if (success) {
        alert("Vault restored successfully! The application will now reload.");
        window.location.reload();
      } else {
        alert("Invalid vault file format.");
      }
    };
    reader.readAsText(file);
  };

  const openAudit = (u: User) => {
    setSelectedAuditUser(u);
    setActiveTab('AUDIT_LOG');
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout 
      title={isSuperAdmin ? "Super Admin" : "Security Panel"} 
      actions={
        <button onClick={onLogout} className="text-slate-500 hover:text-red-500 transition-colors px-2">
          <i className="fas fa-power-off"></i>
        </button>
      }
    >
      <div className="bg-white border-b sticky top-0 z-20 flex overflow-x-auto scrollbar-hide shadow-sm">
        {(['MONITOR', 'USERS', 'AUDIT_LOG', 'VAULT'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'MONITOR' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-chart-line text-blue-600"></i>
              Infrastructure Monitor
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Users</p>
                <p className="text-3xl font-black text-blue-600">{users.length}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Movement History</p>
                <p className="text-3xl font-black text-green-600">
                  {users.reduce((acc, u) => acc + (u.devices[0]?.locationHistory?.length || 0), 0)}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <i className="fas fa-terminal text-6xl"></i>
              </div>
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                Secure System Feed
              </h4>
              <div className="font-mono text-[9px] space-y-2 text-blue-400/80 max-h-48 overflow-y-auto pr-2">
                <p>[{new Date().toLocaleTimeString()}] CRYPTO: AES-256 Vault Ready</p>
                <p>[{new Date().toLocaleTimeString()}] DB_SYNC: STORAGE_KEY={STORAGE_KEY}</p>
                <p>[{new Date().toLocaleTimeString()}] PRUNE: History Limit = 200 items</p>
                {users.slice(0, 3).map(u => (
                  <p key={u.id}>[{new Date().toLocaleTimeString()}] PING: {u.email.split('@')[0]} (Loc: {u.devices[0]?.lastLocation?.accuracy || '0'}m)</p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg text-[11px]"
              >
                <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                BACKUP VAULT
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all text-[11px]"
              >
                <i className="fas fa-upload"></i>
                RESTORE VAULT
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".json" 
                className="hidden" 
              />
            </div>
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="space-y-4">
            <div className="relative mb-6">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                placeholder="Search user database..."
                className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <i className="fas fa-user-slash text-4xl mb-4 block"></i>
                <p className="text-sm font-bold uppercase tracking-widest">No users found</p>
              </div>
            ) : filteredUsers.map(u => (
              <div key={u.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-lg border border-blue-100">
                      {u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{u.email}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {u.id}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${u.isBlocked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {u.isBlocked ? 'Blocked' : 'Active'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openAudit(u)}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-black transition-colors"
                  >
                    View Audit Log
                  </button>
                  <button 
                    onClick={() => toggleBlockUser(u.id)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold border ${u.isBlocked ? 'bg-green-600 text-white border-green-600' : 'bg-white text-red-600 border-red-100'}`}
                  >
                    {u.isBlocked ? 'Unblock' : 'Suspend'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'AUDIT_LOG' && (
          <div className="space-y-6">
            {!selectedAuditUser ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <i className="fas fa-fingerprint text-4xl text-slate-300 mb-4"></i>
                <p className="text-slate-500 text-sm font-bold">Select a user to initiate audit</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-800">{selectedAuditUser.email}</h3>
                    <p className="text-[10px] text-slate-400">Master Record Control</p>
                  </div>
                  <button onClick={() => setSelectedAuditUser(null)} className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors">
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {/* User Credentials Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <i className="fas fa-user-shield text-7xl"></i>
                  </div>
                  <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest mb-1">Encrypted Hash (Master Key)</p>
                  <p className="font-mono text-xs break-all mb-6 bg-black/20 p-3 rounded-xl border border-white/10">{selectedAuditUser.password}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-bold opacity-70 uppercase">Login Count</p>
                      <p className="text-lg font-black">{selectedAuditUser.loginHistory?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold opacity-70 uppercase">Registered On</p>
                      <p className="text-sm font-bold">{new Date(selectedAuditUser.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Login History */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-history text-blue-500"></i>
                    Session Access History
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                    {selectedAuditUser.loginHistory?.slice().reverse().map((log, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] border-b border-slate-50 pb-2">
                        <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold ${log.status === 'SUCCESS' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permanent Location History */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-map-marked-alt text-green-500"></i>
                    Movement Audit Trail
                  </h4>
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                    {selectedAuditUser.devices[0]?.locationHistory?.slice().reverse().map((loc, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between hover:bg-slate-100 transition-colors">
                        <div>
                          <p className="text-[10px] font-black text-slate-700 tracking-tight">LAT: {loc.lat.toFixed(5)} / LNG: {loc.lng.toFixed(5)}</p>
                          <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase">
                            <i className="far fa-clock mr-1"></i>
                            {new Date(loc.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-blue-600 mb-1">ACC: ±{loc.accuracy}m</p>
                          <a 
                            href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[8px] text-white bg-blue-600 px-2 py-1 rounded-md uppercase font-bold"
                          >
                            Map <i className="fas fa-external-link-alt"></i>
                          </a>
                        </div>
                      </div>
                    ))}
                    {(!selectedAuditUser.devices[0]?.locationHistory || selectedAuditUser.devices[0].locationHistory.length === 0) && (
                      <p className="text-[10px] text-slate-400 italic">No coordinates stored for this device.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'VAULT' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Internal Data Vault</h3>
              <button 
                onClick={() => {
                   if(confirm("DANGER: This will permanently delete ALL data. Are you sure?")) {
                     dbService.wipeDatabase();
                   }
                }}
                className="text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md"
              >
                Destroy DB
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time JSON view of the application state. History is limited to 200 entries per category to maintain performance.
            </p>
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-2xl">
              <pre className="font-mono text-[9px] text-green-400 overflow-x-auto max-h-[400px] scrollbar-hide">
                {rawDB}
              </pre>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl">
              <p className="text-[10px] text-yellow-800 leading-relaxed font-bold italic">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                DATA GOVERNANCE: All location records are purged from memory if the local storage exceeds 5MB. Manual backups are recommended weekly.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
