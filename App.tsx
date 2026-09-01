import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Homepage } from './pages/Homepage';
import { LoginPage } from './pages/LoginPage';
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
import { User, Role, Department } from './types';
import { getUsers, updateUser } from './lib/insforge';

const DEFAULT_STAFF_USER: User = {
  id: 'usr_staff_1',
  fullName: 'David Ileza (Staff)',
  email: 'staff@accadfarms.com',
  role: Role.STAFF,
  department: Department.FISHERY,
  status: 'active'
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('accad_user_v2') || localStorage.getItem('accad_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

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
            {/* Public Homepage with Direct Executive Director Login & Section Navigation */}
            <Route path="/" element={<Homepage user={currentUser} onLoginSuccess={setCurrentUser} />} />

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
                currentUser && (currentUser.role === Role.HATCHERY_MANAGER || currentUser.role === Role.EXECUTIVE_DIRECTOR)
                  ? <HatcheryDashboardPage user={currentUser} />
                  : <Navigate to="/hatchery" replace />
              } 
            />

            {/* Individual Hatchery Form Ledger (One Form Per Page) */}
            <Route 
              path="/hatchery/form/:reportId" 
              element={
                currentUser && (currentUser.role === Role.HATCHERY_MANAGER || currentUser.role === Role.EXECUTIVE_DIRECTOR)
                  ? <HatcheryFormPage user={currentUser} />
                  : <Navigate to="/hatchery" replace />
              } 
            />

            {/* Public Login Page */}
            <Route 
              path="/login" 
              element={
                currentUser ? (
                  currentUser.role === Role.EXECUTIVE_DIRECTOR ? <Navigate to="/admin" replace /> :
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
                currentUser.role === Role.EXECUTIVE_DIRECTOR ? <Navigate to="/admin" replace /> :
                currentUser.role === Role.HATCHERY_MANAGER ? <Navigate to="/hatchery/dashboard" replace /> :
                currentUser.role === Role.MANAGER ? <Navigate to="/manager" replace /> :
                <Navigate to="/staff" replace />
              } 
            />

            {/* Staff Dashboard */}
            <Route 
              path="/staff" 
              element={
                <StaffDashboard user={currentUser || DEFAULT_STAFF_USER} />
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

            {/* Executive Director / Admin Dashboard */}
            <Route 
              path="/admin" 
              element={
                currentUser && currentUser.role === Role.EXECUTIVE_DIRECTOR
                  ? <ExecutiveDashboard user={currentUser} />
                  : <Navigate to="/login" replace />
              } 
            />

            <Route 
              path="/executive" 
              element={<Navigate to="/admin" replace />} 
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