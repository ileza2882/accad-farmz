import React, { useState, useEffect, useCallback } from 'react';
import { User, Role, Department } from '../types';
import { updateUser, deactivateUser, deleteUser, createAuditLog, createNotification, getPendingPasswordResetRequests, resolvePasswordResetRequests, PASSWORD_RESET_REQUESTS_EVENT, PasswordResetRequest } from '../lib/insforge';
import { Search, Shield, UserCheck, UserX, CheckCircle, AlertCircle, Edit, Save, RefreshCw, Trash2, X, KeyRound, Sparkles, Eye, EyeOff, BellRing } from 'lucide-react';
import { sendNewPasswordEmail } from '../lib/emailService';

interface UserManagementTableProps {
  users: User[];
  onUsersUpdated: () => void;
  edUser: User;
}

export const UserManagementTable: React.FC<UserManagementTableProps> = ({
  users,
  onUsersUpdated,
  edUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | ''>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    
    const matchesDept = selectedDeptFilter === 'ALL' || u.department === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const handleRoleChange = async (user: User, newRole: Role) => {
    if (user.role === newRole) {
      setEditingUserId(null);
      return;
    }

    try {
      await updateUser(user.email, { role: newRole });
      
      await createAuditLog(
        edUser.fullName,
        edUser.email,
        'USER_ROLE_CHANGED',
        `Changed role of ${user.fullName} (${user.email}) from ${user.role} to ${newRole}`
      );

      await createNotification({
        userId: user.id,
        userEmail: user.email,
        title: 'Role Updated',
        message: `Role updated to: ${newRole}`,
        type: 'info'
      });

      setActionMessage(`Updated ${user.fullName}'s role to ${newRole}`);
      setEditingUserId(null);
      onUsersUpdated();

      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert('Failed to update role: ' + e.message);
    }
  };

  /** Outstanding 'forgot password' requests, surfaced directly on the affected rows. */
  const refreshResetRequests = useCallback(async () => {
    const pending = await getPendingPasswordResetRequests();
    setResetRequests(pending);
  }, []);

  useEffect(() => {
    refreshResetRequests();
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        refreshResetRequests();
      }
    }, 20000);
    const onChanged = () => refreshResetRequests();
    window.addEventListener(PASSWORD_RESET_REQUESTS_EVENT, onChanged);
    window.addEventListener('focus', onChanged);
    return () => {
      clearInterval(timer);
      window.removeEventListener(PASSWORD_RESET_REQUESTS_EVENT, onChanged);
      window.removeEventListener('focus', onChanged);
    };
  }, [refreshResetRequests]);

  const pendingResetFor = (email: string) =>
    resetRequests.find(r => r.userEmail === email.toLowerCase().trim());

  /**
   * Issues a new password for a staff member and emails it to them.
   * Replaces the old "resend welcome email" action: what the ED actually needs is a way to
   * answer a forgotten-password request, and the welcome email no longer carries a passcode.
   */
  const openResetModal = (targetUser: User) => {
    setResetTarget(targetUser);
    setResetPassword('');
    setResetError(null);
    setShowResetPassword(false);
  };

  const handleGenerateResetPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generated = 'Accad';
    for (let i = 0; i < 4; i++) generated += chars.charAt(Math.floor(Math.random() * chars.length));
    setResetPassword(generated + '!');
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    const newPassword = resetPassword.trim();
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    setIsResetting(true);
    setResetError(null);

    try {
      await updateUser(resetTarget.email, { password: newPassword });

      const result = await sendNewPasswordEmail({
        user: { ...resetTarget, password: newPassword },
        newPassword,
        edCreator: edUser
      });

      // Clear any outstanding "forgot password" flag for this user
      await resolvePasswordResetRequests(resetTarget.email);
      await refreshResetRequests();

      setActionMessage(
        result.success
          ? `New password set for ${resetTarget.fullName} and emailed to ${resetTarget.email}`
          : `Password updated for ${resetTarget.fullName}, but the email failed: ${result.message}`
      );

      setResetTarget(null);
      setResetPassword('');
      await onUsersUpdated();
      setTimeout(() => setActionMessage(null), 8000);
    } catch (err: any) {
      setResetError(err?.message || 'Could not reset the password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async (userToDel: User) => {
    const confirmText = `Are you sure you want to DEACTIVATE "${userToDel.fullName}" (${userToDel.email})?\n\nThis account will be automatically and permanently deleted from the InsForge database, and their access to all dashboards will be immediately revoked.`;
    if (!window.confirm(confirmText)) return;

    try {
      // deactivateUser now verifies the row is genuinely gone from InsForge and throws if it
      // is not, so a failed delete can no longer look like a success and reappear on refresh.
      await deactivateUser(userToDel.email);
      if (userToDel.id) await deactivateUser(userToDel.id);

      await createAuditLog(
        edUser.fullName,
        edUser.email,
        'USER_DEACTIVATED_AND_PURGED',
        `Deactivated and purged user record ${userToDel.fullName} (${userToDel.email}) from InsForge database`
      );

      setActionMessage(`Account for ${userToDel.fullName} permanently deactivated and deleted from database`);
      await onUsersUpdated();

      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert(`Could not delete ${userToDel.fullName}.\n\n${e?.message || 'Unknown error'}\n\nNothing was changed - the account still exists.`);
      await onUsersUpdated();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onUsersUpdated();
      setActionMessage('User directory successfully refreshed from database!');
      setTimeout(() => setActionMessage(null), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRoleBadgeClasses = (role: Role) => {
    if (role === Role.EXECUTIVE_DIRECTOR) return 'bg-slate-900 text-white border-slate-800';
    if (role === Role.MANAGER) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (role === Role.HATCHERY_MANAGER) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden p-4 sm:p-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">User Management</h3>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Manage user roles, departments, and active statuses</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, email, phone..."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Depts</option>
              <option value={Department.FISHERY}>Fishery</option>
              <option value={Department.POULTRY}>Poultry</option>
              <option value={Department.CATTLE}>Cattle</option>
              <option value={Department.PIGGERY}>Piggery</option>
            </select>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5 text-xs font-bold shrink-0"
              title="Refresh user list from database"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {resetRequests.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-900">
              {resetRequests.length} pending password reset {resetRequests.length === 1 ? 'request' : 'requests'}
            </span>
          </div>
          <ul className="space-y-1 pl-6">
            {resetRequests.map(r => (
              <li key={r.id} className="text-[11px] font-bold text-amber-900">
                {r.userName || r.userEmail} ({r.userEmail})
                {r.note ? <span className="font-medium italic"> &mdash; {r.note}</span> : null}
                <span className="font-medium text-amber-700"> &middot; {new Date(r.requestedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-amber-800 font-medium mt-2 pl-6">
            Use the amber <strong>Reset Password</strong> button on the matching row to issue a new password and email it to them.
          </p>
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* ===== DESKTOP TABLE (hidden on mobile) ===== */}
      <div className="hidden lg:block overflow-x-auto border border-slate-100 rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Contact</th>
              <th className="py-3.5 px-4">Department</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                  No users found matching filter criteria
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=059669&color=fff`}
                        alt={u.fullName}
                        className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {u.id.substring(0, 12)}</div>
                        {pendingResetFor(u.email) && (
                          <div
                            className="mt-1 inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
                            title={pendingResetFor(u.email)?.note || 'Password reset requested'}
                          >
                            <BellRing className="w-3 h-3 text-amber-600" />
                            <span>Password reset requested</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-900 font-medium">{u.email}</div>
                    <div className="text-[11px] text-slate-500">{u.phone || 'N/A'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider">
                      {u.department || 'General'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {editingUserId === u.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editingRole || u.role}
                          onChange={(e) => setEditingRole(e.target.value as Role)}
                          className="bg-white border border-emerald-500 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                        >
                          <option value={Role.STAFF}>Staff Member</option>
                          <option value={Role.HATCHERY_MANAGER}>Hatchery Manager</option>
                          <option value={Role.MANAGER}>Sector Manager</option>
                          <option value={Role.EXECUTIVE_DIRECTOR}>Executive Director</option>
                        </select>
                        <button onClick={() => handleRoleChange(u, (editingRole || u.role) as Role)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md" title="Save role">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingUserId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${getRoleBadgeClasses(u.role)}`}>
                          {u.position || (u.role === Role.EXECUTIVE_DIRECTOR ? 'ADMIN / ED' : u.role === Role.HATCHERY_MANAGER ? 'Hatchery Manager' : u.role)}
                        </span>
                        {edUser.email !== u.email && (
                          <button
                            onClick={() => { setEditingUserId(u.id); setEditingRole(u.role); }}
                            className="text-slate-400 hover:text-slate-600 p-1"
                            title="Edit Role"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <span>{u.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openResetModal(u)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95 border ${
                          pendingResetFor(u.email)
                            ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={
                          pendingResetFor(u.email)
                            ? 'This user has requested a password reset - set a new password and email it to them'
                            : 'Set a new password for this user and email it to them'
                        }
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset Password</span>
                      </button>
                      {edUser.email !== u.email && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
                          title="Permanently deactivate and delete user record from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Deactivate</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE CARD VIEW ===== */}
      <div className="lg:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-bold">
            No users found matching filter criteria
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              {/* User Info */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=059669&color=fff`}
                    alt={u.fullName}
                    className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{u.fullName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span>{u.status}</span>
                </span>
              </div>

              {/* Meta Row */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border border-slate-200">
                  {u.department || 'General'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getRoleBadgeClasses(u.role)}`}>
                  {u.position || (u.role === Role.EXECUTIVE_DIRECTOR ? 'Admin / ED' : u.role === Role.HATCHERY_MANAGER ? 'Hatchery Manager' : u.role)}
                </span>
                {u.phone && (
                  <span className="text-slate-500 font-medium">{u.phone}</span>
                )}
              </div>

              {/* Password reset - available for every user, including the ED */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                {pendingResetFor(u.email) && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 text-[11px] font-bold">
                    <BellRing className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Password reset requested
                      {pendingResetFor(u.email)?.note ? `: "${pendingResetFor(u.email)?.note}"` : ''}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => openResetModal(u)}
                  className={`w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 border ${
                    pendingResetFor(u.email)
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </button>
              </div>

              {/* Actions */}
              {edUser.email !== u.email && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  {editingUserId === u.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <select
                        value={editingRole || u.role}
                        onChange={(e) => setEditingRole(e.target.value as Role)}
                        className="flex-1 bg-white border border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      >
                        <option value={Role.STAFF}>Staff Member</option>
                        <option value={Role.HATCHERY_MANAGER}>Hatchery Manager</option>
                        <option value={Role.MANAGER}>Sector Manager</option>
                        <option value={Role.EXECUTIVE_DIRECTOR}>Executive Director</option>
                      </select>
                      <button onClick={() => handleRoleChange(u, (editingRole || u.role) as Role)} className="p-2 bg-emerald-600 text-white rounded-xl active:scale-95" title="Save">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingUserId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-xl active:scale-95" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingUserId(u.id); setEditingRole(u.role); }}
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Role</span>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>


      {/* ===== RESET PASSWORD MODAL ===== */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget && !isResetting) setResetTarget(null); }}
        >
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => !isResetting && setResetTarget(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5 border-b border-slate-100 pb-4">
              <div className="w-11 h-11 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {resetTarget.fullName} &middot; {resetTarget.email}
                </p>
              </div>
            </div>

            {pendingResetFor(resetTarget.email) && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-900 flex items-start gap-2">
                <BellRing className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  This user requested a password reset
                  {pendingResetFor(resetTarget.email)?.note ? <span className="font-medium italic"> &mdash; {pendingResetFor(resetTarget.email)?.note}</span> : null}
                </span>
              </div>
            )}

            {resetError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateResetPassword}
                    className="text-[10px] font-black uppercase text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <KeyRound className="w-4 h-4 text-emerald-700 absolute left-3.5" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-slate-900 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono font-bold outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-relaxed">
                  The new password is saved immediately and emailed to <strong>{resetTarget.email}</strong> from accadfarmsapp@gmail.com.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setResetTarget(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center space-x-2 cursor-pointer active:scale-95"
                >
                  {isResetting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving &amp; Emailing...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Set Password &amp; Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
