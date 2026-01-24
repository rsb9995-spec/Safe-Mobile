import React, { useState, useMemo } from 'react';
import { Layout } from '../components/Layout';

const FAQ_DATA = [
  {
    category: "Device Security",
    icon: "fa-shield-halved",
    items: [
      {
        q: "How does Remote Lock work?",
        a: "When you trigger a Lock command from the dashboard, a signed cryptographic token is sent to your device via the secure bridge. The OS instantly revokes all user session access and requires your master vault password to resume."
      },
      {
        q: "Can a factory reset bypass Safe Mobile?",
        a: "If the 'Remote Admin Bridge' was granted during setup, our system hooks into the hardware-level security module. Any unauthorized reset attempt will trigger an immediate permanent lock (Wipe Protocol)."
      },
      {
        q: "What is 'Wipe Protocol'?",
        a: "Wipe Protocol uses AES-256 bit military-grade erasure to sanitize all user partitions. Once initiated, data cannot be recovered, even by professional forensics."
      }
    ]
  },
  {
    category: "Tracking & Location",
    icon: "fa-map-location-dot",
    items: [
      {
        q: "Why is my location stale?",
        a: "Stale location data typically occurs if the device has lost GSM/LTE signal or enters a deep battery-saving state. Ensure 'Persistent Background' permissions are active in the Guard tab."
      },
      {
        q: "Is GPS active 24/7?",
        a: "Safe Mobile uses 'Significant Motion' tracking. We only engage the high-precision GPS module when the accelerometer detects movement, maximizing battery life while maintaining security."
      }
    ]
  },
  {
    category: "Identity & Privacy",
    icon: "fa-user-secret",
    items: [
      {
        q: "Who can see my tracking data?",
        a: "Only your primary vault owner identity has the decryption keys for your location history. Not even Safe Mobile administrators can view your precise coordinates without your explicit authorization."
      },
      {
        q: "How is my password stored?",
        a: "We use a multi-round PBKDF2 hashing algorithm with unique salts. Your actual password never leaves your device in cleartext."
      }
    ]
  },
  {
    category: "Troubleshooting",
    icon: "fa-wrench",
    items: [
      {
        q: "The Remote Siren isn't sounding",
        a: "Ensure you have authorized 'Intrusion Alerts' to bypass silent mode. Also, check that the device volume isn't hardware-locked by external peripheral controls."
      },
      {
        q: "Commands are pending but not executing",
        a: "The device must have an active internet connection to receive commands. Check the 'Signal' strength indicator on your dashboard."
      }
    ]
  }
];

const Help: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  const filteredFaq = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_DATA;
    
    const query = searchQuery.toLowerCase();
    return FAQ_DATA.map(section => ({
      ...section,
      items: section.items.filter(item => 
        item.q.toLowerCase().includes(query) || 
        item.a.toLowerCase().includes(query)
      )
    })).filter(section => section.items.length > 0);
  }, [searchQuery]);

  return (
    <Layout title="Command Support" onBack={onBack}>
      <div className="px-6 py-8">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-6 shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <i className="fas fa-circle-question text-7xl"></i>
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black tracking-tight mb-2">Protocol Guide</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Technical Intel & Operational Support
            </p>
          </div>
        </div>

        {/* Tactical Search Bar */}
        <div className="relative mb-10">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <i className="fas fa-search text-xs"></i>
          </span>
          <input 
            type="text" 
            placeholder="Search tactical database..."
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-8 min-h-[40vh]">
          {filteredFaq.length > 0 ? (
            filteredFaq.map((section, sIdx) => (
              <div key={section.category} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${sIdx * 100}ms` }}>
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shadow-inner">
                    <i className={`fas ${section.icon}`}></i>
                  </div>
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">{section.category}</h3>
                </div>
                
                <div className="space-y-3">
                  {section.items.map((item, iIdx) => {
                    const id = `${section.category}-${iIdx}`;
                    const isOpen = openIndex === id;
                    return (
                      <div 
                        key={id}
                        className={`bg-white border rounded-3xl transition-all duration-300 overflow-hidden ${isOpen ? 'border-blue-200 shadow-xl scale-[1.02]' : 'border-slate-100 hover:border-slate-200'}`}
                      >
                        <button 
                          onClick={() => toggle(id)}
                          className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                        >
                          <span className={`text-[13px] font-black leading-tight tracking-tight ${isOpen ? 'text-blue-600' : 'text-slate-700'}`}>
                            {item.q}
                          </span>
                          <i className={`fas fa-chevron-down text-[10px] transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-300'}`}></i>
                        </button>
                        
                        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="px-6 pb-6 text-xs text-slate-500 leading-relaxed font-bold border-t border-slate-50 pt-4">
                            {item.a}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <i className="fas fa-satellite-dish text-4xl mb-4 text-slate-300"></i>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">No matching intel records found</p>
            </div>
          )}
        </div>

        <div className="mt-12 bg-slate-900 rounded-[2.5rem] p-8 text-center border border-white/5 shadow-2xl">
           <div className="w-14 h-14 bg-white/5 rounded-2xl shadow-inner flex items-center justify-center mx-auto mb-4 text-blue-400 border border-white/5">
             <i className="fas fa-headset text-xl"></i>
           </div>
           <h4 className="font-black text-white text-sm mb-2 tracking-tight">Emergency Uplink</h4>
           <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-6 uppercase tracking-wider">
             Tactical assistance for recovery operations available 24/7.
           </p>
           <button className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-500/20">
             Contact Response Team
           </button>
        </div>
      </div>
    </Layout>
  );
};

export default Help;