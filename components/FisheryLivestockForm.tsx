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
  ShieldCheck
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

  const [savingPondIdx, setSavingPondIdx] = useState<number | null>(null);
  const [savedPondIdx, setSavedPondIdx] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ idx: number; text: string } | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    pondIndex: number;
    fieldName?: string;
  } | null>(null);

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
    }
  }, [initialData]);

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

  // Confirm Save and Permanently Lock Log Entry (stays on same page)
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
        onSubmit({ ponds: updatedPonds });
      }

      setSavedPondIdx(index);
      setFeedbackMsg({
        idx: index,
        text: `Log entry for ${updatedPonds[index].pondNo} confirmed & permanently locked.`
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

  return (
    <div className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900 font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              <Waves className="w-3.5 h-3.5 text-emerald-600" />
              <span>Livestock Pond Records</span>
            </span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <Lock className="w-3 h-3 text-purple-600" />
              <span>Immutable Log</span>
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1.5">Livestock Pond Inventory</h3>
          <p className="text-xs text-slate-500 font-medium">Record pond water conditions, feeding, health, and mortality with single Save locking</p>
        </div>
        <button
          type="button"
          onClick={addPond}
          className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer w-fit shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Pond</span>
        </button>
      </div>

      <div className="space-y-8">
        {ponds.map((pond, pIdx) => {
          const isSavingThis = savingPondIdx === pIdx;
          const isSavedThis = savedPondIdx === pIdx;
          const isFeedbackForThis = feedbackMsg?.idx === pIdx;
          const isLocked = Boolean(pond.isLocked);
          const isPendingChange = pond.changeRequestStatus === 'PENDING';
          const isApprovedChange = pond.changeRequestStatus === 'APPROVED' && !isLocked;

          return (
            <div 
              key={pIdx} 
              className={`p-6 rounded-3xl border space-y-6 relative transition-all shadow-sm ${
                isLocked 
                  ? 'bg-slate-50/90 border-slate-300 ring-1 ring-slate-200' 
                  : isApprovedChange
                    ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200'
                    : isSavedThis 
                      ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/40' 
                      : 'bg-slate-50 border-slate-200'
              }`}
            >
              
              {/* Pond Header with Single Save or Request for Change button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-3">
                  <span className={`w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-xs ${
                    isLocked ? 'bg-slate-700 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    #{pIdx + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 uppercase">{pond.pondNo} Details</h4>
                      
                      {isLocked && (
                        <span className="inline-flex items-center space-x-1 bg-slate-800 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          <Lock className="w-3 h-3 text-amber-300" />
                          <span>Locked & Permanent</span>
                        </span>
                      )}

                      {isPendingChange && (
                        <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                          <span>Change Request Pending ED Review</span>
                        </span>
                      )}

                      {isApprovedChange && (
                        <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          <Unlock className="w-3 h-3 text-emerald-700" />
                          <span>Unlocked by ED for Correction</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isLocked ? (
                    <button
                      type="button"
                      disabled={isPendingChange}
                      onClick={() => setChangeRequestModal({
                        isOpen: true,
                        pondIndex: pIdx,
                        reason: '',
                        isSubmitting: false
                      })}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95 ${
                        isPendingChange
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed'
                          : 'bg-purple-900 hover:bg-purple-950 text-white shadow-purple-200'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isPendingChange ? 'Request Pending...' : 'Request for Change'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerConfirmation(pIdx, pond.pondNo);
                      }}
                      disabled={isSavingThis || isSubmitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-200 active:scale-95 disabled:opacity-50"
                      title="Save and confirm permanent lock"
                    >
                      {isSavingThis ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save</span>
                    </button>
                  )}

                  {ponds.length > 1 && !isLocked && (
                    <button
                      type="button"
                      onClick={() => removePond(pIdx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      title="Delete Pond"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback Toast */}
              {isFeedbackForThis && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* Pond Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Number / Code</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={pond.pondNo}
                    onChange={(e) => handlePondChange(pIdx, 'pondNo', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                      isLocked ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-text' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Batch Code</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={pond.batch}
                    onChange={(e) => handlePondChange(pIdx, 'batch', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                      isLocked ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-text' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Size (SQM)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={pond.pondSizeSqm}
                    onChange={(e) => handlePondChange(pIdx, 'pondSizeSqm', e.target.value)}
                    placeholder="e.g. 50"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                      isLocked ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-text' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Quantity of Fish</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={pond.quantityOfFish}
                    onChange={(e) => handlePondChange(pIdx, 'quantityOfFish', e.target.value)}
                    placeholder="e.g. 1000"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                      isLocked ? 'bg-slate-100/90 text-emerald-900 font-black border-slate-200 cursor-not-allowed select-text' : 'bg-white border-slate-200 text-emerald-800'
                    }`}
                  />
                </div>
              </div>

              {/* Water Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Water Condition</label>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handlePondChange(pIdx, 'waterCondition', 'Clear')}
                      className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        pond.waterCondition === 'Clear'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handlePondChange(pIdx, 'waterCondition', 'Unclear')}
                      className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        pond.waterCondition === 'Unclear'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
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
                      disabled={isLocked}
                      onClick={() => handleWaterChangedToggle(pIdx, true)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        pond.waterChangedToday.hasChanged
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleWaterChangedToggle(pIdx, false)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        !pond.waterChangedToday.hasChanged
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                    >
                      No
                    </button>

                    {pond.waterChangedToday.hasChanged && (
                      <input
                        type="number"
                        disabled={isLocked}
                        value={pond.waterChangedToday.times}
                        onChange={(e) => handleWaterTimesChange(pIdx, e.target.value)}
                        placeholder="Times changed"
                        className={`w-32 border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                          isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Feeding Records */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-extrabold uppercase text-slate-700">Feeding Records</label>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => addFeedingItem(pIdx)}
                      className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      + Add Feed
                    </button>
                  )}
                </div>

                {pond.feedingRecords.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 items-end">
                    <div>
                      <select
                        disabled={isLocked}
                        value={item.type}
                        onChange={(e) => handleFeedingItemChange(pIdx, itemIdx, 'type', e.target.value)}
                        className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold ${
                          isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 cursor-pointer'
                        }`}
                      >
                        <option value="Branded">Branded</option>
                        <option value="Farm-produced">Farm-produced</option>
                      </select>
                    </div>
                    <div>
                      <select
                        disabled={isLocked}
                        value={item.size}
                        onChange={(e) => handleFeedingItemChange(pIdx, itemIdx, 'size', e.target.value)}
                        className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold ${
                          isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 cursor-pointer'
                        }`}
                      >
                        {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {item.type === 'Branded' && (
                      <div>
                        <select
                          disabled={isLocked}
                          value={item.brand || ''}
                          onChange={(e) => handleFeedingItemChange(pIdx, itemIdx, 'brand', e.target.value)}
                          className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold ${
                            isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 cursor-pointer'
                          }`}
                        >
                          {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        disabled={isLocked}
                        value={item.quantityKg}
                        onChange={(e) => handleFeedingItemChange(pIdx, itemIdx, 'quantityKg', e.target.value)}
                        placeholder="KG"
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold ${
                          isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200'
                        }`}
                      />
                      {pond.feedingRecords.items.length > 1 && !isLocked && (
                        <button
                          type="button"
                          onClick={() => removeFeedingItem(pIdx, itemIdx)}
                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer"
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
                    disabled={isLocked}
                    value={pond.feedingResponse}
                    onChange={(e) => handlePondChange(pIdx, 'feedingResponse', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                      isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 cursor-pointer'
                    }`}
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
                    disabled={isLocked}
                    value={pond.mortality}
                    onChange={(e) => handlePondChange(pIdx, 'mortality', e.target.value)}
                    placeholder="0"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                      isLocked ? 'bg-slate-100 text-rose-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-rose-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isLocked}
                    onChange={(e) => handlePhotoUpload(pIdx, e)}
                    className={`block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 ${
                      isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    }`}
                  />
                </div>
              </div>

              {pond.pondPhoto && (
                <div className="mt-2">
                  <img src={pond.pondPhoto} alt="Pond preview" className="w-32 h-24 object-cover rounded-2xl border border-slate-200" />
                </div>
              )}

            </div>
          );
        })}
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
                🔒 Once confirmed, this log entry for <strong>{ponds[confirmModal.pondIndex]?.pondNo}</strong> will become <strong>immutable and permanent</strong>. It cannot be edited directly. To make corrections later, use the <em>Request for Change</em> button.
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
