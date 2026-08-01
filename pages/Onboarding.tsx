import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Department } from '../types';

interface OnboardingProps {
  onSelect: (dept: Department) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSelect }) => {
  const navigate = useNavigate();

  const handleSelect = (dept: Department) => {
    onSelect(dept);
    if (dept === Department.FISHERY) {
      navigate('/auth');
    } else {
      navigate(`/staging/${dept}`);
    }
  };

  const departments = [
    {
      id: Department.FISHERY,
      name: 'Fishery',
      status: 'Active',
      color: 'bg-emerald-500',
      image: 'https://drive.google.com/thumbnail?id=1N8lOyOO4bg2A901Ns3uSaQiwwASNr6_L&sz=w1000'
    },
    {
      id: Department.POULTRY,
      name: 'Poultry',
      status: 'Standby',
      color: 'bg-orange-500',
      image: 'https://drive.google.com/thumbnail?id=1pFJf3s6biH6jokeG9J8dBUyukAj_ngqY&sz=w1000'
    },
    {
      id: Department.CATTLE,
      name: 'Cattle',
      status: 'Standby',
      color: 'bg-amber-500',
      image: 'https://drive.google.com/thumbnail?id=1LXKorpiQPt5BF13qkVXc8kOZXarF3aTW&sz=w1000'
    },
    {
      id: Department.PIGS,
      name: 'Pigs',
      status: 'Standby',
      color: 'bg-rose-500',
      image: 'https://drive.google.com/thumbnail?id=10sNUlopVgU-oHNDnrAipEBxsEIJ2kLJM&sz=w1000'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header Logo & Top Navigation */}
      <header className="w-full bg-slate-950 border-b border-slate-800/60 sticky top-0 z-50 backdrop-blur-md bg-slate-950/90">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-white rounded-xl p-1.5 shadow-sm flex items-center justify-center border border-slate-200">
              <img src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" className="w-full h-full object-contain" alt="Accad Logo" referrerPolicy="no-referrer" />
            </div>
            <div>
              <span className="text-white font-black text-sm tracking-wider uppercase">ACCAD <span className="text-emerald-500">FARMS</span></span>
              <span className="hidden sm:inline-block ml-2 text-[9px] font-bold text-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Portal</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/auth')} 
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
          >
            Sign In / Register
          </button>
        </div>
      </header>

      {/* Vibrant Hero Section with Animal Farm Overlay */}
      <section className="w-full min-h-[75vh] bg-slate-900 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Vibrant Animal Farm Background Overlay with High Visibility & Glowing Green Tones */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2000&auto=format&fit=crop" 
            alt="Animal Farm Texture" 
            className="w-full h-full object-cover opacity-50 pointer-events-none filter saturate-200 brightness-110 contrast-105" 
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-slate-900/75 to-slate-950/85 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-6 mb-12">
            {/* Reduced Compact Professional Logo Size */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl p-2.5 shadow-xl shadow-emerald-500/20 flex items-center justify-center transform hover:scale-105 transition-transform duration-300 border border-slate-100">
              <img src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
            </div>
            <div className="text-center">
              <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none uppercase italic">
                ACCAD <span className="text-emerald-500">FARMS</span>
              </h1>
              <p className="text-emerald-500/80 font-black text-xs md:text-sm uppercase tracking-[0.6em] mt-4">Unified Operational Infrastructure</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <p className="text-slate-300 max-w-2xl text-base md:text-lg font-medium leading-relaxed mb-10">
              Managing the future of agricultural excellence through precision agriculture and unified sector coordination.
            </p>
            <div className="animate-bounce text-emerald-500">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M19 14l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Department Selection Section */}
      <section className="w-full py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Select Department</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">Identify Operational Node</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleSelect(dept.id)}
                className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl hover:border-emerald-500 transition-all text-left flex items-center space-x-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center p-3 shrink-0 group-hover:bg-emerald-50 transition-colors relative z-10">
                  <img src={dept.image} alt={dept.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{dept.name}</h3>
                    <div className={`w-2.5 h-2.5 rounded-full ${dept.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-300'}`}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">{dept.id} NODE</p>
                  <div className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center group-hover:translate-x-2 transition-transform">
                    Initialize Link
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M14 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="w-full py-20 bg-white border-t border-slate-100 text-center px-6">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">© 2026 ACCAD FARMS INFRASTRUCTURE • ALL SYSTEMS OPERATIONAL</p>
      </footer>
    </div>
  );
};