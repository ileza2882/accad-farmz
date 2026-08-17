import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Role, Department, InventoryType, FisherySection, Report, ReportStatus } from '../types';
import { createReport, createNotification } from '../lib/insforge';
import { FisheryHatcheryForm } from '../components/FisheryHatcheryForm';
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
  ArrowLeft
} from 'lucide-react';

interface FisheryDepartmentPageProps {
  user: User | null;
}

export const FisheryDepartmentPage: React.FC<FisheryDepartmentPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<FisherySection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const handleHatcherySubmit = async (formData: any) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const computerName = getComputerName();
      const firstBatch = formData.batches?.[0]?.batchNumber || 'Batch';
      const effectiveTitle = `Hatchery Transfer - ${firstBatch}`;
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
        content: `Hatchery Section fingerling transfer audit (${formData.batches?.length || 1} batches recorded).`,
        timestamp: Date.now(),
        status: user.role === Role.EXECUTIVE_DIRECTOR ? ReportStatus.APPROVED : ReportStatus.PENDING_MANAGER,
        edApprovedBy: user.role === Role.EXECUTIVE_DIRECTOR ? user.fullName : undefined,
        computerName,
        formData
      };

      await createReport(newReport);

      if (user.role !== Role.EXECUTIVE_DIRECTOR) {
        await createNotification({
          userId: 'manager_group',
          userEmail: 'manager@accadfarms.com',
          title: 'New Hatchery Section Log Submitted',
          message: `New hatchery log "${formatLogName(newReport)}" submitted by ${user.fullName}`,
          type: 'info'
        });
      }

      setSubmitSuccess('Hatchery record successfully submitted and registered in farm audit logs!');
      setTimeout(() => {
        setSubmitSuccess(null);
        navigate('/dashboard');
      }, 1800);

    } catch (e: any) {
      alert('Submission failed: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
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

          <button
            onClick={() => {
              if (selectedSection) setSelectedSection(null);
              else navigate(-1);
            }}
            className="inline-flex items-center space-x-1 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{selectedSection ? 'Back to Sections' : 'Back'}</span>
          </button>
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
              Comprehensive aquaculture management across two specialized divisions: the ongoing <strong>Growth-Out Section</strong> and the dedicated <strong>Hatchery Section</strong>.
            </p>
          </div>
        </div>

        {submitSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-3 shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
        )}

        {/* The Two Main Containers/Sections */}
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
                  
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                      <Fish className="w-7 h-7" />
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                      Preset & Active
                    </span>
                  </div>

                  {/* Section Title & Description */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                      1. Growth-Out Section
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                      The core commercial grow-out operations of the Fishery Department. Manages mature fish ponds, feeding schedules, water quality parameters, and physical assets.
                    </p>
                  </div>

                  {/* Key Features Pill List */}
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

                {/* Action CTA */}
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

              {/* CONTAINER 2: Hatchery Section (New Feature) */}
              <div className="bg-white border-2 border-emerald-600/40 hover:border-emerald-600 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="space-y-5 relative z-10">
                  
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white transition-colors shadow-sm">
                      <Egg className="w-7 h-7" />
                    </div>
                    <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>New Section</span>
                    </span>
                  </div>

                  {/* Section Title & Description */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                      2. Hatchery Section
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                      Artificial breeding, incubation, and fingerling production records. Tracks broodstock pedigree, feeding timeline, fingerling health, and destination grow-out ponds.
                    </p>
                  </div>

                  {/* Key Features Pill List */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Broodstock Source</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Feeding Milestones</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <Droplets className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Fingerling Weight & Age</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Transfer to Grow-Out</span>
                    </div>
                  </div>

                </div>

                {/* Action CTA */}
                <div className="pt-6 mt-6 border-t border-slate-100 relative z-10">
                  <button
                    onClick={() => setSelectedSection(FisherySection.HATCHERY)}
                    className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Open Hatchery Data Entry Form</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

            </div>

          </div>
        ) : (
          /* When Hatchery Section is Opened */
          <div className="space-y-6 animate-fadeIn">
            
            <div className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-black">
                  <Egg className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Hatchery Section Data Entry</h2>
                  <p className="text-xs text-slate-500 font-medium">Record broodstock source, fingerling transfer counts, weights, and destination ponds</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSection(null)}
                className="text-xs font-extrabold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Switch Section
              </button>
            </div>

            {/* Embedded Hatchery Form */}
            <FisheryHatcheryForm onSubmit={handleHatcherySubmit} isSubmitting={isSubmitting} />

          </div>
        )}

      </div>

    </div>
  );
};
