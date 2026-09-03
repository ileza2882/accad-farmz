import React, { useState } from 'react';
import { User, Role, Department } from '../types';
import { updateUser, deactivateUser, deleteUser, createAuditLog, createNotification } from '../lib/insforge';
import { Search, Shield, UserCheck, UserX, CheckCircle, AlertCircle, Edit, Save, RefreshCw, Trash2, X } from 'lucide-react';

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

  const handleDeleteUser = async (userToDel: User) => {
    const confirmText = `Are you sure you want to DEACTIVATE "${userToDel.fullName}" (${userToDel.email})?\n\nThis account will be automatically and permanently deleted from the InsForge database, and their access to all dashboards will be immediately revoked.`;
    if (!window.confirm(confirmText)) return;

    try {
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
      alert('Failed to deactivate user: ' + e.message);
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
                    {edUser.email !== u.email && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ml-auto cursor-pointer shadow-sm active:scale-95"
                        title="Permanently deactivate and delete user record from database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </button>
                    )}
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

    </div>
  );
};
