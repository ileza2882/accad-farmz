import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Homepage } from './pages/Homepage';
import { LoginPage } from './pages/LoginPage';
import { ExecutiveLoginPage } from './pages/ExecutiveLoginPage';
import { StaffDashboard } from './pages/StaffDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { FisheryDepartmentPage } from './pages/FisheryDepartmentPage';
import { HatcheryLoginPage } from './pages/HatcheryLoginPage';
import { HatcheryDashboardPage } from './pages/HatcheryDashboardPage';
import { HatcheryFormPage } from './pages/HatcheryFormPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Header } from './components/Header';
import { DatabaseAuthGuard } from './components/DatabaseAuthGuard';
import { SessionTimeoutGuard, LAST_ACTIVITY_KEY } from './components/SessionTimeoutGuard';
import { User, Role } from './types';
import { getUsers, updateUser, verifyDatabaseAuthorization } from './lib/insforge';
import { refreshPushRegistration } from './lib/pushNotifications';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('accad_user_v2') || localStorage.getItem('accad_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Handle direct URL navigation like app URL/ed
  useEffect(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    if (path === '/ed' && !window.location.hash.includes('/ed')) {
      window.location.hash = '#/ed';
    }
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('accad_user_v2', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('accad_user_v2');
      }
    } catch (e) {}
  }, [currentUser]);

  // Re-register this device for push on every authenticated load.
  //
  // FCM rotates tokens on its own schedule, and a rotated token we never hear about is a device
  // that silently stops receiving anything. This never prompts - it returns immediately unless
  // permission was already granted - so it is safe to run unattended.
  useEffect(() => {
    if (currentUser?.email) {
      refreshPushRegistration({ email: currentUser.email, id: currentUser.id });
    }
  }, [currentUser?.email]);

  // Strict Startup Database Authorization Check:
  // Zero local cache bypass: verify active authorization with InsForge DB immediately.
  useEffect(() => {
    const checkActiveSession = async () => {
      if (currentUser && currentUser.email) {
        const verified = await verifyDatabaseAuthorization(currentUser.email);
        if (!verified) {
          console.warn('[App] Active session revoked: Account not found or deactivated in database.');
          handleLogout();
        } else if (verified.role !== currentUser.role || verified.status !== currentUser.status) {
          setCurrentUser(verified);
        }
      }
    };
    checkActiveSession();
    getUsers();
  }, []);

  const handleLogout = (reason?: string) => {
    setCurrentUser(null);
    localStorage.removeItem('accad_user_v2');
    localStorage.removeItem('accad_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (reason && typeof window !== 'undefined') {
      console.warn(`[App] Session terminated: ${reason}`);
    }
  };

  const handleRoleSwitch = async (newRole: Role) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, role: newRole };
    setCurrentUser(updatedUser);
    localStorage.setItem('accad_user_v2', JSON.stringify(updatedUser));
    await updateUser(currentUser.email, { role: newRole });
  };

  return (
    <HashRouter>
      <SessionTimeoutGuard currentUser={currentUser} onLogout={handleLogout}>
        <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
        
        {/* Universal Header with Logo on Top-Left & Home Button */}
        <Header user={currentUser} onLogout={handleLogout} onRoleSwitch={handleRoleSwitch} />

        <main className="flex-grow">
          <Routes>
            {/* Public Homepage */}
            <Route path="/" element={<Homepage user={currentUser} onLoginSuccess={setCurrentUser} />} />

            {/* Dedicated Executive Director Route (URL ONLY: app URL/ed) */}
            <Route 
              path="/ed" 
              element={
                currentUser && currentUser.role === Role.EXECUTIVE_DIRECTOR ? (
                  <DatabaseAuthGuard 
                    currentUser={currentUser} 
                    allowedRoles={[Role.EXECUTIVE_DIRECTOR]} 
                    onRevokeAccess={handleLogout} 
                    onUserVerified={setCurrentUser}
                  >
                    <ExecutiveDashboard user={currentUser} />
                  </DatabaseAuthGuard>
                ) : (
                  <ExecutiveLoginPage user={currentUser} onLoginSuccess={setCurrentUser} />
                )
              } 
            />

            {/* Dedicated Fishery Department Hub (Grow-Out & Hatchery Gateway) */}
            <Route path="/fishery" element={<FisheryDepartmentPage user={currentUser} onLoginSuccess={setCurrentUser} />} />
            
            {/* Dedicated Hatchery Manager Login Page */}
            <Route 
              path="/hatchery" 
              element={
                currentUser && (currentUser.role === Role.HATCHERY_MANAGER || currentUser.role === Role.EXECUTIVE_DIRECTOR)
                  ? <Navigate to="/hatchery/dashboard" replace />
                  : <HatcheryLoginPage user={currentUser} onLoginSuccess={setCurrentUser} />
              } 
            />

            {/* Hatchery Manager Dashboard (Forms Selection Table) */}
            <Route 
              path="/hatchery/dashboard" 
              element={
                <DatabaseAuthGuard 
                  currentUser={currentUser} 
                  allowedRoles={[Role.HATCHERY_MANAGER, Role.EXECUTIVE_DIRECTOR]} 
                  onRevokeAccess={handleLogout} 
                  onUserVerified={setCurrentUser}
                >
                  <HatcheryDashboardPage user={currentUser!} />
                </DatabaseAuthGuard>
              } 
            />

            {/* Individual Hatchery Form Ledger (One Form Per Page) */}
            <Route 
              path="/hatchery/form/:reportId" 
              element={
                <DatabaseAuthGuard 
                  currentUser={currentUser} 
                  allowedRoles={[Role.HATCHERY_MANAGER, Role.EXECUTIVE_DIRECTOR]} 
                  onRevokeAccess={handleLogout} 
                  onUserVerified={setCurrentUser}
                >
                  <HatcheryFormPage user={currentUser!} />
                </DatabaseAuthGuard>
              } 
            />

            {/* Public Login Page */}
            <Route 
              path="/login" 
              element={
                currentUser ? (
                  currentUser.role === Role.EXECUTIVE_DIRECTOR ? <Navigate to="/ed" replace /> :
                  currentUser.role === Role.HATCHERY_MANAGER ? <Navigate to="/hatchery/dashboard" replace /> :
                  currentUser.role === Role.MANAGER ? <Navigate to="/manager" replace /> :
                  <Navigate to="/staff" replace />
                ) : (
                  <LoginPage onLoginSuccess={setCurrentUser} />
                )
              } 
            />

            {/* Role-based Dashboard Redirector */}
            <Route 
              path="/dashboard" 
              element={
                !currentUser ? <Navigate to="/login" replace /> :
                currentUser.role === Role.EXECUTIVE_DIRECTOR ? <Navigate to="/ed" replace /> :
                currentUser.role === Role.HATCHERY_MANAGER ? <Navigate to="/hatchery/dashboard" replace /> :
                currentUser.role === Role.MANAGER ? <Navigate to="/manager" replace /> :
                <Navigate to="/staff" replace />
              } 
            />

            {/* Staff Dashboard (Strict DB Login & live authorization required) */}
            <Route 
              path="/staff" 
              element={
                <DatabaseAuthGuard 
                  currentUser={currentUser} 
                  allowedRoles={[Role.STAFF, Role.MANAGER, Role.HATCHERY_MANAGER, Role.EXECUTIVE_DIRECTOR]} 
                  onRevokeAccess={handleLogout} 
                  onUserVerified={setCurrentUser}
                >
                  <StaffDashboard user={currentUser!} />
                </DatabaseAuthGuard>
              } 
            />

            {/* Manager Dashboard */}
            <Route 
              path="/manager" 
              element={
                <DatabaseAuthGuard 
                  currentUser={currentUser} 
                  allowedRoles={[Role.MANAGER, Role.EXECUTIVE_DIRECTOR]} 
                  onRevokeAccess={handleLogout} 
                  onUserVerified={setCurrentUser}
                >
                  <ManagerDashboard user={currentUser!} />
                </DatabaseAuthGuard>
              } 
            />

            {/* Redirect /admin and /executive to /ed */}
            <Route 
              path="/admin" 
              element={<Navigate to="/ed" replace />} 
            />

            <Route 
              path="/executive" 
              element={<Navigate to="/ed" replace />} 
            />

            {/* Notifications Page */}
            <Route 
              path="/notifications" 
              element={
                <DatabaseAuthGuard 
                  currentUser={currentUser} 
                  onRevokeAccess={handleLogout} 
                  onUserVerified={setCurrentUser}
                >
                  <NotificationsPage user={currentUser!} />
                </DatabaseAuthGuard>
              } 
            />

            {/* Profile Page */}
            <Route 
              path="/profile" 
              element={
                <DatabaseAuthGuard 
                  currentUser={currentUser} 
                  onRevokeAccess={handleLogout} 
                  onUserVerified={setCurrentUser}
                >
                  <ProfilePage user={currentUser!} onUserUpdated={setCurrentUser} />
                </DatabaseAuthGuard>
              } 
            />

            {/* Fallback */}
            {/* Self-service password reset landing page (opened from the emailed link) */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        </div>
      </SessionTimeoutGuard>
    </HashRouter>
  );
};

export default App;