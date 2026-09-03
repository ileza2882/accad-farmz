import React, { useState, useEffect } from 'react';
import { FisheryLivestockFormData, FisheryLivestockPondData } from '../types';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Image as ImageIcon, 
  RefreshCw, 
  Waves,
  Droplets,
  Fish,
  Sparkles,
  Send,
  Building2,
  Calendar,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';

interface FisheryLivestockFormProps {
  initialData?: FisheryLivestockFormData;
  reportId?: string;
  currentUser?: { fullName: string; email: string };
  onSubmit: (data: FisheryLivestockFormData) => void;
  isSubmitting?: boolean;
  color?: string;
}

const BRANDS = ["Blue Crown", "Ecofloat", "Aqualis", "Alpha", "Coppen", "Skretting"];
const SIZES = ["0.2mm", "0.3mm", "0.5mm", "0.8mm", "1.2mm", "1.5mm", "2mm", "3mm", "4mm", "6mm", "9mm"];

// Create single initial pond without automatic names
const createInitialPond = (index: number = 0): FisheryLivestockPondData => ({
  pondNo: '',
  date: new Date().toISOString().split('T')[0],
  pondSizeSqm: '',
  quantityOfFish: '',
  batch: '',
  waterCondition: 'Clear',
  notes: '',
  waterChangedToday: { hasChanged: false, times: '' },
  feedingRecords: {
    items: [{ type: 'Branded', size: '2mm', brand: 'Blue Crown', quantityKg: '' }]
  },
  feedingResponse: 'Active',
  mortality: '0',
  pondPhoto: ''
});

export const FisheryLivestockForm: React.FC<FisheryLivestockFormProps> = ({ 
  initialData, 
  currentUser,
  onSubmit, 
  isSubmitting 
}) => {
  const [ponds, setPonds] = useState<FisheryLivestockPondData[]>(() => {
    if (initialData?.ponds && initialData.ponds.length > 0) {
      return initialData.ponds;
    }
    return [createInitialPond(0)];
  });

  const [activePondIndex, setActivePondIndex] = useState(0);
  const [generalNotes, setGeneralNotes] = useState(initialData?.generalNotes || '');

  useEffect(() => {
    if (initialData?.ponds && initialData.ponds.length > 0) {
      setPonds(initialData.ponds);
    }
    if (initialData?.generalNotes) {
      setGeneralNotes(initialData.generalNotes);
    }
  }, [initialData]);

  // Ensure activePondIndex is always within bounds
  useEffect(() => {
    if (activePondIndex >= ponds.length && ponds.length > 0) {
      setActivePondIndex(ponds.length - 1);
    }
  }, [ponds.length, activePondIndex]);

  // Field Updates for a specific pond
  const handlePondChange = (index: number, field: keyof FisheryLivestockPondData, value: any) => {
    setPonds(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleWaterChangedToday = (index: number, hasChanged: boolean, times: string = '') => {
    setPonds(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        waterChangedToday: { hasChanged, times }
      };
      return updated;
    });
  };

  const handleFeedItemChange = (pondIndex: number, itemIndex: number, field: string, value: any) => {
    setPonds(prev => {
      const updated = [...prev];
      const feedItems = [...updated[pondIndex].feedingRecords.items];
      feedItems[itemIndex] = { ...feedItems[itemIndex], [field]: value };
      updated[pondIndex] = {
        ...updated[pondIndex],
        feedingRecords: { items: feedItems }
      };
      return updated;
    });
  };

  const addFeedItem = (pondIndex: number) => {
    setPonds(prev => {
      const updated = [...prev];
      const feedItems = [
        ...updated[pondIndex].feedingRecords.items,
        { type: 'Branded' as const, size: '2mm', brand: 'Blue Crown', quantityKg: '' }
      ];
      updated[pondIndex] = {
        ...updated[pondIndex],
        feedingRecords: { items: feedItems }
      };
      return updated;
    });
  };

  const removeFeedItem = (pondIndex: number, itemIndex: number) => {
    setPonds(prev => {
      const updated = [...prev];
      const feedItems = updated[pondIndex].feedingRecords.items.filter((_, idx) => idx !== itemIndex);
      updated[pondIndex] = {
        ...updated[pondIndex],
        feedingRecords: { items: feedItems }
      };
      return updated;
    });
  };

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handlePondChange(index, 'pondPhoto', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // User can add a pond at any time
  const handleAddPond = () => {
    const newPond = createInitialPond(ponds.length);
    setPonds(prev => [...prev, newPond]);
    setActivePondIndex(ponds.length);
  };

  const handleRemovePond = (index: number) => {
    if (ponds.length <= 1) return;
    const pondLabel = ponds[index].pondNo?.trim() || `Pond ${index + 1}`;
    if (window.confirm(`Are you sure you want to remove ${pondLabel}?`)) {
      setPonds(prev => prev.filter((_, idx) => idx !== index));
      setActivePondIndex(prev => (prev >= index ? Math.max(0, prev - 1) : prev));
    }
  };

  // Form Submission
  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify each pond has at least name or index
    const finalizedPonds = ponds.map((p, idx) => ({
      ...p,
      pondNo: p.pondNo?.trim() || `Pond ${idx + 1}`
    }));

    onSubmit({
      ponds: finalizedPonds,
      generalNotes
    });
  };

  // Total summary calculations across all entered ponds
  const totalFish = ponds.reduce((sum, p) => sum + (Number(p.quantityOfFish) || 0), 0);
  const totalMortality = ponds.reduce((sum, p) => sum + (Number(p.mortality) || 0), 0);
  let totalFeedKg = 0;
  ponds.forEach(p => {
    p.feedingRecords.items.forEach(item => {
      totalFeedKg += Number(item.quantityKg) || 0;
    });
  });

  const currentPond = ponds[activePondIndex] || ponds[0] || createInitialPond(0);
  const currentFishCount = Number(currentPond.quantityOfFish) || 0;
  const currentMortality = Number(currentPond.mortality) || 0;

  return (
    <form onSubmit={handleSubmitAll} className="space-y-6">
      
      {/* Grow-Out Livestock Facility Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 sm:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden border border-emerald-800/40">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/80 border border-emerald-700/80 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
            <Waves className="w-3.5 h-3.5 text-emerald-300" />
            <span>Grow-Out Section &bull; Livestock Facility</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            Grow-Out Livestock Facility
          </h3>
          <p className="text-xs text-emerald-200 font-medium max-w-2xl">
            Record and track precision pond metrics, feed allocation, and daily livestock tracking.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 relative z-10">
          <button
            type="button"
            onClick={handleAddPond}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-950/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Pond</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Ponds</span>
          <div className="text-xl font-black text-slate-900">{ponds.length} {ponds.length === 1 ? 'Pond' : 'Ponds'}</div>
          <p className="text-[10px] text-emerald-700 font-bold">Facility Active Log</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Fish Stock</span>
          <div className="text-xl font-black text-emerald-700">{totalFish.toLocaleString()} Fish</div>
          <p className="text-[10px] text-slate-500 font-medium">Across all ponds</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Today's Feed Used</span>
          <div className="text-xl font-black text-blue-700">{totalFeedKg.toFixed(1)} KG</div>
          <p className="text-[10px] text-slate-500 font-medium">Recorded feed consumption</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Mortality</span>
          <div className="text-xl font-black text-rose-600">{totalMortality} Fish</div>
          <p className="text-[10px] text-slate-500 font-medium">Daily count</p>
        </div>
      </div>

      {/* Pond Selector Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <Fish className="w-4 h-4 text-emerald-600" />
            <span>Pond Records ({ponds.length}) &bull; Select to View / Edit</span>
          </span>
          <button
            type="button"
            onClick={handleAddPond}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add New Pond</span>
          </button>
        </div>

        {/* Pond Pills Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {ponds.map((p, idx) => {
            const isActive = idx === activePondIndex;
            const displayName = p.pondNo?.trim() || `Pond ${idx + 1}`;
            const fishCount = Number(p.quantityOfFish) || 0;
            const mort = Number(p.mortality) || 0;

            return (
              <div
                key={idx}
                className={`flex items-center rounded-xl border transition-all shrink-0 ${
                  isActive
                    ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActivePondIndex(idx)}
                  className="px-3.5 py-2 text-left cursor-pointer flex items-center space-x-2.5"
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors ${
                    isActive ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className={`text-xs font-black uppercase tracking-tight truncate max-w-[120px] ${
                      isActive ? 'text-emerald-950 font-black' : 'text-slate-800'
                    }`}>
                      {displayName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {p.date ? p.date : 'No date'} &bull; {fishCount > 0 ? `${fishCount.toLocaleString()} fish` : '0 fish'}
                    </div>
                  </div>
                </button>

                {ponds.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePond(idx);
                    }}
                    className="p-1.5 mr-1 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title={`Delete ${displayName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== ACTIVE POND FORM (ONE FORM AT A TIME) ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
        
        {/* Form Title & Context Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              {activePondIndex + 1}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  {currentPond.pondNo?.trim() || `Pond #${activePondIndex + 1}`}
                </h4>
                {currentPond.date && (
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>{currentPond.date}</span>
                  </span>
                )}
                {currentPond.batch && (
                  <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                    {currentPond.batch}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Active Form &bull; Editing Pond {activePondIndex + 1} of {ponds.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentMortality > 0 && (
              <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                {currentMortality} Mortality
              </span>
            )}
            {ponds.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemovePond(activePondIndex)}
                className="px-3 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                title="Delete this pond"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Pond Form Inputs */}
        <div className="p-5 sm:p-7 space-y-6">
          
          {/* Row 1: Date, Pond Name, Batch, Pond Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                Record Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={currentPond.date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => handlePondChange(activePondIndex, 'date', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                Pond Name / Number *
              </label>
              <input
                type="text"
                required
                value={currentPond.pondNo}
                onChange={(e) => handlePondChange(activePondIndex, 'pondNo', e.target.value)}
                placeholder="e.g. Pond 1, Concrete Pond A, Nursery Tank"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                Stock Batch / ID *
              </label>
              <input
                type="text"
                required
                value={currentPond.batch}
                onChange={(e) => handlePondChange(activePondIndex, 'batch', e.target.value)}
                placeholder="e.g. Batch 2026-A, Fingerling Intake"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                Pond Size (SQM)
              </label>
              <input
                type="number"
                step="any"
                value={currentPond.pondSizeSqm}
                onChange={(e) => handlePondChange(activePondIndex, 'pondSizeSqm', e.target.value)}
                placeholder="e.g. 50"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 2: Fish Quantity & Mortality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-700 mb-1">
                Quantity of Fish (Live Count) *
              </label>
              <input
                type="number"
                required
                value={currentPond.quantityOfFish}
                onChange={(e) => handlePondChange(activePondIndex, 'quantityOfFish', e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-700 mb-1">
                Daily Mortality Count
              </label>
              <input
                type="number"
                value={currentPond.mortality}
                onChange={(e) => handlePondChange(activePondIndex, 'mortality', e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 3: Water Conditions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-emerald-900 mb-1">Water Condition</label>
              <select
                value={currentPond.waterCondition}
                onChange={(e) => handlePondChange(activePondIndex, 'waterCondition', e.target.value)}
                className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="Clear">Clear</option>
                <option value="Unclear">Unclear</option>
                <option value="Greenish">Greenish</option>
                <option value="Aerated">Aerated</option>
                <option value="Brownish">Brownish</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-emerald-900 mb-1">Water Changed Today?</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleWaterChangedToday(activePondIndex, true, currentPond.waterChangedToday.times || '1')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                    currentPond.waterChangedToday.hasChanged ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleWaterChangedToday(activePondIndex, false, '')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                    !currentPond.waterChangedToday.hasChanged ? 'bg-slate-800 text-white border-slate-800 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {currentPond.waterChangedToday.hasChanged && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-emerald-900 mb-1">How Many Times?</label>
                <input
                  type="number"
                  value={currentPond.waterChangedToday.times}
                  onChange={(e) => handleWaterChangedToday(activePondIndex, true, e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>
            )}
          </div>

          {/* Row 4: Feeding Records */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                Feed Administered Today for {currentPond.pondNo?.trim() || `Pond #${activePondIndex + 1}`}
              </span>
              <button
                type="button"
                onClick={() => addFeedItem(activePondIndex)}
                className="text-emerald-700 hover:text-emerald-800 text-[11px] font-black flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Feed Type</span>
              </button>
            </div>

            {currentPond.feedingRecords.items.map((feed, feedIdx) => (
              <div key={feedIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Feed Type</label>
                  <select
                    value={feed.type}
                    onChange={(e) => handleFeedItemChange(activePondIndex, feedIdx, 'type', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                  >
                    <option value="Branded">Branded</option>
                    <option value="Farm-produced">Farm-produced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Pellet Size</label>
                  <select
                    value={feed.size}
                    onChange={(e) => handleFeedItemChange(activePondIndex, feedIdx, 'size', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                  >
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {feed.type === 'Branded' && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Brand</label>
                    <select
                      value={feed.brand || 'Blue Crown'}
                      onChange={(e) => handleFeedItemChange(activePondIndex, feedIdx, 'brand', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                    >
                      {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Quantity (KG)</label>
                    <input
                      type="number"
                      step="any"
                      value={feed.quantityKg}
                      onChange={(e) => handleFeedItemChange(activePondIndex, feedIdx, 'quantityKg', e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                    />
                  </div>
                  {currentPond.feedingRecords.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeedItem(activePondIndex, feedIdx)}
                      className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg mt-3.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Row 5: Feeding Response & Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Feeding Response</label>
              <select
                value={currentPond.feedingResponse}
                onChange={(e) => handlePondChange(activePondIndex, 'feedingResponse', e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                  currentPond.feedingResponse === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                  currentPond.feedingResponse === 'Slow' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                  'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <option value="Active">Active Feeding</option>
                <option value="Slow">Slow Feeding</option>
                <option value="Poor">Poor / No Feeding</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Photo Attachment</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(activePondIndex, e)}
                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 cursor-pointer"
              />
              {currentPond.pondPhoto && (
                <div className="mt-2">
                  <img src={currentPond.pondPhoto} alt="Pond preview" className="w-24 h-16 object-cover rounded-xl border border-slate-200" />
                </div>
              )}
            </div>
          </div>

          {/* Row 6: Pond Specific Notes */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
              Pond Observations / Specific Remarks
            </label>
            <input
              type="text"
              value={currentPond.notes || ''}
              onChange={(e) => handlePondChange(activePondIndex, 'notes', e.target.value)}
              placeholder="e.g. Sampling net test conducted, fish active, water level topped up"
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all"
            />
          </div>

        </div>

        {/* Bottom Navigation for Ponds */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={activePondIndex === 0}
              onClick={() => setActivePondIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-700 transition-all cursor-pointer active:scale-95"
            >
              &larr; Previous Pond
            </button>
            <button
              type="button"
              disabled={activePondIndex >= ponds.length - 1}
              onClick={() => setActivePondIndex(prev => Math.min(ponds.length - 1, prev + 1))}
              className="px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-700 transition-all cursor-pointer active:scale-95"
            >
              Next Pond &rarr;
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleAddPond}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Pond</span>
            </button>
          </div>
        </div>

      </div>

      {/* General Notes for the Entire Report */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 space-y-2 shadow-sm">
        <label className="block text-xs font-bold uppercase text-slate-700">Grow-Out General Facility Remarks & Shift Notes</label>
        <textarea
          rows={3}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Record overall facility remarks, water treatments, aeration logs, or harvesting schedule notes across all ponds..."
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl p-4 text-xs font-medium outline-none transition-all"
        />
      </div>

      {/* Final Submit Action Bar */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-black uppercase">Submit Grow-Out Livestock Report</h4>
          <p className="text-xs text-slate-400">
            Submits complete data for all {ponds.length} {ponds.length === 1 ? 'pond' : 'ponds'} ({totalFish.toLocaleString()} fish, {totalFeedKg.toFixed(1)} kg feed) for manager vetting.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>Submit Complete Grow-Out Report</span>
        </button>
      </div>

    </form>
  );
};
