import React, { useState } from 'react';
import { Report, ReportStatus, Department, InventoryType, User, Role } from '../types';
import { formatLogName, exportLogToPDF, exportLogToWord, formatStatusLabel, getComputerName } from '../lib/exportUtils';
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Eye, 
  Check, 
  X, 
  ArrowUpDown, 
  FileSpreadsheet, 
  Monitor, 
  Calendar, 
  User as UserIcon, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface FarmLogsTableProps {
  reports: Report[];
  user: User;
  onRefresh?: () => void;
  onApprove?: (report: Report) => Promise<void>;
  onReject?: (report: Report) => void;
  onViewDetails?: (report: Report) => void;
}

export const FarmLogsTable: React.FC<FarmLogsTableProps> = ({
  reports,
  user,
  onRefresh,
  onApprove,
  onReject,
  onViewDetails
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [invTypeFilter, setInvTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'title' | 'status'>('date_desc');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter & Sort Logic
  const filteredReports = reports.filter((r) => {
    const logName = formatLogName(r).toLowerCase();
    const matchesSearch = 
      logName.includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.computerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesDept = deptFilter === 'ALL' || r.department === deptFilter;
    const matchesInv = invTypeFilter === 'ALL' || r.inventoryType === invTypeFilter;

    return matchesSearch && matchesStatus && matchesDept && matchesInv;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') return b.timestamp - a.timestamp;
    if (sortBy === 'date_asc') return a.timestamp - b.timestamp;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    return 0;
  });

  const handlePDFExport = (report: Report) => {
    setExportingId(report.id + '_pdf');
    setTimeout(() => {
      exportLogToPDF(report);
      setExportingId(null);
    }, 150);
  };

  const handleWordExport = (report: Report) => {
    setExportingId(report.id + '_word');
    setTimeout(() => {
      exportLogToWord(report);
      setExportingId(null);
    }, 150);
  };

  const handleApproveAction = async (report: Report) => {
    if (!onApprove) return;
    setProcessingId(report.id);
    try {
      await onApprove(report);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden font-sans space-y-4">
      
      {/* Table Controls & Filter Toolbar */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black text-emerald-800 uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Standardized Registry</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mt-1 uppercase tracking-tight">AccadFarms Farm Logs Table</h3>
            <p className="text-xs text-slate-500 font-medium">Naming Convention: <code className="font-mono bg-white px-2 py-0.5 rounded border text-emerald-700">Inventory Type- Date - Sender Name</code></p>
          </div>

          <div className="flex items-center space-x-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center space-x-2 text-xs font-bold"
                title="Refresh Table Data"
              >
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <span>Refresh</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search log name, user, computer, department..."
              className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value={ReportStatus.PENDING_MANAGER}>Pending Manager</option>
              <option value={ReportStatus.PENDING_ED}>Pending ED</option>
              <option value={ReportStatus.APPROVED}>Fully Approved</option>
              <option value={ReportStatus.REJECTED_BY_MANAGER}>Rejected Manager</option>
              <option value={ReportStatus.REJECTED_BY_ED}>Rejected ED</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value={Department.FISHERY}>Fishery</option>
              <option value={Department.POULTRY}>Poultry</option>
              <option value={Department.CATTLE}>Cattle</option>
              <option value={Department.PIGS}>Pigs</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="title">Log Title (A-Z)</option>
              <option value="status">Log Status</option>
            </select>
          </div>

        </div>
      </div>

      {/* Farm Logs Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <th className="py-4 px-6">Standardized Log Name</th>
              <th className="py-4 px-4">Inventory & Sector</th>
              <th className="py-4 px-4">Submitted Date</th>
              <th className="py-4 px-4">User & Workstation</th>
              <th className="py-4 px-4">Log Status</th>
              <th className="py-4 px-6 text-right">Actions / Sheet Exports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-bold space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-600 font-extrabold">No Farm Logs Found</p>
                  <p className="text-xs text-slate-400">Try adjusting your search terms or filter criteria.</p>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const logName = formatLogName(report);
                const computer = report.computerName || getComputerName();
                const isExportingPdf = exportingId === report.id + '_pdf';
                const isExportingWord = exportingId === report.id + '_word';
                const isProcessing = processingId === report.id;

                return (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Log Name Column */}
                    <td className="py-4 px-6">
                      <div className="flex items-start space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm tracking-tight">{logName}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 font-medium mt-0.5">{report.content}</div>
                        </div>
                      </div>
                    </td>

                    {/* Inventory Type & Dept */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                        <span>{report.department}</span>
                        <span>•</span>
                        <span className="text-emerald-700">{report.inventoryType}</span>
                      </div>
                    </td>

                    {/* Submitted Date */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    {/* User & Workstation */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-slate-900 font-extrabold text-[11px]">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{report.fullName || report.email}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono mt-0.5">
                        <Monitor className="w-3 h-3 text-slate-400" />
                        <span>{computer}</span>
                      </div>
                    </td>

                    {/* Log Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                        report.status === ReportStatus.APPROVED ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        report.status === ReportStatus.PENDING_ED ? 'bg-purple-100 text-purple-800 border-purple-300' :
                        report.status === ReportStatus.PENDING_MANAGER ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        <span>{formatStatusLabel(report.status)}</span>
                      </span>
                    </td>

                    {/* Actions & Export Buttons */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        
                        {/* View Details Button */}
                        {onViewDetails && (
                          <button
                            onClick={() => onViewDetails(report)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {/* PDF Download Button */}
                        <button
                          onClick={() => handlePDFExport(report)}
                          disabled={isExportingPdf}
                          className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all active:scale-95 disabled:opacity-50"
                          title="Download AccadFarms PDF Sheet"
                        >
                          {isExportingPdf ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>PDF</span>
                        </button>

                        {/* Word Download Button */}
                        <button
                          onClick={() => handleWordExport(report)}
                          disabled={isExportingWord}
                          className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all active:scale-95 disabled:opacity-50"
                          title="Download AccadFarms Word Sheet (.doc)"
                        >
                          {isExportingWord ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          )}
                          <span>Word</span>
                        </button>

                        {/* Quick Approve Button */}
                        {onApprove && ((user.role === Role.MANAGER && report.status === ReportStatus.PENDING_MANAGER) || (user.role === Role.EXECUTIVE_DIRECTOR && (report.status === ReportStatus.PENDING_ED || report.status === ReportStatus.PENDING_MANAGER))) && (
                          <button
                            onClick={() => handleApproveAction(report)}
                            disabled={isProcessing}
                            className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Quick Reject Button */}
                        {onReject && ((user.role === Role.MANAGER && report.status === ReportStatus.PENDING_MANAGER) || (user.role === Role.EXECUTIVE_DIRECTOR && (report.status === ReportStatus.PENDING_ED || report.status === ReportStatus.PENDING_MANAGER))) && (
                          <button
                            onClick={() => onReject(report)}
                            className="flex items-center space-x-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
