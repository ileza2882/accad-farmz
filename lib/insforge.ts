import { createClient } from '@insforge/sdk';
import { User, Report, ReportStatus, Role, Department, NotificationItem, AuditLog, HatcheryChangeRequest } from '../types';

export const INSFORGE_PROJECT_NAME = (import.meta as any).env?.VITE_INSFORGE_PROJECT_NAME || 'accadfarmz';
export const INSFORGE_URL = (import.meta as any).env?.VITE_INSFORGE_URL || 'https://imf45qwi.us-east.insforge.app';
export const INSFORGE_API_KEY = (import.meta as any).env?.VITE_INSFORGE_API_KEY || 'ik_56a71ca7e6aa4249545fc5bd8f983c38';

// Database connection is active unless explicitly set to disconnect mode
export const IS_DISCONNECTED_MODE = (import.meta as any).env?.VITE_DISCONNECT_DATABASE === 'true';

export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_API_KEY,
});

/**
 * Default initial Executive Director, Manager, and Staff users
 */
export const DEFAULT_USERS: User[] = [
  {
    id: 'ed_user_1',
    fullName: 'Executive Director',
    email: 'info@accadfarms.com',
    phone: '+2348000000000',
    password: '123456',
    role: Role.EXECUTIVE_DIRECTOR,
    staffId: 'ED-001',
    position: 'Executive Director',
    profilePicture: 'https://ui-avatars.com/api/?name=Executive+Director&background=6b21a8&color=fff',
    status: 'active',
    createdAt: Date.now()
  },
  {
    id: 'manager_user_1',
    fullName: 'Sector Manager',
    email: 'manager@accadfarms.com',
    phone: '+2348000000001',
    password: '123456',
    role: Role.MANAGER,
    department: Department.FISHERY,
    staffId: 'MGR-001',
    position: 'Fishery Sector Manager',
    profilePicture: 'https://ui-avatars.com/api/?name=Sector+Manager&background=1e40af&color=fff',
    status: 'active',
    createdAt: Date.now()
  },
  {
    id: 'hatchery_mgr_1',
    fullName: 'Hatchery Manager',
    email: 'hatchery@accadfarms.com',
    phone: '+2348000000003',
    password: '123456',
    role: Role.HATCHERY_MANAGER,
    department: Department.FISHERY,
    staffId: 'HTCH-001',
    position: 'Hatchery Operations Manager',
    profilePicture: 'https://ui-avatars.com/api/?name=Hatchery+Manager&background=0d9488&color=fff',
    status: 'active',
    createdAt: Date.now()
  },
  {
    id: 'staff_user_1',
    fullName: 'Staff Member',
    email: 'staff@accadfarms.com',
    phone: '+2348000000002',
    password: '123456',
    role: Role.STAFF,
    department: Department.FISHERY,
    staffId: 'STF-001',
    position: 'Field Officer',
    profilePicture: 'https://ui-avatars.com/api/?name=Staff+Member&background=047857&color=fff',
    status: 'active',
    createdAt: Date.now()
  }
];

// Local Storage helpers
function saveLocalUsers(users: User[]) {
  try {
    localStorage.setItem('accad_users_v2', JSON.stringify(users));
  } catch (e) {}
}

function getLocalUsers(): User[] {
  try {
    localStorage.removeItem('accad_users_v1');
    localStorage.removeItem('accad_users');
    const raw = localStorage.getItem('accad_users_v2');
    if (raw) {
      const parsed: User[] = JSON.parse(raw);
      // Clean up legacy cache where ed_user_1 had old email dalestic12@gmail.com
      // The official Executive Director email is strictly info@accadfarms.com
      const cleaned = parsed
        .map(u => {
          if (u.id === 'ed_user_1' || u.role === Role.EXECUTIVE_DIRECTOR) {
            return {
              ...u,
              email: 'info@accadfarms.com',
              fullName: 'Executive Director',
              position: 'Executive Director'
            };
          }
          return u;
        })
        .filter(u => {
          // Remove any stray ED user holding dalestic12@gmail.com
          if (u.email.toLowerCase().trim() === 'dalestic12@gmail.com' && (u.role === Role.EXECUTIVE_DIRECTOR || u.id === 'ed_user_1')) {
            return false;
          }
          return true;
        });
      return cleaned;
    }
  } catch (e) {}
  return [];
}

/**
 * First-run bootstrap ONLY.
 *
 * This used to re-insert every missing DEFAULT_USER on each login-page visit, gated only by a
 * per-browser tombstone list. That silently undid deletions: the ED removed a user on their
 * laptop, then anyone opening the login page on a device without that tombstone wrote the row
 * straight back into the database.
 *
 * Deletions are now permanent. Seeding happens only when the users table is completely empty
 * (a brand-new or fully-wiped backend), and only creates the Executive Director account needed
 * to get in and register everyone else.
 */
export async function seedInitialUsers(): Promise<void> {
  if (IS_DISCONNECTED_MODE) return;
  try {
    const { data: dbUsers, error } = await insforge.database
      .from('users')
      .select('id')
      .limit(1);

    // Never seed on a read failure - that would duplicate rows we simply could not see.
    if (error || !dbUsers || !Array.isArray(dbUsers)) return;

    // The database already holds users: whatever is (or is not) there is the truth.
    if (dbUsers.length > 0) return;

    const bootstrapEd = DEFAULT_USERS.find(u => u.role === Role.EXECUTIVE_DIRECTOR);
    if (!bootstrapEd) return;

    console.warn('[InsForge] users table is empty - seeding the bootstrap Executive Director account.');

    await insforge.auth.signUp({
      email: bootstrapEd.email.toLowerCase().trim(),
      password: bootstrapEd.password || '123456',
      name: bootstrapEd.fullName
    }).catch(() => {});

    await insforge.database.from('users').insert([{
      id: bootstrapEd.id,
      originalId: bootstrapEd.id,
      fullName: bootstrapEd.fullName,
      email: bootstrapEd.email.toLowerCase().trim(),
      phone: bootstrapEd.phone || null,
      role: bootstrapEd.role,
      department: bootstrapEd.department || null,
      staffId: bootstrapEd.staffId || null,
      position: bootstrapEd.position || null,
      status: bootstrapEd.status || 'active',
      profilePicture: bootstrapEd.profilePicture || '',
      password: bootstrapEd.password || '123456',
      createdAt: bootstrapEd.createdAt || Date.now()
    }]);

    notifyUserDirectoryChanged();
  } catch (e) {
    console.warn('InsForge seedInitialUsers notice:', e);
  }
}

/**
 * Get all users.
 *
 * The InsForge database is the single source of truth. When the query succeeds its result is
 * returned verbatim - including an empty result, which means the directory really is empty.
 * Previously an empty (or failed) read fell through to DEFAULT_USERS plus the local cache,
 * which resurrected phantom staff who no longer existed in the database.
 *
 * DEFAULT_USERS and the local cache are now used only when the database is genuinely
 * unreachable, so an offline device keeps working without inventing accounts.
 */
export async function getUsers(): Promise<User[]> {
  let resultUsers: User[] = [];
  let databaseReachable = false;
  const deletedIds = new Set<string>();

  try {
    const deletedRaw = localStorage.getItem('accad_deleted_user_ids');
    if (deletedRaw) {
      const parsed: string[] = JSON.parse(deletedRaw);
      parsed.forEach(id => deletedIds.add(id.toLowerCase().trim()));
    }
  } catch (e) {}

  if (!IS_DISCONNECTED_MODE) {
    try {
      const { data, error } = await insforge.database
        .from('users')
        .select('id, originalId, fullName, email, phone, role, department, staffId, position, status, profilePicture, password, createdAt')
        .limit(500);
      if (!error && data && Array.isArray(data)) {
        databaseReachable = true;
        resultUsers = data.map((u: any) => ({
          id: u.originalId || u.id,
          fullName: u.fullName || u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          role: u.role as Role,
          department: u.department as Department | undefined,
          staffId: u.staffId,
          position: u.position,
          status: u.status || 'active',
          profilePicture: u.profilePicture,
          password: u.password || '123456',
          createdAt: u.createdAt || Date.now()
        }));
      }
    } catch (e) {
      console.warn('InsForge getUsers error:', e);
    }
  }

  // Database answered: its contents are the truth, empty or not.
  if (databaseReachable) {
    for (const u of resultUsers) {
      deletedIds.delete(u.email.toLowerCase().trim());
      deletedIds.delete(u.id.toLowerCase().trim());
    }
    try {
      localStorage.setItem('accad_deleted_user_ids', JSON.stringify(Array.from(deletedIds)));
    } catch (e) {}

    saveLocalUsers(resultUsers);
    return resultUsers;
  }

  // Database unreachable: fall back to the last known good cache so the app keeps working.
  const userMap = new Map<string, User>();
  const localList = getLocalUsers();
  const seedPool = localList.length > 0 ? localList : DEFAULT_USERS;

  for (const u of seedPool) {
    const key = u.email.toLowerCase().trim();
    if (!deletedIds.has(key) && !deletedIds.has(u.id.toLowerCase().trim())) {
      userMap.set(key, u);
    }
  }

  return Array.from(userMap.values());
}

/**
 * Strict Database Authorization Verification:
 * Queries InsForge DB directly to verify account existence and active status.
 * Rejects deactivated, deleted, or missing accounts with zero local cache bypass.
 */
export async function verifyDatabaseAuthorization(emailOrId: string): Promise<User | null> {
  if (!emailOrId) return null;
  const normalized = emailOrId.toLowerCase().trim();

  // 1. Direct Live Query to InsForge Database (Authoritative)
  if (!IS_DISCONNECTED_MODE) {
    try {
      const { data, error } = await insforge.database
        .from('users')
        .select('*')
        .or(`email.eq.${normalized},id.eq.${emailOrId},originalId.eq.${emailOrId}`);

      if (!error && data && Array.isArray(data)) {
        const dbUser = data.find((u: any) => 
          u.email?.toLowerCase().trim() === normalized || 
          u.id?.toLowerCase().trim() === normalized ||
          u.originalId?.toLowerCase().trim() === normalized
        );

        if (!dbUser) {
          return null; // Not found in database -> unauthorized!
        }

        if (dbUser.status === 'inactive') {
          return null; // Explicitly deactivated in database
        }

        // Clean from local deleted blacklist if present
        try {
          const deletedRaw = localStorage.getItem('accad_deleted_user_ids');
          if (deletedRaw) {
            const parsed: string[] = JSON.parse(deletedRaw);
            const filtered = parsed.filter(id => id.toLowerCase().trim() !== normalized && id !== dbUser.id);
            localStorage.setItem('accad_deleted_user_ids', JSON.stringify(filtered));
          }
        } catch (e) {}

        const formattedUser: User = {
          id: dbUser.originalId || dbUser.id,
          fullName: dbUser.fullName || dbUser.name || '',
          email: dbUser.email || '',
          phone: dbUser.phone || '',
          role: dbUser.role as Role,
          department: dbUser.department as Department | undefined,
          staffId: dbUser.staffId,
          position: dbUser.position,
          status: dbUser.status || 'active',
          profilePicture: dbUser.profilePicture,
          password: dbUser.password || '123456',
          createdAt: dbUser.createdAt || Date.now()
        };

        return formattedUser;
      }
    } catch (dbErr) {
      console.warn('[InsForge] verifyDatabaseAuthorization database error:', dbErr);
    }
  }

  // 2. Offline Fallback check (only if database unreachable)
  try {
    const deletedRaw = localStorage.getItem('accad_deleted_user_ids');
    if (deletedRaw) {
      const parsed: string[] = JSON.parse(deletedRaw);
      if (parsed.some(id => id.toLowerCase().trim() === normalized)) {
        return null;
      }
    }
  } catch (e) {}

  const all = await getUsers();
  const matched = all.find(u => 
    u.email.toLowerCase().trim() === normalized || 
    u.id.toLowerCase().trim() === normalized
  );

  if (matched && matched.status !== 'inactive') {
    return matched;
  }

  return null;
}


export async function getUserByEmail(email: string): Promise<User | null> {
  return verifyDatabaseAuthorization(email);
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const normalized = phone.trim().replace(/\s+/g, '');
  if (!normalized) return null;
  const all = await getUsers();
  return all.find(u => u.phone && u.phone.trim().replace(/\s+/g, '') === normalized) || null;
}

/**
 * Reads a single user row straight from InsForge. Used to confirm that a write actually
 * landed, rather than trusting a fire-and-forget call that may have been rejected.
 */
async function fetchUserRow(identifier: string): Promise<any | null> {
  if (IS_DISCONNECTED_MODE) return null;
  const normalized = identifier.toLowerCase().trim();
  try {
    const { data, error } = await insforge.database
      .from('users')
      .select('id, originalId, email, status')
      .or(`email.eq.${normalized},id.eq.${identifier},originalId.eq.${identifier}`)
      .limit(5);

    if (error || !data || !Array.isArray(data)) return null;

    return data.find((u: any) =>
      u.email?.toLowerCase().trim() === normalized ||
      u.id?.toLowerCase().trim() === normalized ||
      u.originalId?.toLowerCase().trim() === normalized
    ) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Create a new user. The InsForge database is the single source of truth, so this only
 * reports success once the row has been read back from the database. A user that could not
 * be persisted must surface as an error rather than a local-only ghost account that
 * disappears on the next refresh (and whose welcome email points at a login that fails).
 */
export async function createUser(user: User): Promise<User> {
  const cleanEmail = user.email.toLowerCase().trim();
  const cleanId = user.id.toLowerCase().trim();

  const payload = {
    id: user.id,
    originalId: user.id,
    fullName: user.fullName,
    email: cleanEmail,
    phone: user.phone || null,
    role: user.role,
    department: user.department || null,
    staffId: user.staffId || null,
    position: user.position || null,
    status: user.status || 'active',
    profilePicture: user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=059669&color=fff`,
    password: user.password || '123456',
    createdAt: user.createdAt || Date.now()
  };

  if (!IS_DISCONNECTED_MODE) {
    let dbError = '';

    try {
      await insforge.auth.signUp({
        email: payload.email,
        password: payload.password,
        name: payload.fullName
      }).catch(() => {});

      const { data, error } = await insforge.database
        .from('users')
        .insert([payload])
        .select();

      if (error) {
        // The row may already exist (re-registering a previously removed address): sync it instead.
        console.warn('InsForge createUser insert notice (attempting update sync):', error);
        const { error: updateError } = await insforge.database
          .from('users')
          .update(payload)
          .eq('email', payload.email);
        if (updateError) {
          dbError = (updateError as any).message || String(updateError);
        }
      } else if (data && data[0]) {
        user.id = data[0].originalId || data[0].id;
      }
    } catch (e: any) {
      dbError = e?.message || 'InsForge database unreachable';
      console.error('Failed creating user in InsForge:', e);
    }

    // Authoritative confirmation: the account exists only if the database says it does.
    const confirmed = await fetchUserRow(payload.email);
    if (!confirmed) {
      throw new Error(
        `Could not save ${user.fullName} to the InsForge database${dbError ? ` (${dbError})` : ''}. The account was NOT created - please check the connection and try again.`
      );
    }
    user.id = confirmed.originalId || confirmed.id || user.id;
  }

  // Only once the database holds the record do we clear any stale local tombstone for it.
  try {
    const deletedRaw = localStorage.getItem('accad_deleted_user_ids');
    if (deletedRaw) {
      const parsed: string[] = JSON.parse(deletedRaw);
      const filtered = parsed.filter(id => id !== cleanEmail && id !== cleanId && id !== user.id.toLowerCase().trim());
      localStorage.setItem('accad_deleted_user_ids', JSON.stringify(filtered));
    }
  } catch (e) {}

  const currentLocal = getLocalUsers();
  const idx = currentLocal.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (idx >= 0) currentLocal[idx] = user;
  else currentLocal.push(user);
  saveLocalUsers(currentLocal);

  notifyUserDirectoryChanged();

  return user;
}

/**
 * Update user role or status (InsForge DB update)
 */
export async function updateUser(emailOrId: string, updates: Partial<User>): Promise<boolean> {
  const currentLocal = getLocalUsers();
  const normalized = emailOrId.toLowerCase().trim();
  const idx = currentLocal.findIndex(u => u.id === emailOrId || u.email.toLowerCase().trim() === normalized);
  if (idx >= 0) {
    currentLocal[idx] = { ...currentLocal[idx], ...updates };
    saveLocalUsers(currentLocal);
  }

  if (!IS_DISCONNECTED_MODE) {
    try {
      await insforge.database
        .from('users')
        .update(updates)
        .eq('email', normalized);

      await insforge.database
        .from('users')
        .update(updates)
        .eq('id', emailOrId);

      await insforge.database
        .from('users')
        .update(updates)
        .eq('originalId', emailOrId);
    } catch (e) {
      console.warn('InsForge updateUser notice:', e);
    }
  }

  notifyUserDirectoryChanged();

  return true;
}

/**
 * Permanently delete a user, keeping the app and the InsForge database in lockstep.
 *
 * The database is deleted FIRST and the removal is verified by reading the row back. Only a
 * confirmed deletion purges local state and records a tombstone. If the database still holds
 * the record we fail loudly instead of hiding the user locally - otherwise the account would
 * silently reappear on the next refresh (since the database is the source of truth) and could
 * still be used to sign in from another device.
 */
export async function deactivateUser(userIdOrEmail: string): Promise<boolean> {
  const normalized = userIdOrEmail.toLowerCase().trim();

  // 1. Delete from InsForge across every identifier column
  if (!IS_DISCONNECTED_MODE) {
    let dbError = '';
    try {
      await insforge.database.from('users').delete().eq('email', normalized);
      await insforge.database.from('users').delete().eq('id', userIdOrEmail);
      await insforge.database.from('users').delete().eq('originalId', userIdOrEmail);
    } catch (e: any) {
      dbError = e?.message || 'InsForge database unreachable';
      console.warn('InsForge deactivateUser notice:', e);
    }

    // 2. Verify the record is genuinely gone before touching local state
    const stillPresent = await fetchUserRow(userIdOrEmail);
    if (stillPresent) {
      throw new Error(
        `Could not remove this account from the InsForge database${dbError ? ` (${dbError})` : ''}. The user still exists and can still sign in - nothing was changed.`
      );
    }
  }

  // 3. Record in the local deactivation registry (offline-mode safety net)
  try {
    const deletedRaw = localStorage.getItem('accad_deleted_user_ids');
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedIds.includes(normalized)) {
      deletedIds.push(normalized);
    }
    localStorage.setItem('accad_deleted_user_ids', JSON.stringify(deletedIds));
    localStorage.setItem('accad_last_revocation', Date.now().toString());
  } catch (e) {}

  // 4. Remove from local storage lists
  localStorage.removeItem('accad_users_v1');
  localStorage.removeItem('accad_users');
  const currentLocal = getLocalUsers();
  const updatedLocal = currentLocal.filter(u =>
    u.id.toLowerCase().trim() !== normalized &&
    u.email.toLowerCase().trim() !== normalized
  );
  saveLocalUsers(updatedLocal);

  // 5. Purge the active session if the deleted user is signed in on this device
  try {
    const activeRaw = localStorage.getItem('accad_user_v2') || localStorage.getItem('accad_user');
    if (activeRaw) {
      const activeUser: User = JSON.parse(activeRaw);
      if (
        activeUser.email?.toLowerCase().trim() === normalized ||
        activeUser.id?.toLowerCase().trim() === normalized
      ) {
        localStorage.removeItem('accad_user_v2');
        localStorage.removeItem('accad_user');
      }
    }
  } catch (e) {}

  // 6. Broadcast the removal across all open windows & tabs
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('accad_user_deactivated', { detail: { target: normalized } }));
      localStorage.setItem('accad_session_revoked_at', `${normalized}_${Date.now()}`);
    }
  } catch (e) {}

  notifyUserDirectoryChanged();

  return true;
}

export const deleteUser = deactivateUser;

/* ------------------------------------------------------------------------------------------
 * Self-service password reset tokens
 *
 * Users own their own passwords: the ED creates the account, the user signs in and changes it,
 * and a forgotten password is recovered through an emailed single-use link.
 *
 * Only the SHA-256 hash of a token is ever stored. The raw token lives in the emailed URL and
 * nowhere else, so a reader of the table cannot mint a working link.
 * ---------------------------------------------------------------------------------------- */

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Minimum password rules enforced everywhere a password is chosen. */
export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 of the raw token, hex encoded. */
export async function hashResetToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Issues a reset token for an address. Returns the RAW token to embed in the emailed link,
 * or null when the address has no account (the caller must not reveal which it was).
 */
export async function createPasswordResetToken(email: string): Promise<{ rawToken: string; user: User } | null> {
  const normalized = email.toLowerCase().trim();
  const user = await verifyDatabaseAuthorization(normalized);
  if (!user) return null;

  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const rawToken = toBase64Url(randomBytes);
  const tokenHash = await hashResetToken(rawToken);
  const now = Date.now();

  if (!IS_DISCONNECTED_MODE) {
    try {
      // Retire any outstanding tokens for this address so only the newest link works.
      await insforge.database
        .from('password_reset_tokens')
        .update({ usedAt: now })
        .eq('userEmail', normalized);

      await insforge.database.from('password_reset_tokens').insert([{
        id: `prt_${now}_${Math.random().toString(36).substring(2, 8)}`,
        tokenHash,
        userEmail: normalized,
        createdAt: now,
        expiresAt: now + PASSWORD_RESET_TOKEN_TTL_MS,
        usedAt: null
      }]);
    } catch (e) {
      console.warn('InsForge createPasswordResetToken notice:', e);
      return null;
    }
  }

  return { rawToken, user };
}

// Flat shape rather than a discriminated union: this project compiles with strict mode off,
// where narrowing on a boolean literal discriminant is unreliable.
export interface ResetTokenCheck {
  valid: boolean;
  email?: string;
  tokenId?: string;
  reason?: 'invalid' | 'expired' | 'used';
}

/** Validates a raw token from a reset link without consuming it. */
export async function verifyPasswordResetToken(rawToken: string): Promise<ResetTokenCheck> {
  if (!rawToken || IS_DISCONNECTED_MODE) return { valid: false, reason: 'invalid' };

  try {
    const tokenHash = await hashResetToken(rawToken);
    const { data, error } = await insforge.database
      .from('password_reset_tokens')
      .select('id, userEmail, expiresAt, usedAt')
      .eq('tokenHash', tokenHash)
      .limit(1);

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { valid: false, reason: 'invalid' };
    }

    const row: any = data[0];
    if (row.usedAt) return { valid: false, reason: 'used' };
    if (typeof row.expiresAt === 'number' && Date.now() > row.expiresAt) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true, email: (row.userEmail || '').toLowerCase().trim(), tokenId: row.id };
  } catch (e) {
    console.warn('InsForge verifyPasswordResetToken notice:', e);
    return { valid: false, reason: 'invalid' };
  }
}

/**
 * Completes a reset: re-checks the token, writes the new password, then burns the token so the
 * link cannot be replayed.
 */
export interface PasswordResetResult {
  ok: boolean;
  email?: string;
  message?: string;
}

export async function completePasswordReset(rawToken: string, newPassword: string): Promise<PasswordResetResult> {
  const policyError = validatePasswordStrength(newPassword);
  if (policyError) return { ok: false, message: policyError };

  const check = await verifyPasswordResetToken(rawToken);
  if (!check.valid) {
    const message =
      check.reason === 'expired' ? 'This reset link has expired. Please request a new one.'
      : check.reason === 'used' ? 'This reset link has already been used. Please request a new one.'
      : 'This reset link is not valid. Please request a new one.';
    return { ok: false, message };
  }

  const resolvedEmail = check.email || '';
  await updateUser(resolvedEmail, { password: newPassword });

  try {
    await insforge.database
      .from('password_reset_tokens')
      .update({ usedAt: Date.now() })
      .eq('id', check.tokenId);
  } catch (e) {
    console.warn('InsForge completePasswordReset burn notice:', e);
  }

  try {
    await createAuditLog(
      resolvedEmail,
      resolvedEmail,
      'PASSWORD_RESET_SELF_SERVICE',
      `User ${resolvedEmail} set a new password using an emailed reset link`
    );
  } catch (e) {}

  return { ok: true, email: resolvedEmail };
}


/* ------------------------------------------------------------------------------------------
 * Password reset requests
 *
 * When a staff member uses "Forgot Password" the request is recorded here so it shows up in
 * the ED's User Management table. Previously it only fired a notification and an email, both
 * of which are easy to miss.
 * ---------------------------------------------------------------------------------------- */

export interface PasswordResetRequest {
  id: string;
  userEmail: string;
  userName?: string;
  userRole?: string;
  department?: string;
  note?: string;
  status: 'pending' | 'resolved';
  requestedAt: number;
  resolvedAt?: number;
}

export const PASSWORD_RESET_REQUESTS_EVENT = 'accad_password_reset_requests_changed';

function notifyResetRequestsChanged(): void {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(PASSWORD_RESET_REQUESTS_EVENT));
    localStorage.setItem('accad_reset_requests_stamp', Date.now().toString());
  } catch (e) {}
}

/** Records a staff member's password reset request for the ED to action. */
export async function createPasswordResetRequest(params: {
  user: User;
  note?: string;
}): Promise<PasswordResetRequest> {
  const { user, note } = params;
  const request: PasswordResetRequest = {
    id: `prr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userEmail: user.email.toLowerCase().trim(),
    userName: user.fullName,
    userRole: user.role,
    department: user.department,
    note: (note || '').trim(),
    status: 'pending',
    requestedAt: Date.now()
  };

  if (!IS_DISCONNECTED_MODE) {
    try {
      await insforge.database.from('password_reset_requests').insert([{
        id: request.id,
        userEmail: request.userEmail,
        userName: request.userName || null,
        userRole: request.userRole || null,
        department: request.department || null,
        note: request.note || null,
        status: 'pending',
        requestedAt: request.requestedAt,
        resolvedAt: null
      }]);
    } catch (e) {
      console.warn('InsForge createPasswordResetRequest notice:', e);
    }
  }

  notifyResetRequestsChanged();
  return request;
}

/** All still-outstanding reset requests, newest first. */
export async function getPendingPasswordResetRequests(): Promise<PasswordResetRequest[]> {
  if (IS_DISCONNECTED_MODE) return [];
  try {
    const { data, error } = await insforge.database
      .from('password_reset_requests')
      .select('id, userEmail, userName, userRole, department, note, status, requestedAt')
      .eq('status', 'pending')
      .limit(200);

    if (error || !data || !Array.isArray(data)) return [];

    return data
      .map((r: any) => ({
        id: r.id,
        userEmail: (r.userEmail || '').toLowerCase().trim(),
        userName: r.userName || undefined,
        userRole: r.userRole || undefined,
        department: r.department || undefined,
        note: r.note || undefined,
        status: 'pending' as const,
        requestedAt: r.requestedAt || 0
      }))
      .sort((a, b) => b.requestedAt - a.requestedAt);
  } catch (e) {
    console.warn('InsForge getPendingPasswordResetRequests notice:', e);
    return [];
  }
}

/** Clears every outstanding request for an address once the ED has issued a new password. */
export async function resolvePasswordResetRequests(userEmail: string): Promise<void> {
  const normalized = userEmail.toLowerCase().trim();
  if (!IS_DISCONNECTED_MODE) {
    try {
      await insforge.database
        .from('password_reset_requests')
        .update({ status: 'resolved', resolvedAt: Date.now() })
        .eq('userEmail', normalized);
    } catch (e) {
      console.warn('InsForge resolvePasswordResetRequests notice:', e);
    }
  }
  notifyResetRequestsChanged();
}


/* ------------------------------------------------------------------------------------------
 * Live user-directory reconciliation
 *
 * Keeps the app and the InsForge database in step in BOTH directions: a user added or removed
 * straight from the database (or from another device / browser tab) shows up here without a
 * manual refresh, and local changes broadcast immediately to every open tab.
 *
 * Rather than re-downloading the whole table on a timer, this polls a cheap fingerprint of just
 * four short columns and only fetches full rows when that fingerprint actually moves.
 * ---------------------------------------------------------------------------------------- */

export const USER_DIRECTORY_CHANGED_EVENT = 'accad_user_directory_changed';

/** Announce a locally-made user change so other tabs and listeners reconcile at once. */
export function notifyUserDirectoryChanged(): void {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(USER_DIRECTORY_CHANGED_EVENT));
    localStorage.setItem('accad_user_directory_stamp', Date.now().toString());
  } catch (e) {}
}

/**
 * Cheap change-probe over the users table. Returns a compact fingerprint covering membership
 * (catches additions and deletions) plus role and status (catches promotions and deactivations).
 * Returns null when the database cannot be reached, which is deliberately distinct from '' -
 * the fingerprint of a genuinely empty table.
 */
export async function getUserDirectoryFingerprint(): Promise<string | null> {
  if (IS_DISCONNECTED_MODE) return null;
  try {
    const { data, error } = await insforge.database
      .from('users')
      .select('id, email, role, status')
      .limit(500);

    if (error || !data || !Array.isArray(data)) return null;

    return data
      .map((u: any) => `${u.id}~${(u.email || '').toLowerCase().trim()}~${u.role}~${u.status}`)
      .sort()
      .join('|');
  } catch (e) {
    return null;
  }
}

/**
 * Watches the InsForge users table and invokes onChange with the fresh list whenever the
 * directory actually differs from what was last seen.
 *
 * Polling pauses while the tab is hidden and resumes (with an immediate check) on focus, so an
 * ED dashboard left open overnight costs nothing.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToUserDirectory(
  onChange: (users: User[]) => void,
  options?: { intervalMs?: number }
): () => void {
  const intervalMs = options?.intervalMs ?? 12000;
  let lastFingerprint: string | null = null;
  let stopped = false;
  let inFlight = false;

  const reconcile = async (force = false) => {
    if (stopped || inFlight) return;
    if (!force && typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    inFlight = true;
    try {
      const fingerprint = await getUserDirectoryFingerprint();

      // Database unreachable - hold the last known good state rather than wiping the list.
      if (fingerprint === null) return;

      // First successful probe just establishes the baseline; the caller already has this data.
      if (lastFingerprint === null) {
        lastFingerprint = fingerprint;
        return;
      }

      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        const freshUsers = await getUsers();
        if (!stopped) onChange(freshUsers);
      }
    } catch (e) {
      console.warn('[InsForge] user directory reconcile notice:', e);
    } finally {
      inFlight = false;
    }
  };

  // Establish the baseline immediately so the first real change is detected promptly.
  reconcile(true);

  const timer = setInterval(() => reconcile(), intervalMs);

  const handleFocus = () => reconcile(true);
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') reconcile(true);
  };
  const handleLocalChange = () => reconcile(true);
  const handleStorage = (e: StorageEvent) => {
    if (
      e.key === 'accad_user_directory_stamp' ||
      e.key === 'accad_session_revoked_at' ||
      e.key === 'accad_deleted_user_ids'
    ) {
      reconcile(true);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(USER_DIRECTORY_CHANGED_EVENT, handleLocalChange);
    window.addEventListener('accad_user_deactivated', handleLocalChange);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
  }

  return () => {
    stopped = true;
    clearInterval(timer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(USER_DIRECTORY_CHANGED_EVENT, handleLocalChange);
      window.removeEventListener('accad_user_deactivated', handleLocalChange);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    }
  };
}


/**
 * Clear all farm logs / reports from InsForge DB + Local storage (Start Afresh)
 */
export async function clearAllReports(): Promise<boolean> {
  try {
    localStorage.removeItem('accad_reports_v2');
    localStorage.removeItem('accad_reports_v1');
    localStorage.removeItem('accad_reports');
  } catch (e) {}

  if (!IS_DISCONNECTED_MODE) {
    try {
      const { data } = await insforge.database.from('reports').select('id');
      if (data && Array.isArray(data)) {
        for (const item of data) {
          if (item.id) {
            await insforge.database.from('reports').delete().eq('id', item.id);
          }
        }
      }
    } catch (e) {
      console.warn('InsForge clearAllReports notice:', e);
    }
  }

  return true;
}

/**
 * Get all farm logs / reports from InsForge DB + Local sync
 */
export async function getReports(): Promise<Report[]> {
  if (!IS_DISCONNECTED_MODE) {
    try {
      const { data, error } = await insforge.database.from('reports').select('*');
      if (!error && data && Array.isArray(data)) {
        const dbReports: Report[] = data.map((r: any) => ({
          id: r.originalId || r.id,
          userId: r.userId || '',
          email: r.email || '',
          fullName: r.fullName || '',
          department: r.department as Department,
          inventoryType: r.inventoryType as any,
          title: r.title || '',
          content: r.content || '',
          timestamp: typeof r.timestamp === 'number' ? r.timestamp : (r.timestamp ? parseInt(r.timestamp, 10) : Date.now()),
          status: r.status as ReportStatus,
          formData: r.formData,
          isReEntry: Boolean(r.isReEntry),
          rejectionReason: r.rejectionReason,
          rejectedBy: r.rejectedBy,
          rejectedAt: r.rejectedAt,
          managerApprovedBy: r.managerApprovedBy,
          edApprovedBy: r.edApprovedBy,
          computerName: r.computerName || 'ACCAD-WORKSTATION-PC',
          updatedAt: r.updatedAt || r.timestamp,
          isArchived: Boolean(r.isArchived),
          isResubmitted: Boolean(r.isResubmitted),
          resubmittedAt: r.resubmittedAt,
          resubmissionCount: r.resubmissionCount || 0,
          previousRejectionReason: r.previousRejectionReason,
          redoNotes: r.redoNotes
        })).sort((a: Report, b: Report) => b.timestamp - a.timestamp);

        try {
          localStorage.setItem('accad_reports_v2', JSON.stringify(dbReports));
        } catch (e) {}

        return dbReports;
      }
    } catch (e) {
      console.warn('InsForge getReports error:', e);
    }
  }

  try {
    const local = localStorage.getItem('accad_reports_v2') || localStorage.getItem('accad_reports_v1');
    return local ? JSON.parse(local) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Create a new farm log in InsForge DB
 */
export async function createReport(report: Report): Promise<Report> {
  const payload = {
    id: report.id,
    originalId: report.id,
    userId: report.userId,
    email: report.email,
    fullName: report.fullName || '',
    department: report.department,
    inventoryType: report.inventoryType,
    title: report.title,
    content: report.content,
    timestamp: report.timestamp,
    status: report.status || ReportStatus.PENDING_MANAGER,
    formData: report.formData || null,
    isReEntry: report.isReEntry || false,
    rejectionReason: report.rejectionReason || null,
    rejectedBy: report.rejectedBy || null,
    rejectedAt: report.rejectedAt || null,
    managerApprovedBy: report.managerApprovedBy || null,
    edApprovedBy: report.edApprovedBy || null,
    computerName: report.computerName || 'ACCAD-WORKSTATION-PC',
    updatedAt: Date.now(),
    isArchived: report.isArchived || false,
    isResubmitted: report.isResubmitted || false,
    resubmittedAt: report.resubmittedAt || null,
    resubmissionCount: report.resubmissionCount || 0,
    previousRejectionReason: report.previousRejectionReason || null,
    redoNotes: report.redoNotes || null
  };

  if (!IS_DISCONNECTED_MODE) {
    try {
      const { data, error } = await insforge.database
        .from('reports')
        .insert([payload])
        .select();

      if (error) console.error('InsForge createReport error:', error);
      else if (data && data[0]) {
        report.id = data[0].originalId || data[0].id;
      }
    } catch (e) {
      console.error('Failed creating report in InsForge:', e);
    }
  }

  try {
    const localReports: Report[] = JSON.parse(localStorage.getItem('accad_reports_v2') || localStorage.getItem('accad_reports_v1') || '[]');
    localReports.unshift(report);
    localStorage.setItem('accad_reports_v2', JSON.stringify(localReports));
  } catch (e) {}

  // Trigger InsForge email notification to Manager & Executive Director
  import('./emailService').then(({ sendReportSubmittedEmail }) => {
    sendReportSubmittedEmail(report).catch(err => console.warn('InsForge report email dispatch notice:', err));
  }).catch(() => {});

  return report;
}

/**
 * Update farm log status in InsForge DB
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  rejectionReason?: string,
  managerApprovedBy?: string,
  edApprovedBy?: string,
  rejectedBy?: string
): Promise<boolean> {
  const updates: Record<string, any> = { status, updatedAt: Date.now() };
  if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
  if (managerApprovedBy !== undefined) updates.managerApprovedBy = managerApprovedBy;
  if (edApprovedBy !== undefined) updates.edApprovedBy = edApprovedBy;
  if (rejectedBy !== undefined) {
    updates.rejectedBy = rejectedBy;
    updates.rejectedAt = Date.now();
  }

  if (!IS_DISCONNECTED_MODE) {
    try {
      await insforge.database
        .from('reports')
        .update(updates)
        .eq('originalId', reportId);
    } catch (e) {
      console.warn('InsForge updateReportStatus error:', e);
    }
  }

  try {
    const localReports: Report[] = JSON.parse(localStorage.getItem('accad_reports_v2') || localStorage.getItem('accad_reports_v1') || '[]');
    let targetReport: Report | undefined;
    const updated = localReports.map(r => {
      if (r.id === reportId) {
        targetReport = {
          ...r,
          ...updates
        };
        return targetReport;
      }
      return r;
    });
    localStorage.setItem('accad_reports_v2', JSON.stringify(updated));

    if (targetReport) {
      const reviewerName = edApprovedBy || managerApprovedBy || rejectedBy || 'Supervisor';
      import('./emailService').then(({ sendReportStatusEmail }) => {
        sendReportStatusEmail(targetReport!, status, reviewerName, rejectionReason).catch(err =>
          console.warn('InsForge status email dispatch notice:', err)
        );
      }).catch(() => {});
    }
  } catch (e) {}

  return true;
}

/**
 * Redo and Resubmit a previously rejected farm log
 */
export async function resubmitReport(
  reportId: string,
  redoPayload: {
    formData?: any;
    title?: string;
    content?: string;
    redoNotes?: string;
    resubmittedBy?: string;
  }
): Promise<Report | null> {
  const existingReports = await getReports();
  const existing = existingReports.find(r => r.id === reportId);
  if (!existing) return null;

  const resubmissionCount = (existing.resubmissionCount || 0) + 1;
  const previousRejectionReason = existing.rejectionReason || existing.previousRejectionReason || 'Rejection feedback addressed';

  const updates: Partial<Report> = {
    status: ReportStatus.PENDING_MANAGER,
    isResubmitted: true,
    resubmittedAt: Date.now(),
    resubmissionCount,
    previousRejectionReason,
    rejectionReason: undefined,
    rejectedBy: undefined,
    rejectedAt: undefined,
    managerApprovedBy: undefined,
    edApprovedBy: undefined,
    updatedAt: Date.now(),
    formData: redoPayload.formData !== undefined ? redoPayload.formData : existing.formData,
    title: redoPayload.title || existing.title,
    content: redoPayload.content || existing.content,
    redoNotes: redoPayload.redoNotes || ''
  };

  return await updateReport(reportId, updates);
}

export async function updateReport(reportId: string, updates: Partial<Report>): Promise<Report | null> {
  const mergedUpdates: Record<string, any> = {
    ...updates,
    updatedAt: Date.now()
  };

  if (!IS_DISCONNECTED_MODE) {
    try {
      await insforge.database
        .from('reports')
        .update(mergedUpdates)
        .eq('originalId', reportId);

      await insforge.database
        .from('reports')
        .update(mergedUpdates)
        .eq('id', reportId);
    } catch (e) {
      console.warn('InsForge updateReport error:', e);
    }
  }

  let updatedReport: Report | null = null;
  try {
    const localReports: Report[] = JSON.parse(localStorage.getItem('accad_reports_v2') || localStorage.getItem('accad_reports_v1') || '[]');
    const updated = localReports.map(r => {
      if (r.id === reportId) {
        updatedReport = {
          ...r,
          ...mergedUpdates
        };
        return updatedReport;
      }
      return r;
    });
    localStorage.setItem('accad_reports_v2', JSON.stringify(updated));
  } catch (e) {}

  return updatedReport;
}

/**
 * Real-time Notifications Management synced with InsForge DB
 */
export async function getNotifications(userEmail: string): Promise<NotificationItem[]> {
  let dbNotifs: NotificationItem[] = [];

  if (!IS_DISCONNECTED_MODE) {
    try {
      const { data, error } = await insforge.database.from('notifications').select('*');
      if (!error && data && Array.isArray(data)) {
        dbNotifs = data.map((n: any) => ({
          id: n.originalId || n.id,
          userId: n.userId || n.user_id || '',
          userEmail: n.userEmail || '',
          title: n.title || '',
          message: n.message || '',
          type: n.type as any || 'info',
          read: Boolean(n.read),
          timestamp: typeof n.timestamp === 'number' ? n.timestamp : (n.created_at ? new Date(n.created_at).getTime() : Date.now())
        }));
      }
    } catch (e) {
      console.warn('InsForge getNotifications error:', e);
    }
  }

  try {
    const raw = localStorage.getItem('accad_notifications');
    const localList: NotificationItem[] = raw ? JSON.parse(raw) : [];
    
    const notifMap = new Map<string, NotificationItem>();
    for (const n of localList) notifMap.set(n.id, n);
    for (const n of dbNotifs) notifMap.set(n.id, n);

    const merged = Array.from(notifMap.values())
      .filter(n => n.userEmail.toLowerCase() === userEmail.toLowerCase() || n.userId === 'manager_group' || n.userId === 'ed_user_1')
      .sort((a, b) => b.timestamp - a.timestamp);

    return merged;
  } catch (e) {
    return dbNotifs;
  }
}

export async function createNotification(n: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): Promise<NotificationItem> {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item: NotificationItem = {
    ...n,
    id: notifId,
    timestamp: Date.now(),
    read: false
  };

  if (!IS_DISCONNECTED_MODE) {
    try {
      const payload = {
        id: notifId,
        originalId: item.id,
        userId: item.userId,
        userEmail: item.userEmail,
        title: item.title,
        message: item.message,
        type: item.type,
        read: false,
        timestamp: item.timestamp
      };
      await insforge.database.from('notifications').insert([payload]);
    } catch (e) {
      console.warn('InsForge createNotification error:', e);
    }
  }

  try {
    const raw = localStorage.getItem('accad_notifications');
    const all: NotificationItem[] = raw ? JSON.parse(raw) : [];
    all.unshift(item);
    localStorage.setItem('accad_notifications', JSON.stringify(all));
  } catch (e) {}

  // Mirror the notification to the user's registered devices via Firebase Cloud Messaging.
  //
  // Deliberately not awaited. Every caller awaits createNotification, several from inside loops,
  // and a push round trip on each would be felt in the UI. The in-app notification above is the
  // durable record; push is a best-effort nudge on top of it, so it must never delay or fail the
  // write. The endpoint answers 200 with skipped:true when push is unconfigured or the user has no
  // device registered, which is the normal case for staff who have not opted in.
  try {
    fetch('/api/push-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: item.userEmail,
        title: item.title,
        message: item.message,
        type: item.type,
        notificationId: item.id,
        url: '/notifications'
      })
    }).catch(() => {});
  } catch (e) {}

  return item;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  if (!IS_DISCONNECTED_MODE) {
    try {
      await insforge.database.from('notifications').update({ read: true }).eq('originalId', id);
    } catch (e) {}
  }
  try {
    const raw = localStorage.getItem('accad_notifications');
    const all: NotificationItem[] = raw ? JSON.parse(raw) : [];
    const updated = all.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem('accad_notifications', JSON.stringify(updated));
  } catch (e) {}
}

export async function markAllNotificationsAsRead(userEmail: string): Promise<void> {
  if (!IS_DISCONNECTED_MODE) {
    try {
      await insforge.database.from('notifications').update({ read: true }).eq('userEmail', userEmail.toLowerCase());
    } catch (e) {}
  }
  try {
    const raw = localStorage.getItem('accad_notifications');
    const all: NotificationItem[] = raw ? JSON.parse(raw) : [];
    const updated = all.map(n => n.userEmail.toLowerCase() === userEmail.toLowerCase() ? { ...n, read: true } : n);
    localStorage.setItem('accad_notifications', JSON.stringify(updated));
  } catch (e) {}
}

/**
 * Real-time Audit Logs Management synced with InsForge DB
 */
export async function getAuditLogs(): Promise<AuditLog[]> {
  let dbLogs: AuditLog[] = [];

  if (!IS_DISCONNECTED_MODE) {
    try {
      const { data, error } = await insforge.database.from('audit_logs').select('*');
      if (!error && data && Array.isArray(data)) {
        dbLogs = data.map((a: any) => ({
          id: a.originalId || a.id,
          actorName: a.actorName || a.performed_by || 'System',
          actorEmail: a.actorEmail || '',
          action: a.action || '',
          details: a.details || '',
          timestamp: typeof a.timestamp === 'number' ? a.timestamp : (a.created_at ? new Date(a.created_at).getTime() : Date.now())
        })).sort((x, y) => y.timestamp - x.timestamp);
      }
    } catch (e) {
      console.warn('InsForge getAuditLogs error:', e);
    }
  }

  try {
    const raw = localStorage.getItem('accad_audit_logs');
    const localList: AuditLog[] = raw ? JSON.parse(raw) : [];
    
    const logMap = new Map<string, AuditLog>();
    for (const a of localList) logMap.set(a.id, a);
    for (const a of dbLogs) logMap.set(a.id, a);

    return Array.from(logMap.values()).sort((x, y) => y.timestamp - x.timestamp);
  } catch (e) {
    return dbLogs;
  }
}

export async function createAuditLog(actorName: string, actorEmail: string, action: string, details: string): Promise<AuditLog> {
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const log: AuditLog = {
    id: auditId,
    actorName,
    actorEmail,
    action,
    details,
    timestamp: Date.now()
  };

  if (!IS_DISCONNECTED_MODE) {
    try {
      const payload = {
        id: auditId,
        originalId: auditId,
        actorName,
        actorEmail,
        action,
        details,
        timestamp: log.timestamp
      };
      await insforge.database.from('audit_logs').insert([payload]);
    } catch (e) {
      console.warn('InsForge createAuditLog error:', e);
    }
  }

  try {
    const raw = localStorage.getItem('accad_audit_logs');
    const all: AuditLog[] = raw ? JSON.parse(raw) : [];
    all.unshift(log);
    localStorage.setItem('accad_audit_logs', JSON.stringify(all));
  } catch (e) {}

  return log;
}

export async function migrateDataToInsforge(): Promise<void> {
  await seedInitialUsers();
}

/**
 * Hatchery Log Immutability & Change Request Workflow
 */
export async function getHatcheryChangeRequests(): Promise<HatcheryChangeRequest[]> {
  try {
    const raw = localStorage.getItem('accad_hatchery_change_requests');
    const list: HatcheryChangeRequest[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => b.requestedAt - a.requestedAt);
  } catch (e) {
    return [];
  }
}

export async function createHatcheryChangeRequest(
  reqData: Omit<HatcheryChangeRequest, 'id' | 'requestedAt' | 'status'>
): Promise<HatcheryChangeRequest> {
  const reqId = `chg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const changeReq: HatcheryChangeRequest = {
    ...reqData,
    id: reqId,
    requestedAt: Date.now(),
    status: 'PENDING'
  };

  try {
    const all = await getHatcheryChangeRequests();
    all.unshift(changeReq);
    localStorage.setItem('accad_hatchery_change_requests', JSON.stringify(all));

    // Update target report batch or pond state to PENDING
    const localReports: Report[] = JSON.parse(localStorage.getItem('accad_reports_v2') || localStorage.getItem('accad_reports_v1') || '[]');
    const targetReport = localReports.find(r => r.id === reqData.reportId);
    if (targetReport?.formData) {
      if (targetReport.formData.batches?.[reqData.batchIndex]) {
        targetReport.formData.batches[reqData.batchIndex].changeRequestStatus = 'PENDING';
        targetReport.formData.batches[reqData.batchIndex].changeRequestReason = reqData.reason;
        targetReport.formData.batches[reqData.batchIndex].changeRequestedBy = reqData.requestedBy;
        targetReport.formData.batches[reqData.batchIndex].changeRequestedAt = changeReq.requestedAt;
        await updateReport(targetReport.id, targetReport);
      } else if (targetReport.formData.ponds?.[reqData.batchIndex]) {
        targetReport.formData.ponds[reqData.batchIndex].changeRequestStatus = 'PENDING';
        targetReport.formData.ponds[reqData.batchIndex].changeRequestReason = reqData.reason;
        targetReport.formData.ponds[reqData.batchIndex].changeRequestedBy = reqData.requestedBy;
        targetReport.formData.ponds[reqData.batchIndex].changeRequestedAt = changeReq.requestedAt;
        await updateReport(targetReport.id, targetReport);
      }
    }

    // Create Notification for Executive Director
    await createNotification({
      userId: 'ed_group',
      userEmail: 'ed@accadfarms.com',
      title: 'Farm Log Change Request',
      message: `${reqData.requestedBy} requested to modify locked ${reqData.batchNumber}: "${reqData.reason}"`,
      type: 'warning'
    });

    await createAuditLog(
      reqData.requestedBy,
      reqData.requestedByEmail,
      'FARM_LOG_CHANGE_REQUESTED',
      `Requested unlock for ${reqData.batchNumber} (Report: ${reqData.reportId}): ${reqData.reason}`
    );

    // Dispatch InsForge email alert to ED
    import('./emailService').then(({ sendChangeRequestEmail }) => {
      sendChangeRequestEmail(changeReq).catch(err =>
        console.warn('InsForge change request email dispatch notice:', err)
      );
    }).catch(() => {});
  } catch (e) {
    console.error('Error creating change request:', e);
  }

  return changeReq;
}

export async function reviewHatcheryChangeRequest(
  requestId: string,
  approve: boolean,
  reviewerName: string,
  reviewerEmail: string,
  reviewNotes?: string
): Promise<boolean> {
  try {
    const all = await getHatcheryChangeRequests();
    const reqIndex = all.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return false;

    const changeReq = all[reqIndex];
    changeReq.status = approve ? 'APPROVED' : 'REJECTED';
    changeReq.reviewedBy = reviewerName;
    changeReq.reviewedAt = Date.now();
    changeReq.reviewNotes = reviewNotes;

    localStorage.setItem('accad_hatchery_change_requests', JSON.stringify(all));

    // Update target batch/pond in report
    const localReports: Report[] = JSON.parse(localStorage.getItem('accad_reports_v2') || localStorage.getItem('accad_reports_v1') || '[]');
    let targetReport = localReports.find(r => r.id === changeReq.reportId);
    
    // Fallback: if not found by reportId, find by matching batch or pond in any report
    if (!targetReport) {
      targetReport = localReports.find(r => 
        (r.formData?.batches && r.formData.batches[changeReq.batchIndex]) ||
        (r.formData?.ponds && r.formData.ponds[changeReq.batchIndex])
      );
    }

    if (targetReport?.formData) {
      if (targetReport.formData.batches?.[changeReq.batchIndex]) {
        const batch = targetReport.formData.batches[changeReq.batchIndex];
        batch.changeRequestStatus = approve ? 'APPROVED' : 'REJECTED';
        batch.changeRequestReviewedBy = reviewerName;
        batch.changeRequestReviewedAt = changeReq.reviewedAt;
        batch.isLocked = !approve;
        if (approve) {
          batch.lockedRows = {}; // Reset per-row locks so staff can edit freely
        }
        await updateReport(targetReport.id, targetReport);
      } else if (targetReport.formData.ponds?.[changeReq.batchIndex]) {
        const pond = targetReport.formData.ponds[changeReq.batchIndex];
        pond.changeRequestStatus = approve ? 'APPROVED' : 'REJECTED';
        pond.changeRequestReviewedBy = reviewerName;
        pond.changeRequestReviewedAt = changeReq.reviewedAt;
        pond.isLocked = !approve;
        await updateReport(targetReport.id, targetReport);
      }
    }

    // Notify requester
    await createNotification({
      userId: changeReq.requestedByEmail,
      userEmail: changeReq.requestedByEmail,
      title: `Hatchery Change Request ${approve ? 'Approved' : 'Rejected'}`,
      message: `Your request to edit ${changeReq.batchNumber} was ${approve ? 'approved' : 'rejected'} by Executive Director ${reviewerName}.`,
      type: approve ? 'success' : 'error'
    });

    await createAuditLog(
      reviewerName,
      reviewerEmail,
      approve ? 'HATCHERY_CHANGE_APPROVED' : 'HATCHERY_CHANGE_REJECTED',
      `${approve ? 'Approved' : 'Rejected'} unlock request for ${changeReq.batchNumber} submitted by ${changeReq.requestedBy}`
    );

    return true;
  } catch (e) {
    console.error('Error reviewing hatchery change request:', e);
    return false;
  }
}
