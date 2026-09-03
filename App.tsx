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
import { Header } from './components/Header';
import { User, Role } from './types';
import { getUsers, updateUser } from './lib/insforge';

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

  // Seed default users on startup
  useEffect(() => {
    getUsers();
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('accad_user_v2');
    localStorage.removeItem('accad_user');
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
                currentUser && currentUser.role === Role.EXECUTIVE_DIRECTOR
                  ? <ExecutiveDashboard user={currentUser} />
                  : <ExecutiveLoginPage user={currentUser} onLoginSuccess={setCurrentUser} />
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
                currentUser
                  ? <HatcheryDashboardPage user={currentUser} />
                  : <Navigate to="/login" replace />
              } 
            />

            {/* Individual Hatchery Form Ledger (One Form Per Page) */}
            <Route 
              path="/hatchery/form/:reportId" 
              element={
                currentUser
                  ? <HatcheryFormPage user={currentUser} />
                  : <Navigate to="/login" replace />
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

            {/* Staff Dashboard (Strict DB Login required) */}
            <Route 
              path="/staff" 
              element={
                currentUser
                  ? <StaffDashboard user={currentUser} />
                  : <Navigate to="/login" replace />
              } 
            />

            {/* Manager Dashboard */}
            <Route 
              path="/manager" 
              element={
                currentUser && (currentUser.role === Role.MANAGER || currentUser.role === Role.EXECUTIVE_DIRECTOR)
                  ? <ManagerDashboard user={currentUser} /> 
                  : <Navigate to="/login" replace />
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
                currentUser ? <NotificationsPage user={currentUser} /> : <Navigate to="/login" replace />
              } 
            />

            {/* Profile Page */}
            <Route 
              path="/profile" 
              element={
                currentUser ? <ProfilePage user={currentUser} onUserUpdated={setCurrentUser} /> : <Navigate to="/login" replace />
              } 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

      </div>
    </HashRouter>
  );
};

export default App;