import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Role } from '../types';
import { Clock, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const WARNING_WINDOW_MS = 2 * 60 * 1000;   // 2 minutes before timeout
export const LAST_ACTIVITY_KEY = 'accad_session_last_active';
export const TIMEOUT_NOTICE_KEY = 'accad_timeout_notice';

interface SessionTimeoutGuardProps {
  currentUser: User | null;
  onLogout: (reason?: string) => void;
  children: React.ReactNode;
}

export const SessionTimeoutGuard: React.FC<SessionTimeoutGuardProps> = ({
  currentUser,
  onLogout,
  children
}) => {
  const navigate = useNavigate();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);
  const lastWriteTimeRef = useRef<number>(Date.now());

  // Record user activity
  const recordActivity = useCallback((force = false) => {
    if (!currentUser) return;
    const now = Date.now();
    // Throttle writing to localStorage to once every 4 seconds unless forced
    if (force || now - lastWriteTimeRef.current > 4000) {
      lastWriteTimeRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        // Dispatch custom event for in-window components (like the badge) to update immediately
        window.dispatchEvent(new CustomEvent('accad_activity_ping', { detail: { timestamp: now } }));
      } catch (e) {
        // Ignore localStorage quota errors
      }
    }
  }, [currentUser]);

  // Extend session handler (used when user clicks 'Stay Logged In')
  const handleStayLoggedIn = useCallback(() => {
    recordActivity(true);
    setShowWarningModal(false);
  }, [recordActivity]);

  // Execute session expiration logout
  const handleExpireSession = useCallback(() => {
    setShowWarningModal(false);
    try {
      sessionStorage.setItem(
        TIMEOUT_NOTICE_KEY,
        'Your session timed out after 30 minutes of inactivity. Please sign in again to continue.'
      );
    } catch (e) {}

    const wasED = currentUser?.role === Role.EXECUTIVE_DIRECTOR;
    onLogout('Session timed out after 30 minutes of inactivity');

    // Route to appropriate login portal
    if (wasED) {
      navigate('/ed', { replace: true, state: { alertMessage: 'Session timed out after 30 minutes of inactivity.' } });
    } else {
      navigate('/login', { replace: true, state: { alertMessage: 'Session timed out after 30 minutes of inactivity.' } });
    }
  }, [currentUser, onLogout, navigate]);

  // 1. Initialize activity timestamp on login or mount
  useEffect(() => {
    if (!currentUser) {
      setShowWarningModal(false);
      return;
    }

    const savedLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    const now = Date.now();

    if (!savedLastActivity) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      lastWriteTimeRef.current = now;
    } else {
      const elapsed = now - Number(savedLastActivity);
      if (elapsed >= SESSION_TIMEOUT_MS) {
        // Stored session has already expired while away!
        handleExpireSession();
        return;
      }
    }
  }, [currentUser, handleExpireSession]);

  // 2. Attach global user interaction listeners
  useEffect(() => {
    if (!currentUser) return;

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleUserInteraction = () => {
      // If warning modal is currently shown, user must click the button explicitly
      if (!showWarningModal) {
        recordActivity(false);
      }
    };

    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleUserInteraction, { passive: true });
    });

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleUserInteraction);
      });
    };
  }, [currentUser, showWarningModal, recordActivity]);

  // 3. Inactivity checker ticker (runs every 1 second)
  useEffect(() => {
    if (!currentUser) return;

    const checkInterval = setInterval(() => {
      const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
      const lastActive = saved ? Number(saved) : Date.now();
      const now = Date.now();
      const elapsed = now - lastActive;

      if (elapsed >= SESSION_TIMEOUT_MS) {
        // Session fully expired
        clearInterval(checkInterval);
        handleExpireSession();
      } else if (elapsed >= SESSION_TIMEOUT_MS - WARNING_WINDOW_MS) {
        // Within warning window (< 2 minutes remaining)
        const remainingMs = SESSION_TIMEOUT_MS - elapsed;
        setSecondsRemaining(Math.max(0, Math.ceil(remainingMs / 1000)));
        setShowWarningModal(true);
      } else {
        // Active within safe window
        if (showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [currentUser, showWarningModal, handleExpireSession]);

  // 4. Cross-tab synchronization & visibility resume listener
  useEffect(() => {
    if (!currentUser) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const lastActive = Number(e.newValue);
        const elapsed = Date.now() - lastActive;
        if (elapsed < SESSION_TIMEOUT_MS - WARNING_WINDOW_MS) {
          // Another tab refreshed the session! Dismiss warning modal.
          setShowWarningModal(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (saved) {
          const elapsed = Date.now() - Number(saved);
          if (elapsed >= SESSION_TIMEOUT_MS) {
            handleExpireSession();
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [currentUser, handleExpireSession]);

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {children}

      {/* Session Inactivity Timeout Warning Modal */}
      {showWarningModal && currentUser && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-warning-title"
        >
          <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 text-center animate-scaleIn relative overflow-hidden">
            
            {/* Top decorative amber bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 animate-pulse" />

            {/* Warning Icon Badge */}
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-200">
              <Clock className="w-8 h-8 animate-pulse text-amber-600" />
            </div>

            {/* Header Text */}
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 bg-amber-100/80 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                <span>Security Timeout Warning</span>
              </div>
              <h3 id="session-warning-title" className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Session Expiring Soon
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                You have been inactive for over 28 minutes. For data integrity and farm record security, your session will automatically log out in:
              </p>
            </div>

            {/* Live Countdown Display */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-inner flex flex-col items-center justify-center space-y-1 border border-slate-800">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-amber-400">
                {formatCountdown(secondsRemaining)}
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Minutes : Seconds Remaining
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleStayLoggedIn}
                className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Stay Logged In</span>
              </button>

              <button
                type="button"
                onClick={() => handleExpireSession()}
                className="w-full sm:w-auto bg-slate-100 hover:bg-rose-50 hover:text-rose-700 active:scale-95 text-slate-600 font-extrabold py-3.5 px-5 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-medium">
              🔒 30-minute automated inactivity timeout applies to all ACCAD farm operational dashboards.
            </p>

          </div>
        </div>
      )}
    </>
  );
};
