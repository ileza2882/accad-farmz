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
  Send 
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
    };
  });

  const [isLocked, setIsLocked] = useState(false);
  const [changeRequestStatus, setChangeRequestStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NONE');
  const [calculatedTotalFeed, setCalculatedTotalFeed] = useState(0);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    sectionName: string;
  } | null>(null);

  // Change Request modal state
  const [changeRequestModal, setChangeRequestModal] = useState<{
    isOpen: boolean;
    reason: string;
    isSubmitting: boolean;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
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

  const handleFeedItemChange = (index: number, field: string, value: string) => {
    if (isLocked) return;
    const newItems = [...formData.feedsInventory.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ 
      ...formData, 
      feedsInventory: { ...formData.feedsInventory, items: newItems } 
    });
  };

  const handleFeedInventorySummaryChange = (field: 'totalBags' | 'totalFeedsInStore', value: string) => {
    if (isLocked) return;
    setFormData({
      ...formData,
      feedsInventory: { ...formData.feedsInventory, [field]: value }
    });
  };

  const addFeedRow = () => {
    if (isLocked) return;
    setFormData({
      ...formData,
      feedsInventory: {
        ...formData.feedsInventory,
        items: [...formData.feedsInventory.items, { type: "Branded", size: "2mm", brand: "Blue Crown", quantityKg: "" }]
      }
    });
  };

  const removeFeedRow = (index: number) => {
    if (isLocked) return;
    const newItems = formData.feedsInventory.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      feedsInventory: { ...formData.feedsInventory, items: newItems }
    });
  };

  const handleIngredientChange = (field: keyof FisheryAssetFormData['ingredientsUsed'], value: string) => {
    if (isLocked) return;
    setFormData({
      ...formData,
      ingredientsUsed: { ...formData.ingredientsUsed, [field]: value }
    });
  };

  const handleDrugChange = (field: keyof FisheryAssetFormData['drugsUsed'], value: string) => {
    if (isLocked) return;
    setFormData({
      ...formData,
      drugsUsed: { ...formData.drugsUsed, [field]: value }
    });
  };

  const handleMachineChange = (field: keyof FisheryAssetFormData['machineCheck'], value: 'Good' | 'Faulty' | 'Needs Maintenance') => {
    if (isLocked) return;
    setFormData({
      ...formData,
      machineCheck: { ...formData.machineCheck, [field]: value }
    });
  };

  const handleTechnicalChange = (field: 'dieselGeneratorLitres' | 'dieselKegsLitres' | 'generatorMeterPhoto', value: string) => {
    if (isLocked) return;
    setFormData({
      ...formData,
      technicalReport: { ...formData.technicalReport, [field]: value }
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
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
  const triggerConfirmation = (sectionName: string) => {
    setConfirmModal({
      isOpen: true,
      sectionName
    });
  };

  // Confirm Save & Lock permanently (stays on same page)
  const handleConfirmLockAndSave = async () => {
    if (!confirmModal) return;
    setConfirmModal(null);

    try {
      setIsLocked(true);
      setChangeRequestStatus('NONE');

      if (onSaveSingleRow) {
        await onSaveSingleRow(confirmModal.sectionName, formData);
      } else {
        onSubmit(formData);
      }
    } catch (e: any) {
      alert('Error saving asset log: ' + e.message);
    }
  };

  // Submit Change Request to Executive Director
  const handleSubmitChangeRequest = async () => {
    if (!changeRequestModal || !changeRequestModal.reason.trim()) {
      alert('Please state a reason for requesting this correction.');
      return;
    }

    const { reason } = changeRequestModal;
    setChangeRequestModal({ ...changeRequestModal, isSubmitting: true });

    try {
      setChangeRequestStatus('PENDING');

      if (onRequestChange) {
        await onRequestChange('Asset Inventory', reason.trim());
      }

      setChangeRequestModal(null);
    } catch (e: any) {
      alert('Error submitting change request: ' + e.message);
    }
  };

  return (
    <div className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900 font-sans">
      
      {/* Header with status pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              <span>Asset & Feed Inventory</span>
            </span>
            {isLocked && (
              <span className="bg-slate-800 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <Lock className="w-3 h-3 text-amber-300" />
                <span>Locked & Permanent</span>
              </span>
            )}
            {changeRequestStatus === 'PENDING' && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                <span>Change Request Pending ED Review</span>
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1.5">Asset & Machinery Inventory</h3>
          <p className="text-xs text-slate-500 font-medium">Record feeds in stock, ingredients, machinery health, and fuel levels</p>
        </div>

        {isLocked ? (
          <button
            type="button"
            disabled={changeRequestStatus === 'PENDING'}
            onClick={() => setChangeRequestModal({
              isOpen: true,
              reason: '',
              isSubmitting: false
            })}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95 ${
              changeRequestStatus === 'PENDING'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed'
                : 'bg-purple-900 hover:bg-purple-950 text-white shadow-purple-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{changeRequestStatus === 'PENDING' ? 'Request Pending...' : 'Request for Change'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => triggerConfirmation('Asset Log')}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all flex items-center space-x-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Log</span>
          </button>
        )}
      </div>

      {/* A. Feeds Inventory */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold text-sm">A</div>
          <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Feeds Inventory Log</h3>
        </div>

        <div className="space-y-3">
          {formData.feedsInventory.items.map((item, index) => (
            <div key={index} className={`grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl border items-end ${
              isLocked ? 'bg-slate-100/90 border-slate-300' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Feed Type</label>
                <select
                  disabled={isLocked}
                  value={item.type}
                  onChange={(e) => handleFeedItemChange(index, 'type', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                    isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Branded">Branded</option>
                  <option value="Farm-produced">Farm-produced</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pellet Size</label>
                <select
                  disabled={isLocked}
                  value={item.size}
                  onChange={(e) => handleFeedItemChange(index, 'size', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                    isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {item.type === 'Branded' && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Brand Name</label>
                  <select
                    disabled={isLocked}
                    value={item.brand || ''}
                    onChange={(e) => handleFeedItemChange(index, 'brand', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                      isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Quantity (KG)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={item.quantityKg}
                    onChange={(e) => handleFeedItemChange(index, 'quantityKg', e.target.value)}
                    placeholder="e.g. 50"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                      isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                {formData.feedsInventory.items.length > 1 && !isLocked && (
                  <button
                    type="button"
                    onClick={() => removeFeedRow(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 mb-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          {!isLocked && (
            <button
              type="button"
              onClick={addFeedRow}
              className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-200 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Feed Entry</span>
            </button>
          )}
          <div className="text-xs font-extrabold text-slate-600 ml-auto">
            Calculated Total: <span className="text-emerald-600 font-black">{calculatedTotalFeed} KG</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Total Bags in Store</label>
            <input
              type="number"
              disabled={isLocked}
              value={formData.feedsInventory.totalBags}
              onChange={(e) => handleFeedInventorySummaryChange('totalBags', e.target.value)}
              placeholder="Total bags"
              className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none ${
                isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Total Feeds in Store (KG)</label>
            <input
              type="number"
              disabled={isLocked}
              value={formData.feedsInventory.totalFeedsInStore}
              onChange={(e) => handleFeedInventorySummaryChange('totalFeedsInStore', e.target.value)}
              placeholder="Total KG in store"
              className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none ${
                isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>
        </div>
      </div>

      {/* B. Ingredients Used */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold text-sm">B</div>
          <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Ingredients Used</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Object.entries(formData.ingredientsUsed).map(([key, value]) => {
            const formattedLabel = key === 'gnc' ? 'GNC' :
              key === 'dcp' ? 'DCP' :
              key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

            return (
              <div key={key} className={`p-3 rounded-2xl border ${
                isLocked ? 'bg-slate-100/90 border-slate-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1 truncate" title={formattedLabel}>
                  {formattedLabel}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="any"
                    disabled={isLocked}
                    value={value}
                    onChange={(e) => handleIngredientChange(key as any, e.target.value)}
                    placeholder="0"
                    className={`w-full border rounded-xl pl-3 pr-9 py-1.5 text-xs font-bold ${
                      isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                  <span className="absolute right-2.5 text-[11px] font-black text-slate-400 pointer-events-none">
                    Kg
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* C. Machine Check */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold text-sm">C</div>
          <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Machine Health Checks</h3>
        </div>

        {(() => {
          const machineCategories: { title: string; keys: string[] }[] = [
            { title: 'General Machines', keys: ['localWetMixer', 'grinder', 'dryerUnit', 'extrudingPelletingMachine', 'shapeQuality'] },
            { title: 'Pumping Machines', keys: ['pumpingMachineA', 'pumpingMachineB', 'pumpingMachineC', 'pumpingMachineD', 'pumpingMachineE'] },
            { title: 'Mixer', keys: ['chineseMixer', 'locallyFabricatedMixer'] },
            { title: 'Grinding Machine', keys: ['chineseGrindingMachine', 'locallyFabricatedGrindingMachine'] },
            { title: 'Solar System', keys: ['solarSystemA', 'solarSystemB', 'solarSystemC', 'solarSystemD', 'solarSystemE'] },
          ];
          return machineCategories.map((cat) => {
            const entries = cat.keys.filter(k => k in formData.machineCheck);
            if (entries.length === 0) return null;
            return (
              <div key={cat.title} className="space-y-2 mt-3">
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider pl-1">{cat.title}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {entries.map((key) => {
                    const status = formData.machineCheck[key];
                    const label = MACHINE_LABELS[key] || key.replace(/([A-Z])/g, ' $1');
                    return (
                      <div key={key} className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                        isLocked ? 'bg-slate-100/90 border-slate-300' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-xs font-bold text-slate-700">{label}</span>
                        <select
                          disabled={isLocked}
                          value={status}
                          onChange={(e) => handleMachineChange(key as any, e.target.value as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black outline-none shrink-0 ${
                            isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                          } ${
                            status === 'Good' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                            status === 'Faulty' ? 'bg-rose-100 text-rose-700 border border-rose-300' :
                            'bg-amber-100 text-amber-700 border border-amber-300'
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
              </div>
            );
          });
        })()}
      </div>

      {/* D. Technical & Fuel */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold text-sm">D</div>
          <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Technical & Fuel Log</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Diesel Generator (Litres)</label>
            <input
              type="number"
              disabled={isLocked}
              value={formData.technicalReport.dieselGeneratorLitres}
              onChange={(e) => handleTechnicalChange('dieselGeneratorLitres', e.target.value)}
              placeholder="Gen litres"
              className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none ${
                isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Diesel Kegs (Litres)</label>
            <input
              type="number"
              disabled={isLocked}
              value={formData.technicalReport.dieselKegsLitres}
              onChange={(e) => handleTechnicalChange('dieselKegsLitres', e.target.value)}
              placeholder="Keg litres"
              className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none ${
                isLocked ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Total Available Fuel</label>
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs font-black text-emerald-700">
              {formData.technicalReport.totalDieselAvailable} Litres
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Generator Meter Photo (Optional)</label>
          <input
            type="file"
            accept="image/*"
            disabled={isLocked}
            onChange={handlePhotoUpload}
            className={`block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 ${
              isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
          />
          {formData.technicalReport.generatorMeterPhoto && (
            <img src={formData.technicalReport.generatorMeterPhoto} alt="Meter Photo" className="mt-2 w-32 h-24 object-cover rounded-xl border border-slate-200" />
          )}
        </div>
      </div>

      {!isLocked && (
        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerConfirmation('Fishery Asset Log');
            }}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Fishery Asset Log</span>
              </>
            )}
          </button>
        </div>
      )}

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
                🔒 Once confirmed, this log entry for <strong>{confirmModal.sectionName}</strong> will become <strong>immutable and permanent</strong>. It cannot be edited directly. To make corrections later, use the <em>Request for Change</em> button.
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
                  Request for Change: Asset Inventory
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Submit a request to the Executive Director to unlock this asset record for correction
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
