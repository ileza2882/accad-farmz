import React, { useState, useEffect, useRef } from 'react';
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
  Briefcase,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === Role.EXECUTIVE_DIRECTOR) return '/admin';
    if (user.role === Role.MANAGER) return '/manager';
    return '/staff';
  };

  const navLinkClass = (path: string, exact = true) => {
    const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
    return `flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
    }`;
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm" ref={menuRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 lg:h-24 flex items-center justify-between">
        
        {/* Logo — responsive sizing */}
        <Link 
          to="/" 
          className="flex items-center space-x-2 sm:space-x-3 group focus:outline-none shrink-0"
          title="ACCAD FARMS - Return to Homepage"
        >
          <div className="w-10 h-10 sm:w-14 sm:h-14 lg:w-20 lg:h-20 bg-emerald-50 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 lg:p-2 border border-emerald-100 group-hover:scale-105 transition-transform flex items-center justify-center shadow-sm sm:shadow-md">
            <img 
              src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" 
              alt="ACCAD Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden xs:block">
            <span className="text-slate-900 font-black text-sm sm:text-lg tracking-tight uppercase group-hover:text-emerald-600 transition-colors">
              ACCAD <span className="text-emerald-600">FARMS</span>
            </span>
            <span className="hidden sm:block text-[9px] font-bold text-slate-400 tracking-widest uppercase">
              Operational Records
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
          
          <Link to="/" className={navLinkClass('/')}>
            <Home className="w-4 h-4 text-emerald-600" />
            <span>Home</span>
          </Link>

          {user ? (
            <>
              <Link to={getDashboardPath()} className={navLinkClass(getDashboardPath())}>
                <LayoutDashboard className="w-4 h-4 text-slate-600" />
                <span className="hidden lg:inline">Dashboard</span>
              </Link>

              <Link
                to="/notifications"
                className={`relative ${navLinkClass('/notifications')}`}
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <Link to="/profile" className={navLinkClass('/profile')}>
                <UserIcon className="w-4 h-4 text-slate-600" />
                <span className="hidden lg:inline">{user.fullName.split(' ')[0]}</span>
              </Link>

              {/* Role Switcher */}
              <div className="border-l border-slate-200 pl-2 lg:pl-3">
                <select
                  value={user.role}
                  onChange={(e) => {
                    const newRole = e.target.value as Role;
                    if (newRole !== user.role && onRoleSwitch) onRoleSwitch(newRole);
                  }}
                  className={`text-[10px] font-extrabold uppercase px-2 py-1.5 rounded-xl border outline-none cursor-pointer transition-all shadow-sm ${
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

              <button
                onClick={() => { onLogout(); navigate('/'); }}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                title="Sign out of account"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-slate-300"
                title="Staff & Manager Portal Login"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-600" />
                <span>Portal Login</span>
              </Link>

              <Link
                to="/?ed_login=true"
                className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-purple-200 transition-all active:scale-95 border border-purple-700"
                title="Executive Director Governance Portal"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>ED Portal</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: Notification Bell + Hamburger */}
        <div className="flex md:hidden items-center space-x-2">
          {user && (
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl border border-slate-200 bg-white"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white shadow-lg animate-fadeIn">
          <div className="px-4 py-4 space-y-2">
            
            <Link to="/" className={`w-full ${navLinkClass('/')}`}>
              <Home className="w-4 h-4 text-emerald-600" />
              <span>Home</span>
            </Link>

            {user ? (
              <>
                <Link to={getDashboardPath()} className={`w-full ${navLinkClass(getDashboardPath())}`}>
                  <LayoutDashboard className="w-4 h-4 text-slate-600" />
                  <span>Dashboard</span>
                </Link>

                <Link to="/notifications" className={`w-full ${navLinkClass('/notifications')}`}>
                  <Bell className="w-4 h-4 text-slate-600" />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link to="/profile" className={`w-full ${navLinkClass('/profile')}`}>
                  <UserIcon className="w-4 h-4 text-slate-600" />
                  <span>{user.fullName}</span>
                </Link>

                {/* Mobile Role Switcher */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">Switch Role</label>
                  <select
                    value={user.role}
                    onChange={(e) => {
                      const newRole = e.target.value as Role;
                      if (newRole !== user.role && onRoleSwitch) onRoleSwitch(newRole);
                    }}
                    className={`w-full text-xs font-extrabold uppercase px-3 py-2.5 rounded-xl border outline-none cursor-pointer transition-all ${
                      user.role === Role.EXECUTIVE_DIRECTOR ? 'bg-purple-50 text-purple-800 border-purple-300' :
                      user.role === Role.MANAGER ? 'bg-blue-50 text-blue-800 border-blue-300' :
                      'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    <option value={Role.STAFF}>Staff</option>
                    <option value={Role.MANAGER}>Manager</option>
                    <option value={Role.EXECUTIVE_DIRECTOR}>Admin (ED)</option>
                  </select>
                </div>

                {/* Mobile Logout */}
                <button
                  onClick={() => { onLogout(); navigate('/'); }}
                  className="w-full flex items-center justify-center space-x-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="space-y-2 pt-2">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-slate-600" />
                  <span>Portal Login (Staff / Manager)</span>
                </Link>

                <Link
                  to="/?ed_login=true"
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-800 to-indigo-900 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-purple-200 transition-all active:scale-95 border border-purple-700"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Executive Director Portal</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
