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
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface FisheryHatcheryFormProps {
  initialData?: FisheryHatcheryFormData;
  reportId?: string;
  onCancel?: () => void;
  onSubmit: (data: FisheryHatcheryFormData, isDraft?: boolean) => void;
  onSaveSingleRow?: (rowIndex: number, batch: FisheryHatcheryBatchData, allBatches: FisheryHatcheryBatchData[]) => Promise<void>;
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
  const [savingRowIdx, setSavingRowIdx] = useState<number | null>(null);
  const [savedRowIdx, setSavedRowIdx] = useState<number | null>(null);
  const [rowSuccessMsg, setRowSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData?.batches && initialData.batches.length > 0) {
      setBatches(initialData.batches);
      setGeneralNotes(initialData.generalNotes || '');
    }
  }, [initialData]);

  const addBatchRow = () => {
    const nextNum = batches.length + 1;
    const padded = String(nextNum).padStart(3, '0');
    const todayStr = new Date().toISOString().split('T')[0];
    const newRow: FisheryHatcheryBatchData = {
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
    setBatches([...batches, newRow]);
  };

  const removeBatchRow = (index: number) => {
    if (batches.length === 1) return;
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleCellChange = (index: number, field: keyof FisheryHatcheryBatchData, value: any) => {
    const updated = [...batches];
    updated[index] = { ...updated[index], [field]: value };
    setBatches(updated);
  };

  const handleSaveIndividualRow = async (index: number) => {
    setSavingRowIdx(index);
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

      setSavedRowIdx(index);
      setRowSuccessMsg(`Row #${index + 1} (${sanitizedBatches[index].batchNumber}) saved! Synced to ED Dashboard.`);
      setTimeout(() => {
        setSavedRowIdx(null);
        setRowSuccessMsg(null);
      }, 3500);
    } catch (e: any) {
      alert('Error saving row: ' + e.message);
    } finally {
      setSavingRowIdx(null);
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
    <div className="space-y-6 bg-white p-4 sm:p-7 rounded-3xl border border-slate-200 shadow-sm text-slate-900">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vertical Batch Form & Progressive Ledger</span>
            </span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              Row-by-Row Live Save
            </span>
          </div>

          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-2">
            Hatchery Section Batch Records
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Each row represents one complete batch record. Update cells anytime as data arrives and click <strong>"Save Row"</strong> to sync live to the ED Dashboard.
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

      {/* Row Save Success Alert */}
      {rowSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{rowSuccessMsg}</span>
        </div>
      )}

      {/* ===== VERTICAL BATCH LEDGER TABLE (Desktop / Tablet) ===== */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner bg-slate-50/50">
        <table className="w-full text-left text-xs border-collapse min-w-[1280px]">
          <thead>
            <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10.5px] tracking-wider divide-x divide-slate-800">
              <th className="py-3.5 px-3 w-12 text-center">#</th>
              <th className="py-3.5 px-3 min-w-[170px]">1. Source of Broodstock</th>
              <th className="py-3.5 px-3 min-w-[130px]">2. Batch Number</th>
              <th className="py-3.5 px-3 min-w-[135px]">3. Hatchery Date</th>
              <th className="py-3.5 px-3 min-w-[135px]">4. 1st Feeding Date</th>
              <th className="py-3.5 px-3 min-w-[135px]">5. Grow-Out Transfer Date</th>
              <th className="py-3.5 px-3 min-w-[130px]">6. Transferred Count</th>
              <th className="py-3.5 px-3 min-w-[110px]">7. Avg Weight (g)</th>
              <th className="py-3.5 px-3 min-w-[110px]">8. Age (Days/Wks)</th>
              <th className="py-3.5 px-3 min-w-[130px]">9. Health Status</th>
              <th className="py-3.5 px-3 min-w-[150px]">10. Destinated Pond</th>
              <th className="py-3.5 px-3 w-[140px] text-center sticky right-0 bg-slate-900 z-10">Row Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-800 bg-white">
            {batches.map((batch, index) => {
              const stageInfo = getHatcheryBatchStage(batch);
              const isRowSaving = savingRowIdx === index;
              const isRowSaved = savedRowIdx === index;

              return (
                <tr 
                  key={index} 
                  className={`divide-x divide-slate-100 hover:bg-slate-50/80 transition-colors ${
                    isRowSaved ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500' : ''
                  }`}
                >
                  {/* Row Number & Stage indicator */}
                  <td className="py-3 px-2 text-center align-middle font-bold text-slate-500 bg-slate-50/80">
                    <span className="w-6 h-6 rounded-lg bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center mx-auto shadow-sm">
                      {index + 1}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block mt-1">
                      {stageInfo.progressPercent}%
                    </span>
                  </td>

                  {/* 1. Source of Broodstock */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={batch.sourceOfBroodstock}
                      onChange={(e) => handleCellChange(index, 'sourceOfBroodstock', e.target.value)}
                      placeholder="e.g. Tank A Broodstock"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </td>

                  {/* 2. Batch Number */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={batch.batchNumber}
                      onChange={(e) => handleCellChange(index, 'batchNumber', e.target.value)}
                      placeholder="e.g. BATCH-001"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 outline-none transition-all"
                    />
                  </td>

                  {/* 3. Hatchery Date */}
                  <td className="p-2">
                    <input
                      type="date"
                      value={batch.hatcheryDate}
                      onChange={(e) => handleCellChange(index, 'hatcheryDate', e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </td>

                  {/* 4. First Date of Feeding */}
                  <td className="p-2">
                    <input
                      type="date"
                      value={batch.firstDateOfFeeding}
                      onChange={(e) => handleCellChange(index, 'firstDateOfFeeding', e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </td>

                  {/* 5. Date of Transfer to Grow-Out */}
                  <td className="p-2">
                    <input
                      type="date"
                      value={batch.dateOfTransferToGrowOut}
                      onChange={(e) => handleCellChange(index, 'dateOfTransferToGrowOut', e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </td>

                  {/* 6. Total Number of Transferred Fingerlings */}
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      value={batch.totalTransferredFingerlings}
                      onChange={(e) => handleCellChange(index, 'totalTransferredFingerlings', e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-black text-emerald-800 outline-none transition-all"
                    />
                  </td>

                  {/* 7. Average Weight of Fingerlings Transferred */}
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={batch.averageWeightTransferred}
                      onChange={(e) => handleCellChange(index, 'averageWeightTransferred', e.target.value)}
                      placeholder="e.g. 5.5"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </td>

                  {/* 8. Age of Fingerlings Transferred */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={batch.ageOfFingerlingsTransferred}
                      onChange={(e) => handleCellChange(index, 'ageOfFingerlingsTransferred', e.target.value)}
                      placeholder="e.g. 45 Days"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </td>

                  {/* 9. Health Status of Fingerlings Transferred */}
                  <td className="p-2">
                    <select
                      value={batch.healthStatusTransferred || 'Good'}
                      onChange={(e) => handleCellChange(index, 'healthStatusTransferred', e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-black text-slate-900 outline-none cursor-pointer"
                    >
                      {HEALTH_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </td>

                  {/* 10. Destinated Pond of Fingerlings Transferred */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={batch.destinatedPondTransferred}
                      onChange={(e) => handleCellChange(index, 'destinatedPondTransferred', e.target.value)}
                      placeholder="e.g. Pond 3"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </td>

                  {/* Row Actions: Save Row Button */}
                  <td className="p-2 text-center align-middle sticky right-0 bg-white shadow-sm z-10">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleSaveIndividualRow(index)}
                        disabled={isRowSaving || isSubmitting}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer shadow-sm active:scale-95 ${
                          isRowSaved
                            ? 'bg-emerald-600 text-white shadow-emerald-200'
                            : 'bg-slate-900 hover:bg-emerald-700 text-white'
                        }`}
                        title="Save or Update this specific row now"
                      >
                        {isRowSaving ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : isRowSaved ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Save className="w-3.5 h-3.5 text-emerald-300" />
                        )}
                        <span>{isRowSaved ? 'Saved' : 'Save Row'}</span>
                      </button>

                      {batches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBatchRow(index)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add New Batch Row Button & Progress Helper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={addBatchRow}
          className="inline-flex items-center space-x-2 text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 px-4 py-2.5 rounded-2xl text-xs font-black border border-emerald-300 transition-all cursor-pointer shadow-sm active:scale-95 w-fit"
        >
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>Add New Batch Row</span>
        </button>

        <div className="text-xs text-slate-500 font-bold">
          Total Batch Rows: <span className="text-slate-900 font-black">{batches.length}</span>
        </div>
      </div>

      {/* General Notes */}
      <div className="space-y-1 pt-2 border-t border-slate-200">
        <label className="block text-xs font-bold uppercase text-slate-700">
          General Hatchery Ledger Observations & Water Notes (Optional)
        </label>
        <textarea
          rows={2}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Record notes on yolk sac absorption, feeding schedules, incubator temps, or transfer preparations..."
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none transition-all"
        />
      </div>

      {/* Global Actions */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-medium">
          💡 You can update individual rows anytime using the <strong>"Save Row"</strong> button on each row.
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSaveAll(e, true)}
            className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save All Rows</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSaveAll(e, false)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-7 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Submit Entire Ledger</span>
          </button>
        </div>
      </div>

    </div>
  );
};
