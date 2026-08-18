import React, { useState, useEffect } from 'react';
import { FisheryLivestockFormData, FisheryLivestockPondData } from '../types';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Image as ImageIcon, 
  RefreshCw, 
  Save, 
  Lock, 
  Unlock, 
  Edit3, 
  AlertTriangle, 
  Check, 
  Clock, 
  Send, 
  Waves,
  Droplets,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Archive,
  FileCheck,
  Fish,
  FolderArchive,
  Sparkles
} from 'lucide-react';

interface FisheryLivestockFormProps {
  initialData?: FisheryLivestockFormData;
  reportId?: string;
  currentUser?: { fullName: string; email: string };
  onSubmit: (data: FisheryLivestockFormData) => void;
  onSaveSingleRow?: (pondIndex: number, pond: FisheryLivestockPondData, allPonds: FisheryLivestockPondData[]) => Promise<void>;
  onRequestChange?: (pondIndex: number, pond: FisheryLivestockPondData, reason: string) => Promise<void>;
  isSubmitting?: boolean;
  color?: string;
}

const BRANDS = ["Blue Crown", "Ecofloat", "Aqualis", "Alpha", "Coppen", "Skretting"];
const SIZES = ["0.2mm", "0.3mm", "0.5mm", "0.8mm", "1.2mm", "1.5mm", "2mm", "3mm", "4mm", "6mm", "9mm"];

export const FisheryLivestockForm: React.FC<FisheryLivestockFormProps> = ({ 
  initialData, 
  currentUser,
  onSubmit, 
  onSaveSingleRow, 
  onRequestChange, 
  isSubmitting 
}) => {
  const [ponds, setPonds] = useState<FisheryLivestockPondData[]>(() => {
    if (initialData?.ponds && initialData.ponds.length > 0) {
      return initialData.ponds;
    }
    return [
      {
        pondNo: 'Pond 1',
        pondSizeSqm: '',
        quantityOfFish: '',
        batch: 'Batch A',
        waterCondition: 'Clear',
        waterChangedToday: { hasChanged: false, times: '' },
        feedingRecords: {
          items: [{ type: 'Branded', size: '2mm', brand: 'Blue Crown', quantityKg: '' }]
        },
        feedingResponse: 'Active',
        mortality: '0',
        pondPhoto: '',
        isLocked: false
      }
    ];
  });

  const [generalNotes, setGeneralNotes] = useState(initialData?.generalNotes || '');
  const [savingPondIdx, setSavingPondIdx] = useState<number | null>(null);
  const [savedPondIdx, setSavedPondIdx] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ idx: number; text: string } | null>(null);

  // Expand & Collapse State
  const [collapsedPonds, setCollapsedPonds] = useState<Record<number, boolean>>({});
  const [isArchiveExpanded, setIsArchiveExpanded] = useState<boolean>(true);
  const [allExpanded, setAllExpanded] = useState<boolean>(true);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    pondIndex: number;
    fieldName?: string;
  } | null>(null);

  // Archive & Submit modal state
  const [archiveModal, setArchiveModal] = useState<boolean>(false);

  // Change Request modal state
  const [changeRequestModal, setChangeRequestModal] = useState<{
    isOpen: boolean;
    pondIndex: number;
    reason: string;
    isSubmitting: boolean;
  } | null>(null);

  useEffect(() => {
    if (initialData?.ponds && initialData.ponds.length > 0) {
      setPonds(initialData.ponds);
      setGeneralNotes(initialData.generalNotes || '');
    }
  }, [initialData]);

  const togglePondCollapse = (index: number) => {
    setCollapsedPonds(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleExpandAll = () => {
    if (allExpanded) {
      const collapsed: Record<number, boolean> = {};
      ponds.forEach((_, i) => {
        collapsed[i] = true;
      });
      setCollapsedPonds(collapsed);
      setAllExpanded(false);
    } else {
      setCollapsedPonds({});
      setAllExpanded(true);
    }
  };

  const addPond = () => {
    const nextIdx = ponds.length;
    setPonds([
      ...ponds,
      {
        pondNo: `Pond ${nextIdx + 1}`,
        pondSizeSqm: '',
        quantityOfFish: '',
        batch: `Batch ${String.fromCharCode(65 + (nextIdx % 26))}`,
        waterCondition: 'Clear',
        waterChangedToday: { hasChanged: false, times: '' },
        feedingRecords: {
          items: [{ type: 'Branded', size: '2mm', brand: 'Blue Crown', quantityKg: '' }]
        },
        feedingResponse: 'Active',
        mortality: '0',
        pondPhoto: '',
        isLocked: false
      }
    ]);
    setCollapsedPonds(prev => ({ ...prev, [nextIdx]: false }));
  };

  const removePond = (index: number) => {
    if (ponds.length === 1) return;
    if (ponds[index].isLocked) {
      alert('This pond entry is permanently locked. It cannot be deleted directly.');
      return;
    }
    setPonds(ponds.filter((_, i) => i !== index));
  };

  const handlePondChange = (index: number, field: keyof FisheryLivestockPondData, value: any) => {
    if (ponds[index].isLocked) return;
    const updated = [...ponds];
    updated[index] = { ...updated[index], [field]: value };
    setPonds(updated);
  };

  const handleWaterChangedToggle = (index: number, hasChanged: boolean) => {
    if (ponds[index].isLocked) return;
    const updated = [...ponds];
    updated[index].waterChangedToday.hasChanged = hasChanged;
    if (!hasChanged) updated[index].waterChangedToday.times = '';
    setPonds(updated);
  };

  const handleWaterTimesChange = (index: number, times: string) => {
    if (ponds[index].isLocked) return;
    const updated = [...ponds];
    updated[index].waterChangedToday.times = times;
    setPonds(updated);
  };

  const handleFeedingItemChange = (pondIdx: number, itemIdx: number, field: string, value: string) => {
    if (ponds[pondIdx].isLocked) return;
    const updated = [...ponds];
    const items = [...updated[pondIdx].feedingRecords.items];
    items[itemIdx] = { ...items[itemIdx], [field]: value };
    updated[pondIdx].feedingRecords.items = items;
    setPonds(updated);
  };

  const addFeedingItem = (pondIdx: number) => {
    if (ponds[pondIdx].isLocked) return;
    const updated = [...ponds];
    updated[pondIdx].feedingRecords.items.push({
      type: 'Branded',
      size: '2mm',
      brand: 'Blue Crown',
      quantityKg: ''
    });
    setPonds(updated);
  };

  const removeFeedingItem = (pondIdx: number, itemIdx: number) => {
    if (ponds[pondIdx].isLocked) return;
    const updated = [...ponds];
    if (updated[pondIdx].feedingRecords.items.length === 1) return;
    updated[pondIdx].feedingRecords.items = updated[pondIdx].feedingRecords.items.filter((_, i) => i !== itemIdx);
    setPonds(updated);
  };

  const handlePhotoUpload = (pondIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (ponds[pondIdx].isLocked) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = [...ponds];
        updated[pondIdx].pondPhoto = reader.result as string;
        setPonds(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open confirmation prompt
  const triggerConfirmation = (index: number, fieldName?: string) => {
    setConfirmModal({
      isOpen: true,
      pondIndex: index,
      fieldName
    });
  };

  // Confirm Save and Permanently Lock Single Pond Entry
  const handleConfirmLockAndSave = async () => {
    if (!confirmModal) return;
    const index = confirmModal.pondIndex;
    setConfirmModal(null);
    setSavingPondIdx(index);

    try {
      const updatedPonds = [...ponds];
      updatedPonds[index] = {
        ...updatedPonds[index],
        isLocked: true,
        lockedAt: Date.now(),
        lockedBy: currentUser?.fullName || 'Staff User',
        changeRequestStatus: 'NONE'
      };
      setPonds(updatedPonds);

      if (onSaveSingleRow) {
        await onSaveSingleRow(index, updatedPonds[index], updatedPonds);
      } else {
        onSubmit({ ponds: updatedPonds, generalNotes });
      }

      setSavedPondIdx(index);
      setFeedbackMsg({
        idx: index,
        text: `✅ ${updatedPonds[index].pondNo} saved & moved to Permanent Archive!`
      });

      setTimeout(() => {
        setSavedPondIdx(null);
        setFeedbackMsg(null);
      }, 4500);
    } catch (e: any) {
      alert('Error saving pond log: ' + e.message);
    } finally {
      setSavingPondIdx(null);
    }
  };

  // Archive and Submit Completed Form
  const handleArchiveAndSubmit = async () => {
    setArchiveModal(false);
    try {
      const finalizedPonds = ponds.map(p => ({
        ...p,
        isLocked: true,
        lockedAt: p.lockedAt || Date.now(),
        lockedBy: p.lockedBy || currentUser?.fullName || 'Staff User'
      }));
      setPonds(finalizedPonds);

      onSubmit({
        ponds: finalizedPonds,
        generalNotes: generalNotes.trim() || undefined,
        isArchived: true,
        isDraft: false
      });

      setFeedbackMsg({
        idx: 0,
        text: '🎉 Complete Livestock Form successfully submitted to permanent records archive!'
      });

      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (e: any) {
      alert('Archive error: ' + e.message);
    }
  };

  // Submit Change Request to Executive Director
  const handleSubmitChangeRequest = async () => {
    if (!changeRequestModal || !changeRequestModal.reason.trim()) {
      alert('Please state a reason for requesting this correction.');
      return;
    }

    const { pondIndex, reason } = changeRequestModal;
    setChangeRequestModal({ ...changeRequestModal, isSubmitting: true });

    try {
      const targetPond = ponds[pondIndex];
      const updatedPonds = [...ponds];
      updatedPonds[pondIndex] = {
        ...targetPond,
        changeRequestStatus: 'PENDING',
        changeRequestReason: reason.trim(),
        changeRequestedBy: currentUser?.fullName || 'Staff User',
        changeRequestedAt: Date.now()
      };
      setPonds(updatedPonds);

      if (onRequestChange) {
        await onRequestChange(pondIndex, targetPond, reason.trim());
      } else if (onSaveSingleRow) {
        await onSaveSingleRow(pondIndex, updatedPonds[pondIndex], updatedPonds);
      }

      setChangeRequestModal(null);
      setFeedbackMsg({
        idx: pondIndex,
        text: `Change request for ${targetPond.pondNo} submitted to Executive Director for authorization.`
      });

      setTimeout(() => {
        setFeedbackMsg(null);
      }, 4500);
    } catch (e: any) {
      alert('Error submitting change request: ' + e.message);
    }
  };

  const totalFish = ponds.reduce((acc, p) => acc + (Number(p.quantityOfFish) || 0), 0);
  const totalMortality = ponds.reduce((acc, p) => acc + (Number(p.mortality) || 0), 0);

  // Separate Active vs Archived Ponds
  const activePondsWithIndices = ponds
    .map((p, i) => ({ pond: p, originalIndex: i }))
    .filter(({ pond }) => !pond.isLocked || pond.changeRequestStatus === 'APPROVED');

  const archivedPondsWithIndices = ponds
    .map((p, i) => ({ pond: p, originalIndex: i }))
    .filter(({ pond }) => pond.isLocked && pond.changeRequestStatus !== 'APPROVED');

  return (
    <div className="space-y-8 bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              <Waves className="w-3.5 h-3.5 text-emerald-600" />
              <span>Livestock Pond Records</span>
            </span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <Lock className="w-3 h-3 text-purple-600" />
              <span>Auto-Archive on Save</span>
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1.5">Livestock Pond Inventory</h3>
          <p className="text-xs text-slate-500 font-medium">
            Active ponds are shown at the top. Completed and saved logs are stored in the archive below until an edit request is made.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Summary Pills */}
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl flex items-center space-x-2">
            <Fish className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-emerald-800">{totalFish.toLocaleString()} Fish Total</span>
          </div>

          {/* Expand / Collapse All */}
          <button
            type="button"
            onClick={toggleExpandAll}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            <ChevronsUpDown className="w-4 h-4 text-slate-600" />
            <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>
        </div>
      </div>

      {/* ===== 1. TOP SECTION: ACTIVE PONDS WORKSPACE ===== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider">
              Active Ponds Workspace ({activePondsWithIndices.length})
            </h4>
          </div>

          <button
            type="button"
            onClick={addPond}
            className="inline-flex items-center space-x-1.5 text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black border border-emerald-300 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>+ Add Next Pond Record</span>
          </button>
        </div>

        {activePondsWithIndices.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h5 className="text-base font-black text-slate-900 uppercase">
                All Pond Logs Completed & Archived
              </h5>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Saved pond records have been moved to the Permanent Farm Archive below. Click below to add a new pond record.
              </p>
            </div>
            <button
              type="button"
              onClick={addPond}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Pond Record</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {activePondsWithIndices.map(({ pond, originalIndex }) => {
              const isSavingThis = savingPondIdx === originalIndex;
              const isSavedThis = savedPondIdx === originalIndex;
              const isFeedbackForThis = feedbackMsg?.idx === originalIndex;
              const isApprovedChange = pond.changeRequestStatus === 'APPROVED';
              const isCollapsed = Boolean(collapsedPonds[originalIndex]);

              return (
                <div 
                  key={originalIndex} 
                  className={`p-5 sm:p-7 rounded-3xl border space-y-5 relative transition-all shadow-sm ${
                    isApprovedChange
                      ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200'
                      : isSavedThis 
                        ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/40' 
                        : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Pond Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                    <div 
                      onClick={() => togglePondCollapse(originalIndex)}
                      className="flex items-center space-x-3 cursor-pointer group select-none flex-1 min-w-0"
                    >
                      <span className="w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-xs shrink-0 bg-emerald-600 text-white">
                        #{originalIndex + 1}
                      </span>
                      
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">
                            {pond.pondNo} ({pond.batch || 'Batch'})
                          </h4>

                          {isApprovedChange && (
                            <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full animate-pulse">
                              <Unlock className="w-3 h-3 text-emerald-700" />
                              <span>Unlocked by ED for Correction</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                          {pond.quantityOfFish && (
                            <span className="text-emerald-700 font-bold">
                              {Number(pond.quantityOfFish).toLocaleString()} Fish
                            </span>
                          )}
                          <span>• Water: <strong>{pond.waterCondition}</strong></span>
                          {Number(pond.mortality) > 0 && (
                            <span className="text-rose-600 font-bold">• Mortality: {pond.mortality}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          triggerConfirmation(originalIndex, pond.pondNo);
                        }}
                        disabled={isSavingThis || isSubmitting}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-200 active:scale-95 disabled:opacity-50"
                        title="Save and lock this pond (moves to archive)"
                      >
                        {isSavingThis ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save Pond</span>
                      </button>

                      {ponds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePond(originalIndex)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete Pond"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => togglePondCollapse(originalIndex)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        title={isCollapsed ? 'Expand Pond' : 'Collapse Pond'}
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

                  {/* Collapsible Content */}
                  {!isCollapsed && (
                    <div className="space-y-5 animate-fadeIn">
                      {/* Pond Basic Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Number / Code</label>
                          <input
                            type="text"
                            value={pond.pondNo}
                            onChange={(e) => handlePondChange(originalIndex, 'pondNo', e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none bg-slate-50 focus:bg-white border-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Batch Code</label>
                          <input
                            type="text"
                            value={pond.batch}
                            onChange={(e) => handlePondChange(originalIndex, 'batch', e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none bg-slate-50 focus:bg-white border-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Size (SQM)</label>
                          <input
                            type="number"
                            value={pond.pondSizeSqm}
                            onChange={(e) => handlePondChange(originalIndex, 'pondSizeSqm', e.target.value)}
                            placeholder="e.g. 50"
                            className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none bg-slate-50 focus:bg-white border-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Quantity of Fish</label>
                          <input
                            type="number"
                            value={pond.quantityOfFish}
                            onChange={(e) => handlePondChange(originalIndex, 'quantityOfFish', e.target.value)}
                            placeholder="e.g. 1000"
                            className="w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none bg-slate-50 focus:bg-white border-slate-200 text-emerald-800"
                          />
                        </div>
                      </div>

                      {/* Water Condition */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Water Condition</label>
                          <div className="flex space-x-3">
                            <button
                              type="button"
                              onClick={() => handlePondChange(originalIndex, 'waterCondition', 'Clear')}
                              className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                                pond.waterCondition === 'Clear'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePondChange(originalIndex, 'waterCondition', 'Unclear')}
                              className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                                pond.waterCondition === 'Unclear'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              Unclear
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Water Changed Today?</label>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => handleWaterChangedToggle(originalIndex, true)}
                              className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                                pond.waterChangedToday.hasChanged
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWaterChangedToggle(originalIndex, false)}
                              className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                                !pond.waterChangedToday.hasChanged
                                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              No
                            </button>

                            {pond.waterChangedToday.hasChanged && (
                              <input
                                type="number"
                                value={pond.waterChangedToday.times}
                                onChange={(e) => handleWaterTimesChange(originalIndex, e.target.value)}
                                placeholder="Times changed"
                                className="w-32 border rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white border-slate-200"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Feeding Records */}
                      <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-extrabold uppercase text-slate-700">Feeding Records</label>
                          <button
                            type="button"
                            onClick={() => addFeedingItem(originalIndex)}
                            className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer"
                          >
                            + Add Feed Record
                          </button>
                        </div>

                        {pond.feedingRecords.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 items-end">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Feed Type</label>
                              <select
                                value={item.type}
                                onChange={(e) => handleFeedingItemChange(originalIndex, itemIdx, 'type', e.target.value)}
                                className="w-full border rounded-xl px-2 py-1.5 text-xs font-bold bg-slate-50 border-slate-200 cursor-pointer"
                              >
                                <option value="Branded">Branded</option>
                                <option value="Farm-produced">Farm-produced</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Pellet Size</label>
                              <select
                                value={item.size}
                                onChange={(e) => handleFeedingItemChange(originalIndex, itemIdx, 'size', e.target.value)}
                                className="w-full border rounded-xl px-2 py-1.5 text-xs font-bold bg-slate-50 border-slate-200 cursor-pointer"
                              >
                                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            {item.type === 'Branded' && (
                              <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Brand</label>
                                <select
                                  value={item.brand || ''}
                                  onChange={(e) => handleFeedingItemChange(originalIndex, itemIdx, 'brand', e.target.value)}
                                  className="w-full border rounded-xl px-2 py-1.5 text-xs font-bold bg-slate-50 border-slate-200 cursor-pointer"
                                >
                                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <div className="flex-1">
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Quantity (KG)</label>
                                <input
                                  type="number"
                                  value={item.quantityKg}
                                  onChange={(e) => handleFeedingItemChange(originalIndex, itemIdx, 'quantityKg', e.target.value)}
                                  placeholder="KG"
                                  className="w-full border rounded-xl px-3 py-1.5 text-xs font-bold bg-slate-50 border-slate-200"
                                />
                              </div>
                              {pond.feedingRecords.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFeedingItem(originalIndex, itemIdx)}
                                  className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl cursor-pointer mt-3.5"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Health, Mortality & Photo */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Feeding Response</label>
                          <select
                            value={pond.feedingResponse}
                            onChange={(e) => handlePondChange(originalIndex, 'feedingResponse', e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 border-slate-200 cursor-pointer"
                          >
                            <option value="Active">Active</option>
                            <option value="Slow">Slow</option>
                            <option value="Poor">Poor</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Mortality Count</label>
                          <input
                            type="number"
                            value={pond.mortality}
                            onChange={(e) => handlePondChange(originalIndex, 'mortality', e.target.value)}
                            placeholder="0"
                            className="w-full border rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 border-slate-200 text-rose-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Photo</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(originalIndex, e)}
                            className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 cursor-pointer"
                          />
                        </div>
                      </div>

                      {pond.pondPhoto && (
                        <div className="mt-2">
                          <img src={pond.pondPhoto} alt="Pond preview" className="w-32 h-24 object-cover rounded-2xl border border-slate-200" />
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

      {/* ===== 2. BOTTOM SECTION: PERMANENT FARM ARCHIVE & COMPLETED RECORDS ===== */}
      {archivedPondsWithIndices.length > 0 && (
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
                    {archivedPondsWithIndices.length} Completed Ponds
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

          {isArchiveExpanded && (
            <div className="space-y-4 animate-fadeIn">
              {archivedPondsWithIndices.map(({ pond, originalIndex }) => {
                const isPendingChange = pond.changeRequestStatus === 'PENDING';
                const isCollapsed = Boolean(collapsedPonds[originalIndex]);

                return (
                  <div 
                    key={originalIndex} 
                    className="border border-slate-200 bg-slate-50/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div 
                        onClick={() => togglePondCollapse(originalIndex)}
                        className="flex items-center space-x-3 cursor-pointer select-none flex-1"
                      >
                        <span className="w-8 h-8 rounded-xl bg-slate-700 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                          #{originalIndex + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-sm font-black text-slate-900 uppercase">
                              {pond.pondNo} ({pond.batch || 'Batch'})
                            </h5>
                            <span className="inline-flex items-center space-x-1 bg-slate-800 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3 text-amber-300" />
                              <span>Locked & Permanent</span>
                            </span>

                            {isPendingChange && (
                              <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Pending ED Unlock Review</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                            {pond.quantityOfFish && (
                              <span className="text-emerald-800 font-bold">• {Number(pond.quantityOfFish).toLocaleString()} Fish</span>
                            )}
                            <span>• Water: <strong>{pond.waterCondition}</strong></span>
                            {Number(pond.mortality) > 0 && <span className="text-rose-600 font-bold">• Mortality: {pond.mortality}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          disabled={isPendingChange}
                          onClick={() => setChangeRequestModal({
                            isOpen: true,
                            pondIndex: originalIndex,
                            reason: '',
                            isSubmitting: false
                          })}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95 ${
                            isPendingChange
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed'
                              : 'bg-purple-900 hover:bg-purple-950 text-white shadow-purple-200'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isPendingChange ? 'Review Pending...' : 'Request for Change'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => togglePondCollapse(originalIndex)}
                          className="p-1.5 bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                          title={isCollapsed ? 'Expand Details' : 'Collapse Details'}
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs animate-fadeIn">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Pond Size</span>
                            <span className="font-bold text-slate-800">{pond.pondSizeSqm ? `${pond.pondSizeSqm} SQM` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Quantity of Fish</span>
                            <span className="font-black text-emerald-800">{Number(pond.quantityOfFish || 0).toLocaleString()} Fish</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Feeding Response</span>
                            <span className="font-bold text-slate-800">{pond.feedingResponse || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Mortality</span>
                            <span className="font-bold text-rose-700">{pond.mortality || '0'}</span>
                          </div>
                        </div>

                        {pond.feedingRecords?.items?.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Feed Records</span>
                            <div className="flex flex-wrap gap-2">
                              {pond.feedingRecords.items.map((item, idx) => (
                                <span key={idx} className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-bold">
                                  {item.type} {item.brand ? `(${item.brand})` : ''} • {item.size} • {item.quantityKg} KG
                                </span>
                              ))}
                            </div>
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
          placeholder="Record notes on overall water flow, temperature trends, treatment applied..."
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl p-3.5 text-xs font-medium text-slate-800 outline-none transition-all"
        />
      </div>

      {/* Final Form Action: Archive & Submit Completed Form */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-3xl">
        <div className="text-xs text-slate-600 font-medium space-y-1">
          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
            <Archive className="w-4 h-4 text-emerald-600" />
            <span>Farm Records Archiving Workflow</span>
          </div>
          <p>
            When all pond logs for this period are completed, submit the entire form to the permanent archive.
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

      {/* Confirmation Modal */}
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
                🔒 Once confirmed, this log entry for <strong>{ponds[confirmModal.pondIndex]?.pondNo}</strong> will become <strong>immutable and permanent</strong>. It will be moved to the archive below. To make corrections later, use the <em>Request for Change</em> button.
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

      {/* Archive Modal */}
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
                Are you ready to submit this complete livestock form to the farm archive?
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 text-left leading-relaxed">
                📦 This will permanently archive all <strong>{ponds.length} pond records</strong> into the central farm registry for record-keeping and forward the complete record for management review.
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

      {/* Change Request Modal */}
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
                  Request for Change: {ponds[changeRequestModal.pondIndex]?.pondNo}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Submit a request to the Executive Director to unlock this pond record for correction
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
                placeholder="e.g. Correct fish mortality count or updated water condition after test..."
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
