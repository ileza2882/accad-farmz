import React, { useState } from 'react';
import { Role, Department, User } from '../types';
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
  Sparkles,
  KeyRound,
  Send
} from 'lucide-react';

interface UserRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserRegistered: (newUser: User) => void;
  edUser: User;
}

export const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({
  isOpen,
  onClose,
  onUserRegistered,
  edUser
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<Department>(Department.FISHERY);
  const [role, setRole] = useState<Role>(Role.STAFF);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleUseDefaultPassword = () => {
    setPassword('123456');
    setConfirmPassword('123456');
    setError(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPass = password;
    const cleanConfirm = confirmPassword;

    // 1. Empty field validation
    if (!cleanName || !cleanEmail || !cleanPhone || !cleanPass || !cleanConfirm) {
      setError('All fields marked with * are required.');
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

    // 4. Role selection check
    if (!role) {
      setError('Please select an account role.');
      return;
    }

    // 5. Password length check (min 6 chars to support standard 123456 passwords)
    if (cleanPass.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // 6. Confirm password check
    if (cleanPass !== cleanConfirm) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 7 & 8. Check uniqueness by fetching all users in a single call
      const allUsers = await getUsers();
      
      const existingEmailUser = allUsers.find(u => {
        const uEmail = u.email.toLowerCase().trim();
        // Ignore stale legacy ED records where old email was stored
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
        role: role,
        department: department,
        status: 'active',
        password: cleanPass,
        profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=059669&color=fff`,
        createdAt: Date.now()
      };

      const created = await createUser(newUserObj);

      // Audit Log
      await createAuditLog(
        edUser.fullName,
        edUser.email,
        'USER_REGISTERED',
        `Registered user ${created.fullName} (${created.email}) with role ${created.role} in ${created.department}`
      );

      // In-App Notification for new user
      await createNotification({
        userId: created.id,
        userEmail: created.email,
        title: 'Account Created',
        message: `Account created by ED with role: ${created.role}. You can log in using your email and password.`,
        type: 'info'
      });

      // Dispatch automated welcome & credentials email notification to user
      const emailResult = await sendUserWelcomeEmail({
        newUser: created,
        edCreator: edUser
      });

      if (emailResult.success) {
        setSuccess(`User ${created.fullName} registered successfully! Welcome email notification sent to ${created.email}.`);
      } else {
        setSuccess(`User ${created.fullName} registered successfully! (${emailResult.message})`);
      }

      onUserRegistered(created);

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 2200);

    } catch (err: any) {
      setError(err.message || 'Failed to register user. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
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
                <span>Credentials email will be sent automatically upon creation</span>
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

          {/* Department & Role Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Department *
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value={Department.FISHERY}>Fishery</option>
                  <option value={Department.POULTRY}>Poultry</option>
                  <option value={Department.CATTLE}>Cattle</option>
                  <option value={Department.PIGS}>Pigs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Role *
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value={Role.STAFF}>Staff Member</option>
                  <option value={Role.MANAGER}>Sector Manager</option>
                  <option value={Role.EXECUTIVE_DIRECTOR}>Admin (Executive Director)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Password Fill Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-bold text-slate-500">Security Credentials</span>
            <button
              type="button"
              onClick={handleUseDefaultPassword}
              className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg transition-all flex items-center space-x-1 active:scale-95 cursor-pointer"
            >
              <KeyRound className="w-3 h-3" />
              <span>Use Default Password (123456)</span>
            </button>
          </div>

          {/* Password & Confirm Password Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Min 6 characters (e.g. 123456)"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Repeat password"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Match Visual Indicator */}
          {password && confirmPassword && (
            <div className="text-xs font-bold flex items-center space-x-1.5 pt-1">
              {password === confirmPassword ? (
                <span className="text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Passwords match!</span>
                </span>
              ) : (
                <span className="text-rose-600 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>Passwords do not match.</span>
                </span>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
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
                <span>Registering User...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register User</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
