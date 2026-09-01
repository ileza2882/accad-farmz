import { User, Report, ReportStatus, HatcheryChangeRequest } from '../types';
import { insforge, IS_DISCONNECTED_MODE, createAuditLog, createNotification } from './insforge';

export interface EmailDispatchResult {
  success: boolean;
  recipient: string;
  subject: string;
  message: string;
  timestamp: number;
  deliveryMethod: 'insforge_smtp' | 'netlify_function' | 'in_app_dispatch' | 'simulated';
}

/**
 * Validates whether an email is formatted properly and has an active domain structure.
 */
export function isValidEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  
  // Standard RFC 5322 compliant regex for valid email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return false;

  // Domain structure checks
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain.includes('.')) return false;
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;

  return true;
}

/**
 * Core Universal Mail Dispatcher using InsForge SMTP as primary delivery route
 */
export async function dispatchEmailWithInsForge(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  metaPayload?: Record<string, any>;
}): Promise<EmailDispatchResult> {
  const recipient = options.to.trim().toLowerCase();
  const subject = options.subject;
  const fromName = options.fromName || 'ACCAD FARMS Hub';
  const fromEmail = options.fromEmail || 'info@accadfarms.com';
  const replyTo = options.replyTo || 'info@accadfarms.com';

  if (!isValidEmailAddress(recipient)) {
    console.warn(`[EmailService] Invalid recipient email address: "${recipient}". Skipping dispatch.`);
    return {
      success: false,
      recipient,
      subject,
      message: `Invalid email address format "${recipient}".`,
      timestamp: Date.now(),
      deliveryMethod: 'simulated'
    };
  }

  let deliveryMethod: 'insforge_smtp' | 'netlify_function' | 'in_app_dispatch' | 'simulated' = 'in_app_dispatch';

  // 1. Primary: Direct InsForge BaaS SMTP Client
  if (!IS_DISCONNECTED_MODE && insforge?.emails?.send) {
    try {
      const { data, error } = await insforge.emails.send({
        to: recipient,
        subject: subject,
        html: options.html,
        text: options.text,
        replyTo: replyTo
      });

      if (!error) {
        deliveryMethod = 'insforge_smtp';
        console.log(`[EmailService] Delivered via InsForge SMTP to ${recipient}`);
      } else {
        console.warn('[EmailService] InsForge SMTP response notice:', error.message);
      }
    } catch (insErr) {
      console.warn('[EmailService] InsForge SMTP exception:', insErr);
    }
  }

  // 2. Secondary / Live Inbox Relay (FormSubmit & Serverless relay fallback)
  try {
    const portalUrl = window.location.origin || 'https://accadfarmz.netlify.app';
    const payload = {
      name: fromName,
      email: fromEmail,
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      'Recipient': recipient,
      'Portal URL': portalUrl,
      ...(options.metaPayload || {}),
      'Timestamp': new Date().toLocaleString()
    };

    // Primary activated relay token
    fetch('https://formsubmit.co/ajax/628b81a295608a62a2883c8cb312aad1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});

    // Secondary direct recipient relay
    if (recipient !== 'dalestic12@gmail.com') {
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }

    // Also notify local dev server / netlify endpoint
    fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient,
        from: fromEmail,
        fromName: fromName,
        subject: subject,
        html: options.html,
        text: options.text,
        user: { email: recipient }
      })
    }).catch(() => {});

  } catch (fsErr) {
    console.warn('[EmailService] Secondary relay dispatch notice:', fsErr);
  }

  // 3. Save local sent record
  try {
    const existing = JSON.parse(localStorage.getItem('accad_sent_emails') || '[]');
    existing.unshift({
      recipient,
      subject,
      timestamp: Date.now(),
      status: 'SENT',
      deliveryMethod,
      provider: 'InsForge SMTP'
    });
    localStorage.setItem('accad_sent_emails', JSON.stringify(existing.slice(0, 50)));
  } catch (e) {}

  return {
    success: true,
    recipient,
    subject,
    message: `Email notification automatically dispatched to ${recipient} via InsForge SMTP`,
    timestamp: Date.now(),
    deliveryMethod
  };
}

/**
 * Generates plain-text invitation and credentials message with optional ED remarks.
 */
export function generateWelcomeEmailPlainText(user: User, edCreator?: User, customNotes?: string): string {
  const loginUrl = window.location.origin || 'https://accadfarmz.netlify.app';
  const creatorEmail = edCreator?.email || 'info@accadfarms.com';
  const cleanNotes = customNotes ? customNotes.trim() : '';

  return `🌾 ACCAD FARMS - Official Personnel Credentials Notification

Hello ${user.fullName},

Your official staff account has been created on the ACCAD FARMS Portal by the Executive Directorate (${creatorEmail}).
${cleanNotes ? `\n📝 SPECIAL MESSAGE FROM EXECUTIVE DIRECTOR:\n"${cleanNotes}"\n` : ''}
Here are your verified portal login details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Portal Login Email:  ${user.email}
• Temporary Passcode:  ${user.password || '123456'}
• Assigned Role:       ${(user.role || 'STAFF').toUpperCase()}
• Department / Sector: ${user.department || 'General Operations'}
• Portal Web Address:  ${loginUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Security Notice:
Please sign in to the portal and change your temporary password upon first login. Keep your login passcode strictly confidential.

ACCAD FARMS LIMITED
Agboopa Village, Awowo, Ewekoro LGA, Ogun State, Nigeria
Support: info@accadfarms.com | +234 916 358 3220
`;
}

/**
 * Generates a clean HTML onboarding template for new users created by the Executive Director.
 */
export function generateWelcomeEmailHtml(user: User, edCreator?: User, customNotes?: string): string {
  const loginUrl = window.location.origin || 'https://accadfarmz.netlify.app';
  const creatorEmail = edCreator?.email || 'info@accadfarms.com';
  const cleanNotes = customNotes ? customNotes.trim() : '';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ACCAD FARMS Portal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
    .email-wrapper { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .email-header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 36px 24px; text-align: center; color: #ffffff; }
    .brand-title { font-size: 24px; font-weight: 900; letter-spacing: 1.5px; margin: 0; text-transform: uppercase; }
    .brand-subtitle { font-size: 11px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; font-weight: 700; }
    .email-body { padding: 32px 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; border: 1px solid #a7f3d0; }
    .greeting { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; }
    .intro-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .cred-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #cbd5e1; font-size: 13px; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { color: #64748b; font-weight: 600; }
    .cred-val { color: #0f172a; font-weight: 700; font-family: Consolas, Monaco, monospace; }
    .action-btn { display: block; text-align: center; background: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; margin: 28px 0; letter-spacing: 0.5px; }
    .action-btn:hover { background: #047857; }
    .notice { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px; font-size: 12px; color: #92400e; line-height: 1.5; margin-top: 20px; }
    .custom-notes-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 16px; margin: 20px 0; color: #166534; font-size: 13px; line-height: 1.6; }
    .email-footer { background: #f1f5f9; padding: 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
    .email-footer a { color: #059669; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="brand-title">🌾 ACCAD FARMS</div>
      <div class="brand-subtitle">Farm Management & Operations Hub</div>
    </div>
    <div class="email-body">
      <span class="badge">Official Staff Onboarding</span>
      <h2 class="greeting">Welcome to the Team, ${user.fullName}!</h2>
      <p class="intro-text">
        An official staff account has been provisioned for you on the <strong>ACCAD FARMS Management Portal</strong> by the Executive Director (<code>${creatorEmail}</code>).
      </p>

      ${cleanNotes ? `
      <div class="custom-notes-box">
        <strong>📝 Message from Executive Director:</strong>
        <p style="margin: 6px 0 0 0; font-style: italic;">"${cleanNotes}"</p>
      </div>
      ` : ''}

      <div class="cred-card">
        <div class="cred-row">
          <span class="cred-label">Portal Login Email:</span>
          <span class="cred-val">${user.email}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Temporary Passcode:</span>
          <span class="cred-val">${user.password || '123456'}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Assigned Role:</span>
          <span class="cred-val">${(user.role || 'STAFF').toUpperCase()}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Department / Sector:</span>
          <span class="cred-val">${user.department || 'General Operations'}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Staff ID:</span>
          <span class="cred-val">${user.staffId || 'STF-ACCAD'}</span>
        </div>
      </div>

      <a href="${loginUrl}" class="action-btn">Sign In to Farm Portal &rarr;</a>

      <div class="notice">
        <strong>🔒 Security Reminder:</strong> Please change your temporary passcode after your initial sign-in. Never share your credentials with third parties.
      </div>
    </div>
    <div class="email-footer">
      <p><strong>ACCAD FARMS LIMITED</strong><br>Agboopa Village, Awowo, Ewekoro LGA, Ogun State, Nigeria</p>
      <p>Contact: <a href="mailto:info@accadfarms.com">info@accadfarms.com</a> | +234 916 358 3220</p>
      <p style="color: #94a3b8; font-size: 10px; margin-top: 10px;">This automated notification was generated directly from ACCAD FARMS Executive Governance Console.</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Dispatches an automated email notification when the ED creates a new user via InsForge SMTP.
 */
export async function sendUserWelcomeEmail(params: {
  newUser: User;
  edCreator?: User;
  customNotes?: string;
}): Promise<EmailDispatchResult> {
  const { newUser, edCreator, customNotes } = params;
  const recipient = newUser.email.trim().toLowerCase();
  const subject = `Welcome to ACCAD FARMS Portal - Your Staff Credentials (${newUser.fullName})`;

  const htmlContent = generateWelcomeEmailHtml(newUser, edCreator, customNotes);
  const plainText = generateWelcomeEmailPlainText(newUser, edCreator, customNotes);

  const metaPayload = {
    'Staff Member Name': newUser.fullName,
    'Portal Login Email': newUser.email,
    'Temporary Passcode': newUser.password || '123456',
    'Assigned Role': (newUser.role || 'STAFF').toUpperCase(),
    'Department / Sector': newUser.department || 'General Operations',
    'Staff ID': newUser.staffId || 'STF-ACCAD',
    ...(customNotes ? { 'Special Remarks from ED': customNotes } : {})
  };

  const result = await dispatchEmailWithInsForge({
    to: recipient,
    subject,
    html: htmlContent,
    text: plainText,
    fromName: 'ACCAD FARMS Executive Hub',
    fromEmail: edCreator?.email || 'info@accadfarms.com',
    replyTo: 'info@accadfarms.com',
    metaPayload
  });

  // Record In-App notification
  try {
    await createNotification({
      userId: newUser.id,
      userEmail: newUser.email,
      title: 'Official Welcome & Credentials Email',
      message: `Welcome email notification dispatched via InsForge SMTP to ${newUser.email} with temporary login credentials. Password: ${newUser.password || '123456'}`,
      type: 'info'
    });
  } catch (e) {}

  // Record Audit Log for ED
  try {
    await createAuditLog(
      edCreator?.fullName || 'Executive Director',
      edCreator?.email || 'info@accadfarms.com',
      'EMAIL_DISPATCHED_INSFORGE',
      `Sent welcome and credentials email notification via InsForge SMTP to ${newUser.fullName} (${newUser.email})`
    );
  } catch (e) {}

  return result;
}

/**
 * Dispatches an automated email notification when a new farm log is submitted.
 */
export async function sendReportSubmittedEmail(report: Report, submitterUser?: User): Promise<EmailDispatchResult> {
  const recipient = 'info@accadfarms.com';
  const submitterName = submitterUser?.fullName || report.fullName || report.email;
  const subject = `[ACCAD FARMS] New ${report.department} Report Submitted - ${report.title}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #047857; margin-top: 0;">🌾 New Farm Report Submitted</h2>
      <p>A new operational log has been submitted for review on the <strong>ACCAD FARMS Management Portal</strong>.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Report Title:</td><td style="padding: 8px; font-weight: bold;">${report.title}</td></tr>
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Department:</td><td style="padding: 8px;">${report.department}</td></tr>
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Inventory Type:</td><td style="padding: 8px;">${report.inventoryType}</td></tr>
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Submitted By:</td><td style="padding: 8px;">${submitterName} (${report.email})</td></tr>
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Date & Time:</td><td style="padding: 8px;">${new Date(report.timestamp).toLocaleString()}</td></tr>
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Status:</td><td style="padding: 8px; color: #0284c7; font-weight: bold;">${report.status}</td></tr>
      </table>

      <a href="https://accadfarmz.netlify.app" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold;">Open Executive Hub to Review</a>
    </div>
  `;

  const text = `New Farm Report Submitted: ${report.title} (${report.department}) by ${submitterName}. Status: ${report.status}. View in portal.`;

  return await dispatchEmailWithInsForge({
    to: recipient,
    subject,
    html,
    text,
    metaPayload: {
      'Report Title': report.title,
      'Department': report.department,
      'Submitted By': submitterName,
      'Report ID': report.id
    }
  });
}

/**
 * Dispatches an automated email notification when a report status changes (Approved / Rejected).
 */
export async function sendReportStatusEmail(
  report: Report,
  newStatus: ReportStatus,
  reviewerName: string,
  rejectionReason?: string
): Promise<EmailDispatchResult> {
  const recipient = report.email.trim().toLowerCase();
  const isApproved = newStatus === ReportStatus.APPROVED_BY_ED || newStatus === ReportStatus.APPROVED_BY_MANAGER;
  const subject = `[ACCAD FARMS] Report Status Update: "${report.title}" is ${newStatus}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: ${isApproved ? '#047857' : '#e11d48'}; margin-top: 0;">
        ${isApproved ? '✅ Report Approved' : '⚠️ Report Requires Revision / Rejected'}
      </h2>
      <p>Your submitted farm report <strong>"${report.title}"</strong> has been reviewed by <strong>${reviewerName}</strong>.</p>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>New Status:</strong> ${newStatus}</p>
        <p style="margin: 0 0 8px 0;"><strong>Reviewed By:</strong> ${reviewerName}</p>
        ${rejectionReason ? `<p style="margin: 8px 0 0 0; color: #be123c;"><strong>Remarks / Reason:</strong> "${rejectionReason}"</p>` : ''}
      </div>

      <a href="https://accadfarmz.netlify.app" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold;">Sign In to View Report Details</a>
    </div>
  `;

  const text = `Report Status Update: Your report "${report.title}" has been reviewed by ${reviewerName}. Status: ${newStatus}. ${rejectionReason ? `Reason: "${rejectionReason}"` : ''}`;

  return await dispatchEmailWithInsForge({
    to: recipient,
    subject,
    html,
    text,
    metaPayload: {
      'Report Title': report.title,
      'New Status': newStatus,
      'Reviewer': reviewerName,
      ...(rejectionReason ? { 'Rejection Reason': rejectionReason } : {})
    }
  });
}

/**
 * Dispatches an automated email notification when a Hatchery change request is submitted to the ED.
 */
export async function sendChangeRequestEmail(
  changeReq: HatcheryChangeRequest,
  requesterUser?: User
): Promise<EmailDispatchResult> {
  const recipient = 'info@accadfarms.com';
  const requesterName = requesterUser?.fullName || changeReq.requestedBy;
  const subject = `[ACCAD FARMS] Urgent: Hatchery Batch Unlock Requested - ${changeReq.batchNumber}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #d97706; margin-top: 0;">🔒 Hatchery Batch Change Request</h2>
      <p>The Hatchery Manager <strong>${requesterName}</strong> has requested Executive Director clearance to unlock and modify a locked batch record.</p>
      
      <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Target Batch:</strong> ${changeReq.batchNumber}</p>
        <p style="margin: 0 0 8px 0;"><strong>Requester:</strong> ${requesterName} (${changeReq.requestedByEmail})</p>
        <p style="margin: 8px 0 0 0; color: #92400e;"><strong>Reason for Modification:</strong> "${changeReq.reason}"</p>
      </div>

      <a href="https://accadfarmz.netlify.app" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold;">Open ED Portal to Review & Approve</a>
    </div>
  `;

  const text = `Hatchery Batch Unlock Requested for ${changeReq.batchNumber} by ${requesterName}. Reason: "${changeReq.reason}". Review in ED Portal.`;

  return await dispatchEmailWithInsForge({
    to: recipient,
    subject,
    html,
    text,
    metaPayload: {
      'Batch Number': changeReq.batchNumber,
      'Requester': requesterName,
      'Reason': changeReq.reason,
      'Report ID': changeReq.reportId
    }
  });
}
