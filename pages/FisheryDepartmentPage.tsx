import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Role, Department, InventoryType, FisherySection, Report, ReportStatus, FisheryHatcheryFormData, getHatcheryBatchStage } from '../types';
import { getReports, createReport, updateReport, createNotification, createAuditLog } from '../lib/insforge';
import { FisheryHatcheryForm } from '../components/FisheryHatcheryForm';
import { ReportDetails } from '../components/ReportDetails';
import { formatLogName, getComputerName } from '../lib/exportUtils';
import { 
  Fish, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  ChevronRight, 
  CheckCircle2, 
  Package, 
  Activity, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Waves, 
  Egg,
  TrendingUp,
  Droplets,
  Building2,
  ArrowLeft,
  Edit3,
  Plus,
  RefreshCw,
  Clock,
  Check,
  Eye,
  FileSpreadsheet
} from 'lucide-react';

interface FisheryDepartmentPageProps {
  user: User | null;
}

export const FisheryDepartmentPage: React.FC<FisheryDepartmentPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<FisherySection | null>(null);
  const [hatcheryReports, setHatcheryReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  // Editing state
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReportForModal, setSelectedReportForModal] = useState<Report | null>(null);

  const loadHatcheryLogs = async () => {
    setLoading(true);
    try {
      const allReports = await getReports();
      const hLogs = allReports.filter(r => 
        r.department === Department.FISHERY && 
        (r.inventoryType === InventoryType.HATCHERY || r.section === FisherySection.HATCHERY || r.formData?.batches)
      );
      setHatcheryReports(hLogs);
    } catch (e) {
      console.error('Error loading hatchery logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHatcheryLogs();
  }, []);

  const handleStartNewBatch = () => {
    setEditingReport(null);
    setIsFormOpen(true);
  };

  const handleEditBatch = (report: Report) => {
    setEditingReport(report);
    setIsFormOpen(true);
  };

  const handleHatcherySubmit = async (formData: FisheryHatcheryFormData, isDraft: boolean = false) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const computerName = getComputerName();
      const firstBatch = formData.batches?.[0]?.batchNumber || 'Batch';
      const effectiveTitle = `Hatchery Log - ${firstBatch}`;
      const status = user.role === Role.EXECUTIVE_DIRECTOR 
        ? ReportStatus.APPROVED 
        : isDraft 
          ? ReportStatus.PENDING_MANAGER 
          : ReportStatus.PENDING_MANAGER;

      if (editingReport) {
        // Progressive update of existing record
        await updateReport(editingReport.id, {
          title: effectiveTitle,
          content: `Hatchery log updated progressively (${formData.batches?.length || 1} batches).`,
          formData,
          status,
          updatedAt: Date.now()
        });

        await createAuditLog(
          user.fullName,
          user.email,
          'HATCHERY_LOG_PROGRESS_UPDATED',
          `Hatchery log "${editingReport.title}" updated progressively by ${user.fullName} (${isDraft ? 'Progress Saved' : 'Submitted'})`
        );

        setSubmitSuccess(isDraft ? 'Hatchery progress saved! Updated in real-time on ED Dashboard.' : 'Hatchery log updated and submitted for review!');
      } else {
        // Create new ongoing record
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
          content: `Hatchery Section progressive entry (${formData.batches?.length || 1} batches recorded).`,
          timestamp: Date.now(),
          status,
          edApprovedBy: user.role === Role.EXECUTIVE_DIRECTOR ? user.fullName : undefined,
          computerName,
          formData
        };

        await createReport(newReport);

        await createAuditLog(
          user.fullName,
          user.email,
          'HATCHERY_LOG_CREATED',
          `New hatchery log "${effectiveTitle}" created by ${user.fullName}`
        );

        if (user.role !== Role.EXECUTIVE_DIRECTOR) {
          await createNotification({
            userId: 'manager_group',
            userEmail: 'manager@accadfarms.com',
            title: 'Hatchery Log Entry Registered',
            message: `Hatchery log "${formatLogName(newReport)}" updated by ${user.fullName}`,
            type: 'info'
          });
        }

        setSubmitSuccess('New hatchery batch log created! Synced in real-time across dashboards.');
      }

      await loadHatcheryLogs();
      setEditingReport(null);
      setIsFormOpen(false);

      setTimeout(() => {
        setSubmitSuccess(null);
      }, 3500);

    } catch (e: any) {
      alert('Submission failed: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregated Hatchery Metrics
  let totalTransferredCount = 0;
  let activeBatchesCount = 0;
  hatcheryReports.forEach(r => {
    const batches = r.formData?.batches || [];
    batches.forEach((b: any) => {
      activeBatchesCount++;
      totalTransferredCount += Number(b.totalTransferredFingerlings) || 0;
    });
  });

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white pb-16">
      
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
            <Link to="/" className="hover:text-emerald-700 transition-colors flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 font-black">Fishery Department</span>
            {selectedSection && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-900 font-black">{selectedSection}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (isFormOpen) setIsFormOpen(false);
                else if (selectedSection) setSelectedSection(null);
                else navigate(-1);
              }}
              className="inline-flex items-center space-x-1 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isFormOpen ? 'Back to Batch List' : selectedSection ? 'Back to Sections' : 'Back'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-8">
        
        {/* Department Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-6 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden border border-emerald-800/40">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center space-x-2 bg-emerald-800/70 border border-emerald-600/50 px-3.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-emerald-200">
              <Waves className="w-3.5 h-3.5 text-emerald-400" />
              <span>Aquaculture Operations Hub</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight">
              Fishery Department
            </h1>
            
            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-2xl leading-relaxed">
              Precision aquaculture system unifying the commercial <strong>Growth-Out Section</strong> and the progressive <strong>Hatchery Section</strong>.
            </p>
          </div>
        </div>

        {submitSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-3 shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
        )}

        {/* The Two Main Containers/Sections Overview */}
        {!selectedSection ? (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Operational Divisions</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">Select Department Section</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">Choose a division below to access logs or submit records</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              
              {/* CONTAINER 1: Growth-Out Section (Preset) */}
              <div className="bg-white border border-slate-200 hover:border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-5">
                  
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                      <Fish className="w-7 h-7" />
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                      Preset & Active
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                      1. Growth-Out Section
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                      The core commercial grow-out operations of the Fishery Department. Manages mature fish ponds, feeding schedules, water quality parameters, and physical assets.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Asset & Feed Store</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <Waves className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Pond Water Audits</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Mortality Logs</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Growth Monitoring</span>
                    </div>
                  </div>

                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (user) navigate('/staff');
                      else navigate('/login');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Enter Growth-Out Section</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

              {/* CONTAINER 2: Hatchery Section (Progressive Updates) */}
              <div className="bg-white border-2 border-emerald-600/40 hover:border-emerald-600 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="space-y-5 relative z-10">
                  
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white transition-colors shadow-sm">
                      <Egg className="w-7 h-7" />
                    </div>
                    <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>Progressive Logging</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                      2. Hatchery Section
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                      Artificial breeding, incubation, feeding timeline, and fingerling transfers. Supports progressive updates across days and weeks as data evolves.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Broodstock Sourcing</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Feeding Milestones</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <Droplets className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Fingerling Weights</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Grow-Out Transfers</span>
                    </div>
                  </div>

                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 relative z-10">
                  <button
                    onClick={() => setSelectedSection(FisherySection.HATCHERY)}
                    className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Manage Hatchery Batches & Forms</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

            </div>

          </div>
        ) : (
          /* HATCHERY SECTION WORKSPACE (List + Progressive Form) */
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Section Summary & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-black">
                  <Egg className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Hatchery Operations Workspace</h2>
                  <p className="text-xs text-slate-500 font-medium">Record progressive logs across breeding, feeding, and pond transfer milestones</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleStartNewBatch}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-200 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Hatchery Batch</span>
                </button>

                <button
                  onClick={() => {
                    setIsFormOpen(false);
                    setSelectedSection(null);
                  }}
                  className="text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Switch Division
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400">Recorded Hatchery Logs</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{hatcheryReports.length}</p>
                <span className="text-[11px] font-bold text-slate-500 mt-1 block">Live synced with ED Dashboard</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400">Total Batches Tracked</span>
                <p className="text-2xl font-black text-purple-900 mt-1">{activeBatchesCount} Batches</p>
                <span className="text-[11px] font-bold text-purple-600 mt-1 block">Multi-stage progression</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400">Transferred Fingerlings</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{totalTransferredCount.toLocaleString()} Fish</p>
                <span className="text-[11px] font-bold text-emerald-700 mt-1 block">Moved to Grow-Out Ponds</span>
              </div>
            </div>

            {/* Form View (if active) or Ongoing Batches List */}
            {isFormOpen ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    {editingReport ? `Editing: ${editingReport.title}` : 'Creating New Hatchery Batch Entry'}
                  </h3>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Cancel & Return to Batch List
                  </button>
                </div>

                <FisheryHatcheryForm
                  initialData={editingReport?.formData as FisheryHatcheryFormData}
                  reportId={editingReport?.id}
                  onCancel={() => setIsFormOpen(false)}
                  onSubmit={handleHatcherySubmit}
                  isSubmitting={isSubmitting}
                />
              </div>
            ) : (
              /* Ongoing & Recorded Batches Table */
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      Ongoing & Recorded Hatchery Batches
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Click "Update / Edit" on any batch to add progressive milestones</p>
                  </div>
                  <button
                    onClick={loadHatcheryLogs}
                    className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {hatcheryReports.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Egg className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-600">No Hatchery logs recorded yet.</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Start by recording broodstock sourcing and incubation dates. You can update feeding and grow-out transfers later.
                    </p>
                    <button
                      onClick={handleStartNewBatch}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider inline-flex items-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create First Hatchery Batch</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hatcheryReports.map((report) => {
                      const batches: any[] = report.formData?.batches || [];
                      const primaryBatch = batches[0] || {};
                      const stageInfo = getHatcheryBatchStage(primaryBatch);
                      const dateStr = new Date(report.timestamp).toLocaleDateString();
                      const lastUpdatedStr = report.updatedAt ? new Date(report.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                      return (
                        <div
                          key={report.id}
                          className="bg-slate-50/70 border border-slate-200 hover:border-emerald-400 p-4 sm:p-5 rounded-2xl transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">{report.title}</span>
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${stageInfo.badgeColor}`}>
                                {stageInfo.stage} ({stageInfo.progressPercent}%)
                              </span>
                              <span className="text-[10px] font-extrabold text-slate-400">
                                Logged by: {report.fullName || report.email}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-black block">Broodstock Source</span>
                                <span className="font-bold text-slate-800">{primaryBatch.sourceOfBroodstock || 'Pending'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-black block">Hatch Date</span>
                                <span className="font-bold text-slate-800">{primaryBatch.hatcheryDate || 'Pending'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-black block">Fingerlings Transferred</span>
                                <span className="font-bold text-emerald-700">{primaryBatch.totalTransferredFingerlings ? `${Number(primaryBatch.totalTransferredFingerlings).toLocaleString()} Fish` : 'Pending Transfer'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-black block">Destination Pond</span>
                                <span className="font-bold text-slate-800">{primaryBatch.destinatedPondTransferred || 'Pending'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress bar and Action buttons */}
                          <div className="flex items-center space-x-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200">
                            <button
                              onClick={() => setSelectedReportForModal(report)}
                              className="px-3.5 py-2 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            <button
                              onClick={() => handleEditBatch(report)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-200 active:scale-95"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Update / Progress Log</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>

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
