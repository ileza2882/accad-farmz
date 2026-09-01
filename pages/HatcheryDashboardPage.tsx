import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Role, Department, InventoryType, FisherySection, Report, getHatcheryBatchStage } from '../types';
import { getReports, createReport } from '../lib/insforge';
import { getComputerName } from '../lib/exportUtils';
import { 
  Egg, 
  Plus, 
  ArrowRight,
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  Waves,
  Building2,
  ChevronRight,
  ArrowLeft,
  FileSpreadsheet,
  Activity,
  Calendar,
  ExternalLink,
  Lock,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface HatcheryDashboardPageProps {
  user: User | null;
}

export const HatcheryDashboardPage: React.FC<HatcheryDashboardPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [hatcheryReports, setHatcheryReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!user || (user.role !== Role.HATCHERY_MANAGER && user.role !== Role.EXECUTIVE_DIRECTOR)) {
      navigate('/hatchery', { replace: true });
    }
  }, [user, navigate]);

  const loadHatcheryLogs = async () => {
    setLoading(true);
    try {
      const allReports = await getReports();
      const hLogs = allReports.filter(r =>
        r.department === Department.FISHERY &&
        (r.inventoryType === InventoryType.HATCHERY || r.section === FisherySection.HATCHERY || r.formData?.batches)
      ).sort((a, b) => (b.updatedAt || b.timestamp) - (a.updatedAt || a.timestamp));
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

  const handleCreateNewLog = async (openInNewTab = false) => {
    setCreatingNew(true);
    try {
      const newReportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newReport: Report = {
        id: newReportId,
        userId: user?.id || 'hatchery_user',
        email: user?.email || 'hatchery@accadfarms.com',
        fullName: user?.fullName || 'Hatchery Manager',
        department: Department.FISHERY,
        inventoryType: InventoryType.HATCHERY,
        section: FisherySection.HATCHERY,
        title: 'New Hatchery Log',
        content: 'New hatchery batch record.',
        timestamp: Date.now(),
        status: 'pending_manager' as any,
        computerName: getComputerName(),
        formData: {
          batches: [
            {
              sourceOfBroodstock: 'Outside the Farm',
              batchNumber: '1st',
              hatcheryDate: '',
              firstDateOfFeeding: '',
              dateOfTransferToGrowOut: '',
              totalTransferredFingerlings: '',
              averageWeightTransferred: '',
              ageOfFingerlingsTransferred: '',
              healthStatusTransferred: 'Good',
              destinatedPondTransferred: '',
              remarks: '',
              isLocked: false,
              lockedRows: {}
            }
          ]
        }
      };

      await createReport(newReport);

      const targetUrl = `/hatchery/form/${newReportId}`;
      if (openInNewTab) {
        window.open(`${window.location.origin}/#${targetUrl}`, '_blank');
        await loadHatcheryLogs();
      } else {
        navigate(targetUrl);
      }
    } catch (e: any) {
      alert('Failed to create new log: ' + e.message);
    } finally {
      setCreatingNew(false);
    }
  };

  const handleOpenInNewTab = (reportId: string) => {
    window.open(`${window.location.origin}/#/hatchery/form/${reportId}`, '_blank');
  };

  if (!user) return null;

  // Separate in-progress vs completed
  const inProgressReports = hatcheryReports.filter(r => {
    const batches = r.formData?.batches || [];
    return batches.some((b: any) => !b.isLocked);
  });

  const completedReports = hatcheryReports.filter(r => {
    const batches = r.formData?.batches || [];
    return batches.length > 0 && batches.every((b: any) => b.isLocked);
  });

  // Aggregate stats
  const totalBatches = hatcheryReports.reduce((acc, r) => acc + (r.formData?.batches?.length || 0), 0);
  const totalFingerlings = hatcheryReports.reduce((acc, r) => {
    const batches = r.formData?.batches || [];
    return acc + batches.reduce((sum: number, b: any) => sum + (Number(b.totalTransferredFingerlings) || 0), 0);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white pb-16">
      
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
            <Link to="/" className="hover:text-emerald-700 transition-colors flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/fishery" className="hover:text-emerald-700 transition-colors">
              <span>Fishery</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 font-black">Hatchery Dashboard</span>
          </div>
          <button
            onClick={() => navigate('/fishery')}
            className="inline-flex items-center space-x-1 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-8">
        
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-teal-950 via-emerald-950 to-slate-950 text-white p-6 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden border border-teal-800/40">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTJ2NEgzNHpNNiAzNHYySDR2LTJoMnptMC0zMFYwSDR2NGgyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 bg-teal-800/70 border border-teal-600/50 px-3.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-teal-200">
                <Waves className="w-3.5 h-3.5 text-teal-400" />
                <span>Hatchery Operations Hub</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight">
                Hatchery Dashboard
              </h1>
              
              <p className="text-xs sm:text-sm text-teal-100/90 font-medium max-w-xl leading-relaxed">
                Welcome, <strong>{user.fullName}</strong>. Select an in-progress form to continue, or start a new hatchery log below.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <button
                onClick={() => handleCreateNewLog(false)}
                disabled={creatingNew}
                className="inline-flex items-center justify-center space-x-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/30 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {creatingNew ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Start New Log</span>
              </button>
              <button
                onClick={() => handleCreateNewLog(true)}
                disabled={creatingNew}
                className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                title="Open a new hatchery log in a separate browser tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span>New Log in New Tab</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Total Forms</span>
            </div>
            <span className="text-2xl font-black text-slate-900">{hatcheryReports.length}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>In Progress</span>
            </div>
            <span className="text-2xl font-black text-amber-700">{inProgressReports.length}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <Egg className="w-3.5 h-3.5 text-purple-600" />
              <span>Total Batches</span>
            </div>
            <span className="text-2xl font-black text-slate-900">{totalBatches}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              <span>Total Fingerlings</span>
            </div>
            <span className="text-2xl font-black text-emerald-700">{totalFingerlings.toLocaleString()}</span>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-600 mt-3">Loading hatchery forms...</p>
          </div>
        ) : hatcheryReports.length === 0 ? (
          /* Empty state */
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-5 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
              <Egg className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-black text-slate-900 uppercase">No Hatchery Forms Yet</h3>
              <p className="text-sm text-slate-500 font-medium">
                Start your first hatchery log to begin tracking broodstock, hatching dates, feeding timelines, and fingerling transfers.
              </p>
            </div>
            <button
              onClick={() => handleCreateNewLog(false)}
              disabled={creatingNew}
              className="inline-flex items-center space-x-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {creatingNew ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Create First Hatchery Log</span>
            </button>
          </div>
        ) : (
          /* Forms Table */
          <div className="space-y-6">
            
            {/* In-Progress Forms */}
            {inProgressReports.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        In-Progress Forms
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {inProgressReports.length} form{inProgressReports.length > 1 ? 's' : ''} with active batch records
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {inProgressReports.map((report) => {
                    const batches: any[] = report.formData?.batches || [];
                    const primaryBatch = batches[0] || {};
                    const stageInfo = getHatcheryBatchStage(primaryBatch);
                    const fingerlingTotal = batches.reduce((acc: number, b: any) => acc + (Number(b.totalTransferredFingerlings) || 0), 0);
                    const lockedBatches = batches.filter((b: any) => b.isLocked).length;
                    const lastUpdated = report.updatedAt || report.timestamp;

                    return (
                      <div
                        key={report.id}
                        className="px-6 py-4 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center gap-4"
                      >
                        {/* Form info */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-900 text-sm truncate">
                              {report.title || 'Hatchery Log'}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${stageInfo.badgeColor}`}>
                              {stageInfo.stage}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              {batches.length} batch{batches.length !== 1 ? 'es' : ''}
                            </span>
                            {lockedBatches > 0 && (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                {lockedBatches} saved
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {primaryBatch.hatcheryDate || 'No date set'}
                            </span>
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <Egg className="w-3 h-3 text-emerald-600" />
                              {fingerlingTotal.toLocaleString()} fingerlings
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Updated {new Date(lastUpdated).toLocaleDateString()} at {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenInNewTab(report.id)}
                            className="px-3 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
                            title="Open in a new browser tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>New Tab</span>
                          </button>
                          <button
                            onClick={() => navigate(`/hatchery/form/${report.id}`)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-200 active:scale-95"
                          >
                            <span>Continue Working</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Forms */}
            {completedReports.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Completed & Archived Forms
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {completedReports.length} form{completedReports.length > 1 ? 's' : ''} with all batches locked
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {completedReports.map((report) => {
                    const batches: any[] = report.formData?.batches || [];
                    const primaryBatch = batches[0] || {};
                    const fingerlingTotal = batches.reduce((acc: number, b: any) => acc + (Number(b.totalTransferredFingerlings) || 0), 0);
                    const lastUpdated = report.updatedAt || report.timestamp;

                    return (
                      <div
                        key={report.id}
                        className="px-6 py-4 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center gap-4"
                      >
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-900 text-sm truncate">
                              {report.title || 'Hatchery Log'}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-white border border-slate-700 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-300" />
                              Completed & Archived
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              {batches.length} batch{batches.length !== 1 ? 'es' : ''}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {primaryBatch.hatcheryDate || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <Egg className="w-3 h-3 text-emerald-600" />
                              {fingerlingTotal.toLocaleString()} fingerlings
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(lastUpdated).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => navigate(`/hatchery/form/${report.id}`)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                          >
                            <span>View Record</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Refresh */}
        <div className="text-center">
          <button
            onClick={loadHatcheryLogs}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
