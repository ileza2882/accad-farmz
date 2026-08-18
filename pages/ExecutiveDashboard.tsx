import React, { useState, useEffect } from 'react';
import { User, Role, Report, ReportStatus, AuditLog, Department, InventoryType, FisherySection, HatcheryChangeRequest, FisheryHatcheryBatchData, FisheryLivestockPondData } from '../types';
import { getUsers, getReports, updateReportStatus, getAuditLogs, createNotification, createAuditLog, createReport, clearAllReports, getHatcheryChangeRequests, reviewHatcheryChangeRequest } from '../lib/insforge';
import { UserRegistrationModal } from '../components/UserRegistrationModal';
import { UserManagementTable } from '../components/UserManagementTable';
import { ReportDetails } from '../components/ReportDetails';
import { FarmLogsTable } from '../components/FarmLogsTable';
import { FisheryAssetForm } from '../components/FisheryAssetForm';
import { FisheryLivestockForm } from '../components/FisheryLivestockForm';
import { FisheryHatcheryForm } from '../components/FisheryHatcheryForm';
import { formatLogName, getComputerName } from '../lib/exportUtils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart, 
  Area 
} from 'recharts';
import { 
  Users, 
  UserPlus, 
  CheckSquare, 
  Activity, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  Check, 
  X,
  Plus,
  FileText,
  Layers,
  Sparkles,
  BarChart3,
  TrendingUp,
  Download,
  Filter,
  Calendar,
  Zap,
  Award,
  Waves,
  Egg,
  Fish,
  Building2,
  FolderArchive,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface ExecutiveDashboardProps {
  user: User;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ user }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);
  const [hatcheryChangeRequests, setHatcheryChangeRequests] = useState<HatcheryChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'all_logs' | 'approvals' | 'manager_hub' | 'staff_entry' | 'users' | 'analytics' | 'audit'>('all_logs');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Department & Log Type Organization State for ED Central Dashboard
  const [selectedDashboardDept, setSelectedDashboardDept] = useState<string>('ALL');
  const [selectedFisherySection, setSelectedFisherySection] = useState<'ALL' | 'GROW_OUT' | 'HATCHERY'>('ALL');

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [rejectionReport, setRejectionReport] = useState<Report | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Staff Entry state for ED
  const [selectedDept, setSelectedDept] = useState<Department>(Department.FISHERY);
  const [selectedInvType, setSelectedInvType] = useState<InventoryType>(InventoryType.ASSET);
  const [logTitle, setLogTitle] = useState('');
  const [logContent, setLogContent] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  // Analytics Filter States
  const [analyticsTimeFilter, setAnalyticsTimeFilter] = useState<'ALL' | '30DAYS' | '7DAYS'>('ALL');
  const [analyticsDeptFilter, setAnalyticsDeptFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, r, a, c] = await Promise.all([
        getUsers(),
        getReports(),
        getAuditLogs(),
        getHatcheryChangeRequests()
      ]);
      setUsersList(u);
      setReportsList(r);
      setAuditLogsList(a);
      setHatcheryChangeRequests(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewChangeRequest = async (requestId: string, approve: boolean) => {
    setIsActionProcessing(true);
    try {
      await reviewHatcheryChangeRequest(requestId, approve, user.fullName, user.email);
      setActionMessage(`Change Request ${approve ? 'Approved & Batch Unlocked' : 'Rejected'}.`);
      await loadData();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e: any) {
      alert('Failed to process request: ' + e.message);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleEDApprove = async (report: Report) => {
    setIsActionProcessing(true);
    try {
      await updateReportStatus(
        report.id,
        ReportStatus.APPROVED,
        undefined,
        report.managerApprovedBy || user.fullName,
        user.fullName
      );

      await createAuditLog(
        user.fullName,
        user.email,
        'ED_FINAL_APPROVAL',
        `ED ${user.fullName} granted final approval for farm log "${formatLogName(report)}"`
      );

      await createNotification({
        userId: report.userId,
        userEmail: report.email,
        title: 'Farm Log Fully Approved',
        message: `✅ Your farm log "${formatLogName(report)}" has been fully approved by Executive Director (${user.fullName}).`,
        type: 'success'
      });

      setActionMessage(`Final ED approval granted for "${formatLogName(report)}"`);
      setSelectedReport(null);
      await loadData();

      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert('Approval failed: ' + e.message);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleEDConfirmReject = async () => {
    if (!rejectionReport || !rejectionReason.trim()) {
      alert('Please state the mandatory reason for rejection.');
      return;
    }
    setIsActionProcessing(true);

    try {
      await updateReportStatus(
        rejectionReport.id,
        ReportStatus.REJECTED_BY_ED,
        rejectionReason.trim(),
        rejectionReport.managerApprovedBy,
        user.fullName
      );

      await createAuditLog(
        user.fullName,
        user.email,
        'ED_REJECTED_LOG',
        `ED ${user.fullName} rejected farm log "${formatLogName(rejectionReport)}" with reason: ${rejectionReason.trim()}`
      );

      await createNotification({
        userId: rejectionReport.userId,
        userEmail: rejectionReport.email,
        title: 'Farm Log Rejected by ED',
        message: `❌ Farm log rejected by ED. Reason: ${rejectionReason.trim()}`,
        type: 'error'
      });

      setActionMessage(`Log "${formatLogName(rejectionReport)}" rejected by ED.`);
      setRejectionReport(null);
      setRejectionReason('');
      setSelectedReport(null);
      await loadData();

      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert('Rejection failed: ' + e.message);
    } finally {
      setIsActionProcessing(false);
      setRejectionReport(null);
    }
  };

  const handleClearOldLogs = async () => {
    const confirmText = "Are you sure you want to REMOVE ALL old farm log records and start afresh? This will permanently delete old log entries from the database.";
    if (!window.confirm(confirmText)) return;

    setIsActionProcessing(true);
    try {
      await clearAllReports();
      await loadData();
      setActionMessage("All old farm log records have been permanently cleared from database. Starting afresh!");
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e: any) {
      alert("Failed clearing old logs: " + e.message);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleEDFormSubmit = async (formData?: any) => {
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
    setIsActionProcessing(true);

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
        content: logContent.trim() || `${selectedDept} ${selectedInvType} ED Direct Log Submission`,
        timestamp: Date.now(),
        status: ReportStatus.APPROVED,
        edApprovedBy: user.fullName,
        computerName,
        formData: formData || null
      };

      await createReport(newReport);

      await createAuditLog(
        user.fullName,
        user.email,
        'ED_DIRECT_LOG_ENTRY',
        `Executive Director created and auto-approved log "${formatLogName(newReport)}"`
      );

      setSubmitSuccess('Direct farm log created and auto-approved successfully!');
      setLogTitle('');
      setLogContent('');
      await loadData();

      setTimeout(() => {
        setSubmitSuccess(null);
        setActiveTab('all_logs');
      }, 1500);

    } catch (e: any) {
      alert('Direct submission failed: ' + e.message);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleEDSaveSingleRow = async (
    rowIndex: number,
    batch: FisheryHatcheryBatchData,
    allBatches: FisheryHatcheryBatchData[]
  ) => {
    const firstBatch = allBatches[0]?.batchNumber || 'Batch';
    const effectiveTitle = `Hatchery Log - ${firstBatch}`;
    const computerName = getComputerName();
    const newReportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newReport: Report = {
      id: newReportId,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      department: selectedDept,
      inventoryType: InventoryType.HATCHERY,
      section: FisherySection.HATCHERY,
      title: effectiveTitle,
      content: `Hatchery Section ED entry (${allBatches.length} batch rows).`,
      timestamp: Date.now(),
      status: ReportStatus.APPROVED,
      edApprovedBy: user.fullName,
      computerName,
      formData: { batches: allBatches }
    };

    await createReport(newReport);
    await createAuditLog(
      user.fullName,
      user.email,
      'ED_HATCHERY_ROW_SAVED',
      `ED confirmed and locked hatchery batch row #${rowIndex + 1} (${batch.batchNumber})`
    );
    await loadData();
  };

  const handleEDSaveLivestockPond = async (
    pondIndex: number,
    pond: FisheryLivestockPondData,
    allPonds: FisheryLivestockPondData[]
  ) => {
    const effectiveTitle = `Grow-Out Livestock - ${pond.pondNo}`;
    const computerName = getComputerName();
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
      content: `Grow-Out Pond ED entry (${allPonds.length} ponds).`,
      timestamp: Date.now(),
      status: ReportStatus.APPROVED,
      edApprovedBy: user.fullName,
      computerName,
      formData: { ponds: allPonds }
    };

    await createReport(newReport);
    await createAuditLog(
      user.fullName,
      user.email,
      'ED_LIVESTOCK_POND_SAVED',
      `ED confirmed and locked livestock pond #${pondIndex + 1} (${pond.pondNo})`
    );
    await loadData();
  };

  const handleEDSaveAssetSection = async (
    sectionName: string,
    data: any
  ) => {
    const effectiveTitle = `${selectedDept} Asset Inventory`;
    const computerName = getComputerName();
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
      content: `Asset Section ED entry.`,
      timestamp: Date.now(),
      status: ReportStatus.APPROVED,
      edApprovedBy: user.fullName,
      computerName,
      formData: data
    };

    await createReport(newReport);
    await createAuditLog(
      user.fullName,
      user.email,
      'ED_ASSET_SAVED',
      `ED confirmed and locked asset inventory`
    );
    await loadData();
  };

  // Filter and breakdown calculations for Department & Log Type Organization
  const pendingEDReports = reportsList.filter(r => r.status === ReportStatus.PENDING_ED);
  const pendingManagerReports = reportsList.filter(r => r.status === ReportStatus.PENDING_MANAGER);
  const approvedReports = reportsList.filter(r => r.status === ReportStatus.APPROVED);
  const pendingChangeRequests = hatcheryChangeRequests.filter(c => c.status === 'PENDING');

  // Department counts
  const fisheryReports = reportsList.filter(r => r.department === Department.FISHERY);
  const growOutReports = fisheryReports.filter(r => 
    r.section === FisherySection.GROW_OUT || 
    r.inventoryType === InventoryType.LIVESTOCK || 
    r.inventoryType === InventoryType.ASSET || 
    Boolean(r.formData?.ponds && r.formData.ponds.length > 0) || 
    Boolean(r.formData?.feedsInventory)
  );
  const hatcheryReports = fisheryReports.filter(r => 
    r.section === FisherySection.HATCHERY || 
    r.inventoryType === InventoryType.HATCHERY || 
    Boolean(r.formData?.batches && r.formData.batches.length > 0)
  );
  const poultryReports = reportsList.filter(r => r.department === Department.POULTRY);
  const cattleReports = reportsList.filter(r => r.department === Department.CATTLE);
  const pigsReports = reportsList.filter(r => r.department === Department.PIGS);

  // Fishery detailed stats
  let totalGrowOutFish = 0;
  let totalGrowOutPonds = 0;
  let totalGrowOutMortality = 0;
  growOutReports.forEach(r => {
    if (r.formData?.ponds && Array.isArray(r.formData.ponds)) {
      r.formData.ponds.forEach((p: any) => {
        totalGrowOutPonds++;
        totalGrowOutFish += Number(p.quantityOfFish) || 0;
        totalGrowOutMortality += Number(p.mortality) || 0;
      });
    }
  });

  let totalHatcheryBatches = 0;
  let totalHatcheryFingerlings = 0;
  hatcheryReports.forEach(r => {
    if (r.formData?.batches && Array.isArray(r.formData.batches)) {
      r.formData.batches.forEach((b: any) => {
        totalHatcheryBatches++;
        totalHatcheryFingerlings += Number(b.totalTransferredFingerlings) || 0;
      });
    }
  });

  const getAnalyticsData = () => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const filtered = reportsList.filter(r => {
      const matchesTime = 
        analyticsTimeFilter === '7DAYS' ? r.timestamp >= sevenDaysAgo :
        analyticsTimeFilter === '30DAYS' ? r.timestamp >= thirtyDaysAgo : true;
      
      const matchesDept = analyticsDeptFilter === 'ALL' || r.department === analyticsDeptFilter;
      return matchesTime && matchesDept;
    });

    const approvedCount = filtered.filter(r => r.status === ReportStatus.APPROVED).length;
    const pendingEDCount = filtered.filter(r => r.status === ReportStatus.PENDING_ED).length;
    const pendingManagerCount = filtered.filter(r => r.status === ReportStatus.PENDING_MANAGER).length;
    const rejectedCount = filtered.filter(r => r.status.includes('rejected')).length;

    const totalCount = filtered.length || 1;
    const approvalRate = ((approvedCount / totalCount) * 100).toFixed(1);

    let totalFeedsKg = 0;
    filtered.forEach(r => {
      if (r.formData?.feedsInventory?.items) {
        r.formData.feedsInventory.items.forEach((item: any) => {
          totalFeedsKg += Number(item.quantityKg) || 0;
        });
      }
      if (r.formData?.feedStorage?.totalFeedInStoreKg) {
        totalFeedsKg += Number(r.formData.feedStorage.totalFeedInStoreKg) || 0;
      }
    });

    const deptMap: Record<string, number> = {
      Fishery: 0,
      Poultry: 0,
      Cattle: 0,
      Pigs: 0
    };
    filtered.forEach(r => {
      if (r.department) {
        deptMap[r.department] = (deptMap[r.department] || 0) + 1;
      }
    });
    const sectorChartData = Object.entries(deptMap).map(([name, count]) => ({ name, count }));

    const statusPieData = [
      { name: 'ED Approved', value: approvedCount, color: '#059669' },
      { name: 'Pending ED', value: pendingEDCount, color: '#9333ea' },
      { name: 'Pending Manager', value: pendingManagerCount, color: '#3b82f6' },
      { name: 'Rejected', value: rejectedCount, color: '#e11d48' }
    ].filter(s => s.value > 0);

    const dateMap: Record<string, number> = {};
    const days = 10;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dateMap[dateStr] = 0;
    }
    filtered.forEach(r => {
      const dateStr = new Date(r.timestamp).toISOString().split('T')[0];
      if (dateMap[dateStr] !== undefined) {
        dateMap[dateStr]++;
      }
    });
    const trendChartData = Object.entries(dateMap).map(([date, submissions]) => ({
      date: date.substring(5),
      submissions
    }));

    return {
      filteredReports: filtered,
      approvedCount,
      pendingEDCount,
      pendingManagerCount,
      rejectedCount,
      approvalRate,
      totalFeedsKg,
      totalHatcheryFingerlings,
      totalHatcheryBatches,
      sectorChartData,
      statusPieData,
      trendChartData
    };
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-8 font-sans">
      
      {/* Executive Portal Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-slate-950 text-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden border border-purple-800/40">
        
        <div className="relative z-10 space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center space-x-2 bg-purple-800/60 border border-purple-700/60 px-2.5 sm:px-3.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-widest uppercase">
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-300" />
            <span>Executive Governance Hub</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase">ED Portal</h1>
          <p className="text-[10px] sm:text-xs text-purple-200 font-medium break-all sm:break-normal">
            Admin: <strong className="text-white">{user.fullName}</strong>
            <span className="hidden sm:inline"> ({user.email})</span>
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register User</span>
          </button>
        </div>

      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Metrics Summary Panels Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        
        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Accounts</span>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{usersList.length}</div>
          <p className="text-[10px] sm:text-[11px] text-emerald-600 font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{usersList.filter(u => u.status === 'active').length} Active</span>
          </p>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Logs Total</span>
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{reportsList.length}</div>
          <p className="text-[10px] sm:text-[11px] text-purple-600 font-bold">
            {pendingEDReports.length} Pending ED
          </p>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Mgr Queue</span>
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{pendingManagerReports.length}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Manager Review</p>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Approved</span>
            <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{approvedReports.length}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">ED Authorized</p>
        </div>

      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        
        <button
          onClick={() => setActiveTab('all_logs')}
          className={`flex items-center space-x-2 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'all_logs'
              ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Department Reports Hub ({reportsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center space-x-2 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'approvals'
              ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-purple-400" />
          <span>ED Approvals ({pendingEDReports.length + pendingChangeRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('manager_hub')}
          className={`flex items-center space-x-2 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'manager_hub'
              ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Manager Vetting Hub ({pendingManagerReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff_entry')}
          className={`flex items-center space-x-2 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'staff_entry'
              ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>ED Direct Entry</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-2 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-purple-900 text-white shadow-lg shadow-purple-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Audit Trail ({auditLogsList.length})</span>
        </button>

      </div>

      {/* ===== TAB 1: DEPARTMENT & LOG TYPE GOVERNANCE HUB ===== */}
      {activeTab === 'all_logs' && (
        <div className="space-y-6">
          
          {/* Department & Log Type Categorization Navigator */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 bg-purple-100 border border-purple-200 px-3 py-1 rounded-full">
                  Executive Department Registry
                </span>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1.5">
                  Categorized Operational Ledger
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select a department to view records. Fishery is subdivided into <strong>Grow-Out</strong> and <strong>Hatchery</strong> sections. Other departments are displayed in a general department view.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleClearOldLogs}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  title="Clear all database logs and reset"
                >
                  Clear Old Logs
                </button>
              </div>
            </div>

            {/* Department Level Selector */}
            <div className="space-y-3">
              <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider">
                Select Department:
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                
                {/* Global View */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDashboardDept('ALL');
                    setSelectedFisherySection('ALL');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    selectedDashboardDept === 'ALL'
                      ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Unified</span>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black uppercase">All Departments</div>
                    <div className="text-[11px] font-bold opacity-80">{reportsList.length} Total Logs</div>
                  </div>
                </button>

                {/* Fishery Department */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDashboardDept(Department.FISHERY);
                    setSelectedFisherySection('ALL');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    selectedDashboardDept === Department.FISHERY
                      ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-300'
                      : 'bg-emerald-50/50 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Subdivided</span>
                    <Fish className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black uppercase">Fishery</div>
                    <div className="text-[11px] font-bold opacity-80">{fisheryReports.length} Reports (2 Sections)</div>
                  </div>
                </button>

                {/* Poultry Department */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDashboardDept(Department.POULTRY);
                    setSelectedFisherySection('ALL');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    selectedDashboardDept === Department.POULTRY
                      ? 'bg-orange-700 text-white shadow-md ring-2 ring-orange-300'
                      : 'bg-orange-50/50 border-orange-200 text-orange-950 hover:bg-orange-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">General View</span>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black uppercase">Poultry</div>
                    <div className="text-[11px] font-bold opacity-80">{poultryReports.length} Reports</div>
                  </div>
                </button>

                {/* Cattle Department */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDashboardDept(Department.CATTLE);
                    setSelectedFisherySection('ALL');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    selectedDashboardDept === Department.CATTLE
                      ? 'bg-amber-700 text-white shadow-md ring-2 ring-amber-300'
                      : 'bg-amber-50/50 border-amber-200 text-amber-950 hover:bg-amber-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">General View</span>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black uppercase">Cattle</div>
                    <div className="text-[11px] font-bold opacity-80">{cattleReports.length} Reports</div>
                  </div>
                </button>

                {/* Pigs Department */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDashboardDept(Department.PIGS);
                    setSelectedFisherySection('ALL');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    selectedDashboardDept === Department.PIGS
                      ? 'bg-rose-700 text-white shadow-md ring-2 ring-rose-300'
                      : 'bg-rose-50/50 border-rose-200 text-rose-950 hover:bg-rose-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">General View</span>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black uppercase">Pigs</div>
                    <div className="text-[11px] font-bold opacity-80">{pigsReports.length} Reports</div>
                  </div>
                </button>

              </div>
            </div>

            {/* Fishery Sub-Section / Log Type Selector */}
            {selectedDashboardDept === Department.FISHERY && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center space-x-1.5">
                    <Waves className="w-4 h-4 text-emerald-700" />
                    <span>Fishery Log Categories (Grow-Out vs Hatchery):</span>
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-white px-2.5 py-0.5 rounded-md border border-emerald-200">
                    {fisheryReports.length} Total Fishery Logs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* All Fishery */}
                  <button
                    type="button"
                    onClick={() => setSelectedFisherySection('ALL')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFisherySection === 'ALL'
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="text-xs font-black uppercase">All Fishery Logs</div>
                    <div className="text-[10px] opacity-80 font-medium">Combined Grow-Out & Hatchery ({fisheryReports.length})</div>
                  </button>

                  {/* Grow-Out Section */}
                  <button
                    type="button"
                    onClick={() => setSelectedFisherySection('GROW_OUT')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFisherySection === 'GROW_OUT'
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1 text-xs font-black uppercase">
                      <Waves className="w-3.5 h-3.5" />
                      <span>Grow-Out Section</span>
                    </div>
                    <div className="text-[10px] opacity-80 font-medium">
                      Livestock Ponds & Assets ({growOutReports.length} logs)
                    </div>
                  </button>

                  {/* Hatchery Section */}
                  <button
                    type="button"
                    onClick={() => setSelectedFisherySection('HATCHERY')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFisherySection === 'HATCHERY'
                        ? 'bg-purple-900 text-white border-purple-950 shadow-sm ring-2 ring-purple-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1 text-xs font-black uppercase">
                      <Egg className="w-3.5 h-3.5 text-amber-300" />
                      <span>Hatchery Section</span>
                    </div>
                    <div className="text-[10px] opacity-80 font-medium">
                      Progressive Batch Ledgers ({hatcheryReports.length} logs)
                    </div>
                  </button>

                </div>
              </div>
            )}

            {/* Category Key Metrics Banner */}
            {selectedDashboardDept === Department.FISHERY && selectedFisherySection === 'GROW_OUT' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Total Ponds Logged</span>
                  <span className="text-base font-black text-emerald-800">{totalGrowOutPonds} Ponds</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Fish in Grow-Out</span>
                  <span className="text-base font-black text-emerald-800">{totalGrowOutFish.toLocaleString()} Fish</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Grow-Out Mortality</span>
                  <span className="text-base font-black text-rose-600">{totalGrowOutMortality} Fish</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Grow-Out Logs</span>
                  <span className="text-base font-black text-slate-800">{growOutReports.length} Submitted</span>
                </div>
              </div>
            ) : selectedDashboardDept === Department.FISHERY && selectedFisherySection === 'HATCHERY' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/40 p-4 rounded-2xl border border-purple-200 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Hatchery Batches</span>
                  <span className="text-base font-black text-purple-900">{totalHatcheryBatches} Batches</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Transferred Fingerlings</span>
                  <span className="text-base font-black text-purple-900">{totalHatcheryFingerlings.toLocaleString()} Fish</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Pending Unlock Requests</span>
                  <span className="text-base font-black text-amber-700">{pendingChangeRequests.length} Requests</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Hatchery Logs</span>
                  <span className="text-base font-black text-slate-800">{hatcheryReports.length} Submitted</span>
                </div>
              </div>
            ) : selectedDashboardDept !== 'ALL' && selectedDashboardDept !== Department.FISHERY ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">{selectedDashboardDept} Department</span>
                  <span className="font-extrabold text-slate-800">
                    Displaying all logs submitted for {selectedDashboardDept} under the general department view.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedDept(selectedDashboardDept as Department);
                    setActiveTab('staff_entry');
                  }}
                  className="px-3.5 py-1.5 bg-purple-900 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  + Direct {selectedDashboardDept} Entry
                </button>
              </div>
            ) : null}

          </div>

          {/* Farm Logs Table Filtered by Department and Category */}
          <FarmLogsTable
            reports={reportsList}
            user={user}
            selectedDept={selectedDashboardDept}
            selectedSection={selectedFisherySection}
            onDepartmentChange={(dept) => setSelectedDashboardDept(dept)}
            onSectionChange={(sec) => setSelectedFisherySection(sec as any)}
            onRefresh={loadData}
            onApprove={handleEDApprove}
            onReject={(report) => setRejectionReport(report)}
            onViewDetails={(report) => setSelectedReport(report)}
          />

        </div>
      )}

      {/* ===== TAB 2: ED FINAL APPROVALS & CHANGE REQUESTS ===== */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          
          {/* HATCHERY CHANGE REQUESTS QUEUE */}
          {pendingChangeRequests.length > 0 && (
            <div className="bg-amber-50/80 border-2 border-amber-300 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-black">
                    <AlertTriangle className="w-4 h-4 text-amber-800" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Hatchery Log Change Requests ({pendingChangeRequests.length})
                    </h4>
                    <p className="text-xs text-amber-900 font-medium">
                      Staff requested authorization to unlock and correct permanently locked hatchery records
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingChangeRequests.map((req) => (
                  <div key={req.id} className="bg-white border border-amber-200 rounded-2xl p-4 space-y-3 shadow-xs flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="bg-amber-100 text-amber-900 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full">
                          {req.batchNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {new Date(req.requestedAt).toLocaleDateString()} {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900">
                        Requested by: <span className="text-purple-900">{req.requestedBy}</span> ({req.requestedByEmail})
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
                        <span className="text-[10px] text-slate-400 uppercase font-black block">Stated Reason for Change:</span>
                        <p className="italic text-slate-800 mt-0.5">"{req.reason}"</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleReviewChangeRequest(req.id, true)}
                        disabled={isActionProcessing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1 transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Unlock</span>
                      </button>

                      <button
                        onClick={() => handleReviewChangeRequest(req.id, false)}
                        disabled={isActionProcessing}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject Request</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Farm Logs Pending Executive Authorization</h3>
              <p className="text-xs text-slate-500 font-medium">Logs vetted by Managers awaiting ED final signature</p>
            </div>

            <button
              onClick={loadData}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-purple-700" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 font-bold">Loading pending ED approvals...</div>
          ) : pendingEDReports.length === 0 ? (
            <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-3 shadow-sm">
              <CheckSquare className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Farm Logs Awaiting ED Final Approval</h3>
              <p className="text-xs text-slate-400">All manager-vetted logs have been authorized.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingEDReports.map((r) => (
                <div key={r.id} className="bg-white border border-slate-200 hover:border-purple-400 p-6 rounded-3xl shadow-sm transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                        {r.department} • {r.inventoryType}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(r.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-slate-900">{formatLogName(r)}</h4>
                    <p className="text-xs font-bold text-slate-700 mt-1">Submitted by: {r.fullName || r.email}</p>
                    {r.managerApprovedBy && (
                      <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">Manager Vetted: {r.managerApprovedBy}</p>
                    )}
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">{r.content}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                      Pending ED Final Approval
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setRejectionReport(r)}
                        className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleEDApprove(r)}
                        disabled={isActionProcessing}
                        className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isActionProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 3: MANAGER VETTING HUB ===== */}
      {activeTab === 'manager_hub' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Manager Vetting Oversight Hub</h3>
              <p className="text-xs text-slate-500 font-medium">Inspect and directly authorize logs pending sector manager review across all departments</p>
            </div>

            <button
              onClick={loadData}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-purple-700" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 font-bold">Loading manager pending logs...</div>
          ) : pendingManagerReports.length === 0 ? (
            <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-3 shadow-sm">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Logs Pending Manager Vetting</h3>
              <p className="text-xs text-slate-400">All submitted logs have passed manager-level review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingManagerReports.map((r) => (
                <div key={r.id} className="bg-white border border-slate-200 hover:border-blue-400 p-6 rounded-3xl shadow-sm transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        {r.department} • {r.inventoryType}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(r.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-slate-900">{formatLogName(r)}</h4>
                    <p className="text-xs font-bold text-slate-700 mt-1">Staff: {r.fullName || r.email}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">{r.content}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                      Pending Manager Review
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setRejectionReport(r)}
                        className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleEDApprove(r)}
                        disabled={isActionProcessing}
                        className="flex items-center space-x-1 bg-purple-900 hover:bg-purple-950 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isActionProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Direct ED Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 4: ED DIRECT LOG ENTRY ===== */}
      {activeTab === 'staff_entry' && (
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 bg-purple-100 border border-purple-200 px-3 py-1 rounded-full">
              Executive Direct Entry Mode
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">Submit New Log Entry</h2>
            <p className="text-xs text-slate-500 font-medium">Direct log creation by Executive Director (Auto-Approved upon submission)</p>
          </div>

          {submitSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Target Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value as Department)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value={Department.FISHERY}>Fishery Department</option>
                <option value={Department.POULTRY}>Poultry Department</option>
                <option value={Department.CATTLE}>Cattle Department</option>
                <option value={Department.PIGS}>Pigs Department</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Inventory / Section Type</label>
              <select
                value={selectedInvType}
                onChange={(e) => setSelectedInvType(e.target.value as InventoryType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer"
              >
                <optgroup label="Grow-Out Section">
                  <option value={InventoryType.ASSET}>Asset Inventory (Feeds & Machines)</option>
                  <option value={InventoryType.LIVESTOCK}>Livestock Inventory (Ponds & Fish)</option>
                </optgroup>
                <optgroup label="Hatchery Section">
                  <option value={InventoryType.HATCHERY}>Hatchery Record (Fingerling Transfers)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {selectedDept === Department.FISHERY && selectedInvType === InventoryType.ASSET ? (
            <FisheryAssetForm 
              currentUser={{ fullName: user.fullName, email: user.email }}
              onSubmit={handleEDFormSubmit} 
              onSaveSingleRow={handleEDSaveAssetSection}
              isSubmitting={isActionProcessing} 
            />
          ) : selectedDept === Department.FISHERY && selectedInvType === InventoryType.LIVESTOCK ? (
            <FisheryLivestockForm 
              currentUser={{ fullName: user.fullName, email: user.email }}
              onSubmit={handleEDFormSubmit} 
              onSaveSingleRow={handleEDSaveLivestockPond}
              isSubmitting={isActionProcessing} 
            />
          ) : selectedDept === Department.FISHERY && selectedInvType === InventoryType.HATCHERY ? (
            <FisheryHatcheryForm 
              currentUser={{ fullName: user.fullName, email: user.email }}
              onSubmit={handleEDFormSubmit} 
              onSaveSingleRow={handleEDSaveSingleRow}
              isSubmitting={isActionProcessing} 
            />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Log Title *</label>
                <input
                  type="text"
                  required
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  placeholder={`e.g. ${selectedDept} Department Operational Audit`}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Log Details / Narrative *</label>
                <textarea
                  rows={6}
                  required
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder="Enter complete details, observation notes, and operational status..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-xl p-4 text-xs font-medium outline-none transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => handleEDFormSubmit()}
                disabled={isActionProcessing}
                className="bg-purple-900 hover:bg-purple-950 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs uppercase shadow-md transition-all active:scale-95 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isActionProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Submit ED Direct Log</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* ===== TAB 5: USER DIRECTORY & GOVERNANCE ===== */}
      {activeTab === 'users' && (
        <UserManagementTable
          users={usersList}
          onUsersUpdated={loadData}
          edUser={user}
        />
      )}

      {/* ===== TAB 6: VISUAL ANALYTICS & KPI HUB ===== */}
      {activeTab === 'analytics' && (() => {
        const analytics = getAnalyticsData();
        return (
          <div className="space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Operational Analytics</h3>
                <p className="text-xs text-slate-500 font-medium">Performance trends across Fishery, Poultry, Cattle, and Pigs</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={analyticsDeptFilter}
                  onChange={(e) => setAnalyticsDeptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="ALL">All Departments</option>
                  <option value={Department.FISHERY}>Fishery</option>
                  <option value={Department.POULTRY}>Poultry</option>
                  <option value={Department.CATTLE}>Cattle</option>
                  <option value={Department.PIGS}>Pigs</option>
                </select>

                <select
                  value={analyticsTimeFilter}
                  onChange={(e) => setAnalyticsTimeFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="ALL">All Time</option>
                  <option value="30DAYS">Last 30 Days</option>
                  <option value="7DAYS">Last 7 Days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Sector Distribution */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase">Logs by Farm Sector</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.sectorChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase">Approval Status Breakdown</h4>
                <div className="h-64 flex items-center justify-center">
                  {analytics.statusPieData.length === 0 ? (
                    <p className="text-xs text-slate-400">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.statusPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {analytics.statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

          </div>
        );
      })()}

      {/* ===== TAB 7: AUDIT TRAIL ===== */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">System Audit Trail</h3>
              <p className="text-xs text-slate-500 font-medium">Immutable log of all user actions, logins, unlocks, and authorizations</p>
            </div>
            <span className="text-xs font-black text-purple-900 bg-purple-100 px-3 py-1 rounded-full">
              {auditLogsList.length} Total Events
            </span>
          </div>

          <div className="space-y-3">
            {auditLogsList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No audit events recorded yet.</div>
            ) : (
              auditLogsList.slice(0, 50).map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-black text-[10px] uppercase">
                        {log.action}
                      </span>
                      <span className="font-bold text-slate-900">{log.userName}</span>
                      <span className="text-slate-400">({log.userEmail})</span>
                    </div>
                    <p className="text-slate-600 font-medium">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* User Registration Modal */}
      <UserRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onUserCreated={loadData}
        creator={user}
      />

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <ReportDetails report={selectedReport} />
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 relative">
            <button
              onClick={() => setRejectionReport(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">Reject Farm Log</h3>
                <p className="text-xs text-slate-500 font-medium">State the reason for rejecting {formatLogName(rejectionReport)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-700">Reason for Rejection *</label>
              <textarea
                rows={4}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify corrections needed before resubmission..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 rounded-2xl p-3.5 text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectionReport(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isActionProcessing || !rejectionReason.trim()}
                onClick={handleEDConfirmReject}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-rose-200 cursor-pointer flex items-center space-x-2 disabled:opacity-50"
              >
                {isActionProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
