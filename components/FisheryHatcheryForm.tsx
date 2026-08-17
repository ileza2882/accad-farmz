import React, { useState } from 'react';
import { FisheryHatcheryFormData, FisheryHatcheryBatchData } from '../types';
import { Plus, Trash2, CheckCircle2, RefreshCw, Calendar, Scale, Activity, MapPin, Layers, Sparkles, Hash, Droplets } from 'lucide-react';

interface FisheryHatcheryFormProps {
  onSubmit: (data: FisheryHatcheryFormData) => void;
  isSubmitting?: boolean;
}

const HEALTH_STATUS_OPTIONS = [
  'Excellent',
  'Good',
  'Fair',
  'Under Observation',
  'Poor'
];

export const FisheryHatcheryForm: React.FC<FisheryHatcheryFormProps> = ({ onSubmit, isSubmitting }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [batches, setBatches] = useState<FisheryHatcheryBatchData[]>([
    {
      sourceOfBroodstock: '',
      batchNumber: 'BATCH-001',
      hatcheryDate: todayStr,
      firstDateOfFeeding: todayStr,
      dateOfTransferToGrowOut: todayStr,
      totalTransferredFingerlings: '',
      averageWeightTransferred: '',
      ageOfFingerlingsTransferred: '',
      healthStatusTransferred: 'Good',
      destinatedPondTransferred: 'Grow-Out Pond 1',
      remarks: ''
    }
  ]);

  const [generalNotes, setGeneralNotes] = useState('');

  const addBatch = () => {
    const nextNum = batches.length + 1;
    const padded = String(nextNum).padStart(3, '0');
    setBatches([
      ...batches,
      {
        sourceOfBroodstock: batches[batches.length - 1]?.sourceOfBroodstock || '',
        batchNumber: `BATCH-${padded}`,
        hatcheryDate: todayStr,
        firstDateOfFeeding: todayStr,
        dateOfTransferToGrowOut: todayStr,
        totalTransferredFingerlings: '',
        averageWeightTransferred: '',
        ageOfFingerlingsTransferred: '',
        healthStatusTransferred: 'Good',
        destinatedPondTransferred: `Grow-Out Pond ${nextNum}`,
        remarks: ''
      }
    ]);
  };

  const removeBatch = (index: number) => {
    if (batches.length === 1) return;
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleBatchChange = (index: number, field: keyof FisheryHatcheryBatchData, value: any) => {
    const updated = [...batches];
    updated[index] = { ...updated[index], [field]: value };
    setBatches(updated);
  };

  const totalFingerlings = batches.reduce((acc, b) => acc + (Number(b.totalTransferredFingerlings) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (!b.batchNumber || !b.sourceOfBroodstock) {
        alert(`Please complete the Source of Broodstock and Batch Number for Batch #${i + 1}.`);
        return;
      }
    }
    onSubmit({
      batches,
      generalNotes: generalNotes.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hatchery Production & Fingerling Transfer Record</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-2">Hatchery Section Log Entry</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Log broodstock lineage, incubation milestones, and fingerlings transferred to Grow-Out
          </p>
        </div>

        {/* Quick Summary Badge */}
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl flex items-center space-x-3 shrink-0">
          <Droplets className="w-5 h-5 text-emerald-600" />
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Total Fingerlings</span>
            <span className="text-base font-black text-emerald-700">{totalFingerlings.toLocaleString()} Fish</span>
          </div>
        </div>
      </div>

      {/* Batch Entries */}
      <div className="space-y-6">
        {batches.map((batch, index) => (
          <div key={index} className="bg-slate-50/70 border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-5 relative">
            
            {/* Batch Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-xl bg-emerald-700 text-white text-xs font-black flex items-center justify-center shadow-sm">
                  {index + 1}
                </span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Hatchery Batch: <span className="text-emerald-700">{batch.batchNumber || `Batch #${index + 1}`}</span>
                </h4>
              </div>

              {batches.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBatch(index)}
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Remove Batch</span>
                </button>
              )}
            </div>

            {/* Grid for Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-bold">
              
              {/* 1. Source of Broodstock */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  1. Source of Broodstock *
                </label>
                <input
                  type="text"
                  required
                  value={batch.sourceOfBroodstock}
                  onChange={(e) => handleBatchChange(index, 'sourceOfBroodstock', e.target.value)}
                  placeholder="e.g. In-house Broodstock Tank A / Certified Breeder"
                  className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                />
              </div>

              {/* 2. Batch Number */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  2. Batch Number *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Hash className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={batch.batchNumber}
                    onChange={(e) => handleBatchChange(index, 'batchNumber', e.target.value)}
                    placeholder="e.g. BATCH-2026-01"
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 3. Hatchery Date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  3. Hatchery Date *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="date"
                    required
                    value={batch.hatcheryDate}
                    onChange={(e) => handleBatchChange(index, 'hatcheryDate', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 4. First Date of Feeding */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  4. First Date of Feeding *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="date"
                    required
                    value={batch.firstDateOfFeeding}
                    onChange={(e) => handleBatchChange(index, 'firstDateOfFeeding', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 5. Date of Transfer to Grow-Out */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  5. Date of Transfer to Grow-Out *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="date"
                    required
                    value={batch.dateOfTransferToGrowOut}
                    onChange={(e) => handleBatchChange(index, 'dateOfTransferToGrowOut', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 6. Total Number of Transferred Fingerlings */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  6. Total Transferred Fingerlings *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    required
                    min="0"
                    value={batch.totalTransferredFingerlings}
                    onChange={(e) => handleBatchChange(index, 'totalTransferredFingerlings', e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                  <span className="absolute right-3 text-[10px] font-extrabold uppercase text-slate-400">
                    Fish
                  </span>
                </div>
              </div>

              {/* 7. Average Weight of Fingerlings Transferred */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  7. Average Weight of Fingerlings (g) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Scale className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={batch.averageWeightTransferred}
                    onChange={(e) => handleBatchChange(index, 'averageWeightTransferred', e.target.value)}
                    placeholder="e.g. 5.5"
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                  <span className="absolute right-3 text-[10px] font-extrabold uppercase text-slate-400">
                    g
                  </span>
                </div>
              </div>

              {/* 8. Age of Fingerlings Transferred */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  8. Age of Fingerlings (Days/Weeks) *
                </label>
                <input
                  type="text"
                  required
                  value={batch.ageOfFingerlingsTransferred}
                  onChange={(e) => handleBatchChange(index, 'ageOfFingerlingsTransferred', e.target.value)}
                  placeholder="e.g. 45 Days or 6 Weeks"
                  className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                />
              </div>

              {/* 9. Health Status of Fingerlings Transferred */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  9. Health Status *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Activity className="w-3.5 h-3.5" />
                  </span>
                  <select
                    value={batch.healthStatusTransferred}
                    onChange={(e) => handleBatchChange(index, 'healthStatusTransferred', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                  >
                    {HEALTH_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 10. Destinated Pond of Fingerlings Transferred */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  10. Destinated Pond of Fingerlings Transferred *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                  <input
                    type="text"
                    required
                    value={batch.destinatedPondTransferred}
                    onChange={(e) => handleBatchChange(index, 'destinatedPondTransferred', e.target.value)}
                    placeholder="e.g. Grow-Out Pond 3 / Earthen Pond B / Concrete Tank 4"
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

            </div>

          </div>
        ))}
      </div>

      {/* Add Batch Button */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={addBatch}
          className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-xs font-black border border-emerald-200 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Hatchery Batch</span>
        </button>

        <div className="text-xs font-extrabold text-slate-500">
          Batches to Record: <span className="text-slate-900 font-black">{batches.length}</span>
        </div>
      </div>

      {/* General Notes */}
      <div className="space-y-1 pt-2 border-t border-slate-200">
        <label className="block text-xs font-bold uppercase text-slate-700">
          General Hatchery Observations / Remarks (Optional)
        </label>
        <textarea
          rows={3}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Enter any incubation temperature notes, water aeration remarks, or broodstock condition details..."
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3.5 text-xs font-medium text-slate-800 outline-none transition-all"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Submitting Hatchery Record...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Hatchery Section Log</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
};
