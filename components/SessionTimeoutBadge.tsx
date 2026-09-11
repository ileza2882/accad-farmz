import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SESSION_TIMEOUT_MS, LAST_ACTIVITY_KEY } from './SessionTimeoutGuard';

interface SessionTimeoutBadgeProps {
  compact?: boolean;
  className?: string;
  dark?: boolean;
}

export const SessionTimeoutBadge: React.FC<SessionTimeoutBadgeProps> = ({
  compact = false,
  className = '',
  dark = false
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30 * 60);
  const [isExtendedRecently, setIsExtendedRecently] = useState(false);

  const calculateRemaining = useCallback(() => {
    const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
    const lastActive = saved ? Number(saved) : Date.now();
    const elapsed = Date.now() - lastActive;
    const leftMs = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
    return Math.floor(leftMs / 1000);
  }, []);

  useEffect(() => {
    setRemainingSeconds(calculateRemaining());

    const timer = setInterval(() => {
      setRemainingSeconds(calculateRemaining());
    }, 1000);

    const handlePing = () => {
      setRemainingSeconds(calculateRemaining());
    };

    window.addEventListener('accad_activity_ping', handlePing);
    window.addEventListener('storage', handlePing);

    return () => {
      clearInterval(timer);
      window.removeEventListener('accad_activity_ping', handlePing);
      window.removeEventListener('storage', handlePing);
    };
  }, [calculateRemaining]);

  const handleManualExtend = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    window.dispatchEvent(new CustomEvent('accad_activity_ping', { detail: { timestamp: now } }));
    setRemainingSeconds(30 * 60);
    setIsExtendedRecently(true);
    setTimeout(() => setIsExtendedRecently(false), 2500);
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;

  const isLowTime = remainingSeconds <= 300; // Under 5 minutes

  if (compact) {
    return (
      <div 
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs select-none ${
          dark 
            ? isLowTime
              ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300 animate-pulse'
              : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60'
            : isLowTime
              ? 'bg-amber-50 border border-amber-300 text-amber-900 animate-pulse'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100/70'
        } ${className}`}
        title={`Session Inactivity Timeout: ${timeFormatted} remaining before auto-logout. Click to extend session by 30 mins.`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLowTime ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isLowTime ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
        </span>
        
        <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-amber-500' : dark ? 'text-emerald-400' : 'text-emerald-600'}`} />

        <span className="text-[11px] font-mono tracking-tight font-extrabold">
          {isExtendedRecently ? 'Session +30m' : `${timeFormatted} left`}
        </span>

        <button
          type="button"
          onClick={handleManualExtend}
          title="Reset timer to 30 mins"
          className={`p-1 rounded-lg transition-transform active:scale-90 cursor-pointer ${
            dark ? 'hover:bg-emerald-800 text-emerald-300' : 'hover:bg-emerald-200/80 text-emerald-700'
          }`}
        >
          {isExtendedRecently ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <RefreshCw className="w-3 h-3 hover:rotate-180 transition-transform duration-300" />
          )}
        </button>
      </div>
    );
  }

  // Full / Card Widget Mode
  return (
    <div 
      className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all ${
        dark 
          ? 'bg-slate-900/90 border-emerald-800/40 text-white shadow-lg' 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
            dark ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                dark ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/40' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Security Active
              </span>
              <span className={`text-xs font-mono font-black ${isLowTime ? 'text-amber-500 animate-pulse' : dark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                {timeFormatted}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight mt-0.5">
              30-Minute Inactivity Auto-Timeout
            </h4>
            <p className={`text-[10px] sm:text-[11px] font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Session auto-terminates after 30 minutes of idle inactivity to protect farm ledger data.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualExtend}
          className={`shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs ${
            isExtendedRecently
              ? 'bg-emerald-600 text-white shadow-emerald-500/30'
              : dark
                ? 'bg-emerald-800/60 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          title="Reset inactivity timer to 30 minutes"
        >
          {isExtendedRecently ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Extended!</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Extend (+30m)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
