import React, { useState } from 'react';
import { User, Role } from '../types';
import { updateUser } from '../lib/insforge';
import { User as UserIcon, Mail, Phone, Building, Shield, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfilePageProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdated }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(newPassword)) {
      setError('Password must be 8+ chars with uppercase, lowercase, number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await updateUser(user.email, { password: newPassword });
      const updated = { ...user, password: newPassword };
      onUserUpdated(updated);

      setMessage('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError('Failed to update password: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-8">
      
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900">User Profile</h1>
        <p className="text-xs text-slate-500 font-medium">Personal details and account security preferences</p>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* User Information Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-4">
          <img
            src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=059669&color=fff`}
            alt={user.fullName}
            className="w-16 h-16 rounded-full border border-slate-200 object-cover shadow-sm"
          />
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{user.fullName}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                user.role === Role.EXECUTIVE_DIRECTOR ? 'bg-emerald-100 text-emerald-700' :
                user.role === Role.MANAGER ? 'bg-blue-100 text-blue-700' :
                user.role === Role.HATCHERY_MANAGER ? 'bg-teal-100 text-teal-800' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {user.role === Role.EXECUTIVE_DIRECTOR ? 'ADMIN / ED' : user.role === Role.HATCHERY_MANAGER ? 'Hatchery Manager' : user.role}
              </span>
              <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                {user.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
            <div className="font-extrabold text-slate-900 mt-0.5">{user.email}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
            <div className="font-extrabold text-slate-900 mt-0.5">{user.phone || 'N/A'}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
            <div className="font-extrabold text-slate-900 mt-0.5">{user.department || 'General'}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Account Status</span>
            <div className="font-extrabold text-emerald-600 mt-0.5 uppercase">{user.status}</div>
          </div>
        </div>
      </div>

      {/* Role Switching Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-extrabold">Switch Active Account Role</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Switch your operational role to change permissions and access the corresponding dashboard. Role updates are persisted to the database.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[Role.STAFF, Role.HATCHERY_MANAGER, Role.MANAGER, Role.EXECUTIVE_DIRECTOR].map((r) => (
            <button
              key={r}
              type="button"
              onClick={async () => {
                if (user.role !== r) {
                  const updated = { ...user, role: r };
                  await updateUser(user.email, { role: r });
                  onUserUpdated(updated);
                }
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                user.role === r
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm font-black'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
              }`}
            >
              <div className="text-xs uppercase font-black">
                {r === Role.EXECUTIVE_DIRECTOR ? 'Admin (ED)' : r === Role.HATCHERY_MANAGER ? 'Hatchery Mgr' : r}
              </div>
              <div className="text-[10px] text-slate-500 font-normal mt-1">
                {r === Role.EXECUTIVE_DIRECTOR ? 'Executive governance & full control' :
                 r === Role.HATCHERY_MANAGER ? 'Hatchery batches, incubation & transfers' :
                 r === Role.MANAGER ? 'Vetting & sector management' :
                 'Daily log entries & submissions'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">Security & Password Update</h3>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars (1 Upper, 1 Lower, 1 Num)"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
