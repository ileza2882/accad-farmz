import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AdminNav: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const routes = [
    { name: 'Root / Onboarding', path: '/' },
    { name: 'Auth Node', path: '/auth' },
    { name: 'Staff Terminal', path: '/staff' },
    { name: 'Manager Control', path: '/manager' },
    { name: 'Executive Oversight', path: '/executive' },
    { name: 'Staging: Poultry', path: '/staging/Poultry' },
    { name: 'Staging: Cattle', path: '/staging/Cattle' },
  ];

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[999] w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-emerald-600 transition-all transform active:scale-90 border-2 border-white/20"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M4 6h16M4 12h16m-7 6h7" /></svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-[999] flex flex-col items-end space-y-4">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-bottom-5 duration-300 w-64">
        <div className="flex items-center justify-between mb-6 px-2">
          <span className="text-[10px] font-black text-emerald-500 tracking-[0.3em] uppercase">Admin Bridge</span>
          <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="space-y-1">
          {routes.map(route => (
            <button
              key={route.path}
              onClick={() => { navigate(route.path); setIsOpen(false); }}
              className="w-full text-left px-4 py-3 text-[11px] font-bold text-slate-400 hover:bg-white/5 hover:text-emerald-400 rounded-xl transition-all uppercase tracking-wider"
            >
              {route.name}
            </button>
          ))}
        </div>
        
        <div className="mt-6 pt-6 border-t border-white/5 px-2">
          <p className="text-[9px] font-black text-slate-600 tracking-widest uppercase">Dev Environment • 2025</p>
        </div>
      </div>
    </div>
  );
};