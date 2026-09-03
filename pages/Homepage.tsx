import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Department, User } from '../types';
import { 
  ArrowRight, 
  Wrench, 
  Sparkles, 
  X, 
  ExternalLink,
  ChevronRight,
  Crown,
  Layers,
  Activity,
  ShieldCheck
} from 'lucide-react';

interface HomepageProps {
  user: User | null;
  onLoginSuccess?: (user: User) => void;
}

export const Homepage: React.FC<HomepageProps> = ({ user, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [devModalDept, setDevModalDept] = useState<any | null>(null);

  const departments = [
    {
      id: Department.FISHERY,
      name: 'Fishery Department',
      description: 'Aquaculture monitoring, feed inventory, water quality checks, and pond harvest logs.',
      status: 'Active',
      image: 'https://drive.google.com/thumbnail?id=1N8lOyOO4bg2A901Ns3uSaQiwwASNr6_L&sz=w1000'
    },
    {
      id: Department.POULTRY,
      name: 'Poultry Department',
      description: 'Flock mortality records, feed conversion, egg production, and environmental monitoring.',
      status: 'Standby',
      image: 'https://drive.google.com/thumbnail?id=1pFJf3s6biH6jokeG9J8dBUyukAj_ngqY&sz=w1000'
    },
    {
      id: Department.CATTLE,
      name: 'Cattle Department',
      description: 'Livestock health tracking, milk yield metrics, pasture management, and breeding logs.',
      status: 'Standby',
      image: 'https://drive.google.com/thumbnail?id=1LXKorpiQPt5BF13qkVXc8kOZXarF3aTW&sz=w1000'
    },
    {
      id: Department.PIGS,
      name: 'Pigs Department',
      description: 'Porker weights, litter tracking, feed allocation, and veterinary check logs.',
      status: 'Standby',
      image: 'https://drive.google.com/thumbnail?id=10sNUlopVgU-oHNDnrAipEBxsEIJ2kLJM&sz=w1000'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-12 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-200 overflow-hidden bg-white">
        
        {/* Farm Texture Overlay */}
        <div className="absolute inset-0 z-0 opacity-35 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2000&auto=format&fit=crop" 
            alt="Farm Overlay" 
            className="w-full h-full object-cover filter saturate-150"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center pt-4 sm:pt-6">
          
          {/* Executive Tag */}
          <div className="inline-flex items-center space-x-2 bg-slate-100/90 border border-slate-200 px-3.5 py-1.5 rounded-full mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Central Farm Registry System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight uppercase text-slate-900 leading-none">
            ACCAD <span className="text-emerald-600">FARMS</span>
          </h1>

          <p className="mt-3 sm:mt-4 text-[11px] sm:text-sm lg:text-base font-extrabold uppercase text-slate-400 tracking-[0.2em] sm:tracking-[0.4em]">
            Precision Agricultural Operations
          </p>

          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-slate-600 font-medium leading-relaxed px-2 sm:px-0">
            Enterprise farm management system unifying Staff logs, Manager vetting, and Executive Director final governance across Fishery, Poultry, Cattle, and Pigs.
          </p>

        </div>
      </section>

      {/* Department Nodes Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8 sm:mb-12">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-600">Operational Sectors</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase mt-1">Farm Departments</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
            Select a department node to access farm logs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              onClick={() => {
                if (dept.id !== Department.FISHERY) {
                  setDevModalDept(dept);
                } else {
                  navigate('/fishery');
                }
              }}
              className="bg-white border border-slate-200 hover:border-emerald-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex items-start space-x-4 sm:space-x-6 relative group cursor-pointer select-none"
            >
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shrink-0 p-1.5 sm:p-2 group-hover:bg-emerald-50 transition-colors">
                <img 
                  src={dept.image} 
                  alt={dept.name} 
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <h3 className="text-base sm:text-xl font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">{dept.name}</h3>
                  <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase shrink-0 ${
                    dept.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {dept.status}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">{dept.description}</p>

                <div
                  className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-emerald-700 group-hover:text-emerald-800 uppercase tracking-wider group-hover:translate-x-1 transition-transform"
                >
                  <span>Access Department Node</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="bg-slate-50 border-t border-slate-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 text-left">
            
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-2 sm:space-y-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-800">
                <Crown className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Executive Central Governance</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Centralized operational registry with immutable logs, batch unlocking, real-time audit trails, and multi-sector farm data.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Multi-Stage Vetting</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Structured workflow ensures all farm log submissions undergo Manager review before receiving final Executive Director approval.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Immutable Farm Archiving</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Per-row and per-batch saving locks verified records into the permanent archive, with audit-tracked change requests for corrections.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 text-center px-4">
        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
          © {new Date().getFullYear()} ACCAD FARMS INFRASTRUCTURE • ALL SYSTEMS OPERATIONAL
        </p>
      </footer>

      {/* Custom Under Development Branded Overlay Modal */}
      {devModalDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden relative p-8 text-center space-y-6">
            
            <button
              onClick={() => setDevModalDept(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative mx-auto w-24 h-24 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center p-3 shadow-inner">
              <img
                src={devModalDept.image}
                alt={devModalDept.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-2xl shadow-md border-2 border-white">
                <Wrench className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Sector Under Active Development</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{devModalDept.name}</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                The {devModalDept.name} infrastructure is currently undergoing precision monitoring setup and automated sector workflow integration.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setDevModalDept(null);
                  navigate('/fishery');
                }}
                className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Access Active Fishery</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setDevModalDept(null)}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              >
                <span>Understood</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
