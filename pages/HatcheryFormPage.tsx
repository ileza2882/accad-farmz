import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Role, Department, InventoryType, FisherySection, Report, ReportStatus, FisheryHatcheryFormData, FisheryHatcheryBatchData } from '../types';
import { getReports, createReport, updateReport, createAuditLog, createHatcheryChangeRequest } from '../lib/insforge';
import { FisheryHatcheryForm } from '../components/FisheryHatcheryForm';
import { getComputerName } from '../lib/exportUtils';
import { 
  Egg, 
  ArrowLeft, 
  ChevronRight, 
  Building2, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Plus
} from 'lucide-react';

interface HatcheryFormPageProps {
  user: User | null;
}

export const HatcheryFormPage: React.FC<HatcheryFormPageProps> = ({ user }) => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Guard: Must be Hatchery Manager or Executive Director
  useEffect(() => {
    if (!user || (user.role !== Role.HATCHERY_MANAGER && user.role !== Role.EXECUTIVE_DIRECTOR)) {
      navigate('/hatchery', { replace: true });
    }
  }, [user, navigate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (!reportId || reportId === 'new') {
        // Create brand new report
        const newId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const initialReport: Report = {
          id: newId,
          userId: user?.id || 'hatchery_user',
          email: user?.email || 'hatchery@accadfarms.com',
          fullName: user?.fullName || 'Hatchery Manager',
          department: Department.FISHERY,
          inventoryType: InventoryType.HATCHERY,
          section: FisherySection.HATCHERY,
          title: 'Hatchery Log - 1st Batch',
          content: 'Hatchery Section single-form ledger record.',
          timestamp: Date.now(),
          status: ReportStatus.PENDING_MANAGER,
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

        await createReport(initialReport);
        setReport(initialReport);
        navigate(`/hatchery/form/${newId}`, { replace: true });
      } else {
        const allReports = await getReports();
        const found = allReports.find(r => r.id === reportId);
        if (found) {
          setReport(found);
        } else {
          // If not found in DB, instantiate fallback report
          const fallbackReport: Report = {
            id: reportId,
            userId: user?.id || 'hatchery_user',
            email: user?.email || 'hatchery@accadfarms.com',
            fullName: user?.fullName || 'Hatchery Manager',
            department: Department.FISHERY,
            inventoryType: InventoryType.HATCHERY,
            section: FisherySection.HATCHERY,
            title: `Hatchery Log - ${reportId}`,
            content: 'Hatchery Section single-form ledger record.',
            timestamp: Date.now(),
            status: ReportStatus.PENDING_MANAGER,
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
          setReport(fallbackReport);
        }
      }
    } catch (err: any) {
      console.error('Error loading report:', err);
      alert('Error loading hatchery report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const handleSaveSingleRow = async (
    rowIndex: number,
    batch: FisheryHatcheryBatchData,
    allBatches: FisheryHatcheryBatchData[]
  ) => {
    if (!report) return;
    const effectiveUser = user || {
      id: 'hatchery_mgr',
      fullName: 'Hatchery Manager',
      email: 'hatchery@accadfarms.com',
      role: Role.HATCHERY_MANAGER
    };

    const firstBatchName = allBatches[0]?.batchNumber || 'Batch';
    const effectiveTitle = `Hatchery Log - ${firstBatchName}`;
    const status = effectiveUser.role === Role.EXECUTIVE_DIRECTOR 
      ? ReportStatus.APPROVED 
      : ReportStatus.PENDING_MANAGER;

    try {
      const updated = await updateReport(report.id, {
        title: effectiveTitle,
        content: `Hatchery log updated (${allBatches.length} batch record). Row #${rowIndex + 1} saved.`,
        formData: {
          batches: allBatches,
          generalNotes: report.formData?.generalNotes
        },
        status,
        updatedAt: Date.now()
      });

      if (updated) {
        setReport(updated);
      }

      await createAuditLog(
        effectiveUser.fullName,
        effectiveUser.email,
        'HATCHERY_ROW_UPDATED',
        `Hatchery row in form ${report.id} (${batch.batchNumber || `Batch ${rowIndex + 1}`}) updated by ${effectiveUser.fullName}`
      );
    } catch (e: any) {
      console.error('Save row error:', e);
      throw e;
    }
  };

  const handleRequestChange = async (batchIndex: number, batch: FisheryHatcheryBatchData, reason: string) => {
    if (!report) return;
    const effectiveUser = user || {
      id: 'hatchery_mgr',
      fullName: 'Hatchery Manager',
      email: 'hatchery@accadfarms.com',
      role: Role.HATCHERY_MANAGER
    };

    await createHatcheryChangeRequest({
      reportId: report.id,
      batchIndex,
      batchNumber: `${batch.batchNumber} Batch`,
      requestedBy: effectiveUser.fullName,
      requestedByEmail: effectiveUser.email,
      reason
    });
  };

  const handleHatcherySubmit = async (formData: FisheryHatcheryFormData, isDraft: boolean = false) => {
    if (!report) return;
    setIsSubmitting(true);
    const effectiveUser = user || {
      id: 'hatchery_mgr',
      fullName: 'Hatchery Manager',
      email: 'hatchery@accadfarms.com',
      role: Role.HATCHERY_MANAGER
    };

    try {
      const firstBatchName = formData.batches?.[0]?.batchNumber || 'Batch';
      const effectiveTitle = `Hatchery Log - ${firstBatchName}`;
      const status = effectiveUser.role === Role.EXECUTIVE_DIRECTOR 
        ? ReportStatus.APPROVED 
        : ReportStatus.PENDING_MANAGER;

      const updated = await updateReport(report.id, {
        title: effectiveTitle,
        content: `Hatchery log completed & archived (${formData.batches?.length || 1} batches recorded).`,
        formData,
        status,
        updatedAt: Date.now()
      });

      if (updated) {
        setReport(updated);
      }

      await createAuditLog(
        effectiveUser.fullName,
        effectiveUser.email,
        'HATCHERY_LOG_ARCHIVED',
        `Hatchery log ${report.id} archived & submitted by ${effectiveUser.fullName}`
      );

      setFeedbackMsg('Hatchery form saved and synced to the database!');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (e: any) {
      alert('Submission failed: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAnotherFormInNewTab = async () => {
    const newId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initialReport: Report = {
      id: newId,
      userId: user?.id || 'hatchery_user',
      email: user?.email || 'hatchery@accadfarms.com',
      fullName: user?.fullName || 'Hatchery Manager',
      department: Department.FISHERY,
      inventoryType: InventoryType.HATCHERY,
      section: FisherySection.HATCHERY,
      title: 'New Hatchery Log',
      content: 'New hatchery batch record.',
      timestamp: Date.now(),
      status: ReportStatus.PENDING_MANAGER,
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

    await createReport(initialReport);
    window.open(`${window.location.origin}/#/hatchery/form/${newId}`, '_blank');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white pb-16">
      
      {/* Breadcrumb / Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 truncate">
            <Link to="/" className="hover:text-emerald-700 transition-colors flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/fishery" className="hover:text-emerald-700 transition-colors">
              <span className="hidden sm:inline">Fishery</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/hatchery/dashboard" className="hover:text-emerald-700 transition-colors font-bold">
              <span>Hatchery Dashboard</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 font-black truncate">
              {report?.title || 'Form Ledger'}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleOpenAnotherFormInNewTab}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95"
              title="Start another hatchery form on a new page in a separate browser tab to work on both forms simultaneously"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Start New Form in New Tab ↗</span>
            </button>

            <button
              onClick={() => navigate('/hatchery/dashboard')}
              className="inline-flex items-center space-x-1 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        
        {feedbackMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-3 shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Loading Hatchery Form...</p>
            <p className="text-xs text-slate-400">Fetching records from InsForge database</p>
          </div>
        ) : !report ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Egg className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">Form Not Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The requested hatchery form could not be retrieved or has been removed.
            </p>
            <button
              onClick={() => navigate('/hatchery/dashboard')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* The single hatchery form component */}
            <FisheryHatcheryForm
              initialData={report.formData as FisheryHatcheryFormData}
              reportId={report.id}
              currentUser={{ fullName: user.fullName, email: user.email }}
              onCancel={() => navigate('/hatchery/dashboard')}
              onSubmit={handleHatcherySubmit}
              onSaveSingleRow={handleSaveSingleRow}
              onRequestChange={handleRequestChange}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

      </div>

    </div>
  );
};
