import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Role } from '../types';
import { getNotifications } from '../lib/insforge';
import { 
  Home, 
  LayoutDashboard, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  LogIn,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onRoleSwitch?: (newRole: Role) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onRoleSwitch }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      getNotifications(user.email).then(notifs => {
        setUnreadCount(notifs.filter(n => !n.read).length);
      });
      const interval = setInterval(() => {
        getNotifications(user.email).then(notifs => {
          setUnreadCount(notifs.filter(n => !n.read).length);
        });
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user, location.pathname]);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === Role.EXECUTIVE_DIRECTOR) return '/admin';
    if (user.role === Role.MANAGER) return '/manager';
    return '/staff';
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.EXECUTIVE_DIRECTOR:
        return <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-200">ED / ADMIN</span>;
      case Role.MANAGER:
        return <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">MANAGER</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">STAFF</span>;
    }
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
        
        {/* Top-Left Logo (Clickable -> Homepage) */}
        <Link 
          to="/" 
          className="flex items-center space-x-3 group focus:outline-none"
          title="ACCAD FARMS - Return to Homepage"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl p-2 border border-emerald-100 group-hover:scale-105 transition-transform flex items-center justify-center shadow-md">
            <img 
              src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" 
              alt="ACCAD Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-slate-900 font-black text-lg tracking-tight uppercase group-hover:text-emerald-600 transition-colors">
              ACCAD <span className="text-emerald-600">FARMS</span>
            </span>
            <span className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase">
              Operational Records
            </span>
          </div>
        </Link>

        {/* Center & Right Navigation Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Always Visible Home Button */}
          <Link
            to="/"
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              location.pathname === '/' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Home className="w-4 h-4 text-emerald-600" />
            <span>Home</span>
          </Link>

          {user ? (
            <>
              {/* Dashboard Navigation Button */}
              <Link
                to={getDashboardPath()}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  location.pathname.startsWith('/dashboard') || location.pathname === getDashboardPath()
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-slate-600" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>

              {/* Notifications Link */}
              <Link
                to="/notifications"
                className={`relative flex items-center justify-center p-2 rounded-xl text-xs font-bold transition-all border ${
                  location.pathname === '/notifications'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile Link */}
              <Link
                to="/profile"
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  location.pathname === '/profile'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UserIcon className="w-4 h-4 text-slate-600" />
                <span className="hidden lg:inline">{user.fullName.split(' ')[0]}</span>
              </Link>

              {/* Interactive User Role Switcher */}
              <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-3">
                <select
                  value={user.role}
                  onChange={(e) => {
                    const newRole = e.target.value as Role;
                    if (newRole !== user.role && onRoleSwitch) {
                      onRoleSwitch(newRole);
                    }
                  }}
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer transition-all shadow-sm ${
                    user.role === Role.EXECUTIVE_DIRECTOR ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100' :
                    user.role === Role.MANAGER ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100' :
                    'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  }`}
                  title="Switch user role and redirect dashboard"
                >
                  <option value={Role.STAFF}>Role: Staff</option>
                  <option value={Role.MANAGER}>Role: Manager</option>
                  <option value={Role.EXECUTIVE_DIRECTOR}>Role: Admin (ED)</option>
                </select>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  onLogout();
                  navigate('/');
                }}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ml-2"
                title="Sign out of account"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            /* Login Link for Unauthenticated Users */
            <Link
              to="/login"
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </Link>
          )}

        </div>

      </div>
    </header>
  );
};
