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
    email: 'info@accadfarms.com',
    role: Role.EXECUTIVE_DIRECTOR
  } as User;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPresetRole, setSelectedPresetRole] = useState<string>('FISHERY_STAFF');
  const [customRoleTitle, setCustomRoleTitle] = useState<string>('');
  const [customDepartment, setCustomDepartment] = useState<string>('');
  const [department, setDepartment] = useState<Department | string>(Department.FISHERY);
  const [role, setRole] = useState<Role>(Role.STAFF);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePresetRoleChange = (presetId: string) => {
    setSelectedPresetRole(presetId);
    if (presetId === 'FISHERY_STAFF') {
      setRole(Role.STAFF);
      setDepartment(Department.FISHERY);
    } else if (presetId === 'FISHERY_MANAGER') {
      setRole(Role.MANAGER);
      setDepartment(Department.FISHERY);
    } else if (presetId === 'HATCHERY_MANAGER') {
      setRole(Role.HATCHERY_MANAGER);
      setDepartment(Department.FISHERY);
    } else if (presetId === 'POULTRY_STAFF') {
      setRole(Role.STAFF);
      setDepartment(Department.POULTRY);
    } else if (presetId === 'POULTRY_MANAGER') {
      setRole(Role.MANAGER);
      setDepartment(Department.POULTRY);
    } else if (presetId === 'CATTLE_STAFF') {
      setRole(Role.STAFF);
      setDepartment(Department.CATTLE);
    } else if (presetId === 'CATTLE_MANAGER') {
      setRole(Role.MANAGER);
      setDepartment(Department.CATTLE);
    } else if (presetId === 'PIGGERY_STAFF') {
      setRole(Role.STAFF);
      setDepartment(Department.PIGS);
    } else if (presetId === 'PIGGERY_MANAGER') {
      setRole(Role.MANAGER);
      setDepartment(Department.PIGS);
    } else if (presetId === 'EXECUTIVE_DIRECTOR') {
      setRole(Role.EXECUTIVE_DIRECTOR);
      setDepartment(Department.ADMIN);
    } else if (presetId === 'OTHERS') {
      setRole(Role.STAFF);
      setDepartment(Department.OTHERS);
    }
  };

  const handleUseDefaultPassword = () => {
    setPassword('123456');
    setConfirmPassword('123456');
    setError(null);
  };

  const handleResetForm = () => {
    setRegisteredUser(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setSelectedPresetRole('FISHERY_STAFF');
    setCustomRoleTitle('');
    setCustomDepartment('');
    setDepartment(Department.FISHERY);
    setRole(Role.STAFF);
    setPassword('');
    setConfirmPassword('');
    setCustomNotes('');
    setError(null);
    setSuccess(null);
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

    // 4b. Custom role validation
    let resolvedPosition = '';
    let resolvedDept = department;

    if (selectedPresetRole === 'FISHERY_STAFF') resolvedPosition = 'Fishery Staff';
    else if (selectedPresetRole === 'FISHERY_MANAGER') resolvedPosition = 'Fishery Manager';
    else if (selectedPresetRole === 'HATCHERY_MANAGER') resolvedPosition = 'Hatchery Manager';
    else if (selectedPresetRole === 'POULTRY_STAFF') resolvedPosition = 'Poultry Staff';
    else if (selectedPresetRole === 'POULTRY_MANAGER') resolvedPosition = 'Poultry Manager';
    else if (selectedPresetRole === 'CATTLE_STAFF') resolvedPosition = 'Cattle Staff';
    else if (selectedPresetRole === 'CATTLE_MANAGER') resolvedPosition = 'Cattle Manager';
    else if (selectedPresetRole === 'PIGGERY_STAFF') resolvedPosition = 'Piggery Staff';
    else if (selectedPresetRole === 'PIGGERY_MANAGER') resolvedPosition = 'Piggery Manager';
    else if (selectedPresetRole === 'EXECUTIVE_DIRECTOR') resolvedPosition = 'Executive Director';
    else if (selectedPresetRole === 'OTHERS') {
      if (!customRoleTitle.trim()) {
        setError('Please type in the custom role / position title.');
        return;
      }
      resolvedPosition = customRoleTitle.trim();
      if (customDepartment.trim()) {
        resolvedDept = customDepartment.trim();
      }
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
        department: resolvedDept,
        position: resolvedPosition,
        customRoleTitle: selectedPresetRole === 'OTHERS' ? customRoleTitle.trim() : undefined,
        status: 'active',
        password: cleanPass,
        profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=059669&color=fff`,
        createdAt: Date.now()
      };

      const created = await createUser(newUserObj);

      // Audit Log
      await createAuditLog(
        currentEd?.fullName || 'Executive Director',
        currentEd?.email || 'info@accadfarms.com',
        'USER_REGISTERED',
        `Registered user ${created.fullName} (${created.email}) with role ${created.role} in ${created.department}`
      );

      // In-App Notification for new user
      await createNotification({
        userId: created.id,
        userEmail: created.email,
        title: 'Account Created',
        message: `Account created by ED with role: ${created.role}. Password: ${created.password || '123456'}`,
        type: 'info'
      });

      // Dispatch automated welcome & credentials email notification to user
      sendUserWelcomeEmail({
        newUser: created,
        edCreator: currentEd,
        customNotes: customNotes.trim()
      }).catch(err => console.warn('Background email dispatch notice:', err));

      if (onUserRegistered) onUserRegistered(created);
      if (onUserCreated) onUserCreated(created);

      setRegisteredUser(created);
      setIsSubmitting(false);

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

            {/* Credentials Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Verified Login Credentials</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Login Email</div>
                  <div className="font-mono font-bold text-white text-sm mt-0.5 select-all truncate">{registeredUser.email}</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-emerald-400 uppercase font-black tracking-wider">Assigned Password</div>
                  <div className="font-mono font-black text-emerald-300 text-sm mt-0.5 select-all">{registeredUser.password || '123456'}</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Assigned Role</div>
                  <div className="font-bold text-white mt-0.5 uppercase">{registeredUser.role}</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Department</div>
                  <div className="font-bold text-white mt-0.5">{registeredUser.department || 'General Operations'}</div>
                </div>
              </div>
            </div>

            {/* Live Automated Dispatch Status */}
            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl py-3.5 px-4 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Automatic onboarding email with password has been sent to <strong>{registeredUser.email}</strong></span>
            </div>

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
                onClick={onClose}
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

            {/* Categorized Role & Department Selection */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Assigned Role (Categorized by Department) *
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                    <select
                      value={selectedPresetRole}
                      onChange={(e) => handlePresetRoleChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none transition-all cursor-pointer font-bold"
                    >
                      <optgroup label="🐟 Fishery Department">
                        <option value="FISHERY_STAFF">Fishery Staff</option>
                        <option value="FISHERY_MANAGER">Fishery Manager</option>
                        <option value="HATCHERY_MANAGER">Hatchery Manager</option>
                      </optgroup>
                      <optgroup label="🐔 Poultry Department">
                        <option value="POULTRY_STAFF">Poultry Staff</option>
                        <option value="POULTRY_MANAGER">Poultry Manager</option>
                      </optgroup>
                      <optgroup label="🐂 Cattle Department">
                        <option value="CATTLE_STAFF">Cattle Staff</option>
                        <option value="CATTLE_MANAGER">Cattle Manager</option>
                      </optgroup>
                      <optgroup label="🐖 Piggery Department">
                        <option value="PIGGERY_STAFF">Piggery Staff</option>
                        <option value="PIGGERY_MANAGER">Piggery Manager</option>
                      </optgroup>
                      <optgroup label="🏛️ Administration & Executive">
                        <option value="EXECUTIVE_DIRECTOR">Executive Director</option>
                      </optgroup>
                      <optgroup label="✨ Others">
                        <option value="OTHERS">Others – (Type-in Field)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Department / Division *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <select
                      disabled={selectedPresetRole !== 'OTHERS'}
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as Department)}
                      className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all font-bold ${
                        selectedPresetRole !== 'OTHERS'
                          ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                          : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-slate-900 cursor-pointer'
                      }`}
                    >
                      <option value={Department.FISHERY}>Fishery Department</option>
                      <option value={Department.POULTRY}>Poultry Department</option>
                      <option value={Department.PIGS}>Piggery Department</option>
                      <option value={Department.CATTLE}>Cattle Department</option>
                      <option value={Department.ADMIN}>Administration & HR</option>
                      <option value={Department.CROPS}>Crops & Horticulture</option>
                      <option value={Department.FEED_MILL}>Feed Mill</option>
                      <option value={Department.SECURITY}>Security</option>
                      <option value={Department.MAINTENANCE}>Maintenance & Engineering</option>
                      <option value={Department.STORE}>Store & Logistics</option>
                      <option value={Department.ACCOUNTING}>Accounting & Finance</option>
                      <option value={Department.OTHERS}>Others (Custom Unit)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Conditional Type-In Field for "Others" */}
              {selectedPresetRole === 'OTHERS' && (
                <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-2xl p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center space-x-2 text-emerald-950 font-black text-xs">
                    <Edit3 className="w-4 h-4 text-emerald-700" />
                    <span>Others: Specify Custom Role & Department Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-emerald-900 mb-1">
                        Type-in Role / Position Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={customRoleTitle}
                        onChange={(e) => setCustomRoleTitle(e.target.value)}
                        placeholder="e.g. Farm Agronomist, Head Veterinarian, Feed Specialist"
                        className="w-full bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase text-emerald-900 mb-1">
                        Custom Department / Unit Name
                      </label>
                      <input
                        type="text"
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        placeholder="e.g. Crop Plantation / Veterinary Clinic"
                        className="w-full bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Password Section */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Security Credentials</span>
                </span>
                <button
                  type="button"
                  onClick={handleUseDefaultPassword}
                  className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors border border-emerald-200 flex items-center space-x-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Use Default Password (123456)</span>
                </button>
              </div>
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
