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
  X, 
  ShieldCheck, 
  Egg, 
  ChevronDown 
} from 'lucide-react';

interface FisheryHatcheryFormProps {
  initialData?: FisheryHatcheryFormData;
  reportId?: string;
  onCancel?: () => void;
  onSubmit: (data: FisheryHatcheryFormData, isDraft?: boolean) => void;
  onSaveSingleRow?: (batchIndex: number, batch: FisheryHatcheryBatchData, allBatches: FisheryHatcheryBatchData[]) => Promise<void>;
  isSubmitting?: boolean;
}

const HEALTH_STATUS_OPTIONS = [
  'Good',
  'Excellent',
  'Fair',
  'Under Observation',
  'Poor'
];

export const FisheryHatcheryForm: React.FC<FisheryHatcheryFormProps> = ({ 
  initialData, 
  reportId, 
  onCancel, 
  onSubmit, 
  onSaveSingleRow, 
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
  const [savingBatchIdx, setSavingBatchIdx] = useState<number | null>(null);
  const [savedBatchIdx, setSavedBatchIdx] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ idx: number; text: string } | null>(null);

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
    const newBatch: FisheryHatcheryBatchData = {
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
    };
    setBatches([...batches, newBatch]);
  };

  const removeBatch = (index: number) => {
    if (batches.length === 1) return;
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: keyof FisheryHatcheryBatchData, value: any) => {
    const updated = [...batches];
    updated[index] = { ...updated[index], [field]: value };
    setBatches(updated);
  };

  const handleSaveSingleBatch = async (index: number) => {
    setSavingBatchIdx(index);
    try {
      const sanitizedBatches = batches.map((b, idx) => ({
        ...b,
        batchNumber: b.batchNumber.trim() || `BATCH-${String(idx + 1).padStart(3, '0')}`
      }));

      if (onSaveSingleRow) {
        await onSaveSingleRow(index, sanitizedBatches[index], sanitizedBatches);
      } else {
        onSubmit({
          batches: sanitizedBatches,
          generalNotes: generalNotes.trim() || undefined,
          isDraft: true
        }, true);
      }

      setSavedBatchIdx(index);
      setFeedbackMsg({
        idx: index,
        text: `Batch #${index + 1} (${sanitizedBatches[index].batchNumber}) saved! Live updated on Executive Director Dashboard.`
      });

      setTimeout(() => {
        setSavedBatchIdx(null);
        setFeedbackMsg(null);
      }, 4000);
    } catch (e: any) {
      alert('Error saving batch: ' + e.message);
    } finally {
      setSavingBatchIdx(null);
    }
  };

  const handleSaveAll = (e: React.FormEvent, isDraftMode: boolean) => {
    e.preventDefault();
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

  const totalFingerlings = batches.reduce((acc, b) => acc + (Number(b.totalTransferredFingerlings) || 0), 0);

  return (
    <div className="space-y-8 bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              <Egg className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hatchery Vertical Progressive Log</span>
            </span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              Individual Batch Update
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-2">
            Vertical Hatchery Section Logs
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Log entries are arranged vertically. Update individual batches at intervals as data arrives, and save each batch independently.
          </p>
        </div>

        {/* Quick Summary Pill & Actions */}
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
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ===== VERTICAL BATCH CARDS (Stacked Vertically) ===== */}
      <div className="space-y-6">
        {batches.map((batch, index) => {
          const stageInfo = getHatcheryBatchStage(batch);
          const isSavingThis = savingBatchIdx === index;
          const isSavedThis = savedBatchIdx === index;
          const isFeedbackForThis = feedbackMsg?.idx === index;

          return (
            <div 
              key={index} 
              className={`bg-slate-50/80 border rounded-3xl p-5 sm:p-7 space-y-6 transition-all shadow-sm ${
                isSavedThis ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/40' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Batch Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-2xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shadow-sm">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        Batch Record #{index + 1}: <span className="text-emerald-700">{batch.batchNumber || `Batch #${index + 1}`}</span>
                      </h4>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${stageInfo.badgeColor}`}>
                        {stageInfo.stage} ({stageInfo.progressPercent}%)
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-400">
                        {batch.sourceOfBroodstock ? `Broodstock: ${batch.sourceOfBroodstock}` : 'Lineage Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Per-Batch Top Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSaveSingleBatch(index)}
                    disabled={isSavingThis || isSubmitting}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95 ${
                      isSavedThis
                        ? 'bg-emerald-600 text-white shadow-emerald-200'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md'
                    }`}
                    title="Save this specific batch log now"
                  >
                    {isSavingThis ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isSavedThis ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>{isSavedThis ? 'Saved' : 'Save This Batch'}</span>
                  </button>

                  {batches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBatch(index)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove Batch Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Instant Row/Batch Feedback Toast */}
              {isFeedbackForThis && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* VERTICAL FORM FIELDS (1 to 10 stacked in a clean, vertical sequence) */}
              <div className="space-y-4">
                
                {/* 1. Source of Broodstock */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">1</span>
                    <span>Source of Broodstock</span>
                  </label>
                  <input
                    type="text"
                    value={batch.sourceOfBroodstock}
                    onChange={(e) => handleFieldChange(index, 'sourceOfBroodstock', e.target.value)}
                    placeholder="e.g. Tank A In-House Broodstock / Certified Breeder"
                    className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>

                {/* 2. Batch Number */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">2</span>
                    <span>Batch Number</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Hash className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={batch.batchNumber}
                      onChange={(e) => handleFieldChange(index, 'batchNumber', e.target.value)}
                      placeholder="e.g. BATCH-001"
                      className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-black text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 3. Hatchery Date */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">3</span>
                    <span>Hatchery Date</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={batch.hatcheryDate}
                      onChange={(e) => handleFieldChange(index, 'hatcheryDate', e.target.value)}
                      className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 4. First Date of Feeding */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">4</span>
                    <span>First Date of Feeding</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={batch.firstDateOfFeeding}
                      onChange={(e) => handleFieldChange(index, 'firstDateOfFeeding', e.target.value)}
                      className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 5. Date of Transfer to Grow-Out */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">5</span>
                    <span>Date of Transfer to Grow-Out</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={batch.dateOfTransferToGrowOut}
                      onChange={(e) => handleFieldChange(index, 'dateOfTransferToGrowOut', e.target.value)}
                      className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 6. Total Number of Transferred Fingerlings */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">6</span>
                    <span>Total Number of Transferred Fingerlings</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      value={batch.totalTransferredFingerlings}
                      onChange={(e) => handleFieldChange(index, 'totalTransferredFingerlings', e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-black text-emerald-800 outline-none transition-all"
                    />
                    <span className="absolute right-3.5 text-[10px] font-extrabold uppercase text-slate-400">
                      Fish
                    </span>
                  </div>
                </div>

                {/* 7. Average Weight of Fingerlings Transferred */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">7</span>
                    <span>Average Weight of Fingerlings Transferred</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Scale className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={batch.averageWeightTransferred}
                      onChange={(e) => handleFieldChange(index, 'averageWeightTransferred', e.target.value)}
                      placeholder="e.g. 5.5"
                      className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                    <span className="absolute right-3.5 text-[10px] font-extrabold uppercase text-slate-400">
                      g
                    </span>
                  </div>
                </div>

                {/* 8. Age of Fingerlings Transferred */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">8</span>
                    <span>Age of Fingerlings Transferred</span>
                  </label>
                  <input
                    type="text"
                    value={batch.ageOfFingerlingsTransferred}
                    onChange={(e) => handleFieldChange(index, 'ageOfFingerlingsTransferred', e.target.value)}
                    placeholder="e.g. 45 Days or 6 Weeks"
                    className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>

                {/* 9. Health Status of Fingerlings Transferred */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">9</span>
                    <span>Health Status of Fingerlings Transferred</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Activity className="w-4 h-4" />
                    </span>
                    <select
                      value={batch.healthStatusTransferred || 'Good'}
                      onChange={(e) => handleFieldChange(index, 'healthStatusTransferred', e.target.value)}
                      className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none cursor-pointer"
                    >
                      {HEALTH_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 10. Destinated Pond of Fingerlings Transferred */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 focus-within:border-emerald-500 transition-colors">
                  <label className="block text-[11px] font-black uppercase text-slate-600 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">10</span>
                    <span>Destinated Pond of Fingerlings Transferred</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    </span>
                    <input
                      type="text"
                      value={batch.destinatedPondTransferred}
                      onChange={(e) => handleFieldChange(index, 'destinatedPondTransferred', e.target.value)}
                      placeholder="e.g. Grow-Out Pond 3 / Earthen Pond B"
                      className="w-full bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

              </div>

              {/* Bottom Card Action: Dedicated Save Button for this Batch */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  Click below to save updates for <strong>{batch.batchNumber || `Batch #${index + 1}`}</strong> only.
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveSingleBatch(index)}
                  disabled={isSavingThis || isSubmitting}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-95 ${
                    isSavedThis
                      ? 'bg-emerald-600 text-white shadow-emerald-200'
                      : 'bg-slate-900 hover:bg-emerald-700 text-white shadow-slate-300'
                  }`}
                >
                  {isSavingThis ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : isSavedThis ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Save className="w-4 h-4 text-emerald-300" />
                  )}
                  <span>{isSavedThis ? 'Batch Saved & Synced' : `Save ${batch.batchNumber || `Batch #${index + 1}`}`}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add New Batch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={addBatch}
          className="inline-flex items-center space-x-2 text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-5 py-3 rounded-2xl text-xs font-black border border-emerald-300 transition-all cursor-pointer shadow-sm active:scale-95 w-fit"
        >
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>Add New Vertical Batch Record</span>
        </button>

        <div className="text-xs text-slate-500 font-bold">
          Total Vertical Batches: <span className="text-slate-900 font-black">{batches.length}</span>
        </div>
      </div>

      {/* General Notes */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200">
        <label className="block text-xs font-bold uppercase text-slate-700">
          General Operational Remarks & Observations (Optional)
        </label>
        <textarea
          rows={3}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Record notes on water temperature, yolk absorption, feeding frequency, or upcoming transfer preparations..."
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl p-3.5 text-xs font-medium text-slate-800 outline-none transition-all"
        />
      </div>

      {/* Global Submit Actions */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-medium">
          💡 You can update any individual batch card above and click <strong>"Save This Batch"</strong> at any time.
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSaveAll(e, true)}
            className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save All Batches</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSaveAll(e, false)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-7 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Submit Entire Log</span>
          </button>
        </div>
      </div>

    </div>
  );
};
