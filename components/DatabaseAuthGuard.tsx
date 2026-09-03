import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User, Role } from '../types';
import { verifyDatabaseAuthorization } from '../lib/insforge';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface DatabaseAuthGuardProps {
  currentUser: User | null;
  allowedRoles?: Role[];
  onRevokeAccess: (reason: string) => void;
  onUserVerified?: (user: User) => void;
  children: React.ReactNode;
}

export const DatabaseAuthGuard: React.FC<DatabaseAuthGuardProps> = ({
  currentUser,
  allowedRoles,
  onRevokeAccess,
  onUserVerified,
  children
}) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [denialReason, setDenialReason] = useState<string | null>(null);
  const location = useLocation();
  const isCheckingRef = useRef(false);

  const checkAuthorization = useCallback(async () => {
    if (!currentUser || !currentUser.email) {
      setIsAuthorized(false);
      setDenialReason('Authentication required. Please sign in.');
      setIsVerifying(false);
      return;
    }

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const dbUser = await verifyDatabaseAuthorization(currentUser.email);

      if (!dbUser) {
        // User record does not exist or has been deleted/deactivated from the database!
        console.warn(`[DatabaseAuthGuard] Access DENIED for ${currentUser.email} - record not found in InsForge DB.`);
        setIsAuthorized(false);
        setDenialReason('Your account has been deactivated or removed from the database by the Executive Director.');
        onRevokeAccess('Your account has been deactivated or removed from the database by the Executive Director.');
        setIsVerifying(false);
        return;
      }

      if (dbUser.status === 'inactive') {
        console.warn(`[DatabaseAuthGuard] Access DENIED for ${currentUser.email} - status is inactive.`);
        setIsAuthorized(false);
        setDenialReason('Your account has been deactivated. Please contact the Executive Directorate.');
        onRevokeAccess('Your account has been deactivated. Please contact the Executive Directorate.');
        setIsVerifying(false);
        return;
      }

      // Check role authorization if specified
      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
        console.warn(`[DatabaseAuthGuard] Role mismatch for ${currentUser.email}. Role: ${dbUser.role}, Allowed: ${allowedRoles.join(', ')}`);
        setIsAuthorized(false);
        setDenialReason(`Access restricted. Your current role (${dbUser.role}) is not authorized for this dashboard.`);
        onRevokeAccess(`Access restricted. Your current role (${dbUser.role}) is not authorized for this dashboard.`);
        setIsVerifying(false);
        return;
      }

      // Authorization Confirmed with live InsForge DB!
      setIsAuthorized(true);
      setDenialReason(null);
      if (onUserVerified && (dbUser.role !== currentUser.role || dbUser.status !== currentUser.status)) {
        onUserVerified(dbUser);
      }
    } catch (err: any) {
      console.warn('[DatabaseAuthGuard] Verification query failed:', err);
      // If network transient error, allow if currentUser exists but keep verifying
      setIsAuthorized(true);
    } finally {
      setIsVerifying(false);
      isCheckingRef.current = false;
    }
  }, [currentUser, allowedRoles, onRevokeAccess, onUserVerified]);

  // 1. Initial Verification on Route Load
  useEffect(() => {
    setIsVerifying(true);
    checkAuthorization();
  }, [location.pathname, checkAuthorization]);

  // 2. Real-Time Heartbeat (Every 15s) and Focus Listener
  useEffect(() => {
    if (!currentUser) return;

    // Heartbeat verification every 15 seconds
    const interval = setInterval(() => {
      checkAuthorization();
    }, 15000);

    // Immediate check whenever user returns to window / tab
    const handleFocus = () => {
      checkAuthorization();
    };

    // Cross-tab deactivation listeners
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accad_session_revoked_at' || e.key === 'accad_deleted_user_ids') {
        checkAuthorization();
      }
    };

    const handleCustomDeact = () => {
      checkAuthorization();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('accad_user_deactivated', handleCustomDeact);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('accad_user_deactivated', handleCustomDeact);
    };
  }, [currentUser, checkAuthorization]);

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location, message: 'Please sign in to access this portal.' }} />;
  }

  // Loading state while checking database on fresh mount
  if (isVerifying && isAuthorized === null) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-slate-50/50">
        <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-8 max-w-sm w-full text-center space-y-4 animate-fadeIn">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h4 className="text-base font-black text-slate-900">Verifying Database Authorization</h4>
          <p className="text-xs text-slate-500 font-medium">
            Confirming active credentials with the InsForge system...
          </p>
        </div>
      </div>
    );
  }

  // Access Denied / Deactivated in Database
  if (isAuthorized === false) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 bg-slate-50/50">
        <div className="bg-white border-2 border-rose-200 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center space-y-5 animate-scaleIn">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">Access Revoked</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {denialReason || 'Your account is not authorized or has been deactivated in the database.'}
            </p>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-[11px] font-bold text-rose-800">
            🔒 Database Authorization Required: Stored passwords or local session tokens cannot bypass backend deactivation.
          </div>
          <Navigate to="/login" replace state={{ alertMessage: denialReason }} />
        </div>
      </div>
    );
  }

  // Authorized: Render the requested Dashboard!
  return <>{children}</>;
};
