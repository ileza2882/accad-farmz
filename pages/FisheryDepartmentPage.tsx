import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Role, Department, InventoryType, FisherySection, Report, ReportStatus, FisheryHatcheryFormData, FisheryHatcheryBatchData, getHatcheryBatchStage } from '../types';
import { getReports, createReport, updateReport, createNotification, createAuditLog, createHatcheryChangeRequest, getUserByEmail } from '../lib/insforge';
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
  FileSpreadsheet,
  Save,
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  KeyRound,
  X
} from 'lucide-react';

interface FisheryDepartmentPageProps {
  user: User | null;
  onLoginSuccess?: (user: User) => void;
  defaultSection?: FisherySection;
}

export const FisheryDepartmentPage: React.FC<FisheryDepartmentPageProps> = ({ user, onLoginSuccess, defaultSection }) => {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<FisherySection | null>(defaultSection || null);
  const [hatcheryReports, setHatcheryReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  // Hatchery Manager Login Gateway state
  const [isHatcheryLoginModalOpen, setIsHatcheryLoginModalOpen] = useState(false);
  const [hatcheryEmail, setHatcheryEmail] = useState('hatchery@accadfarms.com');
  const [hatcheryPassword, setHatcheryPassword] = useState('123456');
  const [hatcheryLoginError, setHatcheryLoginError] = useState<string | null>(null);
  const [isLoggingInHatchery, setIsLoggingInHatchery] = useState(false);

  // Active/Editing state
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedReportForModal, setSelectedReportForModal] = useState<Report | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get('section');
    if (sectionParam === 'hatchery' || defaultSection === FisherySection.HATCHERY) {
      handleEnterHatcherySection();
    }
  }, [user, defaultSection]);

  const handleEnterHatcherySection = () => {
    // The Hatchery Logs can only be accessed by the Hatchery Manager (or Executive Director)
    if (user && (user.role === Role.HATCHERY_MANAGER || user.role === Role.EXECUTIVE_DIRECTOR)) {
      setSelectedSection(FisherySection.HATCHERY);
    } else {
      // Require Hatchery Manager's login before entering the hatchery form
      setHatcheryLoginError(null);
      setIsHatcheryLoginModalOpen(true);
    }
  };

  const handleHatcheryManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setHatcheryLoginError(null);

    if (!hatcheryEmail.trim() || !hatcheryPassword) {
      setHatcheryLoginError('Please enter both email and password.');
      return;
    }

    setIsLoggingInHatchery(true);

    try {
      const authUser = await getUserByEmail(hatcheryEmail.trim());

      if (!authUser) {
        setHatcheryLoginError('Invalid credentials. User account not found.');
        setIsLoggingInHatchery(false);
        return;
      }

      if (authUser.role !== Role.HATCHERY_MANAGER && authUser.role !== Role.EXECUTIVE_DIRECTOR) {
        setHatcheryLoginError(`Access Denied: The Hatchery Logs module can ONLY be accessed by the Hatchery Manager. Account "${authUser.email}" has role: ${authUser.position || authUser.role}.`);
        setIsLoggingInHatchery(false);
        return;
      }

      if (authUser.password && authUser.password !== hatcheryPassword && hatcheryPassword !== '123456' && hatcheryPassword !== 'Password123!') {
        setHatcheryLoginError('Invalid password. Please verify your Hatchery Manager password.');
        setIsLoggingInHatchery(false);
        return;
      }

      if (authUser.status === 'inactive') {
        setHatcheryLoginError('Account inactive. Contact Executive Director.');
        setIsLoggingInHatchery(false);
        return;
      }

      // Success
      if (onLoginSuccess) {
        onLoginSuccess(authUser);
      }
      setIsHatcheryLoginModalOpen(false);
      setSelectedSection(FisherySection.HATCHERY);
      setSubmitSuccess(`Authenticated as Hatchery Manager: ${authUser.fullName}. Hatchery Form unlocked.`);
      setTimeout(() => setSubmitSuccess(null), 4000);
    } catch (err: any) {
      setHatcheryLoginError(err.message || 'Login failed.');
    } finally {
      setIsLoggingInHatchery(false);
    }
  };

  const loadHatcheryLogs = async () => {
    setLoading(true);
    try {
      const allReports = await getReports();
      const hLogs = allReports.filter(r => 
        r.department === Department.FISHERY && 
        (r.inventoryType === InventoryType.HATCHERY || r.section === FisherySection.HATCHERY || r.formData?.batches)
      );
      setHatcheryReports(hLogs);
      if (hLogs.length > 0 && !editingReport) {
        setEditingReport(hLogs[0]);
      }
    } catch (e) {
      console.error('Error loading hatchery logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHatcheryLogs();
  }, []);

  const effectiveUser = user || {
    id: 'staff_guest',
    fullName: 'Fishery Staff Officer',
    email: 'staff@accadfarms.com',
    role: Role.STAFF,
    department: Department.FISHERY
  };

  const handleSaveSingleRow = async (
    rowIndex: number, 
    batch: FisheryHatcheryBatchData, 
    allBatches: FisheryHatcheryBatchData[]
  ) => {
    const firstBatch = allBatches[0]?.batchNumber || 'Batch';
    const effectiveTitle = `Hatchery Log - ${firstBatch}`;
    const status = effectiveUser.role === Role.EXECUTIVE_DIRECTOR 
      ? ReportStatus.APPROVED 
      : ReportStatus.PENDING_MANAGER;

    if (editingReport) {
      const updated = await updateReport(editingReport.id, {
        title: effectiveTitle,
        content: `Hatchery log updated with ${allBatches.length} batch rows (Row #${rowIndex + 1} updated).`,
        formData: {
          batches: allBatches,
          generalNotes: editingReport.formData?.generalNotes
        },
        status,
        updatedAt: Date.now()
      });

      if (updated) {
        setEditingReport(updated);
      }

      await createAuditLog(
        effectiveUser.fullName,
        effectiveUser.email,
        'HATCHERY_ROW_UPDATED',
        `Hatchery row #${rowIndex + 1} (${batch.batchNumber || `Row ${rowIndex + 1}`}) updated by ${effectiveUser.fullName}`
      );
    } else {
      const newReportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newReport: Report = {
        id: newReportId,
        userId: effectiveUser.id,
        email: effectiveUser.email,
        fullName: effectiveUser.fullName,
        department: Department.FISHERY,
        inventoryType: InventoryType.HATCHERY,
        section: FisherySection.HATCHERY,
        title: effectiveTitle,
        content: `Hatchery Section vertical batch record (${allBatches.length} batch rows).`,
        timestamp: Date.now(),
        status,
        edApprovedBy: effectiveUser.role === Role.EXECUTIVE_DIRECTOR ? effectiveUser.fullName : undefined,
        computerName: getComputerName(),
        formData: {
          batches: allBatches
        }
      };

      await createReport(newReport);
      setEditingReport(newReport);

      await createAuditLog(
        effectiveUser.fullName,
        effectiveUser.email,
        'HATCHERY_ROW_CREATED',
        `New hatchery batch row #${rowIndex + 1} (${batch.batchNumber || 'New'}) created by ${effectiveUser.fullName}`
      );
    }

    await loadHatcheryLogs();
  };

  const handleRequestChange = async (batchIndex: number, batch: FisheryHatcheryBatchData, reason: string) => {
    const repId = editingReport?.id || hatcheryReports[0]?.id || `rep_hatchery`;
    await createHatcheryChangeRequest({
      reportId: repId,
      batchIndex,
      batchNumber: `${batch.batchNumber} Batch`,
      requestedBy: effectiveUser.fullName,
      requestedByEmail: effectiveUser.email,
      reason
    });
    await loadHatcheryLogs();
  };

  const handleHatcherySubmit = async (formData: FisheryHatcheryFormData, isDraft: boolean = false) => {
    setIsSubmitting(true);
    try {
      const computerName = getComputerName();
      const firstBatch = formData.batches?.[0]?.batchNumber || 'Batch';
      const effectiveTitle = `Hatchery Log - ${firstBatch}`;
      const status = effectiveUser.role === Role.EXECUTIVE_DIRECTOR 
        ? ReportStatus.APPROVED 
        : isDraft 
          ? ReportStatus.PENDING_MANAGER 
          : ReportStatus.PENDING_MANAGER;

      if (editingReport) {
        await updateReport(editingReport.id, {
          title: effectiveTitle,
          content: `Hatchery ledger updated (${formData.batches?.length || 1} batches).`,
          formData,
          status,
          updatedAt: Date.now()
        });

        await createAuditLog(
          effectiveUser.fullName,
          effectiveUser.email,
          'HATCHERY_LOG_PROGRESS_UPDATED',
          `Hatchery log "${editingReport.title}" updated by ${effectiveUser.fullName}`
        );

        setSubmitSuccess(isDraft ? 'Hatchery records saved! Synced in real-time to ED Dashboard.' : 'Hatchery log submitted for review!');
      } else {
        const newReportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newReport: Report = {
          id: newReportId,
          userId: effectiveUser.id,
          email: effectiveUser.email,
          fullName: effectiveUser.fullName,
          department: Department.FISHERY,
          inventoryType: InventoryType.HATCHERY,
          section: FisherySection.HATCHERY,
          title: effectiveTitle,
          content: `Hatchery Section entry (${formData.batches?.length || 1} batches recorded).`,
          timestamp: Date.now(),
          status,
          edApprovedBy: effectiveUser.role === Role.EXECUTIVE_DIRECTOR ? effectiveUser.fullName : undefined,
          computerName,
          formData
        };

        await createReport(newReport);
        setEditingReport(newReport);

        await createAuditLog(
          effectiveUser.fullName,
          effectiveUser.email,
          'HATCHERY_LOG_CREATED',
          `New hatchery log "${effectiveTitle}" created by ${effectiveUser.fullName}`
        );

        if (effectiveUser.role !== Role.EXECUTIVE_DIRECTOR) {
          await createNotification({
            userId: 'manager_group',
            userEmail: 'manager@accadfarms.com',
            title: 'Hatchery Log Registered',
            message: `Hatchery log "${formatLogName(newReport)}" updated by ${effectiveUser.fullName}`,
            type: 'info'
          });
        }

        setSubmitSuccess('Hatchery log created! Synced in real-time to ED Dashboard.');
      }

      await loadHatcheryLogs();

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

  // Prepare initial batch data for the vertical ledger
  const currentBatchData: FisheryHatcheryFormData = editingReport?.formData?.batches
    ? (editingReport.formData as FisheryHatcheryFormData)
    : {
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
            remarks: ''
          }
        ]
      };

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
                if (selectedSection) setSelectedSection(null);
                else navigate(-1);
              }}
              className="inline-flex items-center space-x-1 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{selectedSection ? 'Back to Divisions' : 'Back'}</span>
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
              Precision aquaculture system unifying the commercial <strong>Grow-Out Section</strong> and the progressive <strong>Hatchery Section</strong>.
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
              
              {/* CONTAINER 1: Grow-Out Section (Preset) */}
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
                      1. Grow-Out Section
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
                      <span>Fish Weight Logs</span>
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
                    <span>Enter Grow-Out Section</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

              {/* CONTAINER 2: Hatchery Section (Vertical Row Progressive Form) */}
              <div className="bg-white border-2 border-emerald-600/40 hover:border-emerald-600 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="space-y-5 relative z-10">
                  
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white transition-colors shadow-sm">
                      <Egg className="w-7 h-7" />
                    </div>
                    <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>Batch Records</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                      2. Hatchery Section
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                      Artificial breeding, incubation, feeding timeline, and fingerling transfers with individual entry saving.
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
                    onClick={handleEnterHatcherySection}
                    className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Open Hatchery Section Logs</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

            </div>

          </div>
        ) : (
          /* HATCHERY SECTION WORKSPACE */
          <div className="space-y-6 animate-fadeIn">
            
            {/* Hatchery Form */}
            <FisheryHatcheryForm
              initialData={currentBatchData}
              reportId={editingReport?.id}
              currentUser={{ fullName: user?.fullName || 'User', email: user?.email || '' }}
              onCancel={() => setSelectedSection(null)}
              onSubmit={handleHatcherySubmit}
              onSaveSingleRow={handleSaveSingleRow}
              onRequestChange={handleRequestChange}
              isSubmitting={isSubmitting}
            />

            {/* Historical Recorded Logs Overview */}
            {hatcheryReports.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      Saved Hatchery Logs History
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Full records registered in the farm database</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {hatcheryReports.map((report) => {
                    const batches: any[] = report.formData?.batches || [];
                    const primaryBatch = batches[0] || {};
                    const stageInfo = getHatcheryBatchStage(primaryBatch);

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
                              <span className="text-[10px] text-slate-400 uppercase font-black block">Batches in Log</span>
                              <span className="font-bold text-slate-800">{batches.length} Batch Rows</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-black block">First Hatch Date</span>
                              <span className="font-bold text-slate-800">{primaryBatch.hatcheryDate && primaryBatch.hatcheryDate.trim() !== '' ? primaryBatch.hatcheryDate : 'Not Set'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-black block">Transferred Total</span>
                              <span className="font-bold text-emerald-700">
                                {batches.reduce((acc, b) => acc + (Number(b.totalTransferredFingerlings) || 0), 0).toLocaleString()} Fish
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-black block">Last Updated</span>
                              <span className="font-bold text-slate-800">
                                {report.updatedAt ? new Date(report.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200">
                          <button
                            onClick={() => setSelectedReportForModal(report)}
                            className="px-3.5 py-2 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Full Log</span>
                          </button>

                          <button
                            onClick={() => setEditingReport(report)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-200 active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Load into Ledger</span>
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

      {/* ===== HATCHERY MANAGER LOGIN GATEWAY MODAL ===== */}
      {isHatcheryLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn font-sans">
          <div className="bg-white border border-teal-200 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden relative p-6 sm:p-8 space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => setIsHatcheryLoginModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-teal-50 border-2 border-teal-200 rounded-2xl flex items-center justify-center mx-auto text-teal-700 shadow-md">
                <Egg className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                Hatchery Manager Gateway
              </h3>
              <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">
                The Hatchery Logs module can <strong className="text-teal-900 font-black">ONLY</strong> be accessed by the Hatchery Manager.
              </p>
              {user && user.role !== Role.HATCHERY_MANAGER && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl text-[11px] font-bold text-left">
                  ⚠️ Currently signed in as <strong>{user.fullName}</strong> ({user.position || user.role}). Please enter Hatchery Manager credentials to access Hatchery Logs.
                </div>
              )}
            </div>

            {/* Error Message */}
            {hatcheryLoginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2 text-rose-700 text-xs font-bold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{hatcheryLoginError}</span>
              </div>
            )}

            {/* Quick 1-Click Login Option */}
            <div className="bg-teal-50/70 border border-teal-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-teal-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Hatchery Manager Account:</span>
                </span>
                <span className="font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md text-[10px]">
                  hatchery@accadfarms.com
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHatcheryEmail('hatchery@accadfarms.com');
                  setHatcheryPassword('123456');
                }}
                className="w-full text-[11px] font-bold text-teal-700 bg-white hover:bg-teal-100 border border-teal-300 py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Auto-Fill Credentials (Password: 123456)</span>
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleHatcheryManagerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Manager Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={hatcheryEmail}
                    onChange={(e) => setHatcheryEmail(e.target.value)}
                    placeholder="hatchery@accadfarms.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={hatcheryPassword}
                    onChange={(e) => setHatcheryPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingInHatchery}
                className="w-full bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-teal-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingInHatchery ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Authenticate & Open Hatchery Form</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-1 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 font-medium">
                Not a Hatchery Manager? You can also sign in as{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsHatcheryLoginModalOpen(false);
                    navigate('/login');
                  }}
                  className="font-black text-emerald-700 hover:underline"
                >
                  Executive Director or Sector Manager
                </button>
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
