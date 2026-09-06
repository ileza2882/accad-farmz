import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  verifyPasswordResetToken,
  completePasswordReset,
  validatePasswordStrength
} from '../lib/insforge';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

/**
 * Landing page for the single-use link emailed by "Forgot Password".
 *
 * The token is validated before the form is shown, so an expired or already-used link fails
 * immediately rather than after the user has typed a new password.
 */
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!token) {
        setTokenError('This link is missing its reset code. Please use the link from your email.');
        setChecking(false);
        return;
      }

      const result = await verifyPasswordResetToken(token);
      if (cancelled) return;

      if (result.valid) {
        setTokenEmail(result.email || null);
      } else {
        setTokenError(
          result.reason === 'expired'
            ? 'This reset link has expired. Reset links are valid for 1 hour - please request a new one.'
            : result.reason === 'used'
            ? 'This reset link has already been used. Please request a new one.'
            : 'This reset link is not valid. Please request a new one.'
        );
      }
      setChecking(false);
    };

    check();
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const policyError = validatePasswordStrength(password);
    if (policyError) {
      setError(policyError);
      return;
    }

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await completePasswordReset(token, password);
      if (result.ok) {
        setDone(true);
        setTimeout(() => navigate('/login'), 4000);
      } else {
        setError(result.message || 'Could not reset your password. Please request a new link.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not reset your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-7 sm:p-8">

        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-5">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Choose a New Password</h1>
            <p className="text-xs text-slate-500 font-medium">ACCAD FARMS Management Portal</p>
          </div>
        </div>

        {checking ? (
          <div className="flex items-center justify-center space-x-2 py-10 text-slate-500 text-sm font-bold">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Checking your reset link...</span>
          </div>
        ) : done ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Password updated</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              You can now sign in with your new password. Taking you to the login page...
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : tokenError ? (
          <div className="space-y-5">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{tokenError}</span>
            </div>
            <Link
              to="/login"
              className="block text-center px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              Back to Sign In
            </Link>
            <p className="text-[11px] text-center text-slate-500">
              Use <strong>Forgot Password</strong> on the sign-in page to request a fresh link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tokenEmail && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800">
                Resetting the password for <span className="font-mono">{tokenEmail}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                New Password *
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-emerald-700 absolute left-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1.5">
                Must be at least 8 characters and include a letter and a number.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Set New Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
