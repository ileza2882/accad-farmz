import React from 'react';
import { Report, FisheryAssetFormData, FisheryLivestockFormData, FisheryHatcheryFormData, Department, InventoryType, FisherySection, ReportStatus, MACHINE_LABELS, getHatcheryBatchStage } from '../types';
import { formatLogName, exportLogToPDF, exportLogToWord, exportHatcheryToExcel, getComputerName, formatStatusLabel } from '../lib/exportUtils';
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  UserCheck, 
  Download, 
  FileSpreadsheet, 
  Monitor, 
  Package, 
  Factory, 
  Wrench, 
  Droplet, 
  Fish, 
  Info,
  ShieldCheck,
  Building,
  Image as ImageIcon,
  Egg,
  Scale,
  MapPin,
  Activity,
  Hash,
  Droplets,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface ReportDetailsProps {
  report: Report;
}

export const ReportDetails: React.FC<ReportDetailsProps> = ({ report }) => {
  const logName = formatLogName(report);
  const computer = report.computerName || getComputerName();
  const assetData = report.formData as FisheryAssetFormData;
  const livestockData = report.formData as FisheryLivestockFormData;
  const hatcheryData = report.formData as FisheryHatcheryFormData;

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.APPROVED:
        return (
          <span className="inline-flex items-center space-x-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-1 rounded-full text-xs font-black uppercase shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Fully Approved (ED)</span>
          </span>
        );
      case ReportStatus.PENDING_ED:
        return (
          <span className="inline-flex items-center space-x-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-1 rounded-full text-xs font-black uppercase shadow-sm">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Pending ED Final Approval</span>
          </span>
        );
      case ReportStatus.PENDING_MANAGER:
        return (
          <span className="inline-flex items-center space-x-1.5 bg-blue-100 text-blue-800 border border-blue-300 px-3.5 py-1 rounded-full text-xs font-black uppercase shadow-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Pending Manager Vetting</span>
          </span>
        );
      case ReportStatus.REJECTED_BY_MANAGER:
      case ReportStatus.REJECTED_BY_ED:
        return (
          <span className="inline-flex items-center space-x-1.5 bg-rose-100 text-rose-800 border border-rose-300 px-3.5 py-1 rounded-full text-xs font-black uppercase shadow-sm">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Rejected ({status === ReportStatus.REJECTED_BY_ED ? 'ED' : 'Manager'})</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-black uppercase">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      
      {/* Header Info Banner */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
              {report.department} Sector &bull; {report.inventoryType}
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2 uppercase tracking-tight">{logName}</h2>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 mt-1">
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              <span>Workstation: <strong>{computer}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div>{getStatusBadge(report.status)}</div>
            
            {/* Quick Export Actions */}
            <button
              onClick={() => exportLogToPDF(report)}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Download AccadFarms PDF Sheet"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => exportLogToWord(report)}
              className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Download AccadFarms Word Sheet (.doc)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Word</span>
            </button>

            {/* Hatchery Excel Export */}
            {(report.department === Department.FISHERY && (report.inventoryType === InventoryType.HATCHERY || report.section === FisherySection.HATCHERY || Boolean(report.formData?.batches))) && (
              <button
                onClick={() => exportHatcheryToExcel(report)}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center space-x-1.5 shadow-sm cursor-pointer"
                title="Download AccadFarms Hatchery Excel Sheet (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Export Excel (.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* Metadata & Approval History Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-medium text-slate-600">
          <div className="p-3 bg-white border border-slate-200 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-black uppercase">Submitting User</span>
            <p className="text-slate-900 font-bold mt-0.5">{report.fullName || report.email}</p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-black uppercase">Date Submitted</span>
            <p className="text-slate-900 font-bold mt-0.5">{new Date(report.timestamp).toLocaleString()}</p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-black uppercase">Manager Vetting</span>
            <p className="text-emerald-700 font-bold mt-0.5">{report.managerApprovedBy ? `Vetted by ${report.managerApprovedBy}` : 'Pending Review'}</p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-black uppercase">ED Authorization</span>
            <p className="text-emerald-700 font-bold mt-0.5">{report.edApprovedBy ? `Approved by ${report.edApprovedBy}` : 'Pending Authorization'}</p>
          </div>
        </div>

        {/* Resubmission Audit Alert */}
        {report.isResubmitted && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-bold space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-amber-800 font-extrabold uppercase tracking-wide">
              <RotateCcw className="w-4 h-4 text-amber-700" />
              <span>Redone & Resubmitted Record (Attempt #{report.resubmissionCount || 1})</span>
              {report.resubmittedAt && (
                <span className="text-[10px] text-amber-600 font-normal ml-auto">
                  Resubmitted: {new Date(report.resubmittedAt).toLocaleString()}
                </span>
              )}
            </div>
            {report.previousRejectionReason && (
              <p className="font-medium text-amber-900 bg-white/80 p-2.5 rounded-xl border border-amber-200">
                <strong className="text-rose-700">Previous Rejection Feedback:</strong> "{report.previousRejectionReason}"
              </p>
            )}
          </div>
        )}

        {/* Rejection Reason Alert if any */}
        {report.rejectionReason && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold space-y-1">
            <div className="flex items-center space-x-2 text-rose-700 font-extrabold uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4" />
              <span>Rejection Decision Reason:</span>
            </div>
            <p className="font-medium text-slate-700 italic">"{report.rejectionReason}"</p>
            {report.rejectedBy && (
              <p className="text-[10px] text-rose-600 font-bold not-italic">Rejected by {report.rejectedBy}</p>
            )}
          </div>
        )}
      </div>

      {/* Main Content & Exhaustive Display */}
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Log Narrative Section */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center space-x-2 text-slate-900 font-black uppercase text-xs">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Operational Log Narrative & Summary</span>
          </div>
          <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{report.content || 'No narrative description entered.'}</p>
        </div>

        {/* ASSET INVENTORY EXHAUSTIVE DISPLAY */}
        {report.inventoryType === InventoryType.ASSET && assetData && (
          <div className="space-y-6">
            
            {/* Feeds Inventory */}
            {assetData.feedsInventory?.items && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2 text-slate-900 font-black uppercase text-xs">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Feeds Inventory Breakdown</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Total Store: {assetData.feedsInventory.totalFeedsInStore || assetData.feedStorage?.totalFeedInStoreKg || 0} KG
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assetData.feedsInventory.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase">{item.type}</span>
                        <div className="font-bold text-slate-900">{item.size} {item.brand ? `- ${item.brand}` : ''}</div>
                      </div>
                      <span className="font-black text-emerald-700 text-sm bg-white px-2.5 py-1 rounded-xl border border-slate-200">{item.quantityKg} KG</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-xs font-bold">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-emerald-800 font-black uppercase">Total Calculated Feeds in Store</span>
                    <p className="text-lg font-black text-emerald-900">{assetData.feedsInventory.totalFeedsInStore || 0} KG</p>
                  </div>
                </div>
              </div>
            )}

            {/* Feed Storage Notes & Comments */}
            {assetData.feedStorage && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border text-xs space-y-1 ${assetData.feedStorage.wastageNoticed?.hasWastage ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className="font-black uppercase tracking-wider text-[10px]">Feed Wastage Observation</span>
                  <p className="font-bold">{assetData.feedStorage.wastageNoticed?.hasWastage ? `YES - ${assetData.feedStorage.wastageNoticed.comment}` : 'NO feed wastage reported.'}</p>
                </div>

                <div className={`p-4 rounded-2xl border text-xs space-y-1 ${assetData.feedStorage.machineIssues?.hasIssue ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className="font-black uppercase tracking-wider text-[10px]">Machinery Issue Observation</span>
                  <p className="font-bold">{assetData.feedStorage.machineIssues?.hasIssue ? `YES - ${assetData.feedStorage.machineIssues.comment}` : 'NO machine issues reported.'}</p>
                </div>
              </div>
            )}

            {/* Raw Ingredients Breakdown */}
            {assetData.ingredientsUsed && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-3">
                  <Factory className="w-4 h-4 text-emerald-600" />
                  <span>Raw Ingredients Usage Audit (KG)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 text-xs text-center font-bold">
                  {Object.entries(assetData.ingredientsUsed).map(([ingName, ingVal]) => {
                    const formattedLabel = ingName === 'gnc' ? 'GNC' :
                      ingName === 'dcp' ? 'DCP' :
                      ingName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                    return (
                      <div key={ingName} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-black uppercase truncate" title={formattedLabel}>{formattedLabel}</span>
                        <p className="text-sm font-black text-emerald-900 mt-1">{ingVal || 0} Kg</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drugs & Additives */}
            {assetData.drugsUsed && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-3">
                  <Droplet className="w-4 h-4 text-blue-600" />
                  <span>Drugs & Additives Audit</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-bold">
                  {Object.entries(assetData.drugsUsed).map(([drugName, drugVal]) => (
                    <div key={drugName} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-black uppercase truncate">{drugName.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{drugVal || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Machinery Health Check (Categorized Subsections) */}
            {assetData.machineCheck && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-5">
                <div className="flex items-center space-x-2 text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-3">
                  <Wrench className="w-4 h-4 text-emerald-700" />
                  <span>Machinery Health & Status Audit (By Machine Type)</span>
                </div>

                <div className="space-y-4">
                  {/* Solar Systems */}
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block">
                      ☀️ Solar Power Systems
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {['solarSystemA', 'solarSystemB', 'solarSystemC', 'solarSystemD', 'solarSystemE'].map((key) => {
                        const status = assetData.machineCheck[key] || 'Good';
                        return (
                          <div key={key} className="bg-white p-2.5 rounded-xl border border-amber-100 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-700">{MACHINE_LABELS[key] || key}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1 w-fit ${
                              status === 'Good' ? 'bg-emerald-100 text-emerald-800' :
                              status === 'Faulty' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grinding Machinery */}
                  <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-950 block">
                      ⚙️ Grinding Machinery
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {['chineseGrindingMachine', 'locallyFabricatedGrindingMachine', 'grinder'].map((key) => {
                        const status = assetData.machineCheck[key] || 'Good';
                        return (
                          <div key={key} className="bg-white p-2.5 rounded-xl border border-blue-100 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-700">{MACHINE_LABELS[key] || key}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1 w-fit ${
                              status === 'Good' ? 'bg-emerald-100 text-emerald-800' :
                              status === 'Faulty' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feed Mixers */}
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block">
                      🌀 Feed Mixers & Wet Blenders
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {['chineseMixer', 'locallyFabricatedMixer', 'localWetMixer'].map((key) => {
                        const status = assetData.machineCheck[key] || 'Good';
                        return (
                          <div key={key} className="bg-white p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-700">{MACHINE_LABELS[key] || key}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1 w-fit ${
                              status === 'Good' ? 'bg-emerald-100 text-emerald-800' :
                              status === 'Faulty' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Water Pumping Stations */}
                  <div className="p-4 bg-cyan-50/70 rounded-2xl border border-cyan-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-950 block">
                      💧 Water Pumping Stations
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {['pumpingMachineA', 'pumpingMachineB', 'pumpingMachineC', 'pumpingMachineD', 'pumpingMachineE'].map((key) => {
                        const status = assetData.machineCheck[key] || 'Good';
                        return (
                          <div key={key} className="bg-white p-2.5 rounded-xl border border-cyan-100 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-700">{MACHINE_LABELS[key] || key}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1 w-fit ${
                              status === 'Good' ? 'bg-emerald-100 text-emerald-800' :
                              status === 'Faulty' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Extrusion & Pelleting Units */}
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">
                      🏭 Extrusion & Pelleting Machinery
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['extrudingPelletingMachine', 'dryerUnit'].map((key) => {
                        const status = assetData.machineCheck[key] || 'Good';
                        return (
                          <div key={key} className="bg-white p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-700">{MACHINE_LABELS[key] || key}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1 w-fit ${
                              status === 'Good' ? 'bg-emerald-100 text-emerald-800' :
                              status === 'Faulty' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Technical Fuel Audit & Meter Photo */}
            {assetData.technicalReport && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-black uppercase text-xs border-b border-slate-100 pb-3">
                  <Droplet className="w-4 h-4 text-emerald-600" />
                  <span>Technical Diesel & Meter Audit</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs text-center font-bold">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Generator Litres</span>
                    <p className="text-base font-black text-slate-900">{assetData.technicalReport.dieselGeneratorLitres || 0} L</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Kegs Litres</span>
                    <p className="text-base font-black text-slate-900">{assetData.technicalReport.dieselKegsLitres || 0} L</p>
                  </div>
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                    <span className="text-[10px] opacity-80 font-black uppercase">Total Diesel Available</span>
                    <p className="text-base font-black">{assetData.technicalReport.totalDieselAvailable || 0} L</p>
                  </div>
                </div>

                {assetData.technicalReport.generatorMeterPhoto && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>Generator Meter Attachment Photo:</span>
                    </div>
                    <img 
                      src={assetData.technicalReport.generatorMeterPhoto} 
                      alt="Generator Meter Photo" 
                      className="w-full max-w-md h-56 object-cover rounded-2xl border border-slate-200 shadow-sm" 
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* LIVESTOCK INVENTORY EXHAUSTIVE DISPLAY */}
        {report.inventoryType === InventoryType.LIVESTOCK && livestockData?.ponds && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-slate-900 font-black uppercase text-xs bg-white p-4 rounded-2xl border border-slate-200">
              <Fish className="w-4 h-4 text-emerald-600" />
              <span>Livestock Ponds & Mortality Audit</span>
            </div>

            {livestockData.ponds.map((pond, pIdx) => (
              <div key={pIdx} className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                      {pIdx + 1}
                    </span>
                    <div>
                      <h4 className="text-base font-black text-slate-900 uppercase">
                        {pond.pondNo} {pond.batch ? `(${pond.batch})` : ''}
                      </h4>
                      {pond.date && (
                        <p className="text-[11px] text-slate-500 font-bold">
                          Record Date: {pond.date}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                    Mortality: {pond.mortality || 0} Fish
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Pond Size</span>
                    <p className="text-slate-900 font-black text-sm">{pond.pondSizeSqm} SQM</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Fish Count</span>
                    <p className="text-slate-900 font-black text-sm">{pond.quantityOfFish} Fish</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Water Condition</span>
                    <p className={pond.waterCondition === 'Clear' ? 'text-emerald-700 font-black' : 'text-amber-600 font-black'}>{pond.waterCondition}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Water Changed Today</span>
                    <p className="text-slate-900 font-black">{pond.waterChangedToday?.hasChanged ? `YES (${pond.waterChangedToday.times || 1}x)` : 'NO'}</p>
                  </div>
                </div>

                {/* Pond Feeding Records List */}
                {pond.feedingRecords?.items && pond.feedingRecords.items.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pond Feeding Log Breakdown</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                      {pond.feedingRecords.items.map((feedItem, fIdx) => (
                        <div key={fIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between">
                          <span>{feedItem.type} ({feedItem.brand || ''} {feedItem.size})</span>
                          <span className="text-emerald-700 font-black">{feedItem.quantityKg} KG</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feeding Response & Photo */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                  <div className="text-xs font-bold">
                    <span className="text-slate-500">Feeding Response: </span>
                    <span className="text-emerald-700 uppercase font-black">{pond.feedingResponse || 'Active'}</span>
                  </div>

                  {pond.notes && (
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs font-medium text-emerald-950">
                      <span className="text-[10px] font-black uppercase text-emerald-800 block mb-0.5">Pond Observations</span>
                      {pond.notes}
                    </div>
                  )}

                  {pond.pondPhoto && (
                    <div className="w-full">
                      <span className="text-[10px] text-slate-400 font-black uppercase block mb-1">Pond Photo Attachment</span>
                      <img src={pond.pondPhoto} alt="Pond Photo" className="w-full h-56 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* HATCHERY INVENTORY EXHAUSTIVE DISPLAY */}
        {(report.inventoryType === InventoryType.HATCHERY || hatcheryData?.batches) && hatcheryData?.batches && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-900 font-black uppercase text-xs">
                <Egg className="w-4 h-4 text-emerald-600" />
                <span>Hatchery Production & Fingerling Transfer Audit</span>
              </div>
              <span className="text-[11px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
                {hatcheryData.batches.length} {hatcheryData.batches.length === 1 ? 'Batch' : 'Batches'}
              </span>
            </div>

            {hatcheryData.batches.map((batch, bIdx) => {
              const stageInfo = getHatcheryBatchStage(batch);

              return (
                <div key={bIdx} className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                        {bIdx + 1}
                      </span>
                      <div>
                        <h4 className="text-base font-black text-slate-900 uppercase">
                          {batch.batchNumber || `Batch #${bIdx + 1}`}
                        </h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${stageInfo.badgeColor}`}>
                            {stageInfo.stage} ({stageInfo.progressPercent}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                        batch.healthStatusTransferred === 'Excellent' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        batch.healthStatusTransferred === 'Good' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                        batch.healthStatusTransferred === 'Fair' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        Health: {batch.healthStatusTransferred || 'Good'}
                      </span>
                    </div>
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-bold">
                  {batch.sourceOfBroodstock && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-black uppercase">Source of Broodstock</span>
                      <p className="text-slate-900 font-black text-sm">{batch.sourceOfBroodstock}</p>
                    </div>
                  )}

                  {batch.hatcheryDate && batch.hatcheryDate.trim() !== '' && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-black uppercase">Hatchery Date</span>
                      <p className="text-slate-900 font-black text-sm">{batch.hatcheryDate}</p>
                    </div>
                  )}

                  {batch.firstDateOfFeeding && batch.firstDateOfFeeding.trim() !== '' && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-black uppercase">First Date of Feeding</span>
                      <p className="text-slate-900 font-black text-sm">{batch.firstDateOfFeeding}</p>
                    </div>
                  )}

                  {batch.dateOfTransferToGrowOut && batch.dateOfTransferToGrowOut.trim() !== '' && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-black uppercase">Date of Transfer to Grow-Out</span>
                      <p className="text-slate-900 font-black text-sm">{batch.dateOfTransferToGrowOut}</p>
                    </div>
                  )}

                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-black uppercase">Total Transferred Fingerlings</span>
                    <p className="text-emerald-950 font-black text-base">{Number(batch.totalTransferredFingerlings || 0).toLocaleString()} Fish</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Average Weight</span>
                    <p className="text-slate-900 font-black text-sm">{batch.averageWeightTransferred || 0} g</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Age of Fingerlings</span>
                    <p className="text-slate-900 font-black text-sm">{batch.ageOfFingerlingsTransferred || 'N/A'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Destinated Pond</span>
                    <p className="text-slate-900 font-black text-sm">{batch.destinatedPondTransferred || 'N/A'}</p>
                  </div>
                </div>

                {batch.remarks && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Batch Remarks / Notes</span>
                    <p className="text-slate-700 font-medium mt-0.5">{batch.remarks}</p>
                  </div>
                )}

                </div>
              );
            })}

            {hatcheryData.generalNotes && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <span className="text-[10px] text-slate-500 font-black uppercase">General Hatchery Notes</span>
                <p className="text-slate-700 font-medium">{hatcheryData.generalNotes}</p>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
