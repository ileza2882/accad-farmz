import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Department, User, Role } from '../types';
import { getUserByEmail } from '../lib/insforge';
import { 
  LogIn, 
  ArrowRight, 
  Shield, 
  Activity, 
  Layers, 
  CheckCircle2, 
  Wrench, 
  Sparkles, 
  X, 
  ShieldCheck, 
  FileText, 
  BarChart3, 
  Users, 
  Lock, 
  Mail, 
  AlertCircle, 
  Egg, 
  Fish, 
  Database,
  Crown,
  KeyRound,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface HomepageProps {
  user: User | null;
  onLoginSuccess?: (user: User) => void;
}

export const Homepage: React.FC<HomepageProps> = ({ user, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [devModalDept, setDevModalDept] = useState<any | null>(null);
  const [isEDModalOpen, setIsEDModalOpen] = useState(false);

  // Executive Director Login Form State
  const [edEmail, setEdEmail] = useState('info@accadfarms.com');
  const [edPassword, setEdPassword] = useState('123456');
  const [edError, setEdError] = useState<string | null>(null);
  const [isEdSubmitting, setIsEdSubmitting] = useState(false);

  // Check URL query params for ?ed_login=true
  useEffect(() => {
    if (searchParams.get('ed_login') === 'true' || searchParams.get('ed') === 'true') {
      if (!user) {
        setIsEDModalOpen(true);
      }
      // Remove param from URL
      searchParams.delete('ed_login');
      searchParams.delete('ed');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, user]);

  const departments = [
    {
      id: Department.FISHERY,
      name: 'Fishery Department',
      description: 'Aquaculture monitoring, feed inventory, water quality checks, and pond harvest logs.',
      status: 'Active',
      image: 'https://drive.google.com/thumbnail?id=1N8lOyOO4bg2A901Ns3uSaQiwwASNr6_L&sz=w1000'
    },
    {
      id: Department.POULTRY,
      name: 'Poultry Department',
      description: 'Flock mortality records, feed conversion, egg production, and environmental monitoring.',
      status: 'Standby',
      image: 'https://drive.google.com/thumbnail?id=1pFJf3s6biH6jokeG9J8dBUyukAj_ngqY&sz=w1000'
    },
    {
      id: Department.CATTLE,
      name: 'Cattle Department',
      description: 'Livestock health tracking, milk yield metrics, pasture management, and breeding logs.',
      status: 'Standby',
      image: 'https://drive.google.com/thumbnail?id=1LXKorpiQPt5BF13qkVXc8kOZXarF3aTW&sz=w1000'
    },
    {
      id: Department.PIGS,
      name: 'Pigs Department',
      description: 'Porker weights, litter tracking, feed allocation, and veterinary check logs.',
      status: 'Standby',
      image: 'https://drive.google.com/thumbnail?id=10sNUlopVgU-oHNDnrAipEBxsEIJ2kLJM&sz=w1000'
    }
  ];

  const handleEDLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEdError(null);

    if (!edEmail.trim() || !edPassword) {
      setEdError('Please enter both email and password.');
      return;
    }

    setIsEdSubmitting(true);

    try {
      const authenticatedUser = await getUserByEmail(edEmail.trim());

      if (!authenticatedUser) {
        setEdError('Executive account not found. Please verify email.');
        setIsEdSubmitting(false);
        return;
      }

      if (authenticatedUser.role !== Role.EXECUTIVE_DIRECTOR) {
        setEdError('This account does not have Executive Director clearance.');
        setIsEdSubmitting(false);
        return;
      }

      if (authenticatedUser.password && authenticatedUser.password !== edPassword) {
        setEdError('Invalid Executive credentials.');
        setIsEdSubmitting(false);
        return;
      }

      if (onLoginSuccess) {
        onLoginSuccess(authenticatedUser);
      }

      setIsEDModalOpen(false);
      navigate('/admin');
    } catch (err: any) {
      setEdError('Authentication failed: ' + (err.message || 'Server error'));
      setIsEdSubmitting(false);
    }
  };

  const isED = user?.role === Role.EXECUTIVE_DIRECTOR;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-12 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-200 overflow-hidden bg-white">
        
        {/* Farm Texture Overlay */}
        <div className="absolute inset-0 z-0 opacity-35 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2000&auto=format&fit=crop" 
            alt="Farm Overlay" 
            className="w-full h-full object-cover filter saturate-150"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center pt-4 sm:pt-6">
          
          {/* Executive Tag */}
          <div className="inline-flex items-center space-x-2 bg-slate-100/90 border border-slate-200 px-3.5 py-1.5 rounded-full mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Central Farm Registry System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight uppercase text-slate-900 leading-none">
            ACCAD <span className="text-emerald-600">FARMS</span>
          </h1>

          <p className="mt-3 sm:mt-4 text-[11px] sm:text-sm lg:text-base font-extrabold uppercase text-slate-400 tracking-[0.2em] sm:tracking-[0.4em]">
            Precision Agricultural Operations
          </p>

          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-slate-600 font-medium leading-relaxed px-2 sm:px-0">
            Enterprise farm management system unifying Staff logs, Manager vetting, and Executive Director final governance across Fishery, Poultry, Cattle, and Pigs.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            
            {user && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    if (user.role === Role.EXECUTIVE_DIRECTOR) navigate('/admin');
                    else if (user.role === Role.MANAGER) navigate('/manager');
                    else navigate('/staff');
                  }}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Go to Role Dashboard ({user.role})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {isED && (
                  <button
                    onClick={() => navigate('/fishery')}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-purple-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer border border-purple-700"
                  >
                    <Fish className="w-4 h-4 text-amber-400" />
                    <span>View Fishery Reports</span>
                  </button>
                )}
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ===== EXECUTIVE DIRECTOR LOGGED-IN CONSOLE ===== */}
      {isED && (
        <section className="bg-gradient-to-b from-purple-50/70 to-slate-50 border-b border-purple-200 py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-800 text-amber-400 flex items-center justify-center shadow-md">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-purple-950 uppercase tracking-tight">
                    Executive Director Command Hub
                  </h3>
                  <p className="text-xs text-purple-700 font-medium">
                    Logged in as <strong>{user.fullName}</strong>. Select a section to fetch and manage data:
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin')}
                className="inline-flex items-center space-x-1.5 bg-purple-900 hover:bg-purple-950 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
              >
                <span>Open Full Admin Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Fishery Department Reports */}
              <div 
                onClick={() => navigate('/fishery')}
                className="bg-white p-5 rounded-2xl border border-emerald-200 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Fish className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active Sector
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">
                  Fishery Reports & Logs
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Direct access to Hatchery Progressive Ledgers, Grow-Out Pond Inventory, and Assets.
                </p>
                <div className="pt-2 flex items-center text-xs font-extrabold text-emerald-700 group-hover:translate-x-1 transition-transform space-x-1">
                  <span>Fetch Fishery Data</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* ED Approvals & Unlocks */}
              <div 
                onClick={() => navigate('/admin?tab=approvals')}
                className="bg-white p-5 rounded-2xl border border-amber-200 hover:border-amber-500 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-black uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                    ED Authorization
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase group-hover:text-amber-700 transition-colors">
                  Approvals & Change Requests
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Review unlock requests, batch change requests, and grant final ED report approvals.
                </p>
                <div className="pt-2 flex items-center text-xs font-extrabold text-amber-700 group-hover:translate-x-1 transition-transform space-x-1">
                  <span>Review Approvals</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* All Farm Logs Registry */}
              <div 
                onClick={() => navigate('/admin?tab=all_logs')}
                className="bg-white p-5 rounded-2xl border border-blue-200 hover:border-blue-500 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                    Full Database
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase group-hover:text-blue-700 transition-colors">
                  Central Logs Registry
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Inspect multi-department operational records with audit history and export to CSV/Excel.
                </p>
                <div className="pt-2 flex items-center text-xs font-extrabold text-blue-700 group-hover:translate-x-1 transition-transform space-x-1">
                  <span>Open Farm Registry</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Analytics & User Management */}
              <div 
                onClick={() => navigate('/admin?tab=analytics')}
                className="bg-white p-5 rounded-2xl border border-purple-200 hover:border-purple-500 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                    <BarChart3 className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-black uppercase bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                    Governance
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase group-hover:text-purple-700 transition-colors">
                  Yield KPIs & Audit Trail
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Track farm-wide mortality, feed ratios, user permissions, and compliance audit trail.
                </p>
                <div className="pt-2 flex items-center text-xs font-extrabold text-purple-700 group-hover:translate-x-1 transition-transform space-x-1">
                  <span>View Analytics</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* Department Nodes Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8 sm:mb-12">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-600">Operational Sectors</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase mt-1">Farm Departments</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
            {isED ? 'As Executive Director, you have full clearance to access, inspect, and fetch reports from any sector:' : 'Select a department node to access farm logs'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              onClick={() => {
                if (dept.id !== Department.FISHERY) {
                  setDevModalDept(dept);
                } else {
                  navigate('/fishery');
                }
              }}
              className="bg-white border border-slate-200 hover:border-emerald-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex items-start space-x-4 sm:space-x-6 relative group cursor-pointer select-none"
            >
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shrink-0 p-1.5 sm:p-2 group-hover:bg-emerald-50 transition-colors">
                <img 
                  src={dept.image} 
                  alt={dept.name} 
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <h3 className="text-base sm:text-xl font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">{dept.name}</h3>
                  <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase shrink-0 ${
                    dept.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {dept.status}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">{dept.description}</p>

                <div
                  className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-emerald-700 group-hover:text-emerald-800 uppercase tracking-wider group-hover:translate-x-1 transition-transform"
                >
                  <span>{isED ? 'Fetch Department Reports' : 'Access Node Log'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="bg-slate-50 border-t border-slate-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 text-left">
            
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-2 sm:space-y-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-800">
                <Crown className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Executive Central Governance</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Dedicated Executive Director portal on the homepage. Direct access to reports, unlock approvals, audit trails, and multi-sector farm data.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Multi-Stage Vetting</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Structured workflow ensures all farm log submissions undergo Manager review before receiving final Executive Director approval.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Immutable Farm Archiving</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Per-row and per-batch saving locks verified records into the permanent archive, with audit-tracked change requests for corrections.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 text-center px-4">
        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
          © {new Date().getFullYear()} ACCAD FARMS INFRASTRUCTURE • ALL SYSTEMS OPERATIONAL
        </p>
      </footer>

      {/* ===== EXECUTIVE DIRECTOR LOGIN MODAL ===== */}
      {isEDModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-purple-200 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden relative p-6 sm:p-8 space-y-6">
            
            <button
              onClick={() => setIsEDModalOpen(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Emblem */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-800 to-indigo-950 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-purple-200 border-2 border-purple-600">
                <Crown className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center space-x-1.5 bg-purple-100 text-purple-900 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-purple-300">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                <span>Executive Clearance Required</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                Executive Director Login
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                Sign in to access centralized farm governance, department reports, and approvals.
              </p>
            </div>

            {/* Error message */}
            {edError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2 text-rose-700 text-xs font-bold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{edError}</span>
              </div>
            )}

            <form onSubmit={handleEDLogin} className="space-y-4">
              
              {/* Quick 1-Click ED Options */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Quick Executive Credentials
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEdEmail('info@accadfarms.com');
                      setEdPassword('123456');
                      setEdError(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-extrabold transition-all cursor-pointer ${
                      edEmail === 'info@accadfarms.com'
                        ? 'bg-purple-50 border-purple-400 text-purple-950 ring-1 ring-purple-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] text-purple-700 font-black uppercase">Primary ED</div>
                    <div className="truncate font-bold">info@accadfarms.com</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEdEmail('dalestic12@gmail.com');
                      setEdPassword('123456');
                      setEdError(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-extrabold transition-all cursor-pointer ${
                      edEmail === 'dalestic12@gmail.com'
                        ? 'bg-purple-50 border-purple-400 text-purple-950 ring-1 ring-purple-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] text-purple-700 font-black uppercase">Executive Email</div>
                    <div className="truncate font-bold">dalestic12@gmail.com</div>
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-700">
                  Executive Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={edEmail}
                    onChange={(e) => setEdEmail(e.target.value)}
                    placeholder="ed@accadfarms.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-700">
                  Security Passcode / Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={edPassword}
                    onChange={(e) => setEdPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isEdSubmitting}
                className="w-full bg-gradient-to-r from-purple-800 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-purple-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 border border-purple-700"
              >
                {isEdSubmitting ? (
                  <span>Authenticating Clearance...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Enter Executive Hub</span>
                  </>
                )}
              </button>

            </form>

            <div className="text-center pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400">
                Staff or Manager? <Link to="/login" onClick={() => setIsEDModalOpen(false)} className="text-emerald-600 font-extrabold hover:underline">Use Portal Login →</Link>
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Custom Under Development Branded Overlay Modal */}
      {devModalDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden relative p-8 text-center space-y-6">
            
            <button
              onClick={() => setDevModalDept(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative mx-auto w-24 h-24 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center p-3 shadow-inner">
              <img
                src={devModalDept.image}
                alt={devModalDept.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-2xl shadow-md border-2 border-white">
                <Wrench className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Sector Under Active Development</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{devModalDept.name}</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                The {devModalDept.name} infrastructure is currently undergoing precision monitoring setup and automated sector workflow integration.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setDevModalDept(null);
                  navigate('/fishery');
                }}
                className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Access Active Fishery</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setDevModalDept(null)}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              >
                <span>Understood</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
