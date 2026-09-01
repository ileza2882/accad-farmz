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
  Send,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Building,
  Activity,
  Droplets,
  Sun,
  Cog,
  Waves,
  Sparkles,
  FileCheck
} from 'lucide-react';

interface FisheryAssetFormProps {
  initialData?: FisheryAssetFormData;
  reportId?: string;
  currentUser?: { fullName: string; email: string };
  onSubmit: (data: FisheryAssetFormData) => void;
  isSubmitting?: boolean;
  color?: string;
}

const BRANDS = ["Blue Crown", "Ecofloat", "Aqualis", "Alpha", "Coppen", "Skretting"];
const SIZES = ["0.2mm", "0.3mm", "0.5mm", "0.8mm", "1.2mm", "1.5mm", "2mm", "3mm", "4mm", "6mm", "9mm"];

export const FisheryAssetForm: React.FC<FisheryAssetFormProps> = ({ 
  initialData, 
  currentUser,
  onSubmit, 
  isSubmitting 
}) => {
  const [formData, setFormData] = useState<FisheryAssetFormData>(() => {
    if (initialData) return initialData;
    return {
      feedsInventory: {
        items: [
          { type: "Branded", size: "2mm", brand: "Blue Crown", quantityKg: "" },
        ],
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
        // Solar systems
        solarSystemA: 'Good',
        solarSystemB: 'Good',
        solarSystemC: 'Good',
        solarSystemD: 'Good',
        solarSystemE: 'Good',
        // Grinding machines
        chineseGrindingMachine: 'Good',
        locallyFabricatedGrindingMachine: 'Good',
        grinder: 'Good',
        // Mixers
        chineseMixer: 'Good',
        locallyFabricatedMixer: 'Good',
        localWetMixer: 'Good',
        // Pumping machines
        pumpingMachineA: 'Good',
        pumpingMachineB: 'Good',
        pumpingMachineC: 'Good',
        pumpingMachineD: 'Good',
        pumpingMachineE: 'Good',
        // Extrusion & Pelleting
        extrudingPelletingMachine: 'Good',
        dryerUnit: 'Good',
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
      }
    };
  });

  const [calculatedTotalFeed, setCalculatedTotalFeed] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Calculate Feed inventory sum
  useEffect(() => {
    let sum = 0;
    if (formData.feedsInventory?.items) {
      formData.feedsInventory.items.forEach(item => {
        sum += Number(item.quantityKg) || 0;
      });
    }
    setCalculatedTotalFeed(sum);
  }, [formData.feedsInventory]);

  // Calculate Diesel Available sum
  useEffect(() => {
    const gen = Number(formData.technicalReport.dieselGeneratorLitres) || 0;
    const kegs = Number(formData.technicalReport.dieselKegsLitres) || 0;
    setFormData(prev => ({
      ...prev,
      technicalReport: {
        ...prev.technicalReport,
        totalDieselAvailable: gen + kegs
      }
    }));
  }, [formData.technicalReport.dieselGeneratorLitres, formData.technicalReport.dieselKegsLitres]);

  // Field updates
  const handleFeedItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const items = [...prev.feedsInventory.items];
      items[index] = { ...items[index], [field]: value };
      return {
        ...prev,
        feedsInventory: { ...prev.feedsInventory, items }
      };
    });
  };

  const addFeedRow = () => {
    setFormData(prev => ({
      ...prev,
      feedsInventory: {
        ...prev.feedsInventory,
        items: [
          ...prev.feedsInventory.items,
          { type: 'Branded', size: '2mm', brand: 'Blue Crown', quantityKg: '' }
        ]
      }
    }));
  };

  const removeFeedRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      feedsInventory: {
        ...prev.feedsInventory,
        items: prev.feedsInventory.items.filter((_, idx) => idx !== index)
      }
    }));
  };

  const handleFeedInventorySummaryChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      feedsInventory: {
        ...prev.feedsInventory,
        [field]: value
      }
    }));
  };

  const handleIngredientChange = (ingredient: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      ingredientsUsed: {
        ...prev.ingredientsUsed,
        [ingredient]: value
      }
    }));
  };

  const handleDrugChange = (drug: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      drugsUsed: {
        ...prev.drugsUsed,
        [drug]: value
      }
    }));
  };

  const handleMachineChange = (key: string, value: 'Good' | 'Faulty' | 'Needs Maintenance') => {
    setFormData(prev => ({
      ...prev,
      machineCheck: {
        ...prev.machineCheck,
        [key]: value
      }
    }));
  };

  const handleStorageWastageChange = (hasWastage: boolean, comment: string = '') => {
    setFormData(prev => ({
      ...prev,
      feedStorage: {
        ...prev.feedStorage,
        wastageNoticed: { hasWastage, comment }
      }
    }));
  };

  const handleStorageIssueChange = (hasIssue: boolean, comment: string = '') => {
    setFormData(prev => ({
      ...prev,
      feedStorage: {
        ...prev.feedStorage,
        machineIssues: { hasIssue, comment }
      }
    }));
  };

  const handleTechnicalChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      technicalReport: {
        ...prev.technicalReport,
        [field]: value
      }
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          technicalReport: {
            ...prev.technicalReport,
            generatorMeterPhoto: reader.result as string
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setCollapsedSections({
      feedsInventory: true,
      feedStorage: true,
      ingredientsUsed: true,
      drugsUsed: true,
      machineCheck: true,
      technicalReport: true
    });
    setAllExpanded(false);
  };

  // Helper machine status selector pill
  const renderMachineStatusPicker = (key: string, label: string) => {
    const val = formData.machineCheck[key] || 'Good';
    return (
      <div key={key} className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-800 tracking-tight">{label}</label>
          <span className={`w-2.5 h-2.5 rounded-full ${
            val === 'Good' ? 'bg-emerald-500' : val === 'Needs Maintenance' ? 'bg-amber-500' : 'bg-rose-500'
          }`}></span>
        </div>
        <select
          value={val}
          onChange={(e) => handleMachineChange(key, e.target.value as any)}
          className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer outline-none ${
            val === 'Faulty' ? 'text-rose-800 border-rose-300 bg-rose-50/80 font-black' :
            val === 'Needs Maintenance' ? 'text-amber-800 border-amber-300 bg-amber-50/80 font-black' :
            'text-emerald-800 border-emerald-300 bg-emerald-50/80'
          }`}
        >
          <option value="Good">Good Condition</option>
          <option value="Needs Maintenance">Needs Maintenance</option>
          <option value="Faulty">Faulty / Out of Service</option>
        </select>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmitAll} className="space-y-6">
      
      {/* Grow-Out Asset Preset Header Banner */}
      <div className="bg-slate-900 text-white p-5 sm:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
            <Factory className="w-3.5 h-3.5 text-emerald-400" />
            <span>Grow-Out Asset Inventory & Machine Checks</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            Asset Inventory, Feed Stocks & Machine Health
          </h3>
          <p className="text-xs text-slate-300 font-medium max-w-2xl">
            Complete Grow-Out asset overview. Solar Systems, Grinding Machines, and Mixers are categorized into separate subsections for clarity.
          </p>
        </div>
      </div>

      {/* ===== SECTION 1: FEEDS INVENTORY ===== */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <Package className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase">
              1. Feeds Inventory in Store
            </h4>
          </div>
        </div>

        <div className="space-y-4 pt-1">
            {formData.feedsInventory.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Feed Type</label>
                  <select
                    value={item.type}
                    onChange={(e) => handleFeedItemChange(index, 'type', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                  >
                    <option value="Branded">Branded</option>
                    <option value="Farm-produced">Farm-produced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Size</label>
                  <select
                    value={item.size}
                    onChange={(e) => handleFeedItemChange(index, 'size', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                  >
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {item.type === 'Branded' && (
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Brand</label>
                    <select
                      value={item.brand || 'Blue Crown'}
                      onChange={(e) => handleFeedItemChange(index, 'brand', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
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
                      onChange={(e) => handleFeedItemChange(index, 'quantityKg', e.target.value)}
                      placeholder="KG"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                    />
                  </div>
                  {formData.feedsInventory.items.length > 1 && (
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

            <button
              type="button"
              onClick={addFeedRow}
              className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Feed Row</span>
            </button>

            <div className="pt-2">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Total Feeds in Store (Calculated KG)</label>
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-black text-emerald-800 flex items-center justify-between shadow-xs">
                  <span>{calculatedTotalFeed.toLocaleString()} KG</span>
                  <span className="text-xs font-bold text-emerald-600">Auto-calculated from inventory rows</span>
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* ===== SECTION 2: FEED STORAGE & WASTAGE ===== */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <Building className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase">
              2. Feed Storage & Wastage Observations
            </h4>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Feed Wastage Noticed?</label>
              <div className="flex space-x-3 mb-2">
                <button
                  type="button"
                  onClick={() => handleStorageWastageChange(true, formData.feedStorage.wastageNoticed.comment)}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold border ${
                    formData.feedStorage.wastageNoticed.hasWastage ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
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
                  onClick={() => handleStorageIssueChange(true, formData.feedStorage.machineIssues.comment)}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold border ${
                    formData.feedStorage.machineIssues.hasIssue ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
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
                  value={formData.feedStorage.machineIssues.comment}
                  onChange={(e) => handleStorageIssueChange(true, e.target.value)}
                  placeholder="Describe machine issue details..."
                  className="w-full border rounded-xl px-3 py-2 text-xs font-bold bg-white border-slate-200"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: RAW INGREDIENTS USAGE ===== */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <Droplet className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase">
              3. Raw Ingredients Usage (KG)
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
          {Object.keys(formData.ingredientsUsed).map((key) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return (
              <div key={key} className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 truncate">{label}</label>
                <input
                  type="number"
                  step="any"
                  value={formData.ingredientsUsed[key] || ''}
                  onChange={(e) => handleIngredientChange(key, e.target.value)}
                  placeholder="KG"
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== SECTION 4: DRUGS & ADDITIVES ===== */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase">
              4. Drugs, Additives & Supplements (KG)
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {Object.keys(formData.drugsUsed).map((key) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return (
              <div key={key} className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 truncate">{label}</label>
                <input
                  type="number"
                  step="any"
                  value={formData.drugsUsed[key] || ''}
                  onChange={(e) => handleDrugChange(key, e.target.value)}
                  placeholder="KG"
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== SECTION 5: MACHINE HEALTH CHECKS (SUBSECTION SEPARATED) ===== */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <Wrench className="w-5 h-5 text-purple-700" />
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase">
                5. Machine Health Checks & Operational Status
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Organized into distinct subsections: Solar Systems, Grinding Machines, Mixers, and Pumping Stations
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-1">
          {/* SUBSECTION A: SOLAR POWER SYSTEMS */}
          <div className="p-4 sm:p-5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center space-x-2 border-b border-amber-200/80 pb-2">
              <Sun className="w-4 h-4 text-amber-600" />
              <h5 className="text-xs font-black uppercase tracking-wider text-amber-950">
                A. Solar Power Systems
              </h5>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full ml-auto">
                5 Units
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {renderMachineStatusPicker('solarSystemA', 'Solar System A')}
              {renderMachineStatusPicker('solarSystemB', 'Solar System B')}
              {renderMachineStatusPicker('solarSystemC', 'Solar System C')}
              {renderMachineStatusPicker('solarSystemD', 'Solar System D')}
              {renderMachineStatusPicker('solarSystemE', 'Solar System E')}
            </div>
          </div>

          {/* SUBSECTION B: GRINDING MACHINERY */}
          <div className="p-4 sm:p-5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
            <div className="flex items-center space-x-2 border-b border-blue-200/80 pb-2">
              <Cog className="w-4 h-4 text-blue-600" />
              <h5 className="text-xs font-black uppercase tracking-wider text-blue-950">
                B. Grinding Machinery
              </h5>
              <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full ml-auto">
                3 Units
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {renderMachineStatusPicker('chineseGrindingMachine', 'Chinese Grinding Machine')}
              {renderMachineStatusPicker('locallyFabricatedGrindingMachine', 'Locally Fabricated Grinding Machine')}
              {renderMachineStatusPicker('grinder', 'Primary Grinder Unit')}
            </div>
          </div>

          {/* SUBSECTION C: MIXERS & BLENDERS */}
          <div className="p-4 sm:p-5 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3">
            <div className="flex items-center space-x-2 border-b border-purple-200/80 pb-2">
              <RefreshCw className="w-4 h-4 text-purple-600" />
              <h5 className="text-xs font-black uppercase tracking-wider text-purple-950">
                C. Feed Mixers & Wet Blenders
              </h5>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full ml-auto">
                3 Units
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {renderMachineStatusPicker('chineseMixer', 'Chinese Mixer')}
              {renderMachineStatusPicker('locallyFabricatedMixer', 'Locally Fabricated Mixer')}
              {renderMachineStatusPicker('localWetMixer', 'Local Wet Mixer')}
            </div>
          </div>

          {/* SUBSECTION D: WATER PUMPING STATIONS */}
          <div className="p-4 sm:p-5 bg-cyan-50/60 rounded-2xl border border-cyan-200 space-y-3">
            <div className="flex items-center space-x-2 border-b border-cyan-200/80 pb-2">
              <Waves className="w-4 h-4 text-cyan-600" />
              <h5 className="text-xs font-black uppercase tracking-wider text-cyan-950">
                D. Water Pumping Stations
              </h5>
              <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded-full ml-auto">
                5 Pumping Units
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {renderMachineStatusPicker('pumpingMachineA', '1.5 HP Pump – A')}
              {renderMachineStatusPicker('pumpingMachineB', '1.5 HP Pump – B')}
              {renderMachineStatusPicker('pumpingMachineC', '1.5 HP Pump – C')}
              {renderMachineStatusPicker('pumpingMachineD', '1.0 HP Pump – D')}
              {renderMachineStatusPicker('pumpingMachineE', '5.5 HP Pump – E')}
            </div>
          </div>

          {/* SUBSECTION E: EXTRUSION & PELLETING UNITS */}
          <div className="p-4 sm:p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center space-x-2 border-b border-emerald-200/80 pb-2">
              <Factory className="w-4 h-4 text-emerald-600" />
              <h5 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                E. Extrusion & Pelleting Machinery
              </h5>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full ml-auto">
                2 Units
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderMachineStatusPicker('extrudingPelletingMachine', 'Extruding / Pelleting Machine')}
              {renderMachineStatusPicker('dryerUnit', 'Dryer Unit')}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 6: TECHNICAL FUEL AUDIT ===== */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <Droplets className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase">
              6. Technical Fuel & Meter Audit
            </h4>
          </div>
        </div>

        <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Diesel Generator (Litres)</label>
                <input
                  type="number"
                  value={formData.technicalReport.dieselGeneratorLitres}
                  onChange={(e) => handleTechnicalChange('dieselGeneratorLitres', e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Diesel Kegs (Litres)</label>
                <input
                  type="number"
                  value={formData.technicalReport.dieselKegsLitres}
                  onChange={(e) => handleTechnicalChange('dieselKegsLitres', e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
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
      </div>

      {/* Whole Form Submit Action */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-black uppercase">Submit Grow-Out Asset Inventory</h4>
          <p className="text-xs text-slate-400">
            Submits all feeds in store ({calculatedTotalFeed} KG), ingredients, fuel audit, and machine health checks for manager review.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>Submit Complete Asset Inventory</span>
        </button>
      </div>

    </form>
  );
};
