import React, { useState, useEffect } from 'react';
import { 
  FisheryHatcheryFormData, 
  FisheryHatcheryBatchData, 
  getHatcheryBatchStage, 
  BATCH_NUMBER_OPTIONS, 
  BROODSTOCK_SOURCE_OPTIONS 
} from '../types';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  Calendar, 
  Scale, 
  Activity, 
  MapPin, 
  Hash, 
  Droplets, 
  Save, 
  Check, 
  Clock, 
  X, 
  ShieldCheck, 
  Egg, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Send, 
  Edit3,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Archive,
  FileCheck
} from 'lucide-react';

interface FisheryHatcheryFormProps {
  initialData?: FisheryHatcheryFormData;
  reportId?: string;
  currentUser?: { fullName: string; email: string };
  onCancel?: () => void;
  onSubmit: (data: FisheryHatcheryFormData, isDraft?: boolean) => void;
  onSaveSingleRow?: (batchIndex: number, batch: FisheryHatcheryBatchData, allBatches: FisheryHatcheryBatchData[]) => Promise<void>;
  onRequestChange?: (batchIndex: number, batch: FisheryHatcheryBatchData, reason: string) => Promise<void>;
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
  currentUser,
  onCancel, 
  onSubmit, 
  onSaveSingleRow,
  onRequestChange,
  isSubmitting 
}) => {
  const [batches, setBatches] = useState<FisheryHatcheryBatchData[]>(() => {
    if (initialData?.batches && initialData.batches.length > 0) {
      return initialData.batches;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return [
      {
        sourceOfBroodstock: 'Outside the Farm',
        batchNumber: '1st',
        hatcheryDate: todayStr,
        firstDateOfFeeding: '',
        dateOfTransferToGrowOut: '',
        totalTransferredFingerlings: '',
        averageWeightTransferred: '',
        ageOfFingerlingsTransferred: '',
        healthStatusTransferred: 'Good',
        destinatedPondTransferred: '',
        remarks: '',
        isLocked: false,
        lockedRows: {}
      }
    ];
  });

  const [generalNotes, setGeneralNotes] = useState(initialData?.generalNotes || '');
  const [savingBatchIdx, setSavingBatchIdx] = useState<number | null>(null);
  const [savedBatchIdx, setSavedBatchIdx] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ idx: number; text: string } | null>(null);

  // Expand & Collapse State
  const [collapsedBatches, setCollapsedBatches] = useState<Record<number, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(true);

  // Confirmation modal state for individual row or batch save
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    batchIndex: number;
    fieldName?: string;
    rowKey?: keyof FisheryHatcheryBatchData;
  } | null>(null);

  // Archive & Submit modal state
  const [archiveModal, setArchiveModal] = useState<boolean>(false);

  // Change Request modal state
  const [changeRequestModal, setChangeRequestModal] = useState<{
    isOpen: boolean;
    batchIndex: number;
    rowKey?: keyof FisheryHatcheryBatchData;
    fieldTitle?: string;
    reason: string;
    isSubmitting: boolean;
  } | null>(null);

  useEffect(() => {
    if (initialData?.batches && initialData.batches.length > 0) {
      setBatches(initialData.batches);
      setGeneralNotes(initialData.generalNotes || '');
    }
  }, [initialData]);

  const toggleBatchCollapse = (index: number) => {
    setCollapsedBatches(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleExpandAll = () => {
    if (allExpanded) {
      const collapsed: Record<number, boolean> = {};
      batches.forEach((_, i) => {
        collapsed[i] = true;
      });
      setCollapsedBatches(collapsed);
      setAllExpanded(false);
    } else {
      setCollapsedBatches({});
      setAllExpanded(true);
    }
  };

  const addBatch = () => {
    const nextIdx = batches.length;
    const defaultBatchOption = BATCH_NUMBER_OPTIONS[nextIdx] || `${nextIdx + 1}th`;
    const todayStr = new Date().toISOString().split('T')[0];
    const newBatch: FisheryHatcheryBatchData = {
      sourceOfBroodstock: batches[batches.length - 1]?.sourceOfBroodstock || 'Outside the Farm',
      batchNumber: defaultBatchOption,
      hatcheryDate: todayStr,
      firstDateOfFeeding: '',
      dateOfTransferToGrowOut: '',
      totalTransferredFingerlings: '',
      averageWeightTransferred: '',
      ageOfFingerlingsTransferred: '',
      healthStatusTransferred: 'Good',
      destinatedPondTransferred: '',
      remarks: '',
      isLocked: false,
      lockedRows: {}
    };
    setBatches([...batches, newBatch]);
    setCollapsedBatches(prev => ({ ...prev, [nextIdx]: false }));
  };

  const removeBatch = (index: number) => {
    if (batches.length === 1) return;
    if (batches[index].isLocked) {
      alert('This batch is locked and permanent. It cannot be deleted directly.');
      return;
    }
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: keyof FisheryHatcheryBatchData, value: any) => {
    if (batches[index].isLocked || batches[index].lockedRows?.[field as string]) return;
    const updated = [...batches];
    updated[index] = { ...updated[index], [field]: value };
    setBatches(updated);
  };

  // Open confirmation prompt with single Save action per row or batch
  const triggerConfirmation = (index: number, fieldName?: string, rowKey?: keyof FisheryHatcheryBatchData) => {
    setConfirmModal({
      isOpen: true,
      batchIndex: index,
      fieldName,
      rowKey
    });
  };

  // Confirm Save and Permanently Lock Log Entry (row or batch)
  const handleConfirmLockAndSave = async () => {
    if (!confirmModal) return;
    const { batchIndex, rowKey, fieldName } = confirmModal;
    setConfirmModal(null);
    setSavingBatchIdx(batchIndex);

    try {
      const updatedBatches = [...batches];
      const currentBatch = updatedBatches[batchIndex];

      if (rowKey) {
        // Individual Row Save: Lock ONLY this specific row while leaving others active and editable
        const currentLockedRows = { ...(currentBatch.lockedRows || {}) };
        currentLockedRows[rowKey as string] = true;

        updatedBatches[batchIndex] = {
          ...currentBatch,
          lockedRows: currentLockedRows,
          lockedAt: Date.now(),
          lockedBy: currentUser?.fullName || 'Staff User'
        };
      } else {
        // Entire Batch Save: Lock the full batch and all its rows
        const allRowsLocked: Record<string, boolean> = {
          sourceOfBroodstock: true,
          batchNumber: true,
          hatcheryDate: true,
          firstDateOfFeeding: true,
          dateOfTransferToGrowOut: true,
          totalTransferredFingerlings: true,
          averageWeightTransferred: true,
          ageOfFingerlingsTransferred: true,
          healthStatusTransferred: true,
          destinatedPondTransferred: true,
          remarks: true
        };

        updatedBatches[batchIndex] = {
          ...currentBatch,
          isLocked: true,
          lockedRows: allRowsLocked,
          lockedAt: Date.now(),
          lockedBy: currentUser?.fullName || 'Staff User',
          changeRequestStatus: 'NONE'
        };
      }

      setBatches(updatedBatches);

      if (onSaveSingleRow) {
        await onSaveSingleRow(batchIndex, updatedBatches[batchIndex], updatedBatches);
      } else {
        onSubmit({
          batches: updatedBatches,
          generalNotes: generalNotes.trim() || undefined,
          isDraft: false
        }, false);
      }

      setSavedBatchIdx(batchIndex);
      setFeedbackMsg({
        idx: batchIndex,
        text: rowKey 
          ? `✅ ${fieldName || 'Row'} saved & locked! Other rows remain active and editable.` 
          : `✅ Batch ${currentBatch.batchNumber} saved & locked in permanent format.`
      });

      setTimeout(() => {
        setSavedBatchIdx(null);
        setFeedbackMsg(null);
      }, 4500);
    } catch (e: any) {
      alert('Error saving log: ' + e.message);
    } finally {
      setSavingBatchIdx(null);
    }
  };

  // Archive and Submit Completed Form
  const handleArchiveAndSubmit = async () => {
    setArchiveModal(false);
    try {
      // Lock all batches permanently
      const finalizedBatches = batches.map(b => ({
        ...b,
        isLocked: true,
        lockedAt: b.lockedAt || Date.now(),
        lockedBy: b.lockedBy || currentUser?.fullName || 'Staff User'
      }));
      setBatches(finalizedBatches);

      onSubmit({
        batches: finalizedBatches,
        generalNotes: generalNotes.trim() || undefined,
        isDraft: false
      }, false);

      setFeedbackMsg({
        idx: 0,
        text: '🎉 Complete Hatchery Ledger successfully archived and submitted to permanent records!'
      });

      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (e: any) {
      alert('Archive submission error: ' + e.message);
    }
  };

  // Submit Change Request to Executive Director
  const handleSubmitChangeRequest = async () => {
    if (!changeRequestModal || !changeRequestModal.reason.trim()) {
      alert('Please state a reason for requesting this correction.');
      return;
    }

    const { batchIndex, reason, rowKey, fieldTitle } = changeRequestModal;
    setChangeRequestModal({ ...changeRequestModal, isSubmitting: true });

    try {
      const targetBatch = batches[batchIndex];
      const updatedBatches = [...batches];
      const effectiveReason = rowKey ? `[Field: ${fieldTitle || String(rowKey)}] ${reason.trim()}` : reason.trim();

      updatedBatches[batchIndex] = {
        ...targetBatch,
        changeRequestStatus: 'PENDING',
        changeRequestReason: effectiveReason,
        changeRequestedBy: currentUser?.fullName || 'Staff User',
        changeRequestedAt: Date.now()
      };
      setBatches(updatedBatches);

      if (onRequestChange) {
        await onRequestChange(batchIndex, targetBatch, effectiveReason);
      } else {
        if (onSaveSingleRow) {
          await onSaveSingleRow(batchIndex, updatedBatches[batchIndex], updatedBatches);
        }
      }

      setChangeRequestModal(null);
      setFeedbackMsg({
        idx: batchIndex,
        text: `Change request for ${targetBatch.batchNumber} Batch submitted to Executive Director for authorization.`
      });

      setTimeout(() => {
        setFeedbackMsg(null);
      }, 4500);
    } catch (e: any) {
      alert('Error submitting change request: ' + e.message);
    }
  };

  const totalFingerlings = batches.reduce((acc, b) => acc + (Number(b.totalTransferredFingerlings) || 0), 0);

  // Helper to render an INDIVIDUAL Save button per row (leaving other rows active & editable)
  const renderRowActionButton = (
    batchIdx: number, 
    fieldTitle: string, 
    rowKey: keyof FisheryHatcheryBatchData
  ) => {
    const batch = batches[batchIdx];
    const isRowLocked = Boolean(batch.isLocked || batch.lockedRows?.[rowKey as string]);
    const isBatchLocked = Boolean(batch.isLocked);

    if (isRowLocked || isBatchLocked) {
      return (
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Locked</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setChangeRequestModal({
                isOpen: true,
                batchIndex: batchIdx,
                rowKey,
                fieldTitle,
                reason: '',
                isSubmitting: false
              });
            }}
            className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md flex items-center space-x-1 transition-all cursor-pointer"
            title={`Request correction for ${fieldTitle}`}
          >
            <Edit3 className="w-2.5 h-2.5 text-purple-600" />
            <span>Request Change</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerConfirmation(batchIdx, fieldTitle, rowKey);
          }}
          disabled={savingBatchIdx === batchIdx || isSubmitting}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer shadow-xs shadow-emerald-200 active:scale-95 disabled:opacity-50"
          title={`Save ${fieldTitle} (other rows stay editable)`}
        >
          {savingBatchIdx === batchIdx ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          <span>Save</span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8 bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              <Egg className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hatchery Progressive Ledger</span>
            </span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <Lock className="w-3 h-3 text-purple-600" />
              <span>Per-Row Immutable Locking</span>
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-2">
            Hatchery Section Logs
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Save individual rows independently (other rows stay editable). Expand/collapse sections for seamless navigation.
          </p>
        </div>

        {/* Quick Summary Pill & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl flex items-center space-x-3 shrink-0">
            <Droplets className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Total Fingerlings</span>
              <span className="text-base font-black text-emerald-700">{totalFingerlings.toLocaleString()} Fish</span>
            </div>
          </div>

          {/* Expand / Collapse All Toggle Button */}
          <button
            type="button"
            onClick={toggleExpandAll}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs"
            title={allExpanded ? 'Collapse all batch sections' : 'Expand all batch sections'}
          >
            <ChevronsUpDown className="w-4 h-4 text-slate-600" />
            <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>

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

      {/* ===== BATCH RECORDS (Stacked Cards with Expand/Collapse & Row Save) ===== */}
      <div className="space-y-6">
        {batches.map((batch, index) => {
          const stageInfo = getHatcheryBatchStage(batch);
          const isSavingThis = savingBatchIdx === index;
          const isSavedThis = savedBatchIdx === index;
          const isFeedbackForThis = feedbackMsg?.idx === index;
          const isBatchLocked = Boolean(batch.isLocked);
          const isPendingChange = batch.changeRequestStatus === 'PENDING';
          const isApprovedChange = batch.changeRequestStatus === 'APPROVED' && !isBatchLocked;
          const isCollapsed = Boolean(collapsedBatches[index]);

          // Count locked rows
          const lockedRowsCount = Object.keys(batch.lockedRows || {}).length;

          return (
            <div 
              key={index} 
              className={`border rounded-3xl p-5 sm:p-7 space-y-6 transition-all shadow-sm ${
                isBatchLocked 
                  ? 'bg-slate-50/90 border-slate-300 ring-1 ring-slate-200' 
                  : isApprovedChange
                    ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200'
                    : isSavedThis 
                      ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/40' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Batch Card Header with Expand / Collapse */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                <div 
                  onClick={() => toggleBatchCollapse(index)}
                  className="flex items-center space-x-3 cursor-pointer group select-none flex-1 min-w-0"
                >
                  <span className={`w-8 h-8 rounded-2xl text-xs font-black flex items-center justify-center shadow-sm shrink-0 ${
                    isBatchLocked ? 'bg-slate-700 text-white' : 'bg-emerald-700 text-white'
                  }`}>
                    {index + 1}
                  </span>
                  
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                        Batch Record #{index + 1}: <span className="text-emerald-700">{batch.batchNumber} Batch</span>
                      </h4>
                      
                      {isBatchLocked && (
                        <span className="inline-flex items-center space-x-1 bg-slate-800 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                          <Lock className="w-3 h-3 text-amber-300" />
                          <span>All Locked</span>
                        </span>
                      )}

                      {!isBatchLocked && lockedRowsCount > 0 && (
                        <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{lockedRowsCount} Rows Saved</span>
                        </span>
                      )}

                      {isPendingChange && (
                        <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                          <span>Pending ED Approval</span>
                        </span>
                      )}

                      {isApprovedChange && (
                        <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          <Unlock className="w-3 h-3 text-emerald-700" />
                          <span>Unlocked by ED for Correction</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${stageInfo.badgeColor}`}>
                        {stageInfo.stage} ({stageInfo.progressPercent}%)
                      </span>
                      {batch.hatcheryDate && (
                        <span className="text-[10px] font-bold text-slate-500">
                          Date: {batch.hatcheryDate}
                        </span>
                      )}
                      {batch.totalTransferredFingerlings && (
                        <span className="text-[10px] font-bold text-emerald-700">
                          • {Number(batch.totalTransferredFingerlings).toLocaleString()} Fish
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Per-Batch Top Actions: Save Batch / Request Change / Expand Toggle */}
                <div className="flex items-center space-x-2">
                  {isBatchLocked ? (
                    <button
                      type="button"
                      disabled={isPendingChange}
                      onClick={() => setChangeRequestModal({
                        isOpen: true,
                        batchIndex: index,
                        reason: '',
                        isSubmitting: false
                      })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95 ${
                        isPendingChange
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed'
                          : 'bg-purple-900 hover:bg-purple-950 text-white shadow-purple-200'
                      }`}
                      title="Request ED to unlock this entire batch"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isPendingChange ? 'Pending Review...' : 'Request for Change'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerConfirmation(index, 'Batch Record');
                      }}
                      disabled={isSavingThis || isSubmitting}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-200 active:scale-95 disabled:opacity-50"
                      title="Save & Lock all rows in this batch"
                    >
                      {isSavingThis ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Batch</span>
                    </button>
                  )}

                  {!isBatchLocked && batches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBatch(index)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove Batch Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Expand / Collapse Chevron Button */}
                  <button
                    type="button"
                    onClick={() => toggleBatchCollapse(index)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title={isCollapsed ? 'Expand Batch' : 'Collapse Batch'}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Instant Feedback Toast */}
              {isFeedbackForThis && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* FORM FIELDS (Collapsible Section with Individual Row Save) */}
              {!isCollapsed && (
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* 1. Source of Broodstock */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">1</span>
                        <span>Source of Broodstock</span>
                      </label>
                      {renderRowActionButton(index, 'Source of Broodstock', 'sourceOfBroodstock')}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </span>
                      <select
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.sourceOfBroodstock)}
                        value={batch.sourceOfBroodstock || 'Outside the Farm'}
                        onChange={(e) => handleFieldChange(index, 'sourceOfBroodstock', e.target.value)}
                        className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-black outline-none transition-all cursor-pointer ${
                          isBatchLocked || batch.lockedRows?.sourceOfBroodstock
                            ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                        }`}
                      >
                        {BROODSTOCK_SOURCE_OPTIONS.map((source) => (
                          <option key={source} value={source}>
                            {source}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Batch Number */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">2</span>
                        <span>Batch Number</span>
                      </label>
                      {renderRowActionButton(index, 'Batch Number', 'batchNumber')}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <Hash className="w-4 h-4" />
                      </span>
                      <select
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.batchNumber)}
                        value={batch.batchNumber}
                        onChange={(e) => handleFieldChange(index, 'batchNumber', e.target.value)}
                        className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-black outline-none transition-all cursor-pointer ${
                          isBatchLocked || batch.lockedRows?.batchNumber
                            ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                        }`}
                      >
                        {BATCH_NUMBER_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt} Batch
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3. Hatchery Date */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">3</span>
                        <span>Hatchery Date</span>
                      </label>
                      {renderRowActionButton(index, 'Hatchery Date', 'hatcheryDate')}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input
                        type="date"
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.hatcheryDate)}
                        value={batch.hatcheryDate}
                        onChange={(e) => handleFieldChange(index, 'hatcheryDate', e.target.value)}
                        className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold outline-none transition-all ${
                          isBatchLocked || batch.lockedRows?.hatcheryDate
                            ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 4. First Date of Feeding */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">4</span>
                        <span>First Date of Feeding</span>
                      </label>
                      {renderRowActionButton(index, 'First Date of Feeding', 'firstDateOfFeeding')}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input
                        type="date"
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.firstDateOfFeeding)}
                        value={batch.firstDateOfFeeding}
                        onChange={(e) => handleFieldChange(index, 'firstDateOfFeeding', e.target.value)}
                        className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold outline-none transition-all ${
                          isBatchLocked || batch.lockedRows?.firstDateOfFeeding
                            ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 5. Date of Transfer to Grow-Out */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">5</span>
                        <span>Date of Transfer to Grow-Out</span>
                      </label>
                      {renderRowActionButton(index, 'Date of Transfer to Grow-Out', 'dateOfTransferToGrowOut')}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input
                        type="date"
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.dateOfTransferToGrowOut)}
                        value={batch.dateOfTransferToGrowOut}
                        onChange={(e) => handleFieldChange(index, 'dateOfTransferToGrowOut', e.target.value)}
                        className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold outline-none transition-all ${
                          isBatchLocked || batch.lockedRows?.dateOfTransferToGrowOut
                            ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 6. Total Number of Transferred Fingerlings */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">6</span>
                        <span>Total Number of Transferred Fingerlings</span>
                      </label>
                      {renderRowActionButton(index, 'Total Number of Transferred Fingerlings', 'totalTransferredFingerlings')}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.totalTransferredFingerlings)}
                        value={batch.totalTransferredFingerlings}
                        onChange={(e) => handleFieldChange(index, 'totalTransferredFingerlings', e.target.value)}
                        placeholder="e.g. 15000"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-black outline-none transition-all ${
                          isBatchLocked || batch.lockedRows?.totalTransferredFingerlings
                            ? 'bg-slate-100/90 border-slate-200 text-emerald-900 cursor-not-allowed select-text font-black' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-emerald-800'
                        }`}
                      />
                      <span className="absolute right-3.5 text-[10px] font-extrabold uppercase text-slate-400">
                        Fish
                      </span>
                    </div>
                  </div>

                  {/* 7. Average Weight of Fingerlings Transferred */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">7</span>
                        <span>Average Weight of Fingerlings Transferred</span>
                      </label>
                      {renderRowActionButton(index, 'Average Weight of Fingerlings Transferred', 'averageWeightTransferred')}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <Scale className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.averageWeightTransferred)}
                        value={batch.averageWeightTransferred}
                        onChange={(e) => handleFieldChange(index, 'averageWeightTransferred', e.target.value)}
                        placeholder="e.g. 5.5"
                        className={`w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold outline-none transition-all ${
                          isBatchLocked || batch.lockedRows?.averageWeightTransferred
                            ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                        }`}
                      />
                      <span className="absolute right-3.5 text-[10px] font-extrabold uppercase text-slate-400">
                        g
                      </span>
                    </div>
                  </div>

                  {/* 8. Age of Fingerlings Transferred */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">8</span>
                        <span>Age of Fingerlings Transferred</span>
                      </label>
                      {renderRowActionButton(index, 'Age of Fingerlings Transferred', 'ageOfFingerlingsTransferred')}
                    </div>
                    <input
                      type="text"
                      disabled={isBatchLocked || Boolean(batch.lockedRows?.ageOfFingerlingsTransferred)}
                      value={batch.ageOfFingerlingsTransferred}
                      onChange={(e) => handleFieldChange(index, 'ageOfFingerlingsTransferred', e.target.value)}
                      placeholder="e.g. 45 Days or 6 Weeks"
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all ${
                        isBatchLocked || batch.lockedRows?.ageOfFingerlingsTransferred
                          ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                          : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* 9. Health Status of Fingerlings Transferred */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">9</span>
                        <span>Health Status of Fingerlings Transferred</span>
                      </label>
                      {renderRowActionButton(index, 'Health Status of Fingerlings Transferred', 'healthStatusTransferred')}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <Activity className="w-4 h-4" />
                      </span>
                      <select
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.healthStatusTransferred)}
                        value={batch.healthStatusTransferred || 'Good'}
                        onChange={(e) => handleFieldChange(index, 'healthStatusTransferred', e.target.value)}
                        className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold outline-none transition-all cursor-pointer ${
                          isBatchLocked || batch.lockedRows?.healthStatusTransferred
                            ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                        }`}
                      >
                        {HEALTH_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 10. Destinated Pond of Fingerlings Transferred */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">10</span>
                        <span>Destinated Pond of Fingerlings Transferred</span>
                      </label>
                      {renderRowActionButton(index, 'Destinated Pond of Fingerlings Transferred', 'destinatedPondTransferred')}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                      </span>
                      <input
                        type="text"
                        disabled={isBatchLocked || Boolean(batch.lockedRows?.destinatedPondTransferred)}
                        value={batch.destinatedPondTransferred}
                        onChange={(e) => handleFieldChange(index, 'destinatedPondTransferred', e.target.value)}
                        placeholder="e.g. Grow-Out Pond 3 / Earthen Pond B"
                        className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold outline-none transition-all ${
                          isBatchLocked || batch.lockedRows?.destinatedPondTransferred
                            ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                            : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 11. Remarks */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">11</span>
                        <span>Batch Remarks & Growth Observations</span>
                      </label>
                      {renderRowActionButton(index, 'Batch Remarks', 'remarks')}
                    </div>
                    <textarea
                      rows={2}
                      disabled={isBatchLocked || Boolean(batch.lockedRows?.remarks)}
                      value={batch.remarks || ''}
                      onChange={(e) => handleFieldChange(index, 'remarks', e.target.value)}
                      placeholder="Notes on fry feeding response, water aeration, grading records..."
                      className={`w-full border rounded-xl p-3 text-xs font-medium outline-none transition-all ${
                        isBatchLocked || batch.lockedRows?.remarks
                          ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                          : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                      }`}
                    />
                  </div>

                </div>
              )}

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
          <span>Add Next Batch Record</span>
        </button>

        <div className="text-xs text-slate-500 font-bold">
          Total Batches: <span className="text-slate-900 font-black">{batches.length}</span>
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

      {/* ===== FINAL FORM ACTION: ARCHIVE & SUBMIT COMPLETED FORM ===== */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-3xl">
        <div className="text-xs text-slate-600 font-medium space-y-1">
          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
            <Archive className="w-4 h-4 text-emerald-600" />
            <span>Farm Records Archiving Workflow</span>
          </div>
          <p>
            When all batch logs for this period are completed, submit the entire form to the permanent archive.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setArchiveModal(true)}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FileCheck className="w-4 h-4" />
          )}
          <span>Submit Completed Form to Archive</span>
        </button>
      </div>

      {/* ===== 1. ROW / BATCH SAVE CONFIRMATION MODAL ===== */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 relative">
            
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 mx-auto">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Save Farm Log
              </h3>
              <p className="text-sm text-slate-800 font-extrabold leading-relaxed">
                Are you sure you want to save this log?
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 text-left leading-relaxed">
                🔒 Once confirmed, this log entry for <strong>{confirmModal.fieldName || `${batches[confirmModal.batchIndex]?.batchNumber} Batch`}</strong> will become <strong>immutable and permanent</strong>. All other rows remain active and editable. To make corrections later, use the <em>Request for Change</em> button.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLockAndSave}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Yes, Confirm & Lock</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== 2. ARCHIVE FORM CONFIRMATION MODAL ===== */}
      {archiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 mx-auto">
              <Archive className="w-6 h-6 text-emerald-700" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Archive & Submit Form
              </h3>
              <p className="text-sm text-slate-800 font-extrabold leading-relaxed">
                Are you ready to submit this complete ledger to the farm archive?
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 text-left leading-relaxed">
                📦 This will permanently archive all <strong>{batches.length} batch records</strong> into the central farm registry for record-keeping and forward the complete record for management review.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleArchiveAndSubmit}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 3. REQUEST FOR CHANGE MODAL ===== */}
      {changeRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 relative">
            
            <button
              type="button"
              onClick={() => setChangeRequestModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-800">
                <Edit3 className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Request for Change: {changeRequestModal.fieldTitle ? changeRequestModal.fieldTitle : `${batches[changeRequestModal.batchIndex]?.batchNumber} Batch`}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Submit a request to the Executive Director to unlock this record for correction
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-700">
                Reason for Requested Correction *
              </label>
              <textarea
                rows={4}
                required
                value={changeRequestModal.reason}
                onChange={(e) => setChangeRequestModal({ ...changeRequestModal, reason: e.target.value })}
                placeholder="e.g. Need to correct transferred fingerling count from 12,000 to 14,500 due to recount verification..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-2xl p-3.5 text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setChangeRequestModal(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={changeRequestModal.isSubmitting || !changeRequestModal.reason.trim()}
                onClick={handleSubmitChangeRequest}
                className="px-6 py-2.5 bg-purple-900 hover:bg-purple-950 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-purple-200 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
              >
                {changeRequestModal.isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Submit Request to ED</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
