import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Role } from '../types';
import { getUserByEmail } from '../lib/insforge';
import { LogIn, Mail, Lock, AlertCircle, ArrowLeft, ShieldCheck, Users, Briefcase, Egg, Clock } from 'lucide-react';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await getUserByEmail(email.trim());

      if (!user) {
        setError('Access Denied: Account not found or has been deactivated from the database.');
        setIsSubmitting(false);
        return;
      }

      // Check if trying to log in as Executive Director via regular staff portal
      if (user.role === Role.EXECUTIVE_DIRECTOR) {
        setError('Executive Director login is exclusively accessed via the Executive Portal on the Homepage.');
        setIsSubmitting(false);
        return;
      }

      // Check password match (default '123456' or matched password)
      if (user.password && user.password !== password) {
        setError('Invalid credentials.');
        setIsSubmitting(false);
        return;
      }

      // Check user active status
      if (user.status === 'inactive') {
        setError('Account not active. Please contact the Executive Director.');
        setIsSubmitting(false);
        return;
      }

      // Login success for Manager, Hatchery Manager, or Staff
      onLoginSuccess(user);
      
      if (user.role === Role.HATCHERY_MANAGER) {
        navigate('/fishery');
      } else if (user.role === Role.MANAGER) {
        navigate('/manager');
      } else {
        navigate('/staff');
      }

    } catch (err: any) {
      setError('Login failed: ' + (err.message || 'Server error'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-white flex flex-col justify-center items-center px-4 py-12">
      
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 relative">
        
        {/* Logo Banner */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 bg-emerald-50 rounded-3xl p-3 border-2 border-emerald-200 flex items-center justify-center mb-3 shadow-md">
            <img 
              src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" 
              alt="ACCAD Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            Portal <span className="text-emerald-600">Login</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sign in to your Staff or Manager operational workspace
          </p>
        </div>

        {/* Timeout Notice */}
        {timeoutNotice && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start space-x-3 text-amber-900 text-xs font-bold animate-fadeIn shadow-sm">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-extrabold uppercase text-[10px] tracking-wider block text-amber-800">
                Session Inactivity Timeout (30 Mins)
              </span>
              <span>{timeoutNotice}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-700 text-xs font-bold animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
              {error.includes('Homepage') && (
                <div className="mt-2">
                  <Link 
                    to="/" 
                    className="inline-flex items-center space-x-1 text-emerald-900 bg-emerald-100 hover:bg-purple-200 px-3 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Go to Homepage ED Portal</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Quick Role Login Options Selector (Managers & Staff only) */}
          <div className="mb-6 space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">
              Quick Role Login Options
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmail('manager@accadfarms.com');
                  setPassword('123456');
                  setError(null);
                }}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer active:scale-95 ${
                  email === 'manager@accadfarms.com'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm font-extrabold ring-2 ring-emerald-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                }`}
              >
                <Briefcase className="w-4 h-4 text-emerald-700" />
                <span className="text-[11px] uppercase tracking-tight font-black">Sector Mgr</span>
                <span className="text-[9px] text-slate-400 font-medium">Vetting & Review</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('staff@accadfarms.com');
                  setPassword('123456');
                  setError(null);
                }}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer active:scale-95 ${
                  email === 'staff@accadfarms.com'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm font-extrabold ring-2 ring-emerald-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] uppercase tracking-tight font-black">Staff Member</span>
                <span className="text-[9px] text-slate-400 font-medium">Daily Farm Logs</span>
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@accadfarms.com"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>

        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <Link to="/" className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </Link>
        </div>

      </div>

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
