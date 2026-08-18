import React, { useState, useEffect } from 'react';
import { FisheryAssetFormData, MACHINE_LABELS } from '../types';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Factory, 
  Package, 
  Wrench, 
  Droplet, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  Lock, 
  Unlock, 
  Edit3, 
  Check, 
  Clock, 
  Send,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Archive,
  FileCheck,
  Building,
  Activity,
  Droplets
} from 'lucide-react';

interface FisheryAssetFormProps {
  initialData?: FisheryAssetFormData;
  reportId?: string;
  currentUser?: { fullName: string; email: string };
  onSubmit: (data: FisheryAssetFormData) => void;
  onSaveSingleRow?: (sectionName: string, data: any) => Promise<void>;
  onRequestChange?: (sectionName: string, reason: string) => Promise<void>;
  isSubmitting?: boolean;
  color?: string;
}

const BRANDS = ["Blue Crown", "Ecofloat", "Aqualis", "Alpha", "Coppen", "Skretting"];
const SIZES = ["0.2mm", "0.3mm", "0.5mm", "0.8mm", "1.2mm", "1.5mm", "2mm", "3mm", "4mm", "6mm", "9mm"];

export const FisheryAssetForm: React.FC<FisheryAssetFormProps> = ({ 
  initialData, 
  currentUser,
  onSubmit, 
  onSaveSingleRow, 
  onRequestChange, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<FisheryAssetFormData>(() => {
    if (initialData) return initialData;
    return {
      feedsInventory: {
        items: [
          { type: "Branded", size: "2mm", brand: "Blue Crown", quantityKg: "" },
        ],
        totalBags: "",
        totalFeedsInStore: "",
      },
      ingredientsUsed: {
        wheatOffal: "",
        fishMeal: "",
        meatMeal: "",
        bloodMeal: "",
        limestone: "",
        fishOil: "",
        soyaOil: "",
        gnc: "",
        maize: "",
        soyaBeans: "",
        cassava: "",
        klinoFeeds: "",
        lysine: "",
        probiotic: "",
        enzyme: "",
        fishPremix: "",
        methionine: "",
        dcp: "",
        salt: "",
        ascorbicAcid: "",
      },
      drugsUsed: {
        klinoFeed: "",
        lysine: "",
        probiotic: "",
        enzyme: "",
        fishPremix: "",
        toxin: "",
        methionine: "",
        dcp: "",
        salt: "",
      },
      machineCheck: {
        localWetMixer: 'Good',
        grinder: 'Good',
        dryerUnit: 'Good',
        extrudingPelletingMachine: 'Good',
        shapeQuality: 'Good',
        pumpingMachineA: 'Good',
        pumpingMachineB: 'Good',
        pumpingMachineC: 'Good',
        pumpingMachineD: 'Good',
        pumpingMachineE: 'Good',
        chineseMixer: 'Good',
        locallyFabricatedMixer: 'Good',
        chineseGrindingMachine: 'Good',
        locallyFabricatedGrindingMachine: 'Good',
        solarSystemA: 'Good',
        solarSystemB: 'Good',
        solarSystemC: 'Good',
        solarSystemD: 'Good',
        solarSystemE: 'Good',
      },
      feedStorage: {
        totalFeedInStoreKg: "",
        machineIssues: { hasIssue: false, comment: "" },
        wastageNoticed: { hasWastage: false, comment: "" },
      },
      technicalReport: {
        dieselGeneratorLitres: "",
        dieselKegsLitres: "",
        totalDieselAvailable: 0,
        generatorMeterPhoto: "",
      },
      lockedSections: {}
    };
  });

  const [isLocked, setIsLocked] = useState(false);
  const [lockedSections, setLockedSections] = useState<Record<string, boolean>>(formData.lockedSections || {});
  const [calculatedTotalFeed, setCalculatedTotalFeed] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Expand & Collapse State
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(true);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    sectionKey?: string;
    sectionName: string;
  } | null>(null);

  // Archive modal state
  const [archiveModal, setArchiveModal] = useState<boolean>(false);

  // Change Request modal state
  const [changeRequestModal, setChangeRequestModal] = useState<{
    isOpen: boolean;
    sectionKey: string;
    sectionName: string;
    reason: string;
    isSubmitting: boolean;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.lockedSections) {
        setLockedSections(initialData.lockedSections);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const total = formData.feedsInventory.items.reduce((acc, curr) => acc + (Number(curr.quantityKg) || 0), 0);
    setCalculatedTotalFeed(total);
  }, [formData.feedsInventory.items]);

  useEffect(() => {
    const total = (Number(formData.technicalReport.dieselGeneratorLitres) || 0) + (Number(formData.technicalReport.dieselKegsLitres) || 0);
    setFormData(prev => ({
      ...prev,
      technicalReport: { ...prev.technicalReport, totalDieselAvailable: total }
    }));
  }, [formData.technicalReport.dieselGeneratorLitres, formData.technicalReport.dieselKegsLitres]);

  const toggleSectionCollapse = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const toggleExpandAll = () => {
    if (allExpanded) {
      setCollapsedSections({
        feedsInventory: true,
        feedStorage: true,
        ingredientsUsed: true,
        drugsUsed: true,
        machineCheck: true,
        technicalReport: true
      });
      setAllExpanded(false);
    } else {
      setCollapsedSections({});
      setAllExpanded(true);
    }
  };

  const handleFeedItemChange = (index: number, field: string, value: string) => {
    if (isLocked || lockedSections.feedsInventory) return;
    const newItems = [...formData.feedsInventory.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ 
      ...formData, 
      feedsInventory: { ...formData.feedsInventory, items: newItems } 
    });
  };

  const handleFeedInventorySummaryChange = (field: 'totalBags' | 'totalFeedsInStore', value: string) => {
    if (isLocked || lockedSections.feedsInventory) return;
    setFormData({
      ...formData,
      feedsInventory: { ...formData.feedsInventory, [field]: value }
    });
  };

  const addFeedRow = () => {
    if (isLocked || lockedSections.feedsInventory) return;
    setFormData({
      ...formData,
      feedsInventory: {
        ...formData.feedsInventory,
        items: [...formData.feedsInventory.items, { type: "Branded", size: "2mm", brand: "Blue Crown", quantityKg: "" }]
      }
    });
  };

  const removeFeedRow = (index: number) => {
    if (isLocked || lockedSections.feedsInventory) return;
    const newItems = formData.feedsInventory.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      feedsInventory: { ...formData.feedsInventory, items: newItems }
    });
  };

  const handleIngredientChange = (field: keyof FisheryAssetFormData['ingredientsUsed'], value: string) => {
    if (isLocked || lockedSections.ingredientsUsed) return;
    setFormData({
      ...formData,
      ingredientsUsed: { ...formData.ingredientsUsed, [field]: value }
    });
  };

  const handleDrugChange = (field: keyof FisheryAssetFormData['drugsUsed'], value: string) => {
    if (isLocked || lockedSections.drugsUsed) return;
    setFormData({
      ...formData,
      drugsUsed: { ...formData.drugsUsed, [field]: value }
    });
  };

  const handleMachineChange = (field: keyof FisheryAssetFormData['machineCheck'], value: 'Good' | 'Faulty' | 'Needs Maintenance') => {
    if (isLocked || lockedSections.machineCheck) return;
    setFormData({
      ...formData,
      machineCheck: { ...formData.machineCheck, [field]: value }
    });
  };

  const handleStorageChange = (field: 'totalFeedInStoreKg', value: string) => {
    if (isLocked || lockedSections.feedStorage) return;
    setFormData({
      ...formData,
      feedStorage: { ...formData.feedStorage, [field]: value }
    });
  };

  const handleStorageWastageChange = (hasWastage: boolean, comment: string) => {
    if (isLocked || lockedSections.feedStorage) return;
    setFormData({
      ...formData,
      feedStorage: {
        ...formData.feedStorage,
        wastageNoticed: { hasWastage, comment }
      }
    });
  };

  const handleStorageIssueChange = (hasIssue: boolean, comment: string) => {
    if (isLocked || lockedSections.feedStorage) return;
    setFormData({
      ...formData,
      feedStorage: {
        ...formData.feedStorage,
        machineIssues: { hasIssue, comment }
      }
    });
  };

  const handleTechnicalChange = (field: 'dieselGeneratorLitres' | 'dieselKegsLitres' | 'generatorMeterPhoto', value: string) => {
    if (isLocked || lockedSections.technicalReport) return;
    setFormData({
      ...formData,
      technicalReport: { ...formData.technicalReport, [field]: value }
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked || lockedSections.technicalReport) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleTechnicalChange('generatorMeterPhoto', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open confirmation prompt
  const triggerConfirmation = (sectionName: string, sectionKey?: string) => {
    setConfirmModal({
      isOpen: true,
      sectionName,
      sectionKey
    });
  };

  // Confirm Save & Lock permanently (stays on same page)
  const handleConfirmLockAndSave = async () => {
    if (!confirmModal) return;
    const { sectionKey, sectionName } = confirmModal;
    setConfirmModal(null);

    try {
      let updatedLockedSections = { ...lockedSections };
      if (sectionKey) {
        updatedLockedSections[sectionKey] = true;
      } else {
        // Full lock
        updatedLockedSections = {
          feedsInventory: true,
          feedStorage: true,
          ingredientsUsed: true,
          drugsUsed: true,
          machineCheck: true,
          technicalReport: true
        };
        setIsLocked(true);
      }

      setLockedSections(updatedLockedSections);
      const updatedFormData = {
        ...formData,
        lockedSections: updatedLockedSections
      };
      setFormData(updatedFormData);

      if (onSaveSingleRow) {
        await onSaveSingleRow(sectionName, updatedFormData);
      } else {
        onSubmit(updatedFormData);
      }

      setFeedbackMsg(`✅ ${sectionName} successfully saved & locked! Other sections remain active and editable.`);
      setTimeout(() => setFeedbackMsg(null), 4500);
    } catch (e: any) {
      alert('Error saving asset log: ' + e.message);
    }
  };

  // Archive and Submit Completed Form
  const handleArchiveAndSubmit = async () => {
    setArchiveModal(false);
    try {
      const allLockedSections = {
        feedsInventory: true,
        feedStorage: true,
        ingredientsUsed: true,
        drugsUsed: true,
        machineCheck: true,
        technicalReport: true
      };
      setIsLocked(true);
      setLockedSections(allLockedSections);

      const finalData = {
        ...formData,
        lockedSections: allLockedSections
      };

      onSubmit(finalData);
      setFeedbackMsg('🎉 Complete Fishery Asset Inventory successfully submitted to permanent records archive!');
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

    const { sectionName, reason } = changeRequestModal;
    setChangeRequestModal({ ...changeRequestModal, isSubmitting: true });

    try {
      if (onRequestChange) {
        await onRequestChange(sectionName, reason.trim());
      }

      setChangeRequestModal(null);
      setFeedbackMsg(`Change request for ${sectionName} submitted to Executive Director for review.`);
      setTimeout(() => setFeedbackMsg(null), 4500);
    } catch (e: any) {
      alert('Error submitting change request: ' + e.message);
    }
  };

  // Render Action Button per section
  const renderSectionHeaderActions = (sectionKey: string, sectionTitle: string) => {
    const isSectionLocked = isLocked || Boolean(lockedSections[sectionKey]);
    const isCollapsed = Boolean(collapsedSections[sectionKey]);

    return (
      <div className="flex items-center space-x-2">
        {isSectionLocked ? (
          <div className="flex items-center space-x-1.5">
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
                  sectionKey,
                  sectionName: sectionTitle,
                  reason: '',
                  isSubmitting: false
                });
              }}
              className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md flex items-center space-x-1 transition-all cursor-pointer"
            >
              <Edit3 className="w-2.5 h-2.5 text-purple-600" />
              <span>Request Change</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerConfirmation(sectionTitle, sectionKey);
            }}
            disabled={isSubmitting}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer shadow-xs shadow-emerald-200 active:scale-95 disabled:opacity-50"
            title={`Save ${sectionTitle}`}
          >
            <Save className="w-3 h-3" />
            <span>Save Section</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => toggleSectionCollapse(sectionKey)}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Section' : 'Collapse Section'}
        >
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8 bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              <span>Asset & Feed Inventory</span>
            </span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <Lock className="w-3 h-3 text-purple-600" />
              <span>Per-Section Immutable Locking</span>
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1.5">Asset Inventory & Audit</h3>
          <p className="text-xs text-slate-500 font-medium">Save individual sections independently (other sections stay active & editable). Expand and collapse sections as needed.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl flex items-center space-x-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-emerald-800">{calculatedTotalFeed} KG Feeds</span>
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

      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* ===== 1. FEEDS INVENTORY ===== */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        lockedSections.feedsInventory ? 'bg-slate-50/90 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div 
            onClick={() => toggleSectionCollapse('feedsInventory')}
            className="flex items-center space-x-2 cursor-pointer group select-none flex-1"
          >
            <Package className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">
              1. Feeds Inventory Breakdown
            </h4>
          </div>
          {renderSectionHeaderActions('feedsInventory', 'Feeds Inventory')}
        </div>

        {!collapsedSections.feedsInventory && (
          <div className="space-y-4 pt-4 animate-fadeIn">
            {formData.feedsInventory.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 items-end">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Feed Type</label>
                  <select
                    disabled={isLocked || lockedSections.feedsInventory}
                    value={item.type}
                    onChange={(e) => handleFeedItemChange(index, 'type', e.target.value)}
                    className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold ${
                      isLocked || lockedSections.feedsInventory ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="Branded">Branded</option>
                    <option value="Farm-produced">Farm-produced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Size</label>
                  <select
                    disabled={isLocked || lockedSections.feedsInventory}
                    value={item.size}
                    onChange={(e) => handleFeedItemChange(index, 'size', e.target.value)}
                    className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold ${
                      isLocked || lockedSections.feedsInventory ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200'
                    }`}
                  >
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {item.type === 'Branded' && (
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Brand</label>
                    <select
                      disabled={isLocked || lockedSections.feedsInventory}
                      value={item.brand || ''}
                      onChange={(e) => handleFeedItemChange(index, 'brand', e.target.value)}
                      className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold ${
                        isLocked || lockedSections.feedsInventory ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200'
                      }`}
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
                      disabled={isLocked || lockedSections.feedsInventory}
                      value={item.quantityKg}
                      onChange={(e) => handleFeedItemChange(index, 'quantityKg', e.target.value)}
                      placeholder="KG"
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold ${
                        isLocked || lockedSections.feedsInventory ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  {formData.feedsInventory.items.length > 1 && !(isLocked || lockedSections.feedsInventory) && (
                    <button
                      type="button"
                      onClick={() => removeFeedRow(index)}
                      className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl cursor-pointer mt-3.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!(isLocked || lockedSections.feedsInventory) && (
              <button
                type="button"
                onClick={addFeedRow}
                className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer inline-flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Feed Row</span>
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Total Bags in Store</label>
                <input
                  type="number"
                  disabled={isLocked || lockedSections.feedsInventory}
                  value={formData.feedsInventory.totalBags}
                  onChange={(e) => handleFeedInventorySummaryChange('totalBags', e.target.value)}
                  placeholder="e.g. 50"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                    isLocked || lockedSections.feedsInventory ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Total Feeds in Store (Calculated KG)</label>
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-800 flex items-center justify-between">
                  <span>{calculatedTotalFeed} KG</span>
                  <span className="text-[10px] font-bold text-emerald-600">Auto-calculated</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== 2. FEED STORAGE & OBSERVATIONS ===== */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        lockedSections.feedStorage ? 'bg-slate-50/90 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div 
            onClick={() => toggleSectionCollapse('feedStorage')}
            className="flex items-center space-x-2 cursor-pointer group select-none flex-1"
          >
            <Building className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">
              2. Feed Storage & Wastage Observations
            </h4>
          </div>
          {renderSectionHeaderActions('feedStorage', 'Feed Storage Notes')}
        </div>

        {!collapsedSections.feedStorage && (
          <div className="space-y-4 pt-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Feed Wastage Noticed?</label>
                <div className="flex space-x-3 mb-2">
                  <button
                    type="button"
                    disabled={isLocked || lockedSections.feedStorage}
                    onClick={() => handleStorageWastageChange(true, formData.feedStorage.wastageNoticed.comment)}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold border ${
                      formData.feedStorage.wastageNoticed.hasWastage ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={isLocked || lockedSections.feedStorage}
                    onClick={() => handleStorageWastageChange(false, '')}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold border ${
                      !formData.feedStorage.wastageNoticed.hasWastage ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    No
                  </button>
                </div>
                {formData.feedStorage.wastageNoticed.hasWastage && (
                  <input
                    type="text"
                    disabled={isLocked || lockedSections.feedStorage}
                    value={formData.feedStorage.wastageNoticed.comment}
                    onChange={(e) => handleStorageWastageChange(true, e.target.value)}
                    placeholder="Describe feed wastage details..."
                    className="w-full border rounded-xl px-3 py-2 text-xs font-bold bg-white border-slate-200"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Machinery Issues Noticed?</label>
                <div className="flex space-x-3 mb-2">
                  <button
                    type="button"
                    disabled={isLocked || lockedSections.feedStorage}
                    onClick={() => handleStorageIssueChange(true, formData.feedStorage.machineIssues.comment)}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold border ${
                      formData.feedStorage.machineIssues.hasIssue ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={isLocked || lockedSections.feedStorage}
                    onClick={() => handleStorageIssueChange(false, '')}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold border ${
                      !formData.feedStorage.machineIssues.hasIssue ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    No
                  </button>
                </div>
                {formData.feedStorage.machineIssues.hasIssue && (
                  <input
                    type="text"
                    disabled={isLocked || lockedSections.feedStorage}
                    value={formData.feedStorage.machineIssues.comment}
                    onChange={(e) => handleStorageIssueChange(true, e.target.value)}
                    placeholder="Describe machine issue details..."
                    className="w-full border rounded-xl px-3 py-2 text-xs font-bold bg-white border-slate-200"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== 3. RAW INGREDIENTS USAGE ===== */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        lockedSections.ingredientsUsed ? 'bg-slate-50/90 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div 
            onClick={() => toggleSectionCollapse('ingredientsUsed')}
            className="flex items-center space-x-2 cursor-pointer group select-none flex-1"
          >
            <Factory className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">
              3. Raw Ingredients Usage Audit (KG)
            </h4>
          </div>
          {renderSectionHeaderActions('ingredientsUsed', 'Raw Ingredients Audit')}
        </div>

        {!collapsedSections.ingredientsUsed && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-4 animate-fadeIn">
            {Object.keys(formData.ingredientsUsed).map((key) => {
              const label = key === 'gnc' ? 'GNC' :
                key === 'dcp' ? 'DCP' :
                key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

              return (
                <div key={key}>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5 truncate" title={label}>{label}</label>
                  <input
                    type="number"
                    disabled={isLocked || lockedSections.ingredientsUsed}
                    value={formData.ingredientsUsed[key] || ''}
                    onChange={(e) => handleIngredientChange(key as any, e.target.value)}
                    placeholder="0"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                      isLocked || lockedSections.ingredientsUsed ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== 4. DRUGS & ADDITIVES ===== */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        lockedSections.drugsUsed ? 'bg-slate-50/90 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div 
            onClick={() => toggleSectionCollapse('drugsUsed')}
            className="flex items-center space-x-2 cursor-pointer group select-none flex-1"
          >
            <Droplet className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">
              4. Drugs & Additives Audit
            </h4>
          </div>
          {renderSectionHeaderActions('drugsUsed', 'Drugs & Additives')}
        </div>

        {!collapsedSections.drugsUsed && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-4 animate-fadeIn">
            {Object.keys(formData.drugsUsed).map((key) => {
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              return (
                <div key={key}>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5 truncate" title={label}>{label}</label>
                  <input
                    type="number"
                    disabled={isLocked || lockedSections.drugsUsed}
                    value={formData.drugsUsed[key as keyof FisheryAssetFormData['drugsUsed']] || ''}
                    onChange={(e) => handleDrugChange(key as any, e.target.value)}
                    placeholder="0"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                      isLocked || lockedSections.drugsUsed ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== 5. MACHINERY HEALTH CHECK ===== */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        lockedSections.machineCheck ? 'bg-slate-50/90 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div 
            onClick={() => toggleSectionCollapse('machineCheck')}
            className="flex items-center space-x-2 cursor-pointer group select-none flex-1"
          >
            <Wrench className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">
              5. Machinery Health & Maintenance Status
            </h4>
          </div>
          {renderSectionHeaderActions('machineCheck', 'Machinery Status')}
        </div>

        {!collapsedSections.machineCheck && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 animate-fadeIn">
            {Object.keys(formData.machineCheck).map((key) => {
              const label = MACHINE_LABELS[key] || key.replace(/([A-Z])/g, ' $1');
              return (
                <div key={key} className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">{label}</label>
                  <select
                    disabled={isLocked || lockedSections.machineCheck}
                    value={formData.machineCheck[key] || 'Good'}
                    onChange={(e) => handleMachineChange(key as any, e.target.value as any)}
                    className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold ${
                      formData.machineCheck[key] === 'Faulty' ? 'text-rose-700 border-rose-300 bg-rose-50' :
                      formData.machineCheck[key] === 'Needs Maintenance' ? 'text-amber-700 border-amber-300 bg-amber-50' :
                      'text-emerald-800 border-emerald-300 bg-emerald-50'
                    }`}
                  >
                    <option value="Good">Good</option>
                    <option value="Faulty">Faulty</option>
                    <option value="Needs Maintenance">Needs Maintenance</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== 6. TECHNICAL REPORT (FUEL & METER) ===== */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        lockedSections.technicalReport ? 'bg-slate-50/90 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div 
            onClick={() => toggleSectionCollapse('technicalReport')}
            className="flex items-center space-x-2 cursor-pointer group select-none flex-1"
          >
            <Droplets className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">
              6. Technical Fuel & Meter Audit
            </h4>
          </div>
          {renderSectionHeaderActions('technicalReport', 'Technical Fuel Audit')}
        </div>

        {!collapsedSections.technicalReport && (
          <div className="space-y-4 pt-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Diesel Generator (Litres)</label>
                <input
                  type="number"
                  disabled={isLocked || lockedSections.technicalReport}
                  value={formData.technicalReport.dieselGeneratorLitres}
                  onChange={(e) => handleTechnicalChange('dieselGeneratorLitres', e.target.value)}
                  placeholder="0"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                    isLocked || lockedSections.technicalReport ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Diesel Kegs (Litres)</label>
                <input
                  type="number"
                  disabled={isLocked || lockedSections.technicalReport}
                  value={formData.technicalReport.dieselKegsLitres}
                  onChange={(e) => handleTechnicalChange('dieselKegsLitres', e.target.value)}
                  placeholder="0"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                    isLocked || lockedSections.technicalReport ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Total Diesel Available</label>
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-800">
                  {formData.technicalReport.totalDieselAvailable} Litres
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Generator Meter Attachment Photo</label>
              <input
                type="file"
                accept="image/*"
                disabled={isLocked || lockedSections.technicalReport}
                onChange={handlePhotoUpload}
                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700"
              />
              {formData.technicalReport.generatorMeterPhoto && (
                <div className="mt-2">
                  <img src={formData.technicalReport.generatorMeterPhoto} alt="Meter preview" className="w-36 h-28 object-cover rounded-2xl border border-slate-200" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Final Form Action: Archive & Submit Completed Form */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-3xl">
        <div className="text-xs text-slate-600 font-medium space-y-1">
          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
            <Archive className="w-4 h-4 text-emerald-600" />
            <span>Farm Records Archiving Workflow</span>
          </div>
          <p>
            When all asset inventory sections for this period are completed, submit the entire form to the permanent archive.
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
                🔒 Once confirmed, this log entry for <strong>{confirmModal.sectionName}</strong> will become <strong>immutable and permanent</strong>. Other sections remain active and editable. To make corrections later, use the <em>Request for Change</em> button.
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
                Are you ready to submit this complete asset inventory to the farm archive?
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 text-left leading-relaxed">
                📦 This will permanently archive all feeds, ingredients, machinery health, and fuel records into the central farm registry for record-keeping and forward the complete record for management review.
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
                  Request for Change: {changeRequestModal.sectionName}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Submit a request to the Executive Director to unlock this section for correction
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
                placeholder="e.g. Need to adjust feed inventory quantity or report a faulty machine..."
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
