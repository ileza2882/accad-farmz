import React, { useState } from 'react';
import { FisheryLivestockFormData, FisheryLivestockPondData } from '../types';
import { Plus, Trash2, CheckCircle2, Image as ImageIcon, RefreshCw } from 'lucide-react';

interface FisheryLivestockFormProps {
  onSubmit: (data: FisheryLivestockFormData) => void;
  isSubmitting?: boolean;
  color?: string;
}

const BRANDS = ["Blue Crown", "Ecofloat", "Aqualis", "Alpha", "Coppen"];
const SIZES = ["0.2mm", "0.3mm", "0.5mm", "0.8mm", "1.2mm", "1.5mm", "2mm", "3mm", "4mm", "6mm", "9mm"];

export const FisheryLivestockForm: React.FC<FisheryLivestockFormProps> = ({ onSubmit, isSubmitting }) => {
  const [ponds, setPonds] = useState<FisheryLivestockPondData[]>([
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
      pondPhoto: ''
    }
  ]);

  const addPond = () => {
    setPonds([
      ...ponds,
      {
        pondNo: `Pond ${ponds.length + 1}`,
        pondSizeSqm: '',
        quantityOfFish: '',
        batch: `Batch ${String.fromCharCode(65 + ponds.length)}`,
        waterCondition: 'Clear',
        waterChangedToday: { hasChanged: false, times: '' },
        feedingRecords: {
          items: [{ type: 'Branded', size: '2mm', brand: 'Blue Crown', quantityKg: '' }]
        },
        feedingResponse: 'Active',
        mortality: '0',
        pondPhoto: ''
      }
    ]);
  };

  const removePond = (index: number) => {
    if (ponds.length === 1) return;
    setPonds(ponds.filter((_, i) => i !== index));
  };

  const handlePondChange = (index: number, field: keyof FisheryLivestockPondData, value: any) => {
    const updated = [...ponds];
    updated[index] = { ...updated[index], [field]: value };
    setPonds(updated);
  };

  const handleWaterChangedToggle = (index: number, hasChanged: boolean) => {
    const updated = [...ponds];
    updated[index].waterChangedToday.hasChanged = hasChanged;
    if (!hasChanged) updated[index].waterChangedToday.times = '';
    setPonds(updated);
  };

  const handleWaterTimesChange = (index: number, times: string) => {
    const updated = [...ponds];
    updated[index].waterChangedToday.times = times;
    setPonds(updated);
  };

  const handleFeedingItemChange = (pondIdx: number, itemIdx: number, field: string, value: string) => {
    const updated = [...ponds];
    const items = [...updated[pondIdx].feedingRecords.items];
    items[itemIdx] = { ...items[itemIdx], [field]: value };
    updated[pondIdx].feedingRecords.items = items;
    setPonds(updated);
  };

  const addFeedingItem = (pondIdx: number) => {
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
    const updated = [...ponds];
    if (updated[pondIdx].feedingRecords.items.length === 1) return;
    updated[pondIdx].feedingRecords.items = updated[pondIdx].feedingRecords.items.filter((_, i) => i !== itemIdx);
    setPonds(updated);
  };

  const handlePhotoUpload = (pondIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ponds });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-900">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 uppercase">Livestock Pond Inventory</h3>
          <p className="text-xs text-slate-500">Record pond water conditions, feeding, health, and mortality</p>
        </div>
        <button
          type="button"
          onClick={addPond}
          className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Pond</span>
        </button>
      </div>

      <div className="space-y-8">
        {ponds.map((pond, pIdx) => (
          <div key={pIdx} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6 relative">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs">
                  #{pIdx + 1}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase">{pond.pondNo} Details</h4>
              </div>

              {ponds.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePond(pIdx)}
                  className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Pond Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Number / Code</label>
                <input
                  type="text"
                  value={pond.pondNo}
                  onChange={(e) => handlePondChange(pIdx, 'pondNo', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Batch Code</label>
                <input
                  type="text"
                  value={pond.batch}
                  onChange={(e) => handlePondChange(pIdx, 'batch', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Size (SQM)</label>
                <input
                  type="number"
                  value={pond.pondSizeSqm}
                  onChange={(e) => handlePondChange(pIdx, 'pondSizeSqm', e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Quantity of Fish</label>
                <input
                  type="number"
                  value={pond.quantityOfFish}
                  onChange={(e) => handlePondChange(pIdx, 'quantityOfFish', e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
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
                    onClick={() => handlePondChange(pIdx, 'waterCondition', 'Clear')}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      pond.waterCondition === 'Clear'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePondChange(pIdx, 'waterCondition', 'Unclear')}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      pond.waterCondition === 'Unclear'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
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
                    onClick={() => handleWaterChangedToggle(pIdx, true)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      pond.waterChangedToday.hasChanged
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWaterChangedToggle(pIdx, false)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      !pond.waterChangedToday.hasChanged
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    No
                  </button>

                  {pond.waterChangedToday.hasChanged && (
                    <input
                      type="number"
                      value={pond.waterChangedToday.times}
                      onChange={(e) => handleWaterTimesChange(pIdx, e.target.value)}
                      placeholder="Times changed"
                      className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Feeding Records */}
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-extrabold uppercase text-slate-700">Feeding Records</label>
                <button
                  type="button"
                  onClick={() => addFeedingItem(pIdx)}
                  className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  + Add Feed
                </button>
              </div>

              {pond.feedingRecords.items.map((item, itemIdx) => (
                <div key={itemIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 items-end">
                  <div>
                    <select
                      value={item.type}
                      onChange={(e) => handleFeedingItemChange(pIdx, itemIdx, 'type', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold"
                    >
                      <option value="Branded">Branded</option>
                      <option value="Farm-produced">Farm-produced</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={item.size}
                      onChange={(e) => handleFeedingItemChange(pIdx, itemIdx, 'size', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold"
                    >
                      {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {item.type === 'Branded' && (
                    <div>
                      <select
                        value={item.brand || ''}
                        onChange={(e) => handleFeedingItemChange(pIdx, itemIdx, 'brand', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold"
                      >
                        {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={item.quantityKg}
                      onChange={(e) => handleFeedingItemChange(pIdx, itemIdx, 'quantityKg', e.target.value)}
                      placeholder="KG"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                    />
                    {pond.feedingRecords.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeedingItem(pIdx, itemIdx)}
                        className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg"
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
                  onChange={(e) => handlePondChange(pIdx, 'feedingResponse', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
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
                  onChange={(e) => handlePondChange(pIdx, 'mortality', e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-rose-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Pond Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(pIdx, e)}
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
        ))}
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
              <span>Submit Livestock Log</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
};
