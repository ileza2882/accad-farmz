import React, { useState, useEffect } from 'react';
import { User, Department, InventoryType, Report, ReportStatus, FisherySection } from '../types';
import { getReports, createReport, getNotifications, createNotification } from '../lib/insforge';
import { FisheryAssetForm } from '../components/FisheryAssetForm';
import { FisheryLivestockForm } from '../components/FisheryLivestockForm';
import { FisheryHatcheryForm } from '../components/FisheryHatcheryForm';
import { ReportDetails } from '../components/ReportDetails';
import { FarmLogsTable } from '../components/FarmLogsTable';
import { formatLogName, getComputerName } from '../lib/exportUtils';
import { Plus, FileText, CheckCircle2, Clock, XCircle, Filter, Eye, AlertCircle, RefreshCw, Monitor, Sparkles } from 'lucide-react';

interface StaffDashboardProps {
  user: User;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_logs' | 'submit_log'>('my_logs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Submit Log State
  const [selectedDept, setSelectedDept] = useState<Department>(user.department || Department.FISHERY);
  const [selectedInvType, setSelectedInvType] = useState<InventoryType>(InventoryType.ASSET);
  const [logTitle, setLogTitle] = useState('');
  const [logContent, setLogContent] = useState('');
  const [selectedReportForModal, setSelectedReportForModal] = useState<Report | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchUserReports = async () => {
    setLoading(true);
    try {
      const all = await getReports();
      const userLogs = all.filter(r => r.userId === user.id || r.email.toLowerCase() === user.email.toLowerCase());
      setReports(userLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserReports();
  }, [user]);

  const handleFormSubmit = async (formData?: any) => {
    let effectiveTitle = logTitle.trim();
    if (selectedInvType === InventoryType.ASSET) {
      effectiveTitle = `${selectedDept} Asset Inventory`;
    } else if (selectedInvType === InventoryType.HATCHERY) {
      const firstBatch = formData?.batches?.[0]?.batchNumber || 'Batch';
      effectiveTitle = logTitle.trim() || `${selectedDept} Hatchery Transfer - ${firstBatch}`;
    }

    if (selectedInvType !== InventoryType.ASSET && selectedInvType !== InventoryType.HATCHERY && !effectiveTitle) {
      alert('Please enter a title for your farm log entry.');
      return;
    }
    setIsSubmitting(true);

    try {
      const computerName = getComputerName();
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

      setSubmitSuccess('Farm log successfully submitted to Manager for review!');
      setLogTitle('');
      setLogContent('');

      setTimeout(() => {
        setSubmitSuccess(null);
        setActiveTab('my_logs');
        fetchUserReports();
      }, 1500);

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
            onClick={() => setActiveTab('my_logs')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
              activeTab === 'my_logs'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            My Logs ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('submit_log')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'submit_log'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Submit New Log</span>
          </button>
        </div>

      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Main Content View */}
      {activeTab === 'my_logs' ? (
        <FarmLogsTable
          reports={reports}
          user={user}
          onRefresh={fetchUserReports}
          onViewDetails={(report) => setSelectedReportForModal(report)}
        />
      ) : (
        /* Submit Farm Log Form View */
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
              Standard Form
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">Submit Daily Farm Log Entry</h2>
            <p className="text-xs text-slate-500 font-medium">Complete inventory audit entry for Manager review</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Inventory / Section Type</label>
            <select
              value={selectedInvType}
              onChange={(e) => setSelectedInvType(e.target.value as InventoryType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer"
            >
              <optgroup label="Growth-Out Section">
                <option value={InventoryType.ASSET}>Asset Inventory (Feeds & Machines)</option>
                <option value={InventoryType.LIVESTOCK}>Livestock Inventory (Ponds & Fish)</option>
              </optgroup>
              <optgroup label="Hatchery Section">
                <option value={InventoryType.HATCHERY}>Hatchery Record (Fingerling Transfers)</option>
              </optgroup>
            </select>
          </div>

          {selectedInvType !== InventoryType.ASSET && selectedInvType !== InventoryType.HATCHERY && (
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
            <FisheryAssetForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
          ) : selectedDept === Department.FISHERY && selectedInvType === InventoryType.LIVESTOCK ? (
            <FisheryLivestockForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
          ) : selectedDept === Department.FISHERY && selectedInvType === InventoryType.HATCHERY ? (
            <FisheryHatcheryForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
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
                <span>Submit Farm Log</span>
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
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold"
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
