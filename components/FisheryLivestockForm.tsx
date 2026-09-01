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
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Fish,
  Sparkles,
  Send,
  Building2,
  FileCheck,
  Scale
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

// Preset standard 14 ponds for Grow-Out
const createDefaultGrowOutPonds = (): FisheryLivestockPondData[] => {
  return Array.from({ length: 14 }, (_, i) => ({
    pondNo: `Pond ${i + 1}`,
    pondSizeSqm: '',
    quantityOfFish: '',
    batch: `Batch ${String.fromCharCode(65 + (i % 6))}`, // Batch A, B, C...
    waterCondition: 'Clear',
    waterChangedToday: { hasChanged: false, times: '' },
    feedingRecords: {
      items: [{ type: 'Branded', size: '2mm', brand: 'Blue Crown', quantityKg: '' }]
    },
    feedingResponse: 'Active',
    mortality: '0',
    pondPhoto: ''
  }));
};

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
    return createDefaultGrowOutPonds();
  });

  const [generalNotes, setGeneralNotes] = useState(initialData?.generalNotes || '');
  const [activePondFilter, setActivePondFilter] = useState<'ALL' | 'ACTIVE_STOCK' | 'MORTALITY'>('ALL');

  useEffect(() => {
    if (initialData?.ponds && initialData.ponds.length > 0) {
      setPonds(initialData.ponds);
    }
    if (initialData?.generalNotes) {
      setGeneralNotes(initialData.generalNotes);
    }
  }, [initialData]);

  // Field Updates
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

  const handleAddPond = () => {
    setPonds(prev => [
      ...prev,
      {
        pondNo: `Pond ${prev.length + 1}`,
        pondSizeSqm: '',
        quantityOfFish: '',
        batch: `Batch ${String.fromCharCode(65 + (prev.length % 6))}`,
        waterCondition: 'Clear',
        waterChangedToday: { hasChanged: false, times: '' },
        feedingRecords: {
          items: [{ type: 'Branded', size: '2mm', brand: 'Blue Crown', quantityKg: '' }]
        },
        feedingResponse: 'Active',
        mortality: '0',
        pondPhoto: ''
      }
    ]);
  };

  const handleRemovePond = (index: number) => {
    if (ponds.length <= 1) return;
    if (window.confirm(`Are you sure you want to remove ${ponds[index].pondNo}?`)) {
      setPonds(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  // Whole Form Submission Handler (Grow-Out treated as complete preset view)
  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ponds,
      generalNotes
    });
    const allCollapsed: Record<number, boolean> = {};
    ponds.forEach((_, idx) => {
      allCollapsed[idx] = true;
    });
    setCollapsedPonds(allCollapsed);
    setAllExpanded(false);
  };

  // Total summary calculations
  const totalFish = ponds.reduce((sum, p) => sum + (Number(p.quantityOfFish) || 0), 0);
  const totalMortality = ponds.reduce((sum, p) => sum + (Number(p.mortality) || 0), 0);
  let totalFeedKg = 0;
  ponds.forEach(p => {
    p.feedingRecords.items.forEach(item => {
      totalFeedKg += Number(item.quantityKg) || 0;
    });
  });

  return (
    <form onSubmit={handleSubmitAll} className="space-y-6">
      
      {/* Grow-Out Preset View Header */}
      <div className="bg-emerald-900 text-white p-5 sm:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-800/80 border border-emerald-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
            <Waves className="w-3.5 h-3.5 text-emerald-300" />
            <span>Grow-Out Section &bull; Static Preset View</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            Grow-Out Livestock Facility (Ponds 1 – 14)
          </h3>
          <p className="text-xs text-emerald-200 font-medium max-w-2xl">
            This section is treated as a complete, unified view. Enter daily metrics for all ponds and submit the complete report together.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 relative z-10">
          <button
            type="button"
            onClick={handleAddPond}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-950/30 active:scale-95"
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
          <div className="text-xl font-black text-slate-900">{ponds.length} Ponds</div>
          <p className="text-[10px] text-emerald-700 font-bold">Preset Facility View</p>
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

      {/* Ponds List */}
      <div className="space-y-6">
        {ponds.map((pond, pondIndex) => {
          const fishCount = Number(pond.quantityOfFish) || 0;
          const mortalityCount = Number(pond.mortality) || 0;

          return (
            <div 
              key={pondIndex} 
              className="bg-white rounded-3xl border border-slate-200 shadow-sm transition-all overflow-hidden"
            >
              {/* Pond Header */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-slate-50/80 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm border border-emerald-200">
                    {pondIndex + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                        {pond.pondNo || `Pond ${pondIndex + 1}`}
                      </h4>
                      {pond.batch && (
                        <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {pond.batch}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {fishCount > 0 ? `${fishCount.toLocaleString()} Fish` : 'No fish count entered'} &bull; Water: <strong>{pond.waterCondition}</strong> &bull; Response: <strong>{pond.feedingResponse}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {mortalityCount > 0 && (
                    <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                      {mortalityCount} Mortality
                    </span>
                  )}
                  {ponds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePond(pondIndex)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete this pond"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Pond Form Inputs */}
              <div className="p-5 sm:p-7 space-y-5">
                  
                  {/* Row 1: Basic Pond Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Number / Name *</label>
                      <input
                        type="text"
                        required
                        value={pond.pondNo}
                        onChange={(e) => handlePondChange(pondIndex, 'pondNo', e.target.value)}
                        placeholder="e.g. Pond 1"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Size (SQM)</label>
                      <input
                        type="number"
                        step="any"
                        value={pond.pondSizeSqm}
                        onChange={(e) => handlePondChange(pondIndex, 'pondSizeSqm', e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Quantity of Fish *</label>
                      <input
                        type="number"
                        required
                        value={pond.quantityOfFish}
                        onChange={(e) => handlePondChange(pondIndex, 'quantityOfFish', e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Stock Batch *</label>
                      <input
                        type="text"
                        required
                        value={pond.batch}
                        onChange={(e) => handlePondChange(pondIndex, 'batch', e.target.value)}
                        placeholder="e.g. Batch A"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Row 2: Water Conditions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-emerald-900 mb-1">Water Condition</label>
                      <select
                        value={pond.waterCondition}
                        onChange={(e) => handlePondChange(pondIndex, 'waterCondition', e.target.value)}
                        className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="Clear">Clear</option>
                        <option value="Unclear">Unclear</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-emerald-900 mb-1">Water Changed Today?</label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleWaterChangedToday(pondIndex, true, pond.waterChangedToday.times || '1')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                            pond.waterChangedToday.hasChanged ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWaterChangedToday(pondIndex, false, '')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                            !pond.waterChangedToday.hasChanged ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {pond.waterChangedToday.hasChanged && (
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-emerald-900 mb-1">How Many Times?</label>
                        <input
                          type="number"
                          value={pond.waterChangedToday.times}
                          onChange={(e) => handleWaterChangedToday(pondIndex, true, e.target.value)}
                          placeholder="e.g. 1"
                          className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 3: Feeding Records */}
                  <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                        Feed Administered (Today)
                      </span>
                      <button
                        type="button"
                        onClick={() => addFeedItem(pondIndex)}
                        className="text-emerald-700 hover:text-emerald-800 text-[11px] font-black flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Feed Type</span>
                      </button>
                    </div>

                    {pond.feedingRecords.items.map((feed, feedIdx) => (
                      <div key={feedIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Feed Type</label>
                          <select
                            value={feed.type}
                            onChange={(e) => handleFeedItemChange(pondIndex, feedIdx, 'type', e.target.value)}
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
                            onChange={(e) => handleFeedItemChange(pondIndex, feedIdx, 'size', e.target.value)}
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
                              onChange={(e) => handleFeedItemChange(pondIndex, feedIdx, 'brand', e.target.value)}
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
                              onChange={(e) => handleFeedItemChange(pondIndex, feedIdx, 'quantityKg', e.target.value)}
                              placeholder="e.g. 15"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                            />
                          </div>
                          {pond.feedingRecords.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFeedItem(pondIndex, feedIdx)}
                              className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg mt-3.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Row 4: Feeding Response & Mortality */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Feeding Response</label>
                      <select
                        value={pond.feedingResponse}
                        onChange={(e) => handlePondChange(pondIndex, 'feedingResponse', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                          pond.feedingResponse === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          pond.feedingResponse === 'Slow' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="Active">Active Feeding</option>
                        <option value="Slow">Slow Feeding</option>
                        <option value="Poor">Poor / No Feeding</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Mortality (Fish Count)</label>
                      <input
                        type="number"
                        value={pond.mortality}
                        onChange={(e) => handlePondChange(pondIndex, 'mortality', e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Photo Attachment</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(pondIndex, e)}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700"
                      />
                      {pond.pondPhoto && (
                        <div className="mt-2">
                          <img src={pond.pondPhoto} alt="Pond preview" className="w-24 h-16 object-cover rounded-xl border border-slate-200" />
                        </div>
                      )}
                    </div>
                  </div>

                </div>
            </div>
          );
        })}
      </div>

      {/* General Notes */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 space-y-2 shadow-sm">
        <label className="block text-xs font-bold uppercase text-slate-700">Grow-Out General Observations & Operational Notes</label>
        <textarea
          rows={3}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Record any general facility remarks, water treatments, mortality causes, or harvesting schedule notes..."
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl p-4 text-xs font-medium outline-none transition-all"
        />
      </div>

      {/* Whole Form Submit Action */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-black uppercase">Submit Grow-Out Livestock Report</h4>
          <p className="text-xs text-slate-400">
            Submits complete data for all {ponds.length} ponds ({totalFish.toLocaleString()} fish, {totalFeedKg.toFixed(1)} kg feed) for manager vetting.
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
