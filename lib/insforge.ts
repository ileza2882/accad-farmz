import { createClient } from '@insforge/sdk';
import { User, Report, ReportStatus, Role, Department, NotificationItem, AuditLog, HatcheryChangeRequest } from '../types';

export const INSFORGE_PROJECT_NAME = (import.meta as any).env?.VITE_INSFORGE_PROJECT_NAME || 'accadfarmz';
export const INSFORGE_URL = (import.meta as any).env?.VITE_INSFORGE_URL || 'https://a7yjmvd8.us-east.insforge.app';
export const INSFORGE_API_KEY = (import.meta as any).env?.VITE_INSFORGE_API_KEY || 'ik_d5f1bd324edbe697b5f79c8e19de1b28';

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
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

/**
 * Seed Default Users to InsForge Database if missing
 */
export async function seedInitialUsers(): Promise<void> {
  if (IS_DISCONNECTED_MODE) return;
  try {
    const deletedIds = new Set<string>();
    try {
      const deletedRaw = localStorage.getItem('accad_deleted_user_ids');
      if (deletedRaw) {
        const parsed: string[] = JSON.parse(deletedRaw);
        parsed.forEach(id => deletedIds.add(id.toLowerCase().trim()));
      }
    } catch (e) {}

    const { data: dbUsers } = await insforge.database.from('users').select('*');
    const existingEmails = new Set((dbUsers || []).map((u: any) => u.email?.toLowerCase().trim()));

    for (const user of DEFAULT_USERS) {
      const emailKey = user.email.toLowerCase().trim();
      const idKey = user.id.toLowerCase().trim();
      if (deletedIds.has(emailKey) || deletedIds.has(idKey)) {
        continue; // Skip seeding permanently deleted user records
      }

      // Sync to InsForge Authentication service
      await insforge.auth.signUp({
        email: emailKey,
        password: user.password || '123456',
        name: user.fullName
      }).catch(() => {});

      if (!existingEmails.has(emailKey)) {
        const payload = {
          id: user.id,
          originalId: user.id,
          fullName: user.fullName,
          email: emailKey,
          phone: user.phone || null,
          role: user.role,
          department: user.department || null,
          staffId: user.staffId || null,
          position: user.position || null,
          status: user.status || 'active',
          profilePicture: user.profilePicture || '',
          password: user.password || '123456',
          createdAt: user.createdAt || Date.now()
        };
        await insforge.database.from('users').insert([payload]);
      }
    }
  } catch (e) {
    console.warn('InsForge seedInitialUsers notice:', e);
  }
}

/**
 * Get all users with InsForge DB + Local sync
 */
export async function getUsers(): Promise<User[]> {
  let resultUsers: User[] = [];
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
      const { data, error } = await insforge.database.from('users').select('*');
      if (!error && data && Array.isArray(data)) {
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

  const localList = getLocalUsers();
  const userMap = new Map<string, User>();

  for (const u of DEFAULT_USERS) {
    const key = u.email.toLowerCase().trim();
    if (!deletedIds.has(key) && !deletedIds.has(u.id.toLowerCase().trim())) {
      userMap.set(key, u);
    }
  }
  for (const u of localList) {
    const key = u.email.toLowerCase().trim();
    if (!deletedIds.has(key) && !deletedIds.has(u.id.toLowerCase().trim())) {
      userMap.set(key, u);
    }
  }
  for (const u of resultUsers) {
    const key = u.email.toLowerCase().trim();
    if (!deletedIds.has(key) && !deletedIds.has(u.id.toLowerCase().trim())) {
      userMap.set(key, u);
    }
  }

  const merged = Array.from(userMap.values());
  saveLocalUsers(merged);
  return merged;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = email.toLowerCase().trim();
  const all = await getUsers();
  return all.find(u => u.email.toLowerCase().trim() === normalized) || null;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const normalized = phone.trim().replace(/\s+/g, '');
  if (!normalized) return null;
  const all = await getUsers();
  return all.find(u => u.phone && u.phone.trim().replace(/\s+/g, '') === normalized) || null;
}

/**
 * Create a new user (InsForge DB insert + Auth + Local sync)
 */
export async function createUser(user: User): Promise<User> {
  const payload = {
    id: user.id,
    originalId: user.id,
    fullName: user.fullName,
    email: user.email.toLowerCase().trim(),
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

      if (error) console.error('InsForge createUser error:', error);
      else if (data && data[0]) {
        user.id = data[0].originalId || data[0].id;
      }
    } catch (e) {
      console.error('Failed creating user in InsForge:', e);
    }
  }

  const currentLocal = getLocalUsers();
  const idx = currentLocal.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (idx >= 0) currentLocal[idx] = user;
  else currentLocal.push(user);
  saveLocalUsers(currentLocal);

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

  return true;
}

/**
 * Permanently Delete a User Record (InsForge DB delete + Local storage sync)
 */
export async function deleteUser(userIdOrEmail: string): Promise<boolean> {
  const normalized = userIdOrEmail.toLowerCase().trim();

  // 1. Record in deleted list to prevent re-merging default templates or re-seeding
  try {
    const deletedRaw = localStorage.getItem('accad_deleted_user_ids');
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedIds.includes(normalized)) {
      deletedIds.push(normalized);
    }
    localStorage.setItem('accad_deleted_user_ids', JSON.stringify(deletedIds));
  } catch (e) {}

  // 2. Remove from Local Storage
  localStorage.removeItem('accad_users_v1');
  localStorage.removeItem('accad_users');
  const currentLocal = getLocalUsers();
  const updatedLocal = currentLocal.filter(u => 
    u.id.toLowerCase().trim() !== normalized && 
    u.email.toLowerCase().trim() !== normalized
  );
  saveLocalUsers(updatedLocal);

  // 3. Delete from InsForge Database across all identifier columns
  if (!IS_DISCONNECTED_MODE) {
    try {
      const res1 = await insforge.database
        .from('users')
        .delete()
        .eq('email', normalized);

      const res2 = await insforge.database
        .from('users')
        .delete()
        .eq('id', userIdOrEmail);

      const res3 = await insforge.database
        .from('users')
        .delete()
        .eq('originalId', userIdOrEmail);

      console.log('InsForge deleteUser DB sync results:', { res1, res2, res3 });
    } catch (e) {
      console.warn('InsForge deleteUser notice:', e);
    }
  }

  return true;
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
          managerApprovedBy: r.managerApprovedBy,
          edApprovedBy: r.edApprovedBy,
          computerName: r.computerName || 'ACCAD-WORKSTATION-PC',
          updatedAt: r.updatedAt || r.timestamp
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
    managerApprovedBy: report.managerApprovedBy || null,
    edApprovedBy: report.edApprovedBy || null,
    computerName: report.computerName || 'ACCAD-WORKSTATION-PC',
    updatedAt: Date.now()
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
  edApprovedBy?: string
): Promise<boolean> {
  const updates: Record<string, any> = { status, updatedAt: Date.now() };
  if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
  if (managerApprovedBy !== undefined) updates.managerApprovedBy = managerApprovedBy;
  if (edApprovedBy !== undefined) updates.edApprovedBy = edApprovedBy;

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
    const updated = localReports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          ...updates
        };
      }
      return r;
    });
    localStorage.setItem('accad_reports_v2', JSON.stringify(updated));
  } catch (e) {}

  return true;
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
    const targetReport = localReports.find(r => r.id === changeReq.reportId);
    if (targetReport?.formData) {
      if (targetReport.formData.batches?.[changeReq.batchIndex]) {
        const batch = targetReport.formData.batches[changeReq.batchIndex];
        batch.changeRequestStatus = approve ? 'APPROVED' : 'REJECTED';
        batch.changeRequestReviewedBy = reviewerName;
        batch.changeRequestReviewedAt = changeReq.reviewedAt;
        batch.isLocked = !approve;
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
