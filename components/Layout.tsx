import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { User } from '../types';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const isStandalone = 
    location.pathname === '/' || 
    location.pathname.startsWith('/staging/') || 
    location.pathname === '/staff' || 
    location.pathname === '/manager' || 
    location.pathname === '/executive' || 
    location.pathname === '/auth';

  if (isStandalone) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white relative">
      {user && (
        <div className="fixed top-6 right-6 z-[100]">
           <button 
            onClick={() => { onLogout(); window.location.href = '#/'; }}
            className="bg-white/80 backdrop-blur-md hover:bg-white px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all shadow-lg border border-slate-100 text-slate-500 active:scale-95"
          >
            Sign out
          </button>
        </div>
      )}

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <Outlet />
        </div>
      </main>

      <footer className="bg-slate-50 border-t border-slate-100 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-400 text-[10px] font-black tracking-[0.5em] uppercase">
            &copy; {new Date().getFullYear()} ACCAD FARM
          </p>
          <div className="flex justify-center space-x-6 mt-6 text-[9px] font-bold text-slate-300 tracking-widest uppercase">
            <span className="cursor-pointer hover:text-emerald-500">Privacy</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-emerald-500">Terms</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-emerald-500">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};