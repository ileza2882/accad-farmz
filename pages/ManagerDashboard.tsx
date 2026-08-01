import React, { useState, useEffect } from 'react';
import { User, Report, ReportStatus, Department } from '../types';
import { getReports, updateReportStatus, createNotification, createAuditLog } from '../lib/insforge';
import { ReportDetails } from '../components/ReportDetails';
import { FarmLogsTable } from '../components/FarmLogsTable';
import { formatLogName, getComputerName } from '../lib/exportUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Check, 
  X,
  Layers,
  BarChart3,
  Sparkles,
  Users,
  ShieldAlert
} from 'lucide-react';

interface ManagerDashboardProps {
  user: User;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ user }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Rejection modal state
  const [rejectionReport, setRejectionReport] = useState<Report | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const all = await getReports();
      // Filter logs belonging to manager's department or all logs
      const deptLogs = user.department 
        ? all.filter(r => r.department === user.department)
        : all;
      setReports(deptLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleApprove = async (report: Report) => {
    setIsProcessing(true);
    try {
      await updateReportStatus(
        report.id,
        ReportStatus.PENDING_ED,
        undefined,
        user.fullName,
        undefined
      );

      await createAuditLog(
        user.fullName,
        user.email,
        'MANAGER_APPROVED_LOG',
        `Manager ${user.fullName} approved farm log "${formatLogName(report)}" submitted by ${report.fullName || report.email}`
      );

      await createNotification({
        userId: report.userId,
        userEmail: report.email,
        title: 'Log Approved by Manager',
        message: `✅ Your farm log "${formatLogName(report)}" was approved by manager (${user.fullName}) and forwarded for ED final review.`,
        type: 'success'
      });

      await createNotification({
        userId: 'ed_user_1',
        userEmail: 'info@accadfarms.com',
        title: 'Farm Log Pending ED Approval',
        message: `Farm log "${formatLogName(report)}" approved by Manager (${user.fullName}) and pending final ED approval.`,
        type: 'info'
      });

      setActionMessage(`Log "${formatLogName(report)}" approved and forwarded to ED!`);
      setSelectedReport(null);
      await fetchReports();

      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert('Approval failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReport || !rejectionReason.trim()) {
      alert('Please provide a mandatory reason for rejection.');
      return;
    }
    setIsProcessing(true);

    try {
      await updateReportStatus(
        rejectionReport.id,
        ReportStatus.REJECTED_BY_MANAGER,
        rejectionReason.trim(),
        user.fullName,
        undefined
      );

      await createAuditLog(
        user.fullName,
        user.email,
        'MANAGER_REJECTED_LOG',
        `Manager ${user.fullName} rejected farm log "${formatLogName(rejectionReport)}" with reason: ${rejectionReason.trim()}`
      );

      await createNotification({
        userId: rejectionReport.userId,
        userEmail: rejectionReport.email,
        title: 'Farm Log Rejected by Manager',
        message: `❌ Farm log rejected. Reason: ${rejectionReason.trim()}`,
        type: 'error'
      });

      setActionMessage(`Log "${formatLogName(rejectionReport)}" rejected.`);
      setRejectionReport(null);
      setRejectionReason('');
      setSelectedReport(null);
      await fetchReports();

      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert('Rejection failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingReports = reports.filter(r => r.status === ReportStatus.PENDING_MANAGER);
  const approvedReports = reports.filter(r => r.status === ReportStatus.APPROVED || r.status === ReportStatus.PENDING_ED);

  // Department Chart Data
  const statusCounts = [
    { name: 'Pending Review', count: pendingReports.length },
    { name: 'Vetted / Approved', count: approvedReports.length },
    { name: 'Rejected', count: reports.filter(r => r.status.includes('rejected')).length }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-8 font-sans overflow-x-hidden">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 text-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden border border-blue-800/40">
        
        <div className="space-y-1.5 sm:space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-blue-800/60 border border-blue-700/60 px-2.5 sm:px-3.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-widest uppercase">
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-300" />
            <span>Manager Review Portal</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase">Manager Portal</h1>
          <p className="text-[10px] sm:text-xs text-blue-200 font-medium">
            Manager: <strong className="text-white">{user.fullName}</strong>
            <span className="hidden sm:inline"> &bull; Sector: <strong className="text-white">{user.department || 'All Departments'}</strong></span>
          </p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 relative z-10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            Pending ({pendingReports.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            All Logs ({reports.length})
          </button>
        </div>

      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Manager Summary Cards & Recharts Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-1 sm:space-y-2">
            <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Pending</span>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">{pendingReports.length}</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:block">Logs requiring vetting</p>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-1 sm:space-y-2">
            <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Approved</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{approvedReports.length}</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:block">Approved by Manager or ED</p>
          </div>
        </div>

        {/* Manager Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-900">Sector Vetting Status Breakdown</h3>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusCounts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Spacious Filterable Logs Table */}
      <FarmLogsTable
        reports={activeTab === 'pending' ? pendingReports : reports}
        user={user}
        onRefresh={fetchReports}
        onApprove={handleApprove}
        onReject={(report) => setRejectionReport(report)}
        onViewDetails={(report) => setSelectedReport(report)}
      />

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
            <ReportDetails report={selectedReport} />

            {selectedReport.status === ReportStatus.PENDING_MANAGER && (
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setRejectionReport(selectedReport);
                    setSelectedReport(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-50 active:scale-95 transition-all"
                >
                  Reject Log
                </button>
                <button
                  onClick={() => handleApprove(selectedReport)}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Approve Log</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {rejectionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-2 text-rose-700 font-extrabold uppercase text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Reject Farm Log Entry</span>
            </div>
            
            <p className="text-xs text-slate-600 font-medium">
              Please state the mandatory reason for rejecting log <strong>"{formatLogName(rejectionReport)}"</strong>.
            </p>

            <textarea
              rows={4}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide reason for rejection (e.g. Invalid feed weight entry, missing pond photo)..."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 rounded-xl p-3 text-xs font-medium outline-none transition-all"
            />

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setRejectionReport(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
