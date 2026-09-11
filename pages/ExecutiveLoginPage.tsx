import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Role } from '../types';
import { getUserByEmail } from '../lib/insforge';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  LogIn, 
  RefreshCw, 
  AlertCircle, 
  ArrowLeft,
  Eye,
  EyeOff,
  HelpCircle,
  Clock
} from 'lucide-react';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

interface ExecutiveLoginPageProps {
  user: User | null;
  onLoginSuccess: (user: User) => void;
}

export const ExecutiveLoginPage: React.FC<ExecutiveLoginPageProps> = ({ user, onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('info@accadfarms.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(() => {
    try {
      const stored = sessionStorage.getItem('accad_timeout_notice');
      if (stored) {
        sessionStorage.removeItem('accad_timeout_notice');
        return stored;
      }
      const stateMsg = (location.state as any)?.alertMessage;
      if (stateMsg && typeof stateMsg === 'string' && stateMsg.toLowerCase().includes('timeout')) {
        return stateMsg;
      }
    } catch (e) {}
    return null;
  });

  // If already logged in as Executive Director, redirect to ED dashboard
  React.useEffect(() => {
    if (user && user.role === Role.EXECUTIVE_DIRECTOR) {
      navigate('/ed', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const authUser = await getUserByEmail(cleanEmail);

      if (!authUser) {
        setError('Executive account not found in database. Please verify your email.');
        setIsLoading(false);
        return;
      }

      if (authUser.role !== Role.EXECUTIVE_DIRECTOR) {
        setError('Access Denied: This account does not possess Executive Director credentials.');
        setIsLoading(false);
        return;
      }

      if (authUser.password && authUser.password !== password) {
        setError('Invalid password. Please enter the current Executive Director password.');
        setIsLoading(false);
        return;
      }

      if (authUser.status === 'inactive') {
        setError('Executive account is currently inactive in the database.');
        setIsLoading(false);
        return;
      }

      // Success
      onLoginSuccess(authUser);
      navigate('/ed', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify database connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 font-sans text-slate-100">
      
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[30rem] h-[30rem] bg-emerald-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] bg-teal-600/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        
        {/* Return to Homepage Link */}
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Homepage</span>
        </Link>

        {/* Main ED Login Card */}
        <div className="bg-slate-900/90 border border-emerald-500/30 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden">
          
          {/* Card Header */}
          <div className="p-8 text-center border-b border-slate-800 relative bg-gradient-to-b from-emerald-950/40 to-transparent">
            <div className="w-20 h-20 bg-white rounded-3xl p-2.5 border-2 border-emerald-400/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/60 mb-4 overflow-hidden">
              <img 
                src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" 
                alt="ACCAD Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="inline-flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-emerald-300 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restricted Governance Portal</span>
            </div>

            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Executive Director Login
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto mt-1.5">
              Secure administrative access for farm-wide operations, audit vetting, and user management.
            </p>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-5">
            
            {/* Timeout Notice */}
            {timeoutNotice && (
              <div className="p-3.5 bg-amber-950/70 border border-amber-500/50 rounded-2xl flex items-start space-x-2.5 text-amber-200 text-xs font-bold animate-fadeIn shadow-sm">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="flex-1">
                  <span className="font-extrabold uppercase text-[10px] tracking-wider block text-amber-400">
                    Session Inactivity Timeout (30 Mins)
                  </span>
                  <span>{timeoutNotice}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-600/40 rounded-2xl flex items-start space-x-2 text-rose-300 text-xs font-bold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                  Executive Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@accadfarms.com"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                    ED Security Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-12 py-3 text-sm text-white outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-6"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Database Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Access Executive Dashboard</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-3 border-t border-slate-800">
              <p className="text-[11px] text-slate-500 font-medium">
                URL-restricted access for Executive Director governance only.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-500 font-medium">
          ACCAD Farms • Executive Director Portal
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        initialEmail={email}
        isExecutiveMode={true}
      />
    </div>
  );
};
