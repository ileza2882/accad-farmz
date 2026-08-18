import React, { useState, useEffect, useRef } from 'react';
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
  FileCheck,
  FolderArchive,
  Sparkles,
  Inbox
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

interface HatcheryDateInputProps {
  value?: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const HatcheryDateInput: React.FC<HatcheryDateInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select Date'
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = Boolean(value && value.trim() !== '');

  const openPicker = () => {
    if (disabled) return;
    setIsFocused(true);
    setTimeout(() => {
      try {
        if (inputRef.current && 'showPicker' in inputRef.current) {
          (inputRef.current as any).showPicker();
        } else if (inputRef.current) {
          inputRef.current.focus();
        }
      } catch (_) {}
    }, 40);
  };

  return (
    <div className="relative flex items-center w-full group">
      <span 
        onClick={openPicker}
        className={`absolute left-3.5 text-slate-400 z-10 ${!disabled ? 'cursor-pointer hover:text-emerald-600 transition-colors' : 'pointer-events-none'}`}
      >
        <Calendar className="w-4 h-4" />
      </span>
      <input
        ref={inputRef}
        type={hasValue || isFocused ? 'date' : 'text'}
        disabled={disabled}
        placeholder={placeholder}
        value={value || ''}
        onClick={openPicker}
        onFocus={openPicker}
        onBlur={() => {
          setIsFocused(false);
        }}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={`${className} ${!hasValue ? 'placeholder-slate-400 font-normal text-slate-400 cursor-pointer' : ''}`}
      />
      {hasValue && !disabled ? (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
            setIsFocused(false);
          }}
          className="absolute right-3.5 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Clear date (Reset to Select Date)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : !hasValue && !disabled ? (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            openPicker();
          }}
          className="absolute right-3.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
          title="Click to select date"
        >
          <Calendar className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
};

const cleanInitialBatches = (rawBatches?: FisheryHatcheryBatchData[]): FisheryHatcheryBatchData[] => {
  if (!rawBatches || rawBatches.length === 0) {
    return [
      {
        sourceOfBroodstock: 'Outside the Farm',
        batchNumber: '1st',
        hatcheryDate: '',
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
  }

  return rawBatches.map(batch => {
    const isBatchLocked = Boolean(batch.isLocked);
    const lockedRows = batch.lockedRows || {};
    
    return {
      ...batch,
      // Date fields MUST default to empty '' ("Select Date") unless locked & confirmed
      hatcheryDate: isBatchLocked || lockedRows.hatcheryDate ? (batch.hatcheryDate || '') : '',
      firstDateOfFeeding: isBatchLocked || lockedRows.firstDateOfFeeding ? (batch.firstDateOfFeeding || '') : '',
      dateOfTransferToGrowOut: isBatchLocked || lockedRows.dateOfTransferToGrowOut ? (batch.dateOfTransferToGrowOut || '') : ''
    };
  });
};

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
    return cleanInitialBatches(initialData?.batches);
  });

  const [generalNotes, setGeneralNotes] = useState(initialData?.generalNotes || '');
  const [savingBatchIdx, setSavingBatchIdx] = useState<number | null>(null);
  const [savedBatchIdx, setSavedBatchIdx] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ idx: number; text: string } | null>(null);

  // Expand & Collapse State
  const [collapsedBatches, setCollapsedBatches] = useState<Record<number, boolean>>({});
  const [isArchiveExpanded, setIsArchiveExpanded] = useState<boolean>(true);
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
      setBatches(cleanInitialBatches(initialData.batches));
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
    const newBatch: FisheryHatcheryBatchData = {
      sourceOfBroodstock: batches[batches.length - 1]?.sourceOfBroodstock || 'Outside the Farm',
      batchNumber: defaultBatchOption,
      hatcheryDate: '',
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
        // Entire Batch Save: Lock the full batch and all its rows -> moves directly into Archive!
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
          : `✅ Batch ${currentBatch.batchNumber} completed & moved to Permanent Archive!`
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

  // Separate batches into ACTIVE vs ARCHIVED/COMPLETED
  // Active: not locked OR change request approved by ED
  // Archived: locked AND change request not approved
  const activeBatchesWithIndices = batches
    .map((b, i) => ({ batch: b, originalIndex: i }))
    .filter(({ batch }) => !batch.isLocked || batch.changeRequestStatus === 'APPROVED');

  const archivedBatchesWithIndices = batches
    .map((b, i) => ({ batch: b, originalIndex: i }))
    .filter(({ batch }) => batch.isLocked && batch.changeRequestStatus !== 'APPROVED');

  // Helper to render an INDIVIDUAL Save button per row
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
              <span>Auto-Archive on Save</span>
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-2">
            Hatchery Section Logs
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Active in-progress batches appear at the top. Completed/saved logs are cleanly stored in the Permanent Archive below until an edit request is made.
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

      {/* ===== 1. TOP SECTION: ACTIVE BATCH WORKSPACE ===== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider">
              Active Batch Workspace ({activeBatchesWithIndices.length})
            </h4>
          </div>

          <button
            type="button"
            onClick={addBatch}
            className="inline-flex items-center space-x-1.5 text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black border border-emerald-300 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>+ Start Next Batch Record</span>
          </button>
        </div>

        {/* If no active batches at top (all completed/archived) */}
        {activeBatchesWithIndices.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h5 className="text-base font-black text-slate-900 uppercase">
                All Batch Records Completed & Archived
              </h5>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Previous batch records have been saved and moved to the Permanent Farm Archive below. Click below to begin entering logs for the next batch cycle.
              </p>
            </div>
            <button
              type="button"
              onClick={addBatch}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Start Next Batch Record</span>
            </button>
          </div>
        ) : (
          /* Active Batches List */
          <div className="space-y-6">
            {activeBatchesWithIndices.map(({ batch, originalIndex }) => {
              const stageInfo = getHatcheryBatchStage(batch);
              const isSavingThis = savingBatchIdx === originalIndex;
              const isSavedThis = savedBatchIdx === originalIndex;
              const isFeedbackForThis = feedbackMsg?.idx === originalIndex;
              const isApprovedChange = batch.changeRequestStatus === 'APPROVED';
              const isCollapsed = Boolean(collapsedBatches[originalIndex]);
              const lockedRowsCount = Object.keys(batch.lockedRows || {}).length;

              return (
                <div 
                  key={originalIndex} 
                  className={`border rounded-3xl p-5 sm:p-7 space-y-6 transition-all shadow-sm ${
                    isApprovedChange
                      ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200'
                      : isSavedThis 
                        ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/40' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Batch Card Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                    <div 
                      onClick={() => toggleBatchCollapse(originalIndex)}
                      className="flex items-center space-x-3 cursor-pointer group select-none flex-1 min-w-0"
                    >
                      <span className="w-8 h-8 rounded-2xl text-xs font-black flex items-center justify-center shadow-sm shrink-0 bg-emerald-700 text-white">
                        {originalIndex + 1}
                      </span>
                      
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                            Batch Record #{originalIndex + 1}: <span className="text-emerald-700">{batch.batchNumber} Batch</span>
                          </h4>

                          {isApprovedChange && (
                            <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full animate-pulse">
                              <Unlock className="w-3 h-3 text-emerald-700" />
                              <span>Unlocked by ED for Correction</span>
                            </span>
                          )}

                          {lockedRowsCount > 0 && !isApprovedChange && (
                            <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>{lockedRowsCount} Rows Saved</span>
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

                    {/* Batch Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          triggerConfirmation(originalIndex, 'Batch Record');
                        }}
                        disabled={isSavingThis || isSubmitting}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-200 active:scale-95 disabled:opacity-50"
                        title="Save Batch and move to permanent archive"
                      >
                        {isSavingThis ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save Batch</span>
                      </button>

                      {batches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBatch(originalIndex)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Remove Batch Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleBatchCollapse(originalIndex)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        title={isCollapsed ? 'Expand Batch' : 'Collapse Batch'}
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Feedback Toast */}
                  {isFeedbackForThis && (
                    <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{feedbackMsg.text}</span>
                    </div>
                  )}

                  {/* Batch Fields Form */}
                  {!isCollapsed && (
                    <div className="space-y-4 animate-fadeIn">
                      
                      {/* 1. Source of Broodstock */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">1</span>
                            <span>Source of Broodstock</span>
                          </label>
                          {renderRowActionButton(originalIndex, 'Source of Broodstock', 'sourceOfBroodstock')}
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-slate-400">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          </span>
                          <select
                            disabled={Boolean(batch.lockedRows?.sourceOfBroodstock)}
                            value={batch.sourceOfBroodstock || 'Outside the Farm'}
                            onChange={(e) => handleFieldChange(originalIndex, 'sourceOfBroodstock', e.target.value)}
                            className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-black outline-none transition-all cursor-pointer ${
                              batch.lockedRows?.sourceOfBroodstock
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
                          {renderRowActionButton(originalIndex, 'Batch Number', 'batchNumber')}
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-slate-400">
                            <Hash className="w-4 h-4" />
                          </span>
                          <select
                            disabled={Boolean(batch.lockedRows?.batchNumber)}
                            value={batch.batchNumber}
                            onChange={(e) => handleFieldChange(originalIndex, 'batchNumber', e.target.value)}
                            className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs font-black outline-none transition-all cursor-pointer ${
                              batch.lockedRows?.batchNumber
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
                          {renderRowActionButton(originalIndex, 'Hatchery Date', 'hatcheryDate')}
                        </div>
                        <HatcheryDateInput
                          disabled={Boolean(batch.lockedRows?.hatcheryDate)}
                          value={batch.hatcheryDate}
                          placeholder="Select Date"
                          onChange={(val) => handleFieldChange(originalIndex, 'hatcheryDate', val)}
                          className={`w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold outline-none transition-all ${
                            batch.lockedRows?.hatcheryDate
                              ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                              : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-800'
                          }`}
                        />
                      </div>

                      {/* 4. First Date of Feeding */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">4</span>
                            <span>First Date of Feeding</span>
                          </label>
                          {renderRowActionButton(originalIndex, 'First Date of Feeding', 'firstDateOfFeeding')}
                        </div>
                        <HatcheryDateInput
                          disabled={Boolean(batch.lockedRows?.firstDateOfFeeding)}
                          value={batch.firstDateOfFeeding}
                          placeholder="Select Date"
                          onChange={(val) => handleFieldChange(originalIndex, 'firstDateOfFeeding', val)}
                          className={`w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold outline-none transition-all ${
                            batch.lockedRows?.firstDateOfFeeding
                              ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                              : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-800'
                          }`}
                        />
                      </div>

                      {/* 5. Date of Transfer to Grow-Out */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">5</span>
                            <span>Date of Transfer to Grow-Out</span>
                          </label>
                          {renderRowActionButton(originalIndex, 'Date of Transfer to Grow-Out', 'dateOfTransferToGrowOut')}
                        </div>
                        <HatcheryDateInput
                          disabled={Boolean(batch.lockedRows?.dateOfTransferToGrowOut)}
                          value={batch.dateOfTransferToGrowOut}
                          placeholder="Select Date"
                          onChange={(val) => handleFieldChange(originalIndex, 'dateOfTransferToGrowOut', val)}
                          className={`w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold outline-none transition-all ${
                            batch.lockedRows?.dateOfTransferToGrowOut
                              ? 'bg-slate-100/90 border-slate-200 text-slate-700 cursor-not-allowed select-text font-bold' 
                              : 'bg-slate-50/60 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-800'
                          }`}
                        />
                      </div>

                      {/* 6. Total Number of Transferred Fingerlings */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 focus-within:border-emerald-500 transition-colors shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-black uppercase text-slate-700 flex items-center space-x-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">6</span>
                            <span>Total Number of Transferred Fingerlings</span>
                          </label>
                          {renderRowActionButton(originalIndex, 'Total Number of Transferred Fingerlings', 'totalTransferredFingerlings')}
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="0"
                            disabled={Boolean(batch.lockedRows?.totalTransferredFingerlings)}
                            value={batch.totalTransferredFingerlings}
                            onChange={(e) => handleFieldChange(originalIndex, 'totalTransferredFingerlings', e.target.value)}
                            placeholder="e.g. 15000"
                            className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-black outline-none transition-all ${
                              batch.lockedRows?.totalTransferredFingerlings
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
                          {renderRowActionButton(originalIndex, 'Average Weight of Fingerlings Transferred', 'averageWeightTransferred')}
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-slate-400">
                            <Scale className="w-4 h-4" />
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={Boolean(batch.lockedRows?.averageWeightTransferred)}
                            value={batch.averageWeightTransferred}
                            onChange={(e) => handleFieldChange(originalIndex, 'averageWeightTransferred', e.target.value)}
                            placeholder="e.g. 5.5"
                            className={`w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold outline-none transition-all ${
                              batch.lockedRows?.averageWeightTransferred
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
                          {renderRowActionButton(originalIndex, 'Age of Fingerlings Transferred', 'ageOfFingerlingsTransferred')}
                        </div>
                        <input
                          type="text"
                          disabled={Boolean(batch.lockedRows?.ageOfFingerlingsTransferred)}
                          value={batch.ageOfFingerlingsTransferred}
                          onChange={(e) => handleFieldChange(originalIndex, 'ageOfFingerlingsTransferred', e.target.value)}
                          placeholder="e.g. 45 Days or 6 Weeks"
                          className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all ${
                            batch.lockedRows?.ageOfFingerlingsTransferred
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
                          {renderRowActionButton(originalIndex, 'Health Status of Fingerlings Transferred', 'healthStatusTransferred')}
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-slate-400">
                            <Activity className="w-4 h-4" />
                          </span>
                          <select
                            disabled={Boolean(batch.lockedRows?.healthStatusTransferred)}
                            value={batch.healthStatusTransferred || 'Good'}
                            onChange={(e) => handleFieldChange(originalIndex, 'healthStatusTransferred', e.target.value)}
                            className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold outline-none transition-all cursor-pointer ${
                              batch.lockedRows?.healthStatusTransferred
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
                          {renderRowActionButton(originalIndex, 'Destinated Pond of Fingerlings Transferred', 'destinatedPondTransferred')}
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-slate-400">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                          </span>
                          <input
                            type="text"
                            disabled={Boolean(batch.lockedRows?.destinatedPondTransferred)}
                            value={batch.destinatedPondTransferred}
                            onChange={(e) => handleFieldChange(originalIndex, 'destinatedPondTransferred', e.target.value)}
                            placeholder="e.g. Grow-Out Pond 3 / Earthen Pond B"
                            className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold outline-none transition-all ${
                              batch.lockedRows?.destinatedPondTransferred
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
                          {renderRowActionButton(originalIndex, 'Batch Remarks', 'remarks')}
                        </div>
                        <textarea
                          rows={2}
                          disabled={Boolean(batch.lockedRows?.remarks)}
                          value={batch.remarks || ''}
                          onChange={(e) => handleFieldChange(originalIndex, 'remarks', e.target.value)}
                          placeholder="Notes on fry feeding response, water aeration, grading records..."
                          className={`w-full border rounded-xl p-3 text-xs font-medium outline-none transition-all ${
                            batch.lockedRows?.remarks
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
        )}
      </div>

      {/* ===== 2. BOTTOM SECTION: PERMANENT FARM ARCHIVE & COMPLETED RECORDS ===== */}
      {archivedBatchesWithIndices.length > 0 && (
        <div className="space-y-4 pt-6 border-t-2 border-slate-200">
          <div 
            onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
            className="flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200/80 rounded-2xl cursor-pointer select-none transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <FolderArchive className="w-5 h-5 text-purple-700" />
              <div>
                <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>Permanent Farm Archive & Completed Records</span>
                  <span className="bg-purple-100 text-purple-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-200">
                    {archivedBatchesWithIndices.length} Completed Batches
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Stored permanently. To make corrections, submit a "Request for Change" to the Executive Director.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold text-slate-600">
                {isArchiveExpanded ? 'Hide Archive' : 'Show Archive'}
              </span>
              {isArchiveExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
            </div>
          </div>

          {/* Archived Batches Cards */}
          {isArchiveExpanded && (
            <div className="space-y-4 animate-fadeIn">
              {archivedBatchesWithIndices.map(({ batch, originalIndex }) => {
                const stageInfo = getHatcheryBatchStage(batch);
                const isPendingChange = batch.changeRequestStatus === 'PENDING';
                const isCollapsed = Boolean(collapsedBatches[originalIndex]);

                return (
                  <div 
                    key={originalIndex} 
                    className="border border-slate-200 bg-slate-50/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div 
                        onClick={() => toggleBatchCollapse(originalIndex)}
                        className="flex items-center space-x-3 cursor-pointer select-none flex-1"
                      >
                        <span className="w-8 h-8 rounded-xl bg-slate-700 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                          #{originalIndex + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-sm font-black text-slate-900 uppercase">
                              Batch Record #{originalIndex + 1}: {batch.batchNumber} Batch
                            </h5>
                            <span className="inline-flex items-center space-x-1 bg-slate-800 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3 text-amber-300" />
                              <span>All Locked & Permanent</span>
                            </span>

                            {isPendingChange && (
                              <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Pending ED Unlock Review</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${stageInfo.badgeColor}`}>
                              {stageInfo.stage} ({stageInfo.progressPercent}%)
                            </span>
                            {batch.hatcheryDate && <span>• Date: {batch.hatcheryDate}</span>}
                            {batch.totalTransferredFingerlings && (
                              <span className="text-emerald-800 font-bold">• {Number(batch.totalTransferredFingerlings).toLocaleString()} Fish</span>
                            )}
                            {batch.destinatedPondTransferred && <span>• To: {batch.destinatedPondTransferred}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Archived Batch Actions: Request Change + Expand Details */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          disabled={isPendingChange}
                          onClick={() => setChangeRequestModal({
                            isOpen: true,
                            batchIndex: originalIndex,
                            reason: '',
                            isSubmitting: false
                          })}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95 ${
                            isPendingChange
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed'
                              : 'bg-purple-900 hover:bg-purple-950 text-white shadow-purple-200'
                          }`}
                          title="Submit a request to ED to unlock this record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isPendingChange ? 'Review Pending...' : 'Request for Change'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleBatchCollapse(originalIndex)}
                          className="p-1.5 bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                          title={isCollapsed ? 'Expand Details' : 'Collapse Details'}
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Read-Only Preview */}
                    {!isCollapsed && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs animate-fadeIn">
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Broodstock Source</span>
                          <span className="font-bold text-slate-800">{batch.sourceOfBroodstock || 'N/A'}</span>
                        </div>
                        {batch.hatcheryDate && (
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Hatchery Date</span>
                            <span className="font-bold text-slate-800">{batch.hatcheryDate}</span>
                          </div>
                        )}
                        {batch.firstDateOfFeeding && (
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">First Feeding Date</span>
                            <span className="font-bold text-slate-800">{batch.firstDateOfFeeding}</span>
                          </div>
                        )}
                        {batch.dateOfTransferToGrowOut && (
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Transfer Date</span>
                            <span className="font-bold text-slate-800">{batch.dateOfTransferToGrowOut}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Transferred Count</span>
                          <span className="font-black text-emerald-800">{Number(batch.totalTransferredFingerlings || 0).toLocaleString()} Fish</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Average Weight</span>
                          <span className="font-bold text-slate-800">{batch.averageWeightTransferred ? `${batch.averageWeightTransferred}g` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Age Transferred</span>
                          <span className="font-bold text-slate-800">{batch.ageOfFingerlingsTransferred || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Health Status</span>
                          <span className="font-bold text-slate-800">{batch.healthStatusTransferred || 'Good'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Destinated Pond</span>
                          <span className="font-bold text-slate-800">{batch.destinatedPondTransferred || 'N/A'}</span>
                        </div>
                        {batch.remarks && (
                          <div className="col-span-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Remarks</span>
                            <span className="font-medium text-slate-700 italic">"{batch.remarks}"</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                🔒 Once confirmed, this log entry for <strong>{confirmModal.fieldName || `${batches[confirmModal.batchIndex]?.batchNumber} Batch`}</strong> will become <strong>immutable and permanent</strong>. It will be stored in the archive below. To make corrections later, use the <em>Request for Change</em> button.
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
