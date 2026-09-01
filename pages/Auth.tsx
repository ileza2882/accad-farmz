import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Department, Role, User } from '../types';
import { Shield, Users, User as UserIcon, Egg } from 'lucide-react';
import { getUsers, getUserByEmail, createUser, seedInitialUsers, migrateDataToInsforge } from '../lib/insforge';

interface AuthProps {
  department: Department | null;
  onAuthSuccess: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ department, onAuthSuccess }) => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initInsforgeAuth() {
      await seedInitialUsers();
      await migrateDataToInsforge();
    }
    initInsforgeAuth();
  }, []);

  const deptData = {
    [Department.FISHERY]: {
      color: 'emerald-500',
      accent: 'emerald-400',
      glow: 'rgba(16,185,129,0.15)',
      bgGradient: 'from-emerald-600/20 via-slate-950 to-black',
      logo: 'https://drive.google.com/thumbnail?id=1N8lOyOO4bg2A901Ns3uSaQiwwASNr6_L&sz=w1000'
    },
    [Department.POULTRY]: {
      color: 'orange-500',
      accent: 'orange-400',
      glow: 'rgba(249,115,22,0.15)',
      bgGradient: 'from-orange-600/20 via-slate-950 to-black',
      logo: 'https://drive.google.com/thumbnail?id=1pFJf3s6biH6jokeG9J8dBUyukAj_ngqY&sz=w1000'
    },
    [Department.CATTLE]: {
      color: 'amber-500',
      accent: 'amber-400',
      glow: 'rgba(245,158,11,0.15)',
      bgGradient: 'from-amber-600/20 via-slate-950 to-black',
      logo: 'https://drive.google.com/thumbnail?id=1LXKorpiQPt5BF13qkVXc8kOZXarF3aTW&sz=w1000'
    },
    [Department.PIGS]: {
      color: 'rose-500',
      accent: 'rose-400',
      glow: 'rgba(244,63,94,0.15)',
      bgGradient: 'from-rose-600/20 via-slate-950 to-black',
      logo: 'https://drive.google.com/thumbnail?id=10sNUlopVgU-oHNDnrAipEBxsEIJ2kLJM&sz=w1000'
    }
  };

  const currentDept = department ? deptData[department] : {
    color: 'mint-500',
    accent: 'mint-400',
    glow: 'rgba(0,223,154,0.15)',
    bgGradient: 'from-mint-600/20 via-slate-950 to-black',
    logo: 'https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const existingUsers = await getUsers();
      let authenticatedUser: User | null = null;

      if (isLogin) {
        const targetEmail = email.toLowerCase().trim();
        authenticatedUser = existingUsers.find(
          (u) => u.email.toLowerCase().trim() === targetEmail && 
                 u.password === password && 
                 (selectedRole === Role.STAFF ? u.department === department : true)
        ) || null;

        if (!authenticatedUser) {
          setError('Identification failure. Access denied. Please check your credentials.');
          return;
        }
      } else {
        if (password !== confirmPassword) {
          setError('Parity mismatch. Password validation failed.');
          return;
        }
        const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          fullName,
          staffId,
          position,
          email: email.toLowerCase().trim(),
          role: selectedRole || Role.STAFF,
          department: department || undefined,
          status: 'active',
          profilePicture: profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
          password,
        };

        try {
          authenticatedUser = await createUser(newUser);
        } catch (createErr: any) {
          console.warn('User creation fallback:', createErr);
          authenticatedUser = newUser;
        }
      }

      if (!authenticatedUser) {
        setError('Identification failure. Access denied.');
        return;
      }

      onAuthSuccess(authenticatedUser);
      if (authenticatedUser.role === Role.EXECUTIVE_DIRECTOR) {
        navigate('/executive');
      } else if (authenticatedUser.role === Role.HATCHERY_MANAGER) {
        navigate('/fishery');
      } else if (authenticatedUser.role === Role.MANAGER) {
        navigate('/manager');
      } else {
        navigate('/staff');
      }
    } catch (err: any) {
      console.warn('Authentication error:', err);
      setError('An error occurred during authentication. Please try again.');
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-emerald-50 rounded-2xl flex items-center justify-center p-4 mx-auto mb-6 shadow-sm">
              <img src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" className="w-full h-full object-contain" alt="Company Logo" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Select Your Role</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">Choose your access level to continue</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => {
                setSelectedRole(Role.EXECUTIVE_DIRECTOR);
                setIsLogin(true);
                setEmail('info@accadfarms.com');
                setPassword('123456');
              }}
              className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all group text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-50 transition-colors">
                <Shield className="w-7 h-7 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Executive Director</h3>
              <p className="text-xs text-slate-500 mt-1">Full system governance & analytics</p>
            </button>

            <button 
              onClick={() => {
                setSelectedRole(Role.HATCHERY_MANAGER);
                setIsLogin(true);
                setEmail('hatchery@accadfarms.com');
                setPassword('123456');
              }}
              className="bg-white p-6 rounded-2xl shadow-lg border border-teal-200 hover:border-teal-500 hover:shadow-xl transition-all group text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                <Egg className="w-7 h-7 text-teal-600 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-base font-bold text-teal-950 uppercase tracking-tight">Hatchery Manager</h3>
              <p className="text-xs text-slate-500 mt-1">Hatchery batch logs & progressive ledgers</p>
            </button>

            <button 
              onClick={() => {
                setSelectedRole(Role.MANAGER);
                setIsLogin(true);
                setEmail('manager@accadfarms.com');
                setPassword('123456');
              }}
              className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all group text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-50 transition-colors">
                <Users className="w-7 h-7 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Sector Manager</h3>
              <p className="text-xs text-slate-500 mt-1">Department oversight and vetting</p>
            </button>

            <button 
              onClick={() => {
                setSelectedRole(Role.STAFF);
                setIsLogin(true);
                setEmail('staff@accadfarms.com');
                setPassword('123456');
              }}
              className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all group text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-50 transition-colors">
                <UserIcon className="w-7 h-7 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Staff Member</h3>
              <p className="text-xs text-slate-500 mt-1">Inventory logging and records</p>
            </button>
          </div>
          
          <div className="mt-12 text-center">
            <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-8 text-center border-b border-slate-100">
            {department && selectedRole === Role.STAFF && (
              <div className={`w-24 h-24 bg-${currentDept.color.split('-')[0]}-50 rounded-2xl flex items-center justify-center p-4 mx-auto mb-6 shadow-sm`}>
                <img src={currentDept.logo} className="w-full h-full object-contain" alt="Department Logo" />
              </div>
            )}
            {selectedRole !== Role.STAFF && (
              <div className="w-24 h-24 bg-emerald-50 rounded-2xl flex items-center justify-center p-4 mx-auto mb-6 shadow-sm">
                <img src="https://drive.google.com/thumbnail?id=1nd5mC1tE5UndX4SDWqJFREo2wlCZHlSH&sz=w1000" className="w-full h-full object-contain" alt="Company Logo" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
              {selectedRole === Role.EXECUTIVE_DIRECTOR ? 'Executive Director' : 
               selectedRole === Role.MANAGER ? 'Sector Manager' : 
               (department || 'ACCAD FARMS')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Operational Access Portal</p>
          </div>

          <div className="p-8">
            {selectedRole !== Role.EXECUTIVE_DIRECTOR && (
              <div className="flex bg-slate-100 p-1 rounded-lg mb-8">
                <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sign In</button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Register</button>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold border border-rose-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && selectedRole !== Role.EXECUTIVE_DIRECTOR && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Profile Picture</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-emerald-500 transition-all bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {profilePic ? (
                                <img src={profilePic} alt="Profile" className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-white shadow-sm" />
                            ) : (
                                <>
                                    <svg className="w-8 h-8 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                    <p className="mb-2 text-xs text-slate-500 font-bold uppercase tracking-wide">Click to upload photo</p>
                                </>
                            )}
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setProfilePic(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm" placeholder="John Doe" required />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm" placeholder="name@accad.farm" required />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm" placeholder="••••••••" required />
              </div>

              {!isLogin && selectedRole !== Role.EXECUTIVE_DIRECTOR && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm" placeholder="••••••••" required />
                  </div>
                </>
              )}

              <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-bold uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] mt-4">
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <button onClick={() => {
                setSelectedRole(null);
                setError(null);
              }} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Back to Role Selection</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};