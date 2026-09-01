import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Role } from '../types';
import { 
  Fish, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
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
  onLoginSuccess?: (user: User) => void;
}

export const FisheryDepartmentPage: React.FC<FisheryDepartmentPageProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleEnterHatchery = () => {
    if (user && (user.role === Role.HATCHERY_MANAGER || user.role === Role.EXECUTIVE_DIRECTOR)) {
      navigate('/hatchery/dashboard');
    } else {
      navigate('/hatchery');
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
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center space-x-1 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
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
              Precision aquaculture system unifying the commercial <strong>Grow-Out Section</strong> and the dedicated <strong>Hatchery Section</strong>.
            </p>
          </div>
        </div>

        {/* The Two Main Containers/Sections Overview */}
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Operational Divisions</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">Select Department Section</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">Choose a division below to access logs or submit records</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            
            {/* CONTAINER 1: Grow-Out Section */}
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

            {/* CONTAINER 2: Hatchery Section */}
            <div className="bg-white border-2 border-emerald-600/40 hover:border-emerald-600 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

              <div className="space-y-5 relative z-10">
                
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white transition-colors shadow-sm">
                    <Egg className="w-7 h-7" />
                  </div>
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Hatchery Manager Restricted</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                    2. Hatchery Section
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                    Artificial breeding, incubation, feeding timeline, and fingerling transfers with individual entry saving. Requires Hatchery Manager login.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Broodstock Sourcing</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Feeding Milestones</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <Droplets className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Fingerling Weights</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Grow-Out Transfers</span>
                  </div>
                </div>

              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 relative z-10">
                <button
                  onClick={handleEnterHatchery}
                  className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Open Hatchery Manager Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
