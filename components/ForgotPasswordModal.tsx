import React, { useState } from 'react';
import { getUserByEmail, updateUser, createNotification, createAuditLog } from '../lib/insforge';
import { Role } from '../types';
import { 
  KeyRound, 
  X, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Send,
  Eye,
  EyeOff
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  isExecutiveMode?: boolean;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  isExecutiveMode = false
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<'request' | 'success' | 'ed_reset'>('request');
  const [note, setNote] = useState('');
  
  // For ED direct reset
  const [masterKey, setMasterKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    setStep('request');
    setError(null);
    setSuccessMessage(null);
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleStaffResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await getUserByEmail(cleanEmail);

      if (!user) {
        setError('No account found matching this email address in the database.');
        setIsLoading(false);
        return;
      }

      // If user is ED, offer direct ED recovery mode
      if (user.role === Role.EXECUTIVE_DIRECTOR || isExecutiveMode) {
        setStep('ed_reset');
        setIsLoading(false);
        return;
      }

      // Staff / Manager Flow: Dispatch request to Executive Director
      await createNotification({
        userId: 'ed_user_1',
        userEmail: 'info@accadfarms.com',
        title: `URGENT: Password Reset Request from ${user.fullName}`,
        message: `${user.fullName} (${user.email}, ${user.role} - ${user.department || 'General'}) has requested a password reset. Note: "${note.trim() || 'Please reset my password.'}"`,
        type: 'warning'
      });

      await createAuditLog(
        user.fullName,
        user.email,
        'PASSWORD_RESET_REQUESTED',
        `User ${user.fullName} (${user.email}) requested a password reset from Executive Director. Reason: ${note.trim() || 'Not specified'}`
      );

      setSuccessMessage(`Password reset request sent to the Executive Director! The ED has received a high-priority notification and will update your credentials in the database.`);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to submit password reset request. Please check database connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEDDirectReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Email address is required.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    // Verify recovery authorization (Master Key or previous default '123456')
    if (masterKey.trim() !== '123456' && masterKey.trim() !== 'ACCAD-MASTER-2026') {
      setError('Invalid Master Recovery Key. Please provide the current master key (default 123456) to verify Executive authority.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await getUserByEmail(cleanEmail);
      if (!user || user.role !== Role.EXECUTIVE_DIRECTOR) {
        setError('Executive Director record not found.');
        setIsLoading(false);
        return;
      }

      // Update in InsForge database
      await updateUser(cleanEmail, { password: newPassword });

      await createAuditLog(
        user.fullName,
        user.email,
        'ED_PASSWORD_RESET',
        `Executive Director password reset successfully via Master Recovery Key and synced with database.`
      );

      setSuccessMessage('Executive Director password updated successfully! You can now sign in with your new password.');
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to update password in database.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {step === 'ed_reset' ? 'Executive Password Recovery' : 'Forgot Password'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {step === 'ed_reset' ? 'Master verification & password update' : 'Enterprise credential recovery system'}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2 text-rose-700 text-xs font-bold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Staff/Manager Reset Request */}
        {step === 'request' && (
          <form onSubmit={handleStaffResetRequest} className="space-y-4">
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 leading-relaxed font-medium">
              Enter your registered work email. Because all accounts are governed by the Executive Director, submitting this form sends a verified reset notification directly to the ED.
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Registered Work Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@accadfarms.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Additional Note / Staff ID (Optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Fishery Staff ID STF-001, forgot morning password."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-900 outline-none transition-all font-medium"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Reset Request to ED</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP: ED Direct Reset */}
        {step === 'ed_reset' && (
          <form onSubmit={handleEDDirectReset} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium leading-relaxed">
              <strong className="font-bold">Executive Authority Detected:</strong> You can reset the Executive Director password directly by confirming the master key.
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Executive Email Address
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Current / Master Key (Default: 123456) *
              </label>
              <input
                type="password"
                required
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="Enter current or master key"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                New Executive Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold outline-none"
              />
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs uppercase"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase shadow-md active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Updating DB...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}

        {/* STEP: Success Message */}
        {step === 'success' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-black text-slate-900 uppercase">Action Completed</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {successMessage}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Close Window
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
