import React, { useState, useEffect } from 'react';
import { Role, Department, User, DEPARTMENT_CATEGORIZED_ROLES } from '../types';
import { getUsers, createUser, createAuditLog, createNotification } from '../lib/insforge';
import { sendUserWelcomeEmail } from '../lib/emailService';
import { 
  UserPlus, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Shield, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Lock, 
  Building,
  Eye,
  EyeOff,
  KeyRound,
  Send,
  Edit3,
  Sparkles
} from 'lucide-react';

interface UserRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserRegistered?: (newUser: User) => void;
  onUserCreated?: (newUser?: User) => void;
  edUser?: User;
  creator?: User;
}

export const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({
  isOpen,
  onClose,
  onUserRegistered,
  onUserCreated,
  edUser,
  creator
}) => {
  const currentEd = edUser || creator || {
    id: 'ed_user_1',
    fullName: 'Executive Director',
    email: 'accadfarmsapp@gmail.com',
    role: Role.EXECUTIVE_DIRECTOR
  } as User;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<Department>(Department.FISHERY);
  const [selectedRoleType, setSelectedRoleType] = useState<string>('STAFF');
  const [tempPassword, setTempPassword] = useState('Accad2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [emailStatus, setEmailStatus] = useState<{
    sent: boolean;
    error?: string;
    isSending?: boolean;
  }>({ sent: false });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetForm = () => {
    setRegisteredUser(null);
    setEmailStatus({ sent: false });
    setFullName('');
    setEmail('');
    setPhone('');
    setTempPassword('Accad2026!');
    setShowPassword(false);
    setDepartment(Department.FISHERY);
    setSelectedRoleType('STAFF');
    setCustomNotes('');
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  };

  const handleDispatchWelcomeEmail = async (targetUser: User) => {
    setEmailStatus({ sent: false, isSending: true });
    try {
      const result = await sendUserWelcomeEmail({
        newUser: targetUser,
        edCreator: {
          ...currentEd,
          email: 'accadfarmsapp@gmail.com'
        },
        customNotes: customNotes.trim()
      });

      if (result.success) {
        setEmailStatus({ sent: true, isSending: false });
      } else {
        setEmailStatus({ 
          sent: false, 
          isSending: false, 
          error: result.message || 'Email delivery failed' 
        });
      }
    } catch (err: any) {
      setEmailStatus({ 
        sent: false, 
        isSending: false, 
        error: err?.message || 'Email dispatch failed' 
      });
    }
  };

  const handleCloseModal = () => {
    // Closing mid-dispatch can abandon the request before Gmail accepts it, leaving the new
    // staff member with no credentials email and no warning to the ED.
    if (emailStatus.isSending) {
      const leaveAnyway = window.confirm(
        'The credentials email is still being sent to this staff member.\n\nClose anyway? They may not receive their login details.'
      );
      if (!leaveAnyway) return;
    }
    handleResetForm();
    onClose();
  };

  // Whenever modal opens, ensure we always start with a clean registration form
  useEffect(() => {
    if (isOpen) {
      handleResetForm();
    }
  }, [isOpen]);

  // Handle ESC key to dismiss and reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, emailStatus.isSending]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generated = 'Accad';
    for (let i = 0; i < 4; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generated += '!';
    setTempPassword(generated);
  };

  const handleDepartmentChange = (newDept: Department) => {
    setDepartment(newDept);
    // If switching away from Fishery and role was Hatchery Manager, reset to STAFF
    if (newDept !== Department.FISHERY && selectedRoleType === 'HATCHERY_MANAGER') {
      setSelectedRoleType('STAFF');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPassword = tempPassword.trim();

    // 1. Empty field validation
    if (!cleanName || !cleanEmail || !cleanPhone) {
      setError('All required fields marked with * must be filled.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Temporary password must be at least 6 characters long.');
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. name@accadfarms.com).');
      return;
    }

    // 3. Phone format validation
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid phone number (e.g. 07052882907).');
      return;
    }

    // 4. Resolve Base Role and Position title
    let resolvedRole: Role = Role.STAFF;
    let resolvedPosition = `${department} Staff`;

    if (selectedRoleType === 'MANAGER') {
      resolvedRole = Role.MANAGER;
      resolvedPosition = `${department} Manager`;
    } else if (selectedRoleType === 'HATCHERY_MANAGER' && department === Department.FISHERY) {
      resolvedRole = Role.HATCHERY_MANAGER;
      resolvedPosition = 'Hatchery Manager';
    } else {
      resolvedRole = Role.STAFF;
      resolvedPosition = `${department} Staff`;
    }

    setIsSubmitting(true);

    try {
      // 5. Check uniqueness
      const allUsers = await getUsers();
      
      const existingEmailUser = allUsers.find(u => {
        const uEmail = u.email.toLowerCase().trim();
        if (uEmail === 'dalestic12@gmail.com' && (u.role === Role.EXECUTIVE_DIRECTOR || u.id === 'ed_user_1')) {
          return false;
        }
        return uEmail === cleanEmail;
      });

      if (existingEmailUser) {
        setError(`Email "${cleanEmail}" is already registered in the system.`);
        setIsSubmitting(false);
        return;
      }

      const existingPhoneUser = allUsers.find(u => {
        if (!u.phone) return false;
        if (u.id === 'ed_user_1' && u.email.toLowerCase().trim() === 'dalestic12@gmail.com') return false;
        return u.phone.trim().replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, '');
      });

      if (existingPhoneUser) {
        setError(`Phone number "${cleanPhone}" is already registered in the system.`);
        setIsSubmitting(false);
        return;
      }

      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newUserObj: User = {
        id: newUserId,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: resolvedRole,
        department: department,
        position: resolvedPosition,
        status: 'active',
        password: cleanPassword,
        profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=059669&color=fff`,
        createdAt: Date.now()
      };

      const created = await createUser(newUserObj);

      // Audit Log
      await createAuditLog(
        currentEd?.fullName || 'Executive Director',
        currentEd?.email || 'info@accadfarms.com',
        'USER_REGISTERED',
        `Registered user ${created.fullName} (${created.email}) with role ${created.role} in ${created.department} (Temporary password set by ED)`
      );

      // In-App Notification for new user
      await createNotification({
        userId: created.id,
        userEmail: created.email,
        title: 'Account Created',
        message: `Account created by ED with role: ${created.role}. Temporary password assigned.`,
        type: 'info'
      });

      if (onUserRegistered) onUserRegistered(created);
      if (onUserCreated) onUserCreated(created);

      // Show the credentials panel immediately so the ED always has the passcode on screen, then
      // await the dispatch so the in-flight request is never abandoned before Gmail accepts it.
      setRegisteredUser(created);
      await handleDispatchWelcomeEmail(created);
      setIsSubmitting(false);

    } catch (err: any) {
      setError(err.message || 'Failed to register user. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseModal();
        }
      }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
        
        {/* Close Button */}
        <button
          onClick={handleCloseModal}
          type="button"
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Register Staff Member</h3>
            <p className="text-xs text-slate-500 font-medium">Create a new user account with assigned role & active status</p>
          </div>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-700 text-xs font-bold animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-700 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {registeredUser ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">User Registered Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Official personnel profile for <strong className="text-slate-800">{registeredUser.fullName}</strong> has been created with active clearance.
              </p>
            </div>

            {/* Official Dispatched Credentials Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="bg-emerald-800 text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">Dispatched Credentials Table</span>
                </div>
                <span className="text-[10px] bg-emerald-700 text-emerald-100 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Sent from accadfarmsapp@gmail.com</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50 w-1/3">Staff Member</td>
                      <td className="px-4 py-2.5 font-extrabold text-slate-900">{registeredUser.fullName}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50">Portal Login Email</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-700 select-all">{registeredUser.email}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50">Assigned Passcode</td>
                      <td className="px-4 py-2.5 font-mono font-extrabold text-slate-900 bg-emerald-50 select-all">{registeredUser.password || '123456'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50">Assigned Role</td>
                      <td className="px-4 py-2.5 font-bold text-sky-700 uppercase">{registeredUser.role}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50">Department</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{registeredUser.department || 'General Operations'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50">Sender Email</td>
                      <td className="px-4 py-2.5 font-bold text-slate-600">accadfarmsapp@gmail.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Automated Dispatch Status */}
            {emailStatus.sent ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl py-3 px-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified credentials dispatched from <strong>accadfarmsapp@gmail.com</strong> to <strong>{registeredUser.email}</strong></span>
                </div>
                <button
                  type="button"
                  disabled={emailStatus.isSending}
                  onClick={() => handleDispatchWelcomeEmail(registeredUser)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-lg border border-emerald-300 transition-all shrink-0 cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
                >
                  {emailStatus.isSending ? 'Sending...' : '↻ Resend Email'}
                </button>
              </div>
            ) : emailStatus.isSending ? (
              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200 rounded-2xl py-3.5 px-4 shadow-sm animate-pulse">
                <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Dispatching credentials email via Google Mail to <strong>{registeredUser.email}</strong>...</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl py-3 px-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span>Delivery Notice: {emailStatus.error || 'Awaiting confirmation'}</span>
                    <p className="text-[10px] text-amber-700 font-normal mt-0.5">You can retry sending now or share the passcode directly.</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={emailStatus.isSending}
                  onClick={() => handleDispatchWelcomeEmail(registeredUser)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black rounded-lg transition-all shrink-0 cursor-pointer active:scale-95 shadow-xs"
                >
                  ↻ Retry Send
                </button>
              </div>
            )}

            {/* Delivery Tip */}
            <p className="text-[11px] text-center text-slate-500">
              💡 If the email is not in their primary inbox, please advise them to check their <strong>Spam</strong> or <strong>Promotions</strong> folder.
            </p>

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                + Register Another Staff Member
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Done & Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. David Akoko"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@accadfarms.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                  <Send className="w-3 h-3 text-emerald-600 inline shrink-0" />
                  <span>Onboarding email with login password is dispatched automatically</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07052882907"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Department & Role Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Department / Division *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                  <select
                    value={department}
                    onChange={(e) => handleDepartmentChange(e.target.value as Department)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all font-bold cursor-pointer"
                  >
                    <option value={Department.FISHERY}>Fishery Department</option>
                    <option value={Department.POULTRY}>Poultry Department</option>
                    <option value={Department.CATTLE}>Cattle Department</option>
                    <option value={Department.PIGGERY}>Piggery Department</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Assigned Role *
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                  <select
                    value={selectedRoleType}
                    onChange={(e) => setSelectedRoleType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none transition-all cursor-pointer font-bold"
                  >
                    <option value="STAFF">Staff Member</option>
                    <option value="MANAGER">Sector Manager</option>
                    {department === Department.FISHERY && (
                      <option value="HATCHERY_MANAGER">Hatchery Manager</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Temporary Password Configuration (Set by ED) */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Temporary Password (Set by ED) *</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[10px] font-black uppercase text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Generate Strong</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-emerald-700 absolute left-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Enter temporary password (min 6 chars)"
                  className="w-full bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-slate-900 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono font-bold outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                The user will use this temporary passcode to log in for the first time and can subsequently change their password in their User Profile.
              </p>
            </div>


            {/* Optional Custom Notes / Additional Words from ED */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Additional Notes / Custom Message to Staff (Optional)
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">Included in email</span>
              </div>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Welcome to the ACCAD FARMS team! Please report to the farm station by 8:00 AM on Monday for your onboarding briefing."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all resize-none font-medium"
              />
              <p className="text-[10px] text-slate-500 font-medium">
                The onboarding email with credentials will be dispatched automatically upon clicking "Register User".
              </p>
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-200 disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Registering User & Dispatching Email...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register User & Send Email</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
