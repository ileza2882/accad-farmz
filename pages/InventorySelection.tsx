
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Department, InventoryType } from '../types';

interface InventorySelectionProps {
  department: Department;
  onSelect: (inv: InventoryType) => void;
}

export const InventorySelection: React.FC<InventorySelectionProps> = ({ department, onSelect }) => {
  const navigate = useNavigate();

  const handleSelect = (inv: InventoryType) => {
    onSelect(inv);
    navigate('/staff');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 px-4 py-1.5 rounded-full text-[10px] font-bold text-emerald-700 border border-emerald-100 uppercase tracking-wider mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>{department} department active</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Select Inventory Type</h1>
          <p className="text-slate-500 mt-2 font-medium">Choose an operational aspect to manage</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            onClick={() => handleSelect(InventoryType.ASSET)}
            className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl hover:shadow-2xl hover:border-emerald-500 transition-all text-left flex flex-col group"
          >
            <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-50 transition-colors">
              <svg className="w-7 h-7 text-slate-400 group-hover:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Asset Entry</h2>
            <p className="text-sm text-slate-500 mb-8">Manage equipment, supplies, and physical resources.</p>
            <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-emerald-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Initialize Node
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M14 5l7 7-7 7" /></svg>
            </div>
          </button>

          <button
            onClick={() => handleSelect(InventoryType.LIVESTOCK)}
            className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl hover:shadow-2xl hover:border-emerald-500 transition-all text-left flex flex-col group"
          >
            <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-50 transition-colors">
              <svg className="w-7 h-7 text-slate-400 group-hover:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Livestock Entry</h2>
            <p className="text-sm text-slate-500 mb-8">Transmit population counts and production data.</p>
            <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-emerald-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Initialize Node
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M14 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>
        
        <div className="mt-12 text-center">
          <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Back to Selection</button>
        </div>
      </div>
    </div>
  );
};
