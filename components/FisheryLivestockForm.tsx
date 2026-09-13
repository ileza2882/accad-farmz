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

// One pond, one log entry - no automatic naming
const createInitialPond = (): FisheryLivestockPondData => ({
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
  const [pond, setPond] = useState<FisheryLivestockPondData>(() => {
    if (initialData?.ponds && initialData.ponds.length > 0) {
      return initialData.ponds[0];
    }
    return createInitialPond();
  });

  const [generalNotes, setGeneralNotes] = useState(initialData?.generalNotes || '');

  useEffect(() => {
    if (initialData?.ponds && initialData.ponds.length > 0) {
      setPond(initialData.ponds[0]);
    }
    if (initialData?.generalNotes) {
      setGeneralNotes(initialData.generalNotes);
    }
  }, [initialData]);

  // Field Updates for the pond
  const handlePondChange = (field: keyof FisheryLivestockPondData, value: any) => {
    setPond(prev => ({ ...prev, [field]: value }));
  };

  const handleWaterChangedToday = (hasChanged: boolean, times: string = '') => {
    setPond(prev => ({
      ...prev,
      waterChangedToday: { hasChanged, times }
    }));
  };

  const handleFeedItemChange = (itemIndex: number, field: string, value: any) => {
    setPond(prev => {
      const feedItems = [...prev.feedingRecords.items];
      feedItems[itemIndex] = { ...feedItems[itemIndex], [field]: value };
      return { ...prev, feedingRecords: { items: feedItems } };
    });
  };

  const addFeedItem = () => {
    setPond(prev => ({
      ...prev,
      feedingRecords: {
        items: [
          ...prev.feedingRecords.items,
          { type: 'Branded' as const, size: '2mm', brand: 'Blue Crown', quantityKg: '' }
        ]
      }
    }));
  };

  const removeFeedItem = (itemIndex: number) => {
    setPond(prev => ({
      ...prev,
      feedingRecords: {
        items: prev.feedingRecords.items.filter((_, idx) => idx !== itemIndex)
      }
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handlePondChange('pondPhoto', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form Submission
  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();

    const finalizedPond = {
      ...pond,
      pondNo: pond.pondNo?.trim() || 'Pond 1'
    };

    onSubmit({
      ponds: [finalizedPond],
      generalNotes
    });
  };

  const totalFish = Number(pond.quantityOfFish) || 0;
  const totalMortality = Number(pond.mortality) || 0;
  const totalFeedKg = pond.feedingRecords.items.reduce((sum, item) => sum + (Number(item.quantityKg) || 0), 0);

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
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Fish Stock</span>
          <div className="text-xl font-black text-emerald-700">{totalFish.toLocaleString()} Fish</div>
          <p className="text-[10px] text-slate-500 font-medium">This pond</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Today's Feed Used</span>
          <div className="text-xl font-black text-blue-700">{totalFeedKg.toFixed(1)} KG</div>
          <p className="text-[10px] text-slate-500 font-medium">Recorded feed consumption</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Mortality</span>
          <div className="text-xl font-black text-rose-600">{totalMortality} Fish</div>
          <p className="text-[10px] text-slate-500 font-medium">Daily count</p>
        </div>
      </div>

      {/* ===== POND FORM ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6">

        {/* Form Title & Context Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              <Fish className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  {pond.pondNo?.trim() || 'Pond Log'}
                </h4>
                {pond.date && (
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>{pond.date}</span>
                  </span>
                )}
                {pond.batch && (
                  <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                    {pond.batch}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Daily Pond Log Entry
              </p>
            </div>
          </div>

          {totalMortality > 0 && (
            <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
              {totalMortality} Mortality
            </span>
          )}
        </div>

        {/* Pond Form Inputs */}
        <div className="p-5 sm:p-7 space-y-6">

          {/* Row 1: Date, Pond Name, Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
                Record Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={pond.date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => handlePondChange('date', e.target.value)}
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
                value={pond.pondNo}
                onChange={(e) => handlePondChange('pondNo', e.target.value)}
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
                value={pond.batch}
                onChange={(e) => handlePondChange('batch', e.target.value)}
                placeholder="e.g. Batch 2026-A, Fingerling Intake"
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
                value={pond.quantityOfFish}
                onChange={(e) => handlePondChange('quantityOfFish', e.target.value)}
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
                value={pond.mortality}
                onChange={(e) => handlePondChange('mortality', e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 3: Water Conditions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-emerald-900 mb-1">Water Condition</label>
              <select
                value={pond.waterCondition}
                onChange={(e) => handlePondChange('waterCondition', e.target.value)}
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
                  onClick={() => handleWaterChangedToday(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                    pond.waterChangedToday.hasChanged ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleWaterChangedToday(false, '')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                    !pond.waterChangedToday.hasChanged ? 'bg-slate-800 text-white border-slate-800 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Pond Photo - recorded alongside the water condition it evidences */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Pond Photo Attachment</span>
              </span>
              {pond.pondPhoto && (
                <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Photo Attached</span>
                </span>
              )}
            </div>

            {pond.pondPhoto ? (
              <div className="space-y-2">
                <img
                  src={pond.pondPhoto}
                  alt="Pond attachment"
                  className="w-full max-h-72 object-contain bg-white rounded-2xl border-2 border-emerald-200 shadow-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-700 cursor-pointer transition-all active:scale-95">
                    Replace Photo
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e)} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => handlePondChange('pondPhoto', '')}
                    className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-600 hover:text-rose-700 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full py-8 px-4 bg-white border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-2xl cursor-pointer transition-all text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Tap to Attach Pond Photo</span>
                <span className="text-[10px] text-slate-500 font-medium">Take or choose a photo of the pond for this log</span>
                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e)} className="hidden" />
              </label>
            )}
          </div>

          {/* Row 5: Feeding Records */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                Feed Administered Today for {pond.pondNo?.trim() || 'This Pond'}
              </span>
              <button
                type="button"
                onClick={() => addFeedItem()}
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
                    onChange={(e) => handleFeedItemChange(feedIdx, 'type', e.target.value)}
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
                    onChange={(e) => handleFeedItemChange(feedIdx, 'size', e.target.value)}
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
                      onChange={(e) => handleFeedItemChange(feedIdx, 'brand', e.target.value)}
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
                      onChange={(e) => handleFeedItemChange(feedIdx, 'quantityKg', e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                    />
                  </div>
                  {pond.feedingRecords.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeedItem(feedIdx)}
                      className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg mt-3.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Row 6: Feeding Response */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Feeding Response</label>
            <select
              value={pond.feedingResponse}
              onChange={(e) => handlePondChange('feedingResponse', e.target.value)}
              className={`w-full sm:max-w-xs border rounded-xl px-3 py-2 text-xs font-bold ${
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

          {/* Row 7: Pond Specific Notes */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">
              Pond Observations / Specific Remarks
            </label>
            <input
              type="text"
              value={pond.notes || ''}
              onChange={(e) => handlePondChange('notes', e.target.value)}
              placeholder="e.g. Sampling net test conducted, fish active, water level topped up"
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all"
            />
          </div>

        </div>

      </div>

      {/* Final Submit Action Bar */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-black uppercase">Submit Grow-Out Livestock Report</h4>
          <p className="text-xs text-slate-400">
            Submits this pond's log ({totalFish.toLocaleString()} fish, {totalFeedKg.toFixed(1)} kg feed) for manager vetting.
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
