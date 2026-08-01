import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Role } from '../types';
import { getUserByEmail } from '../lib/insforge';
import { LogIn, Mail, Lock, AlertCircle, Shield, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setError('Invalid credentials');
        setIsSubmitting(false);
        return;
      }

      // Check password match (in development/fallback default '123456' or matched password)
      if (user.password && user.password !== password) {
        setError('Invalid credentials');
        setIsSubmitting(false);
        return;
      }

      // Check user active status
      if (user.status === 'inactive') {
        setError('Account not active. Contact ED.');
        setIsSubmitting(false);
        return;
      }

      // Login success
      onLoginSuccess(user);
      
      // Redirect based on role
      if (user.role === Role.EXECUTIVE_DIRECTOR) navigate('/admin');
      else if (user.role === Role.MANAGER) navigate('/manager');
      else navigate('/staff');

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
          <div className="w-28 h-28 bg-emerald-50 rounded-3xl p-3 border-2 border-emerald-200 flex items-center justify-center mb-3 shadow-md">
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
            Access your ACCAD FARMS role-based dashboard
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-700 text-xs font-bold animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Quick Role Login Options Selector */}
          <div className="mb-6 space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">
              Quick Role Login Options
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('info@accadfarms.com');
                  setPassword('123456');
                  setError(null);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                  email === 'info@accadfarms.com'
                    ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm font-extrabold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                }`}
              >
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-[11px] uppercase tracking-tight leading-tight">Executive Director</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('manager@accadfarms.com');
                  setPassword('123456');
                  setError(null);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                  email === 'manager@accadfarms.com'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm font-extrabold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                }`}
              >
                <LogIn className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] uppercase tracking-tight leading-tight">Sector Manager</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('staff@accadfarms.com');
                  setPassword('123456');
                  setError(null);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                  email === 'staff@accadfarms.com'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm font-extrabold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                }`}
              >
                <LogIn className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] uppercase tracking-tight leading-tight">Staff Member</span>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Password
            </label>
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center space-x-2"
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

        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
