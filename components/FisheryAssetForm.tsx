import React, { useState, useEffect } from 'react';
import { FisheryAssetFormData } from '../types';
import { Plus, Trash2, CheckCircle2, Factory, Package, Wrench, Droplet, AlertTriangle, RefreshCw } from 'lucide-react';

interface FisheryAssetFormProps {
  onSubmit: (data: FisheryAssetFormData) => void;
  isSubmitting?: boolean;
  color?: string;
}

const BRANDS = ["Blue Crown", "Ecofloat", "Aqualis", "Alpha"];
const SIZES = ["0.2mm", "0.3mm", "0.5mm", "0.8mm", "1.2mm", "1.5mm", "2mm", "3mm", "4mm", "6mm", "9mm"];

export const FisheryAssetForm: React.FC<FisheryAssetFormProps> = ({ onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<FisheryAssetFormData>({
    feedsInventory: {
      items: [
        { type: "Branded", size: "2mm", brand: "Blue Crown", quantityKg: "" },
      ],
      totalBags: "",
      totalFeedsInStore: "",
    },
    ingredientsUsed: {
      wheatOffal: "",
      flour: "",
      fishMeal: "",
      meatMeal: "",
      bloodMeal: "",
      soyaBean: "",
      gnc: "",
      maize: "",
      wheat: "",
      maggotsKg: "",
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
      pumpingMachine: 'Good',
      solarInverter: 'Good',
      pelletQuality: 'Good',
      shapeQuality: 'Good',
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
  });

  const [calculatedTotalFeed, setCalculatedTotalFeed] = useState(0);

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
    const newItems = [...formData.feedsInventory.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ 
      ...formData, 
      feedsInventory: { ...formData.feedsInventory, items: newItems } 
    });
  };

  const handleFeedInventorySummaryChange = (field: 'totalBags' | 'totalFeedsInStore', value: string) => {
    setFormData({
      ...formData,
      feedsInventory: { ...formData.feedsInventory, [field]: value }
    });
  };

  const addFeedRow = () => {
    setFormData({
      ...formData,
      feedsInventory: {
        ...formData.feedsInventory,
        items: [...formData.feedsInventory.items, { type: "Branded", size: "2mm", brand: "Blue Crown", quantityKg: "" }]
      }
    });
  };

  const removeFeedRow = (index: number) => {
    const newItems = formData.feedsInventory.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      feedsInventory: { ...formData.feedsInventory, items: newItems }
    });
  };

  const handleIngredientChange = (field: keyof FisheryAssetFormData['ingredientsUsed'], value: string) => {
    setFormData({
      ...formData,
      ingredientsUsed: { ...formData.ingredientsUsed, [field]: value }
    });
  };

  const handleDrugChange = (field: keyof FisheryAssetFormData['drugsUsed'], value: string) => {
    setFormData({
      ...formData,
      drugsUsed: { ...formData.drugsUsed, [field]: value }
    });
  };

  const handleMachineChange = (field: keyof FisheryAssetFormData['machineCheck'], value: 'Good' | 'Faulty' | 'Needs Maintenance') => {
    setFormData({
      ...formData,
      machineCheck: { ...formData.machineCheck, [field]: value }
    });
  };

  const handleStorageChange = (field: 'totalFeedInStoreKg', value: string) => {
    setFormData({
      ...formData,
      feedStorage: { ...formData.feedStorage, [field]: value }
    });
  };

  const handleIssueChange = (type: 'machineIssues' | 'wastageNoticed', key: 'hasIssue' | 'hasWastage' | 'comment', value: any) => {
    setFormData({
      ...formData,
      feedStorage: {
        ...formData.feedStorage,
        [type]: { ...formData.feedStorage[type], [key]: value }
      }
    });
  };

  const handleTechnicalChange = (field: 'dieselGeneratorLitres' | 'dieselKegsLitres' | 'generatorMeterPhoto', value: string) => {
    setFormData({
      ...formData,
      technicalReport: { ...formData.technicalReport, [field]: value }
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleTechnicalChange('generatorMeterPhoto', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900">
      
      {/* A. Feeds Inventory */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold text-sm">A</div>
          <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Feeds Inventory Log</h3>
        </div>

        <div className="space-y-3">
          {formData.feedsInventory.items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 items-end">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Feed Type</label>
                <select
                  value={item.type}
                  onChange={(e) => handleFeedItemChange(index, 'type', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="Branded">Branded</option>
                  <option value="Farm-produced">Farm-produced</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pellet Size</label>
                <select
                  value={item.size}
                  onChange={(e) => handleFeedItemChange(index, 'size', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {item.type === 'Branded' && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Brand Name</label>
                  <select
                    value={item.brand || ''}
                    onChange={(e) => handleFeedItemChange(index, 'brand', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
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
                    value={item.quantityKg}
                    onChange={(e) => handleFeedItemChange(index, 'quantityKg', e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                {formData.feedsInventory.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFeedRow(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 mb-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={addFeedRow}
            className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Feed Entry</span>
          </button>
          <div className="text-xs font-extrabold text-slate-600">
            Calculated Total: <span className="text-emerald-600 font-black">{calculatedTotalFeed} KG</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Total Bags in Store</label>
            <input
              type="number"
              value={formData.feedsInventory.totalBags}
              onChange={(e) => handleFeedInventorySummaryChange('totalBags', e.target.value)}
              placeholder="Total bags"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Total Feeds in Store (KG)</label>
            <input
              type="number"
              value={formData.feedsInventory.totalFeedsInStore}
              onChange={(e) => handleFeedInventorySummaryChange('totalFeedsInStore', e.target.value)}
              placeholder="Total KG in store"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(formData.ingredientsUsed).map(([key, value]) => (
            <div key={key} className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                {key.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => handleIngredientChange(key as any, e.target.value)}
                placeholder={key === 'maggotsKg' ? 'KG' : 'Bags'}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* C. Machine Check */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold text-sm">C</div>
          <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Machine Health Checks</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(formData.machineCheck).map(([key, status]) => (
            <div key={key} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <select
                value={status}
                onChange={(e) => handleMachineChange(key as any, e.target.value as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black outline-none cursor-pointer ${
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
          ))}
        </div>
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
              value={formData.technicalReport.dieselGeneratorLitres}
              onChange={(e) => handleTechnicalChange('dieselGeneratorLitres', e.target.value)}
              placeholder="Gen litres"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Diesel Kegs (Litres)</label>
            <input
              type="number"
              value={formData.technicalReport.dieselKegsLitres}
              onChange={(e) => handleTechnicalChange('dieselKegsLitres', e.target.value)}
              placeholder="Keg litres"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
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
            onChange={handlePhotoUpload}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
          {formData.technicalReport.generatorMeterPhoto && (
            <img src={formData.technicalReport.generatorMeterPhoto} alt="Meter Photo" className="mt-2 w-32 h-24 object-cover rounded-xl border border-slate-200" />
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <button
          type="submit"
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
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Fishery Asset Log</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
};
