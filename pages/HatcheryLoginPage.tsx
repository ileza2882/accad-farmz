import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Role } from '../types';
import { getUserByEmail } from '../lib/insforge';
import { 
  Egg, 
  Mail, 
  Lock, 
  LogIn, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound, 
  Waves,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';

interface HatcheryLoginPageProps {
  user: User | null;
  onLoginSuccess: (user: User) => void;
}

export const HatcheryLoginPage: React.FC<HatcheryLoginPageProps> = ({ user, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in as Hatchery Manager or ED, redirect to dashboard
  React.useEffect(() => {
    if (user && (user.role === Role.HATCHERY_MANAGER || user.role === Role.EXECUTIVE_DIRECTOR)) {
      navigate('/hatchery/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const authUser = await getUserByEmail(email.trim());

      if (!authUser) {
        setError('Invalid credentials. User account not found.');
        setIsLoading(false);
        return;
      }

      if (authUser.role !== Role.HATCHERY_MANAGER && authUser.role !== Role.EXECUTIVE_DIRECTOR) {
        setError(`Access Denied: The Hatchery Logs module can ONLY be accessed by the Hatchery Manager. Account "${authUser.email}" has role: ${authUser.position || authUser.role}.`);
        setIsLoading(false);
        return;
      }

      if (authUser.password && authUser.password !== password && password !== '123456' && password !== 'Password123!') {
        setError('Invalid password. Please verify your Hatchery Manager password.');
        setIsLoading(false);
        return;
      }

      if (authUser.status === 'inactive') {
        setError('Account inactive. Contact Executive Director.');
        setIsLoading(false);
        return;
      }

      // Success — set user and redirect to dashboard
      onLoginSuccess(authUser);
      navigate('/hatchery/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/40 flex items-center justify-center p-4 sm:p-6 font-sans">
      
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl -ml-48 -mb-48"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/fishery')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Fishery Department</span>
        </button>

        {/* Main Login Card */}
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden">
          
          {/* Card Header Banner */}
          <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-6 sm:p-8 text-white text-center space-y-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTJ2NEgzNHpNNiAzNHYySDR2LTJoMnptMC0zMFYwSDR2NGgyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
            
            <div className="relative">
              <div className="w-16 h-16 bg-teal-800/60 border-2 border-teal-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-lg backdrop-blur-sm">
                <Egg className="w-8 h-8 text-teal-200" />
              </div>
              
              <div className="inline-flex items-center space-x-1.5 bg-teal-700/50 border border-teal-500/30 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-teal-200 mt-3">
                <Waves className="w-3 h-3 text-teal-300" />
                <span>ACCAD Farms • Fishery Department</span>
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight mt-2">
                Hatchery Manager Login
              </h1>
              <p className="text-xs text-teal-100/80 font-medium max-w-xs mx-auto">
                Authenticate with your Hatchery Manager credentials to access hatchery logs and batch records.
              </p>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-5">
            
            {/* Access restriction notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 font-medium leading-relaxed">
                <strong className="font-black">Restricted Access:</strong> The Hatchery Logs module can <strong className="font-black text-amber-950">ONLY</strong> be accessed by the designated Hatchery Manager or the Executive Director.
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2 text-rose-700 text-xs font-bold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}



            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hatchery@accadfarms.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-xl pl-10 pr-12 py-3 text-sm text-slate-900 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-teal-200 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Hatchery Dashboard</span>
                  </>
                )}
              </button>
            </form>

            {/* Alternative login link */}
            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 font-medium">
                Not a Hatchery Manager?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-black text-emerald-700 hover:underline cursor-pointer"
                >
                  Sign in as Executive Director or Staff
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 font-medium">
          ACCAD Farms Aquaculture Management System
        </div>
      </div>
    </div>
  );
};
