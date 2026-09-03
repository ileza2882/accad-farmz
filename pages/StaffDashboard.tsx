import React, { useState, useEffect } from 'react';
import { User, Department, InventoryType, Report, ReportStatus, FisherySection, FisheryHatcheryBatchData, FisheryLivestockPondData, FisheryAssetFormData } from '../types';
import { getReports, createReport, updateReport, resubmitReport, createNotification, createAuditLog, createHatcheryChangeRequest } from '../lib/insforge';
import { FisheryAssetForm } from '../components/FisheryAssetForm';
import { FisheryLivestockForm } from '../components/FisheryLivestockForm';
import { FisheryHatcheryForm } from '../components/FisheryHatcheryForm';
import { ReportDetails } from '../components/ReportDetails';
import { FarmLogsTable } from '../components/FarmLogsTable';
import { Plus, FileText, CheckCircle2, Clock, XCircle, Filter, Eye, AlertCircle, RefreshCw, Monitor, Sparkles, RotateCcw, Package, Fish } from 'lucide-react';

interface StaffDashboardProps {
  user: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_logs' | 'submit_log'>('submit_log');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Submit Log State
  const [selectedDept, setSelectedDept] = useState<Department>(user.department || Department.FISHERY);
  const [selectedInvType, setSelectedInvType] = useState<InventoryType>(InventoryType.ASSET);
  const [logTitle, setLogTitle] = useState('');
  const [logContent, setLogContent] = useState('');
  const [selectedReportForModal, setSelectedReportForModal] = useState<Report | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  const [activeHatcheryReport, setActiveHatcheryReport] = useState<Report | null>(null);
  const [activeLivestockReport, setActiveLivestockReport] = useState<Report | null>(null);
  const [activeAssetReport, setActiveAssetReport] = useState<Report | null>(null);
  const [redoingReport, setRedoingReport] = useState<Report | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);

  const fetchUserReports = async () => {
    setLoading(true);
    try {
      const all = await getReports();
      const userLogs = all.filter(r => r.userId === user.id || r.email.toLowerCase() === user.email.toLowerCase());
      setReports(userLogs);
      
      const hatcheryLog = userLogs.find(r => 
        r.department === Department.FISHERY && 
        (r.inventoryType === InventoryType.HATCHERY || r.section === FisherySection.HATCHERY || r.formData?.batches)
      );
      if (hatcheryLog && !activeHatcheryReport) {
        setActiveHatcheryReport(hatcheryLog);
      }

      const livestockLog = userLogs.find(r => 
        r.department === Department.FISHERY && 
        (r.inventoryType === InventoryType.LIVESTOCK || r.formData?.ponds)
      );
      if (livestockLog && !activeLivestockReport) {
        setActiveLivestockReport(livestockLog);
      }

      const assetLog = userLogs.find(r => 
        r.department === Department.FISHERY && 
        (r.inventoryType === InventoryType.ASSET || r.formData?.feedsInventory)
      );
      if (assetLog && !activeAssetReport) {
        setActiveAssetReport(assetLog);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserReports();
  }, [user]);

  // Handle single row save for Hatchery — saves data & keeps user on the same page with locked view (NO REDIRECT)
  const handleSaveSingleRow = async (
    rowIndex: number, 
    batch: FisheryHatcheryBatchData, 
    allBatches: FisheryHatcheryBatchData[]
  ) => {
    const firstBatch = allBatches[0]?.batchNumber || 'Batch';
    const effectiveTitle = `Hatchery Log - ${firstBatch}`;
    const computerName = getComputerName();

    if (activeHatcheryReport) {
      const updated = await updateReport(activeHatcheryReport.id, {
        title: effectiveTitle,
        content: `Hatchery log updated with ${allBatches.length} batch entries (Row #${rowIndex + 1} locked).`,
        formData: {
          batches: allBatches,
          generalNotes: activeHatcheryReport.formData?.generalNotes
        },
        status: ReportStatus.PENDING_MANAGER,
        updatedAt: Date.now()
      });

      if (updated) {
        setActiveHatcheryReport(updated);
      }

      await createAuditLog(
        user.fullName,
        user.email,
        'HATCHERY_ROW_LOCKED_SAVED',
        `Hatchery batch row #${rowIndex + 1} (${batch.batchNumber || `Row ${rowIndex + 1}`}) confirmed and permanently locked by ${user.fullName}`
      );
    } else {
      const newReportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newReport: Report = {
        id: newReportId,
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        department: Department.FISHERY,
        inventoryType: InventoryType.HATCHERY,
        section: FisherySection.HATCHERY,
        title: effectiveTitle,
        content: `Hatchery Section batch record (${allBatches.length} batch rows).`,
        timestamp: Date.now(),
        status: ReportStatus.PENDING_MANAGER,
        computerName,
        formData: {
          batches: allBatches
        }
      };

      await createReport(newReport);
      setActiveHatcheryReport(newReport);

      await createAuditLog(
        user.fullName,
        user.email,
        'HATCHERY_ROW_CREATED_LOCKED',
        `New hatchery batch row #${rowIndex + 1} (${batch.batchNumber || 'New'}) created and locked by ${user.fullName}`
      );
    }

    setSubmitSuccess(`Hatchery log saved & locked in place. You remain on this page.`);
    setTimeout(() => setSubmitSuccess(null), 4000);

    // Refresh background list without redirecting
    const all = await getReports();
    const userLogs = all.filter(r => r.userId === user.id || r.email.toLowerCase() === user.email.toLowerCase());
    setReports(userLogs);
  };

  // Handle request change for locked batch from Staff Dashboard
  const handleRequestChange = async (batchIndex: number, batch: FisheryHatcheryBatchData, reason: string) => {
    const repId = activeHatcheryReport?.id || `rep_hatchery_${user.id}`;
    await createHatcheryChangeRequest({
      reportId: repId,
      batchIndex,
      batchNumber: `${batch.batchNumber} Batch`,
      requestedBy: user.fullName,
      requestedByEmail: user.email,
      reason
    });
    fetchUserReports();
  };

  // Handle single row save for Livestock Pond — saves data & keeps user on same page (NO REDIRECT)
  const handleSaveLivestockPond = async (
    pondIndex: number,
    pond: FisheryLivestockPondData,
    allPonds: FisheryLivestockPondData[]
  ) => {
    const effectiveTitle = `${selectedDept} Livestock Inventory`;
    const computerName = getComputerName();

    if (activeLivestockReport) {
      const updated = await updateReport(activeLivestockReport.id, {
        title: effectiveTitle,
        content: `Livestock inventory updated with ${allPonds.length} pond rows (${pond.pondNo} locked).`,
        formData: { ponds: allPonds },
        status: ReportStatus.PENDING_MANAGER,
        updatedAt: Date.now()
      });
      if (updated) setActiveLivestockReport(updated);
      await createAuditLog(
        user.fullName,
        user.email,
        'LIVESTOCK_POND_LOCKED_SAVED',
        `Pond ${pond.pondNo} locked and saved by ${user.fullName}`
      );
    } else {
      const newReportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newReport: Report = {
        id: newReportId,
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        department: selectedDept,
        inventoryType: InventoryType.LIVESTOCK,
        section: FisherySection.GROW_OUT,
        title: effectiveTitle,
        content: `Livestock inventory record (${allPonds.length} ponds).`,
        timestamp: Date.now(),
        status: ReportStatus.PENDING_MANAGER,
        computerName,
        formData: { ponds: allPonds }
      };
      await createReport(newReport);
      setActiveLivestockReport(newReport);
      await createAuditLog(
        user.fullName,
        user.email,
        'LIVESTOCK_POND_CREATED_LOCKED',
        `New livestock pond ${pond.pondNo} created and locked by ${user.fullName}`
      );
    }

    setSubmitSuccess(`Pond log saved & locked in place. You remain on this page.`);
    setTimeout(() => setSubmitSuccess(null), 4000);

    const all = await getReports();
    const userLogs = all.filter(r => r.userId === user.id || r.email.toLowerCase() === user.email.toLowerCase());
    setReports(userLogs);
  };

  // Handle request change for locked pond
  const handleRequestLivestockChange = async (pondIndex: number, pond: FisheryLivestockPondData, reason: string) => {
    const repId = activeLivestockReport?.id || `rep_livestock_${user.id}`;
    await createHatcheryChangeRequest({
      reportId: repId,
      batchIndex: pondIndex,
      batchNumber: pond.pondNo,
      requestedBy: user.fullName,
      requestedByEmail: user.email,
      reason
    });
    fetchUserReports();
  };

  // Handle save for Asset Inventory — saves data & keeps user on same page (NO REDIRECT)
  const handleSaveAssetSection = async (sectionName: string, data: FisheryAssetFormData) => {
    const effectiveTitle = `${selectedDept} Asset Inventory`;
    const computerName = getComputerName();

    if (activeAssetReport) {
      const updated = await updateReport(activeAssetReport.id, {
        title: effectiveTitle,
        content: `Asset inventory updated and locked.`,
        formData: data,
        status: ReportStatus.PENDING_MANAGER,
        updatedAt: Date.now()
      });
      if (updated) setActiveAssetReport(updated);
      await createAuditLog(
        user.fullName,
        user.email,
        'ASSET_INVENTORY_LOCKED_SAVED',
        `Asset inventory locked and saved by ${user.fullName}`
      );
    } else {
      const newReportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newReport: Report = {
        id: newReportId,
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        department: selectedDept,
        inventoryType: InventoryType.ASSET,
        section: FisherySection.GROW_OUT,
        title: effectiveTitle,
        content: `Asset inventory record.`,
        timestamp: Date.now(),
        status: ReportStatus.PENDING_MANAGER,
        computerName,
        formData: data
      };
      await createReport(newReport);
      setActiveAssetReport(newReport);
      await createAuditLog(
        user.fullName,
        user.email,
        'ASSET_INVENTORY_CREATED_LOCKED',
        `New asset inventory created and locked by ${user.fullName}`
      );
    }

    setSubmitSuccess(`Asset log saved & locked in place. You remain on this page.`);
    setTimeout(() => setSubmitSuccess(null), 4000);

    const all = await getReports();
    const userLogs = all.filter(r => r.userId === user.id || r.email.toLowerCase() === user.email.toLowerCase());
    setReports(userLogs);
  };

  // Handle request change for locked asset
  const handleRequestAssetChange = async (sectionName: string, reason: string) => {
    const repId = activeAssetReport?.id || `rep_asset_${user.id}`;
    await createHatcheryChangeRequest({
      reportId: repId,
      batchIndex: 0,
      batchNumber: sectionName || 'Asset Inventory',
      requestedBy: user.fullName,
      requestedByEmail: user.email,
      reason
    });
    fetchUserReports();
  };

  // Redo / Correction handlers for Rejected Logs
  const handleStartRedo = (report: Report) => {
    setRedoingReport(report);
    setSelectedDept(report.department);
    setSelectedInvType(report.inventoryType);
    setLogTitle(report.title || '');
    setLogContent(report.content || '');
    
    if (report.inventoryType === InventoryType.ASSET) {
      setActiveAssetReport(report);
    } else if (report.inventoryType === InventoryType.LIVESTOCK) {
      setActiveLivestockReport(report);
    } else if (report.inventoryType === InventoryType.HATCHERY) {
      setActiveHatcheryReport(report);
    }
    
    setFormResetKey(prev => prev + 1);
    setActiveTab('submit_log');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelRedo = () => {
    setRedoingReport(null);
    setLogTitle('');
    setLogContent('');
    setActiveAssetReport(null);
    setActiveLivestockReport(null);
    setFormResetKey(prev => prev + 1);
  };

  // Form submit that DOES NOT redirect to another page
  const handleFormSubmit = async (formData?: any) => {
    let effectiveTitle = logTitle.trim();
    if (selectedInvType === InventoryType.ASSET) {
      effectiveTitle = `${selectedDept} Asset Inventory`;
    } else if (selectedInvType === InventoryType.HATCHERY) {
      const firstBatch = formData?.batches?.[0]?.batchNumber || 'Batch';
      effectiveTitle = logTitle.trim() || `${selectedDept} Hatchery Transfer - ${firstBatch}`;
    } else if (selectedInvType === InventoryType.LIVESTOCK) {
      effectiveTitle = logTitle.trim() || `${selectedDept} Livestock Inventory`;
    }

    if (selectedInvType !== InventoryType.ASSET && selectedInvType !== InventoryType.HATCHERY && selectedInvType !== InventoryType.LIVESTOCK && !effectiveTitle) {
      alert('Please enter a title for your farm log entry.');
      return;
    }
    setIsSubmitting(true);

    try {
      const computerName = getComputerName();

      if (redoingReport) {
        // Redoing and Resubmitting a Rejected Log
        await resubmitReport(redoingReport.id, {
          formData: formData !== undefined ? formData : redoingReport.formData,
          title: effectiveTitle || redoingReport.title,
          content: logContent.trim() || redoingReport.content || `Redone submission by ${user.fullName}`,
          redoNotes: `Redone after rejection notes: ${redoingReport.rejectionReason || ''}`,
          resubmittedBy: user.fullName
        });

        // Create Notification for Manager
        await createNotification({
          userId: 'manager_group',
          userEmail: 'manager@accadfarms.com',
          title: '🔄 Farm Log Redone & Resubmitted',
          message: `${user.fullName} has redone and resubmitted "${formatLogName(redoingReport)}" for review.`,
          type: 'warning'
        });

        await createAuditLog(
          user.fullName,
          user.email,
          'LOG_REDONE_RESUBMITTED',
          `Staff ${user.fullName} redone and resubmitted rejected log "${formatLogName(redoingReport)}" with corrections`
        );

        setSubmitSuccess('Rejected farm log successfully redone and resubmitted! Flagged for Sector Manager & ED review.');
        setRedoingReport(null);
      } else {
        // Standard New Log Submission
        const newReportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const section = selectedInvType === InventoryType.HATCHERY 
          ? FisherySection.HATCHERY 
          : FisherySection.GROW_OUT;

        const newReport: Report = {
          id: newReportId,
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          department: selectedDept,
          inventoryType: selectedInvType,
          section,
          title: effectiveTitle,
          content: logContent.trim() || `${selectedDept} ${selectedInvType} Submission`,
          timestamp: Date.now(),
          status: ReportStatus.PENDING_MANAGER,
          computerName,
          formData: formData || null
        };

        await createReport(newReport);

        // Create Notification for Manager
        await createNotification({
          userId: 'manager_group',
          userEmail: 'manager@accadfarms.com',
          title: 'New Farm Log Submitted',
          message: `New farm log pending review: "${formatLogName(newReport)}" from ${user.fullName}`,
          type: 'info'
        });

        setSubmitSuccess('Farm log successfully submitted! Forms collapsed to clean default state for new entry.');
      }

      setLogTitle('');
      setLogContent('');
      setFormResetKey(prev => prev + 1);
      setActiveAssetReport(null);
      setActiveLivestockReport(null);

      setTimeout(() => {
        setSubmitSuccess(null);
      }, 4000);

      await fetchUserReports();

    } catch (e: any) {
      alert('Submission failed: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-8 font-sans overflow-x-hidden">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden border border-emerald-800/40">
        
        <div className="space-y-1.5 sm:space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-800/60 border border-emerald-700/60 px-2.5 sm:px-3.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-widest uppercase">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" />
            <span>Staff Inventory Portal</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase">Welcome, {user.fullName}</h1>
          <p className="text-[10px] sm:text-xs text-emerald-200 font-medium">
            Department: <strong className="text-white">{user.department || 'General'}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 relative z-10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('submit_log')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'submit_log'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Submit / Edit Farm Log</span>
          </button>
          <button
            onClick={() => setActiveTab('my_logs')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
              activeTab === 'my_logs'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            My Logs ({reports.length})
          </button>
        </div>

      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Rejected Logs Alert Section */}
      {reports.filter(r => r.status === ReportStatus.REJECTED_BY_MANAGER || r.status === ReportStatus.REJECTED_BY_ED).length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 p-5 rounded-3xl space-y-3 shadow-md animate-fadeIn">
          <div className="flex items-center space-x-2 text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-tight">
              Action Required: {reports.filter(r => r.status === ReportStatus.REJECTED_BY_MANAGER || r.status === ReportStatus.REJECTED_BY_ED).length} Rejected Log(s) Pending Correction
            </h3>
          </div>
          <p className="text-xs text-rose-800 font-medium">
            Your Sector Manager has reviewed and rejected the log(s) below. Please review the feedback, click <strong>"Redo & Resubmit"</strong>, make your adjustments, and resubmit for review.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {reports.filter(r => r.status === ReportStatus.REJECTED_BY_MANAGER || r.status === ReportStatus.REJECTED_BY_ED).map(r => (
              <div key={r.id} className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                      {r.department} &bull; {r.inventoryType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {new Date(r.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 mt-1.5">{formatLogName(r)}</h4>
                  <div className="mt-2 bg-rose-50/80 p-2.5 rounded-xl border border-rose-100 text-xs text-rose-900">
                    <span className="text-[10px] font-black uppercase text-rose-700 block">Manager's Rejection Note:</span>
                    <p className="italic font-medium mt-0.5">"{r.rejectionReason || 'Please review and adjust log entries.'}"</p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    onClick={() => setSelectedReportForModal(r)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleStartRedo(r)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redo & Resubmit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content View */}
      {activeTab === 'my_logs' ? (
        <FarmLogsTable
          reports={reports}
          user={user}
          onRefresh={fetchUserReports}
          onRedo={handleStartRedo}
          onViewDetails={(report) => setSelectedReportForModal(report)}
        />
      ) : (
        /* Submit / Edit Farm Log Form View (User stays on this page) */
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
          
          {/* Active Redo / Correction Mode Notice */}
          {redoingReport && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 space-y-2 shadow-xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-5 h-5 text-amber-700 shrink-0" />
                  <h4 className="text-xs font-black uppercase tracking-tight text-amber-900">
                    Redo & Correction Mode: {formatLogName(redoingReport)}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCancelRedo}
                  className="text-[11px] font-extrabold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                >
                  Cancel Redo
                </button>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs">
                <span className="text-[10px] font-black uppercase text-rose-700 block">Manager Rejection Feedback:</span>
                <p className="italic font-medium text-slate-800 mt-0.5">"{redoingReport.rejectionReason || 'Please review and adjust log entries.'}"</p>
              </div>
              <p className="text-[11px] text-amber-800 font-medium">
                Make your corrections in the form below and click Submit to resubmit this log to the Sector Manager.
              </p>
            </div>
          )}

          <div className="border-b border-slate-200 pb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
              {redoingReport ? 'Correction Entry' : 'Standard Form'}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">
              {redoingReport ? 'Redo & Resubmit Farm Log' : 'Submit & Record Daily Farm Log'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {redoingReport ? 'Update the values as requested by your manager and submit for re-evaluation.' : 'Save each row or section to lock entry permanently in-place'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Grow-Out Operational Forms (Select to Switch)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
              {/* Form 1: Asset Inventory */}
              <button
                type="button"
                onClick={() => setSelectedInvType(InventoryType.ASSET)}
                className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-start space-x-3 cursor-pointer active:scale-[0.99] ${
                  selectedInvType === InventoryType.ASSET
                    ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-transparent border-transparent hover:bg-white/60 text-slate-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  selectedInvType === InventoryType.ASSET ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-black uppercase tracking-tight truncate ${
                    selectedInvType === InventoryType.ASSET ? 'text-emerald-950 font-black' : 'text-slate-800'
                  }`}>
                    1. Asset Inventory (Feeds & Machines)
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                    Feed inventory, machinery health & equipment maintenance
                  </div>
                  {selectedInvType === InventoryType.ASSET && (
                    <span className="inline-flex items-center space-x-1 mt-1.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Active Form</span>
                    </span>
                  )}
                </div>
              </button>

              {/* Form 2: Livestock Inventory */}
              <button
                type="button"
                onClick={() => setSelectedInvType(InventoryType.LIVESTOCK)}
                className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-start space-x-3 cursor-pointer active:scale-[0.99] ${
                  selectedInvType === InventoryType.LIVESTOCK
                    ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-transparent border-transparent hover:bg-white/60 text-slate-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  selectedInvType === InventoryType.LIVESTOCK ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Fish className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-black uppercase tracking-tight truncate ${
                    selectedInvType === InventoryType.LIVESTOCK ? 'text-emerald-950 font-black' : 'text-slate-800'
                  }`}>
                    2. Livestock Inventory (Ponds & Fish)
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                    Commercial fish stock, pond batches, and daily mortality
                  </div>
                  {selectedInvType === InventoryType.LIVESTOCK && (
                    <span className="inline-flex items-center space-x-1 mt-1.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Active Form</span>
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {selectedInvType !== InventoryType.ASSET && selectedInvType !== InventoryType.HATCHERY && selectedInvType !== InventoryType.LIVESTOCK && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Log Title *</label>
              <input
                type="text"
                required
                value={logTitle}
                onChange={(e) => setLogTitle(e.target.value)}
                placeholder="e.g. Daily Morning Feed & Water Quality Audit"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all"
              />
            </div>
          )}

          {/* Form component depending on department & type */}
          {selectedDept === Department.FISHERY && selectedInvType === InventoryType.ASSET ? (
            <FisheryAssetForm 
              key={`asset_${formResetKey}`}
              initialData={activeAssetReport?.formData}
              reportId={activeAssetReport?.id}
              currentUser={{ fullName: user.fullName, email: user.email }}
              onSubmit={handleFormSubmit} 
              isSubmitting={isSubmitting} 
            />
          ) : selectedDept === Department.FISHERY && selectedInvType === InventoryType.LIVESTOCK ? (
            <FisheryLivestockForm 
              key={`livestock_${formResetKey}`}
              initialData={activeLivestockReport?.formData}
              reportId={activeLivestockReport?.id}
              currentUser={{ fullName: user.fullName, email: user.email }}
              onSubmit={handleFormSubmit} 
              isSubmitting={isSubmitting} 
            />
          ) : selectedDept === Department.FISHERY && selectedInvType === InventoryType.HATCHERY ? (
            <FisheryHatcheryForm 
              key={`hatchery_${formResetKey}`}
              initialData={activeHatcheryReport?.formData}
              reportId={activeHatcheryReport?.id}
              currentUser={{ fullName: user.fullName, email: user.email }}
              onSubmit={handleFormSubmit} 
              onSaveSingleRow={handleSaveSingleRow}
              onRequestChange={handleRequestChange}
              isSubmitting={isSubmitting} 
            />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Log Details / Narrative *</label>
                <textarea
                  rows={6}
                  required
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder="Enter complete details, observation notes, and operational status..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl p-4 text-xs font-medium outline-none transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => handleFormSubmit()}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs uppercase shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Save Farm Log</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* Modal for Details */}
      {selectedReportForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setSelectedReportForModal(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              ✕
            </button>
            <ReportDetails report={selectedReportForModal} />
          </div>
        </div>
      )}

    </div>
  );
};
