import React, { useState, useEffect } from 'react';
import { Report, ReportStatus, Department, InventoryType, FisherySection, User, Role, getHatcheryBatchStage } from '../types';
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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Egg,
  Waves,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface FarmLogsTableProps {
  reports: Report[];
  user: User;
  selectedDept?: string;
  selectedSection?: string;
  onDepartmentChange?: (dept: string) => void;
  onSectionChange?: (sec: string) => void;
  onRefresh?: () => void;
  onApprove?: (report: Report) => Promise<void>;
  onReject?: (report: Report) => void;
  onRedo?: (report: Report) => void;
  onViewDetails?: (report: Report) => void;
}

export const FarmLogsTable: React.FC<FarmLogsTableProps> = ({
  reports,
  user,
  selectedDept = 'ALL',
  selectedSection = 'ALL',
  onDepartmentChange,
  onSectionChange,
  onRefresh,
  onApprove,
  onReject,
  onViewDetails
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>(selectedDept);
  const [sectionFilter, setSectionFilter] = useState<string>(selectedSection);
  const [invTypeFilter, setInvTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'title' | 'status'>('date_desc');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setDeptFilter(selectedDept);
  }, [selectedDept]);

  useEffect(() => {
    setSectionFilter(selectedSection);
  }, [selectedSection]);

  const handleDeptChange = (newDept: string) => {
    setDeptFilter(newDept);
    setSectionFilter('ALL');
    if (onDepartmentChange) onDepartmentChange(newDept);
    if (onSectionChange) onSectionChange('ALL');
  };

  const handleSectionChange = (newSec: string) => {
    setSectionFilter(newSec);
    if (onSectionChange) onSectionChange(newSec);
  };

  // Helper to determine if a report belongs to Hatchery vs Grow-Out
  const isHatcheryReport = (r: Report) => {
    return (
      r.section === FisherySection.HATCHERY ||
      r.inventoryType === InventoryType.HATCHERY ||
      Boolean(r.formData?.batches && r.formData.batches.length > 0)
    );
  };

  const isGrowOutReport = (r: Report) => {
    return (
      r.section === FisherySection.GROW_OUT ||
      r.inventoryType === InventoryType.LIVESTOCK ||
      r.inventoryType === InventoryType.ASSET ||
      Boolean(r.formData?.ponds && r.formData.ponds.length > 0) ||
      Boolean(r.formData?.feedsInventory)
    );
  };

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

    // Section filter (specifically for Fishery or general)
    let matchesSection = true;
    if (deptFilter === Department.FISHERY || r.department === Department.FISHERY) {
      if (sectionFilter === 'HATCHERY') {
        matchesSection = isHatcheryReport(r);
      } else if (sectionFilter === 'GROW_OUT') {
        matchesSection = isGrowOutReport(r);
      }
    }

    return matchesSearch && matchesStatus && matchesDept && matchesInv && matchesSection;
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

  const getStatusClasses = (status: string) => {
    if (status === ReportStatus.APPROVED) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (status === ReportStatus.PENDING_ED) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (status === ReportStatus.PENDING_MANAGER) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  const canApprove = (report: Report) =>
    onApprove && ((user.role === Role.MANAGER && report.status === ReportStatus.PENDING_MANAGER) || 
    (user.role === Role.EXECUTIVE_DIRECTOR && (report.status === ReportStatus.PENDING_ED || report.status === ReportStatus.PENDING_MANAGER)));

  const canReject = (report: Report) =>
    onReject && ((user.role === Role.MANAGER && report.status === ReportStatus.PENDING_MANAGER) || 
    (user.role === Role.EXECUTIVE_DIRECTOR && (report.status === ReportStatus.PENDING_ED || report.status === ReportStatus.PENDING_MANAGER)));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden font-sans space-y-4">
      
      {/* Table Controls & Filter Toolbar */}
      <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black text-emerald-800 uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Standardized Department Registry</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 uppercase tracking-tight">
              {deptFilter === 'ALL' ? 'All Farm Logs' : `${deptFilter} Department Logs`}
              {deptFilter === Department.FISHERY && sectionFilter !== 'ALL' && (
                <span className="text-purple-700 ml-2">
                  &bull; {sectionFilter === 'HATCHERY' ? 'Hatchery Section' : 'Grow-Out Section'}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Naming Convention: <code className="font-mono bg-white px-2 py-0.5 rounded border text-emerald-700">Inventory Type - Date - Submitter Name</code>
            </p>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm transition-all active:scale-95 flex items-center space-x-1.5 text-xs font-bold"
            >
              <Filter className="w-4 h-4 text-emerald-600" />
              <span>Filters</span>
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl sm:rounded-2xl shadow-sm transition-all active:scale-95 flex items-center space-x-2 text-xs font-bold cursor-pointer"
                title="Refresh Table Data"
              >
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className={`${showFilters ? 'block' : 'hidden'} sm:block space-y-3 pt-2`}>
          
          {/* Department Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDeptChange('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                deptFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Departments
            </button>

            <button
              type="button"
              onClick={() => handleDeptChange(Department.FISHERY)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                deptFilter === Department.FISHERY
                  ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Fishery</span>
            </button>

            <button
              type="button"
              onClick={() => handleDeptChange(Department.POULTRY)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                deptFilter === Department.POULTRY
                  ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
              }`}
            >
              Poultry
            </button>

            <button
              type="button"
              onClick={() => handleDeptChange(Department.CATTLE)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                deptFilter === Department.CATTLE
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50'
              }`}
            >
              Cattle
            </button>

            <button
              type="button"
              onClick={() => handleDeptChange(Department.PIGS)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                deptFilter === Department.PIGS
                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50'
              }`}
            >
              Pigs
            </button>
          </div>

          {/* Fishery Section Sub-Selector (Grow-Out vs Hatchery vs All) */}
          {deptFilter === Department.FISHERY && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl animate-fadeIn">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 px-2">
                Fishery Log Type:
              </span>

              <button
                type="button"
                onClick={() => handleSectionChange('ALL')}
                className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  sectionFilter === 'ALL'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                All Fishery Logs
              </button>

              <button
                type="button"
                onClick={() => handleSectionChange('GROW_OUT')}
                className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                  sectionFilter === 'GROW_OUT'
                    ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-400'
                    : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <Waves className="w-3.5 h-3.5" />
                <span>Grow-Out Section</span>
              </button>

              <button
                type="button"
                onClick={() => handleSectionChange('HATCHERY')}
                className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                  sectionFilter === 'HATCHERY'
                    ? 'bg-purple-900 text-white shadow-xs ring-2 ring-purple-400'
                    : 'bg-white text-purple-900 border border-purple-300 hover:bg-purple-100'
                }`}
              >
                <Egg className="w-3.5 h-3.5" />
                <span>Hatchery Section</span>
              </button>
            </div>
          )}

          {/* Secondary Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Search Box */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search log title, workstation, submitter..."
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all"
              />
            </div>

            {/* Status Filter */}
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

            {/* Sort Order */}
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

      {/* ===== DESKTOP TABLE ===== */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <th className="py-4 px-6">Standardized Log Name</th>
              <th className="py-4 px-4">Department & Log Type</th>
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
                  <p className="text-xs text-slate-400">
                    No reports match the current department ({deptFilter}) and log type filters.
                  </p>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const logName = formatLogName(report);
                const computer = report.computerName || getComputerName();
                const isExportingPdf = exportingId === report.id + '_pdf';
                const isExportingWord = exportingId === report.id + '_word';
                const isProcessing = processingId === report.id;
                const isHatchery = isHatcheryReport(report);
                const isGrowOut = isGrowOutReport(report);
                const hatcheryStage = isHatchery && report.formData?.batches?.[0] 
                  ? getHatcheryBatchStage(report.formData.batches[0]) 
                  : null;

                return (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-start space-x-3">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                          report.department === Department.FISHERY
                            ? isHatchery ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          {report.department === Department.FISHERY ? (
                            isHatchery ? <Egg className="w-4 h-4" /> : <Waves className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 hover:text-emerald-700 transition-colors">
                            {logName}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {report.isResubmitted && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1 shadow-xs">
                                <RotateCcw className="w-2.5 h-2.5 text-amber-700" />
                                <span>Resubmitted #{report.resubmissionCount || 1}</span>
                              </span>
                            )}
                            {hatcheryStage && (
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${hatcheryStage.badgeColor}`}>
                                {hatcheryStage.stage}
                              </span>
                            )}
                            {report.formData?.batches && (
                              <span className="text-[9px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full">
                                {report.formData.batches.length} Batches
                              </span>
                            )}
                            {report.formData?.ponds && (
                              <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full">
                                {report.formData.ponds.length} Ponds
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className="inline-block font-extrabold text-slate-900 text-xs">
                          {report.department}
                        </span>
                        <div>
                          {report.department === Department.FISHERY ? (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                              isHatchery 
                                ? 'bg-purple-50 text-purple-800 border-purple-200' 
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {isHatchery ? '🥚 Hatchery Section' : '🌊 Grow-Out Section'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              General Log
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-xs">{new Date(report.timestamp).toLocaleDateString()}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{report.fullName || report.email.split('@')[0]}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono mt-0.5">
                        <Monitor className="w-3 h-3" />
                        <span className="truncate max-w-[110px]">{computer}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusClasses(report.status)}`}>
                          <span>{formatStatusLabel(report.status)}</span>
                        </span>
                        {report.rejectionReason && (report.status === ReportStatus.REJECTED_BY_MANAGER || report.status === ReportStatus.REJECTED_BY_ED) && (
                          <div className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg max-w-[170px] truncate" title={report.rejectionReason}>
                            Note: {report.rejectionReason}
                          </div>
                        )}
                        {report.isResubmitted && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded block w-fit">
                            Corrected & Resubmitted
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Redo & Resubmit Action for Rejected Log */}
                        {(report.status === ReportStatus.REJECTED_BY_MANAGER || report.status === ReportStatus.REJECTED_BY_ED) && onRedo && (
                          <button
                            onClick={() => onRedo(report)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center space-x-1 shadow-xs cursor-pointer"
                            title="Redo and resubmit this rejected log"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Redo Log</span>
                          </button>
                        )}

                        {/* Details View */}
                        {onViewDetails && (
                          <button
                            onClick={() => onViewDetails(report)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 cursor-pointer"
                            title="View Full Report Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {/* Export PDF */}
                        <button
                          onClick={() => handlePDFExport(report)}
                          disabled={isExportingPdf}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                          title="Export to PDF"
                        >
                          {isExportingPdf ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          <span>PDF</span>
                        </button>

                        {/* Export Word */}
                        <button
                          onClick={() => handleWordExport(report)}
                          disabled={isExportingWord}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                          title="Export to Word (.doc)"
                        >
                          {isExportingWord ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                          <span>DOC</span>
                        </button>

                        {/* Executive Director / Manager Approve Action */}
                        {canApprove(report) && (
                          <button
                            onClick={() => handleApproveAction(report)}
                            disabled={isProcessing}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Authorize & Approve Report"
                          >
                            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                        )}

                        {/* Reject Action */}
                        {canReject(report) && (
                          <button
                            onClick={() => onReject!(report)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all active:scale-95 cursor-pointer"
                            title="Reject Report"
                          >
                            <X className="w-4 h-4" />
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

      {/* ===== MOBILE CARDS VIEW ===== */}
      <div className="lg:hidden divide-y divide-slate-100 px-4">
        {filteredReports.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-bold space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-600 font-extrabold">No Farm Logs Found</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const logName = formatLogName(report);
            const isHatchery = isHatcheryReport(report);

            return (
              <div key={report.id} className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {report.department} {report.department === Department.FISHERY && (isHatchery ? '• Hatchery' : '• Grow-Out')}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 mt-1">{logName}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(report.timestamp).toLocaleDateString()} by {report.fullName || report.email}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getStatusClasses(report.status)}`}>
                    {formatStatusLabel(report.status)}
                  </span>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(report)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      View Details
                    </button>
                  )}
                  <button
                    onClick={() => handlePDFExport(report)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black"
                  >
                    PDF
                  </button>
                  {canApprove(report) && (
                    <button
                      onClick={() => handleApproveAction(report)}
                      className="p-1.5 bg-emerald-600 text-white rounded-xl"
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
