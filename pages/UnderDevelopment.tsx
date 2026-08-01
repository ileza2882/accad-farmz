import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Department } from '../types';

export const UnderDevelopment: React.FC = () => {
  const navigate = useNavigate();
  const { dept } = useParams<{ dept: string }>();

  const getDeptConfig = (deptId: string | undefined) => {
    switch (deptId) {
      case Department.POULTRY: 
        return { 
          name: 'Poultry', 
          bgColor: 'bg-[#ef5a16]', 
          glowColor: 'rgba(239, 90, 22, 0.25)',
          image: 'https://drive.google.com/thumbnail?id=1pFJf3s6biH6jokeG9J8dBUyukAj_ngqY&sz=w1000' 
        };
      case Department.CATTLE: 
        return { 
          name: 'Cattle', 
          bgColor: 'bg-[#eab308]', 
          glowColor: 'rgba(234, 179, 8, 0.25)',
          image: 'https://drive.google.com/thumbnail?id=1LXKorpiQPt5BF13qkVXc8kOZXarF3aTW&sz=w1000' 
        };
      case Department.PIGS: 
        return { 
          name: 'Pigs', 
          bgColor: 'bg-[#ec4899]', 
          glowColor: 'rgba(236, 72, 153, 0.25)',
          image: 'https://drive.google.com/thumbnail?id=10sNUlopVgU-oHNDnrAipEBxsEIJ2kLJM&sz=w1000' 
        };
      default: 
        return { 
          name: 'Department', 
          bgColor: 'bg-emerald-600', 
          glowColor: 'rgba(16, 185, 129, 0.25)',
          image: 'https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000' 
        };
    }
  };

  const config = getDeptConfig(dept);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans overflow-hidden relative">
      {/* Subtle vibrant background element */}
      <div 
        className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 animate-pulse -top-40 -right-40"
        style={{ backgroundColor: config.glowColor }}
      ></div>
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-10 -bottom-20 -left-20"
        style={{ backgroundColor: config.glowColor }}
      ></div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-12 text-center border-b border-slate-100 bg-slate-50/50">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-lg border border-slate-100 p-4 mx-auto mb-8 transform hover:rotate-3 transition-transform duration-500">
              <img 
                src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" 
                className="w-full h-full object-contain" 
                alt="Logo" 
              />
            </div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">
              {config.name} <span className="text-emerald-600">Staging</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em]">Operational Node Restructuring</p>
          </div>

          <div className="p-12 flex flex-col items-center text-center">
            <div className={`w-48 h-48 rounded-2xl shadow-2xl mb-10 p-1 border-4 border-white overflow-hidden ${config.bgColor}`}>
              <img src={config.image} alt={config.name} className="w-full h-full object-cover rounded-xl" />
            </div>
            
            <p className="text-slate-500 text-lg font-medium leading-relaxed mb-12 max-w-md">
              This sector is currently undergoing a scheduled infrastructure update for the 2025 seasonal cycle.
            </p>

            <button
              onClick={() => navigate('/')}
              className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7 7-7" />
              </svg>
              <span>Return to Selection</span>
            </button>
          </div>

          <div className="px-12 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center space-x-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Status: Active Node Monitoring</p>
          </div>
        </div>
      </div>
    </div>
  );
};