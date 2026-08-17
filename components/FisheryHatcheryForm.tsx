import React, { useState, useEffect } from 'react';
import { FisheryHatcheryFormData, FisheryHatcheryBatchData, getHatcheryBatchStage } from '../types';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  Calendar, 
  Scale, 
  Activity, 
  MapPin, 
  Layers, 
  Sparkles, 
  Hash, 
  Droplets, 
  Save, 
  Check, 
  Clock, 
  Info,
  HelpCircle,
  X
} from 'lucide-react';

interface FisheryHatcheryFormProps {
  initialData?: FisheryHatcheryFormData;
  reportId?: string;
  onCancel?: () => void;
  onSubmit: (data: FisheryHatcheryFormData, isDraft?: boolean) => void;
  isSubmitting?: boolean;
}

const HEALTH_STATUS_OPTIONS = [
  'Excellent',
  'Good',
  'Fair',
  'Under Observation',
  'Poor'
];

export const FisheryHatcheryForm: React.FC<FisheryHatcheryFormProps> = ({ 
  initialData, 
  reportId, 
  onCancel, 
  onSubmit, 
  isSubmitting 
}) => {
  const [batches, setBatches] = useState<FisheryHatcheryBatchData[]>(() => {
    if (initialData?.batches && initialData.batches.length > 0) {
      return initialData.batches;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return [
      {
        sourceOfBroodstock: '',
        batchNumber: 'BATCH-001',
        hatcheryDate: todayStr,
        firstDateOfFeeding: '',
        dateOfTransferToGrowOut: '',
        totalTransferredFingerlings: '',
        averageWeightTransferred: '',
        ageOfFingerlingsTransferred: '',
        healthStatusTransferred: 'Good',
        destinatedPondTransferred: '',
        remarks: ''
      }
    ];
  });

  const [generalNotes, setGeneralNotes] = useState(initialData?.generalNotes || '');

  useEffect(() => {
    if (initialData?.batches && initialData.batches.length > 0) {
      setBatches(initialData.batches);
      setGeneralNotes(initialData.generalNotes || '');
    }
  }, [initialData]);

  const addBatch = () => {
    const nextNum = batches.length + 1;
    const padded = String(nextNum).padStart(3, '0');
    const todayStr = new Date().toISOString().split('T')[0];
    setBatches([
      ...batches,
      {
        sourceOfBroodstock: batches[batches.length - 1]?.sourceOfBroodstock || '',
        batchNumber: `BATCH-${padded}`,
        hatcheryDate: todayStr,
        firstDateOfFeeding: '',
        dateOfTransferToGrowOut: '',
        totalTransferredFingerlings: '',
        averageWeightTransferred: '',
        ageOfFingerlingsTransferred: '',
        healthStatusTransferred: 'Good',
        destinatedPondTransferred: '',
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

  const handleSaveProgress = (e: React.FormEvent, isDraftMode: boolean) => {
    e.preventDefault();
    
    // Ensure at least one batch has a label or number
    const sanitizedBatches = batches.map((b, idx) => ({
      ...b,
      batchNumber: b.batchNumber.trim() || `BATCH-${String(idx + 1).padStart(3, '0')}`
    }));

    onSubmit(
      {
        batches: sanitizedBatches,
        generalNotes: generalNotes.trim() || undefined,
        isDraft: isDraftMode
      },
      isDraftMode
    );
  };

  return (
    <form className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{reportId ? 'Updating Ongoing Hatchery Log' : 'Progressive Hatchery Data Log'}</span>
            </span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              Multi-Stage Updates
            </span>
          </div>

          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-2">
            {reportId ? 'Update Hatchery Log Entry' : 'Hatchery Section Data Entry'}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Fill in available data progressively over time. Save at any point as new milestones occur.
          </p>
        </div>

        {/* Quick Summary Badge & Cancel if editing */}
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl flex items-center space-x-3 shrink-0">
            <Droplets className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Total Fingerlings</span>
              <span className="text-base font-black text-emerald-700">{totalFingerlings.toLocaleString()} Fish</span>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Close Edit"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progressive Stage Guide Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
        <div className="flex items-center space-x-2 text-slate-800 font-extrabold mb-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Progressive Logging Stages (Fill as data becomes available):</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-slate-600">
          <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center shrink-0">1</span>
            <span>1. Broodstock & Hatching</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center shrink-0">2</span>
            <span>2. First Feeding Date</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">3</span>
            <span>3. Weight & Age Audits</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center shrink-0">4</span>
            <span>4. Grow-Out Transfer</span>
          </div>
        </div>
      </div>

      {/* Batch Entries */}
      <div className="space-y-6">
        {batches.map((batch, index) => {
          const stageInfo = getHatcheryBatchStage(batch);

          return (
            <div key={index} className="bg-slate-50/70 border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-5 relative">
              
              {/* Batch Header with Live Stage Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="w-7 h-7 rounded-xl bg-emerald-700 text-white text-xs font-black flex items-center justify-center shadow-sm">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Hatchery Batch: <span className="text-emerald-700">{batch.batchNumber || `Batch #${index + 1}`}</span>
                    </h4>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${stageInfo.badgeColor}`}>
                        {stageInfo.stage} ({stageInfo.progressPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden hidden sm:block">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${stageInfo.progressPercent}%` }}
                    />
                  </div>

                  {batches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBatch(index)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid for Form Fields (No strict blocking fields to allow saving partial progress) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-bold">
                
                {/* 1. Source of Broodstock */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    1. Source of Broodstock
                  </label>
                  <input
                    type="text"
                    value={batch.sourceOfBroodstock}
                    onChange={(e) => handleBatchChange(index, 'sourceOfBroodstock', e.target.value)}
                    placeholder="e.g. In-house Broodstock Tank A / Certified Breeder"
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>

                {/* 2. Batch Number */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    2. Batch Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400">
                      <Hash className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
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
                    3. Hatchery Date
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="date"
                      value={batch.hatcheryDate}
                      onChange={(e) => handleBatchChange(index, 'hatcheryDate', e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 4. First Date of Feeding */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    4. First Date of Feeding
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="date"
                      value={batch.firstDateOfFeeding}
                      onChange={(e) => handleBatchChange(index, 'firstDateOfFeeding', e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 5. Date of Transfer to Grow-Out */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    5. Date of Transfer to Grow-Out
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="date"
                      value={batch.dateOfTransferToGrowOut}
                      onChange={(e) => handleBatchChange(index, 'dateOfTransferToGrowOut', e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 6. Total Number of Transferred Fingerlings */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    6. Total Transferred Fingerlings
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
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
                    7. Average Weight (g / fish)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400">
                      <Scale className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
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
                    8. Age of Fingerlings
                  </label>
                  <input
                    type="text"
                    value={batch.ageOfFingerlingsTransferred}
                    onChange={(e) => handleBatchChange(index, 'ageOfFingerlingsTransferred', e.target.value)}
                    placeholder="e.g. 45 Days or 6 Weeks"
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>

                {/* 9. Health Status of Fingerlings Transferred */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    9. Health Status
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
                    10. Destinated Pond of Fingerlings Transferred
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    <input
                      type="text"
                      value={batch.destinatedPondTransferred}
                      onChange={(e) => handleBatchChange(index, 'destinatedPondTransferred', e.target.value)}
                      placeholder="e.g. Grow-Out Pond 3 / Earthen Pond B / Concrete Tank 4"
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Add Batch Button */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={addBatch}
          className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-xs font-black border border-emerald-200 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Batch</span>
        </button>

        <div className="text-xs font-extrabold text-slate-500">
          Batches in this log: <span className="text-slate-900 font-black">{batches.length}</span>
        </div>
      </div>

      {/* General Notes */}
      <div className="space-y-1 pt-2 border-t border-slate-200">
        <label className="block text-xs font-bold uppercase text-slate-700">
          Progressive Observations & Operational Remarks (Optional)
        </label>
        <textarea
          rows={3}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Record notes on water temperature, yolk absorption, feeding frequency, or upcoming transfer preparations..."
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3.5 text-xs font-medium text-slate-800 outline-none transition-all"
        />
      </div>

      {/* Action Buttons: Save Progress / Update vs Final Submit */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-medium">
          Changes sync instantly to the Executive Director (ED) dashboard
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Save Progress (In-Progress / Draft) */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSaveProgress(e, true)}
            className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{reportId ? 'Update & Save Progress' : 'Save Progress / Update'}</span>
          </button>

          {/* Submit For Review / Finalize */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSaveProgress(e, false)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-7 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Submit for Review</span>
          </button>
        </div>
      </div>

    </form>
  );
};
