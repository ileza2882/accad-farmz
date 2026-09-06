import React, { useState } from 'react';
import { createPasswordResetToken, createAuditLog, PASSWORD_RESET_TOKEN_TTL_MS } from '../lib/insforge';
import { sendPasswordResetLinkEmail } from '../lib/emailService';
import {
  KeyRound,
  X,
  Mail,
  CheckCircle2,
  AlertCircle,
  Send,
  ShieldCheck,
  Loader2
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  isExecutiveMode?: boolean;
}

/**
 * Self-service password recovery.
 *
 * Everyone - staff, managers and the Executive Director alike - recovers their own account
 * through a single-use link emailed to the address on file. Nobody else, including the ED,
 * sets another person's password.
 *
 * This replaced two earlier paths: a request queued for the ED to action by hand, and an
 * "ED master recovery key" that accepted the literal string 123456, which meant anyone who
 * opened the login page could take over the Executive Director account.
 */
export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = ''
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    setStep('request');
    setError(null);
    setDeliveryWarning(null);
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const expiresInMinutes = Math.round(PASSWORD_RESET_TOKEN_TTL_MS / 60000);

  const buildResetUrl = (rawToken: string): string => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://accadfarms.pages.dev';
    // HashRouter: the route and its query live after the '#'
    return `${origin}/#/reset-password?token=${encodeURIComponent(rawToken)}`;
  };

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDeliveryWarning(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);

    try {
      const issued = await createPasswordResetToken(cleanEmail);

      // Deliberately identical outcome whether or not the account exists, so this form cannot
      // be used to discover which addresses are registered.
      if (!issued) {
        setStep('sent');
        setIsLoading(false);
        return;
      }

      const resetUrl = buildResetUrl(issued.rawToken);
      const result = await sendPasswordResetLinkEmail({
        user: issued.user,
        resetUrl,
        expiresInMinutes
      });

      if (!result.success) {
        setDeliveryWarning(
          'We could not confirm the email was delivered. If nothing arrives, contact the Executive Directorate.'
        );
      }

      try {
        await createAuditLog(
          issued.user.fullName,
          issued.user.email,
          'PASSWORD_RESET_LINK_REQUESTED',
          `Password reset link issued to ${issued.user.email} (expires in ${expiresInMinutes} minutes)`
        );
      } catch (auditErr) {}

      setStep('sent');
    } catch (err: any) {
      setError(err?.message || 'Could not send the reset link. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative overflow-hidden">

        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-5">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Forgot Password</h3>
            <p className="text-xs text-slate-500 font-medium">We will email you a link to reset it</p>
          </div>
        </div>

        {step === 'sent' ? (
          <div className="space-y-5">
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">Check your email</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                If <strong className="text-slate-800">{email.trim().toLowerCase()}</strong> is registered on the
                portal, a password reset link is on its way. The link works once and expires in{' '}
                <strong>{expiresInMinutes} minutes</strong>.
              </p>
            </div>

            {deliveryWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-900 text-[11px] font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{deliveryWarning}</span>
              </div>
            )}

            <p className="text-[11px] text-center text-slate-500 leading-relaxed">
              Nothing after a few minutes? Check your <strong>Spam</strong> folder, and confirm you entered the
              address the Executive Directorate registered for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setStep('request'); setDeliveryWarning(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRequestLink} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter the email address registered for your ACCAD FARMS account. We will send you a secure,
              single-use link so you can choose a new password yourself.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Registered Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-medium leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Only you can set your new password. The link is single use, expires in {expiresInMinutes} minutes,
                and no one else ever sees your password.
              </span>
            </div>

            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
