import { User, Report, ReportStatus, HatcheryChangeRequest } from '../types';
import { insforge, IS_DISCONNECTED_MODE, createAuditLog, createNotification } from './insforge';

export interface EmailDispatchResult {
  success: boolean;
  recipient: string;
  subject: string;
  message: string;
  timestamp: number;
  deliveryMethod: 'gmail_smtp' | 'edge_function' | 'in_app_dispatch' | 'simulated';
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
 * Core Universal Mail Dispatcher using Google Mail SMTP Hub
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
  const fromName = options.fromName || 'ACCAD FARMS';
  const fromEmail = options.fromEmail || 'accadfarmsapp@gmail.com';
  const replyTo = options.replyTo || 'accadfarmsapp@gmail.com';

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

  let deliveryMethod: 'gmail_smtp' | 'edge_function' | 'in_app_dispatch' | 'simulated' = 'in_app_dispatch';
  let dispatchedSuccessfully = false;
  let lastError = '';

  // 1. PRIMARY: Google Mail (Gmail SMTPS) via the same-origin edge endpoint, with failover to the
  //    Cloudflare Pages production endpoint. Each endpoint is retried with backoff so a single
  //    transient blip never silently costs a new staff member their credentials email.
  const candidateEndpoints = [
    '/api/send-email',
    'https://accadfarms.pages.dev/api/send-email'
  ];
  const MAX_ATTEMPTS_PER_ENDPOINT = 3;

  const requestBody = JSON.stringify({
    to: recipient,
    from: fromEmail,
    fromName: fromName,
    subject: subject,
    html: options.html,
    text: options.text,
    replyTo: replyTo,
    user: options.metaPayload ? {
      fullName: options.metaPayload['Staff Member Name'],
      role: options.metaPayload['Assigned Role'],
      department: options.metaPayload['Department / Sector']
    } : undefined,
    customNotes: options.metaPayload?.['Special Remarks from ED']
  });

  endpointLoop:
  for (const endpoint of candidateEndpoints) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_ENDPOINT; attempt++) {
      try {
        console.log(`[EmailService] Delivery attempt ${attempt}/${MAX_ATTEMPTS_PER_ENDPOINT} to ${recipient} via ${endpoint}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: controller.signal,
          body: requestBody
        });

        clearTimeout(timeoutId);

        // Read the body as text first: a 200 that is not JSON means the SPA fallback answered and
        // the mail function is not actually deployed on this host. That must NOT count as delivered.
        const rawResponse = await res.text().catch(() => '');
        let resData: any = null;
        try {
          resData = rawResponse ? JSON.parse(rawResponse) : null;
        } catch {
          resData = null;
        }

        if (res.ok && resData && resData.success !== false) {
          dispatchedSuccessfully = true;
          deliveryMethod = 'gmail_smtp';
          console.log(`[EmailService] Successfully dispatched via Google Mail Hub (${endpoint}) to ${recipient}:`, resData);
          break endpointLoop;
        }

        if (!res.ok) {
          lastError = `HTTP ${res.status}: ${rawResponse.slice(0, 200) || res.statusText}`;
        } else if (!resData) {
          lastError = `Endpoint ${endpoint} returned no JSON delivery receipt - the mail function is not deployed on this host.`;
        } else {
          lastError = resData.error || `Server reported a delivery failure at ${endpoint}`;
        }
        console.warn(`[EmailService] Attempt ${attempt} via ${endpoint} failed:`, lastError);
      } catch (e: any) {
        lastError = e?.name === 'AbortError' ? 'Connection timed out' : (e?.message || 'Network unreachable');
        console.warn(`[EmailService] Attempt ${attempt} via ${endpoint} failed:`, lastError);
      }

      // Linear backoff between retries against the same endpoint
      if (attempt < MAX_ATTEMPTS_PER_ENDPOINT) {
        await new Promise(resolve => setTimeout(resolve, 900 * attempt));
      }
    }
  }

  // 2. Secondary: InsForge BaaS SMTP Client (if configured)
  if (!dispatchedSuccessfully && !IS_DISCONNECTED_MODE && insforge?.emails?.send) {
    try {
      const { data, error } = await insforge.emails.send({
        to: recipient,
        subject: subject,
        html: options.html,
        text: options.text,
        replyTo: replyTo
      });

      if (!error) {
        dispatchedSuccessfully = true;
        deliveryMethod = 'in_app_dispatch';
        console.log(`[EmailService] Delivered via InsForge SMTP to ${recipient}`);
      } else {
        lastError = error.message || lastError;
      }
    } catch (insErr: any) {
      lastError = insErr?.message || lastError;
    }
  }

  // 3. Save local sent record
  try {
    const existing = JSON.parse(localStorage.getItem('accad_sent_emails') || '[]');
    existing.unshift({
      recipient,
      subject,
      timestamp: Date.now(),
      status: dispatchedSuccessfully ? 'SENT' : 'FAILED',
      deliveryMethod,
      provider: 'Google Mail (accadfarmsapp@gmail.com)',
      error: dispatchedSuccessfully ? undefined : lastError
    });
    localStorage.setItem('accad_sent_emails', JSON.stringify(existing.slice(0, 50)));
  } catch (e) {}

  if (!dispatchedSuccessfully) {
    console.error(`[EmailService] ❌ Failed to dispatch email to ${recipient}: ${lastError}`);
    return {
      success: false,
      recipient,
      subject,
      message: `Failed to dispatch email to ${recipient}: ${lastError}`,
      timestamp: Date.now(),
      deliveryMethod: 'simulated'
    };
  }

  return {
    success: true,
    recipient,
    subject,
    message: `Email notification successfully dispatched from accadfarmsapp@gmail.com to ${recipient}`,
    timestamp: Date.now(),
    deliveryMethod
  };
}

/**
 * Generates plain-text invitation and credentials message with optional ED remarks.
 */
export function generateWelcomeEmailPlainText(user: User, edCreator?: User, customNotes?: string): string {
  const loginUrl = (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
    ? window.location.origin 
    : 'https://accadfarms.pages.dev';
  const creatorEmail = edCreator?.email || 'accadfarmsapp@gmail.com';
  const cleanNotes = customNotes ? customNotes.trim() : '';

  return `ACCAD FARMS - Official Personnel Credentials Notification

Hello ${user.fullName},

Your official staff account has been created on the ACCAD FARMS Management Portal by the Executive Directorate (${creatorEmail}).

Account Details:
- Staff Member Name: ${user.fullName}
- Portal Login Email: ${user.email}
- Temporary Passcode: issued separately by the Executive Director (not sent by email for security)
- Assigned System Role: ${(user.role || 'STAFF').toUpperCase()}
- Department / Sector: ${user.department || 'General Operations'}
- Position / Designation: ${user.position || `${user.department || ''} Staff`}
- Staff Identification ID: ${user.staffId || 'STF-ACCAD'}
- Official Dispatcher: accadfarmsapp@gmail.com
- Portal Web Address: ${loginUrl}
${cleanNotes ? `\nSpecial Remarks from Executive Director:\n"${cleanNotes}"\n` : ''}
Security Notice:
Please sign in to the portal and change your temporary password upon first login. Keep your login passcode strictly confidential.

ACCAD FARMS LIMITED
Agboopa Village, Awowo, Ewekoro LGA, Ogun State, Nigeria
Official Support: accadfarmsapp@gmail.com | +234 916 358 3220
`;
}

/**
 * Generates a clean HTML onboarding template for new users created by the Executive Director,
 * featuring an official credential table.
 */
export function generateWelcomeEmailHtml(user: User, edCreator?: User, customNotes?: string): string {
  const loginUrl = (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
    ? window.location.origin 
    : 'https://accadfarms.pages.dev';
  const creatorEmail = edCreator?.email || 'accadfarmsapp@gmail.com';
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
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .email-header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 36px 24px; text-align: center; color: #ffffff; }
    .brand-title { font-size: 24px; font-weight: 900; letter-spacing: 1.5px; margin: 0; text-transform: uppercase; }
    .brand-subtitle { font-size: 11px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; font-weight: 700; }
    .email-body { padding: 32px 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; border: 1px solid #a7f3d0; }
    .greeting { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; }
    .intro-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .table-container { margin: 24px 0; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 14px; }
    .cred-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .cred-table th { background: #065f46; color: #ffffff; padding: 12px 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; font-size: 11px; }
    .cred-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
    .cred-table tr:last-child td { border-bottom: none; }
    .cred-label { font-weight: 700; color: #475569; background: #f8fafc; width: 38%; }
    .cred-value { font-weight: 700; color: #0f172a; }
    .cred-passcode { font-family: Consolas, Monaco, monospace; font-size: 15px; font-weight: 900; color: #065f46; background: #ecfdf5; padding: 4px 10px; border-radius: 8px; display: inline-block; }
    .action-btn { display: block; text-align: center; background: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; margin: 28px 0; letter-spacing: 0.5px; }
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
        An official staff account has been provisioned for you on the <strong>ACCAD FARMS Management Portal</strong> by the Executive Directorate (<code>${creatorEmail}</code>).
      </p>

      ${cleanNotes ? `
      <div class="custom-notes-box">
        <strong>📝 Message from Executive Director:</strong>
        <p style="margin: 6px 0 0 0; font-style: italic;">"${cleanNotes}"</p>
      </div>
      ` : ''}

      <!-- Official Credentials Table -->
      <div class="table-container">
        <table class="cred-table">
          <thead>
            <tr>
              <th>Account Detail</th>
              <th>Verified Information</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cred-label">Staff Member Name</td>
              <td class="cred-value">${user.fullName}</td>
            </tr>
            <tr>
              <td class="cred-label">Portal Login Email</td>
              <td class="cred-value" style="font-family: Consolas, Monaco, monospace; color: #047857;">${user.email}</td>
            </tr>
            <tr>
              <td class="cred-label">Temporary Passcode</td>
              <td class="cred-value" style="color:#92400e;">Issued separately by the Executive Director</td>
            </tr>
            <tr>
              <td class="cred-label">Assigned Role</td>
              <td class="cred-value" style="color: #0284c7; text-transform: uppercase;">${(user.role || 'STAFF').toUpperCase()}</td>
            </tr>
            <tr>
              <td class="cred-label">Department / Sector</td>
              <td class="cred-value">${user.department || 'General Operations'}</td>
            </tr>
            <tr>
              <td class="cred-label">Position / Title</td>
              <td class="cred-value">${user.position || `${user.department || ''} Staff`}</td>
            </tr>
            <tr>
              <td class="cred-label">Staff Identification ID</td>
              <td class="cred-value" style="font-family: monospace;">${user.staffId || 'STF-ACCAD'}</td>
            </tr>
            <tr>
              <td class="cred-label">Official Sender</td>
              <td class="cred-value" style="color: #047857;">accadfarmsapp@gmail.com</td>
            </tr>
            <tr>
              <td class="cred-label">Portal Web Address</td>
              <td><a href="${loginUrl}" style="color: #059669; font-weight: 700; text-decoration: underline;">${loginUrl}</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <a href="${loginUrl}" class="action-btn">Sign In to Farm Portal &rarr;</a>

      <div class="notice">
        <strong>🔒 Security Reminder:</strong> Please change your temporary passcode upon your initial sign-in. Keep your credentials confidential at all times.
      </div>
    </div>
    <div class="email-footer">
      <p><strong>ACCAD FARMS LIMITED</strong><br>Agboopa Village, Awowo, Ewekoro LGA, Ogun State, Nigeria</p>
      <p>Official Contact: <a href="mailto:accadfarmsapp@gmail.com">accadfarmsapp@gmail.com</a> | +234 916 358 3220</p>
      <p style="color: #94a3b8; font-size: 10px; margin-top: 10px;">This automated credential notice was dispatched directly from accadfarmsapp@gmail.com.</p>
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
  const subject = `ACCAD FARMS Portal - Welcome & Account Details (${newUser.fullName})`;

  const htmlContent = generateWelcomeEmailHtml(newUser, edCreator, customNotes);
  const plainText = generateWelcomeEmailPlainText(newUser, edCreator, customNotes);

  const metaPayload = {
    'Staff Member Name': newUser.fullName,
    'Portal Login Email': newUser.email,
    'Passcode Delivery': 'Issued separately by the Executive Director',
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
    fromEmail: 'accadfarmsapp@gmail.com',
    replyTo: 'accadfarmsapp@gmail.com',
    metaPayload
  });

  // Record In-App notification
  try {
    await createNotification({
      userId: newUser.id,
      userEmail: newUser.email,
      title: 'Official Welcome & Credentials Email',
      message: `Welcome email sent to ${newUser.email}. Your temporary passcode is issued separately by the Executive Director.`,
      type: 'info'
    });
  } catch (e) {}

  // Record Audit Log for ED
  try {
    await createAuditLog(
      edCreator?.fullName || 'Executive Director',
      edCreator?.email || 'accadfarmsapp@gmail.com',
      'EMAIL_DISPATCHED_GMAIL',
      `Sent welcome and credentials email notification via accadfarmsapp@gmail.com to ${newUser.fullName} (${newUser.email})`
    );
  } catch (e) {}

  return result;
}

/**
 * Sends a staff member a single-use link to choose their own new password.
 *
 * Carries no passcode: the whole point of the link is that only the person holding the mailbox
 * can set the password, and nobody else ever learns it.
 */
export async function sendPasswordResetLinkEmail(params: {
  user: User;
  resetUrl: string;
  expiresInMinutes?: number;
}): Promise<EmailDispatchResult> {
  const { user, resetUrl } = params;
  const expiresInMinutes = params.expiresInMinutes || 60;
  const recipient = user.email.trim().toLowerCase();
  const subject = 'ACCAD FARMS Portal - Reset Your Password';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; padding:24px 12px; color:#1e293b;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#065f46 0%,#047857 100%); padding:32px 24px; text-align:center; color:#ffffff;">
      <div style="font-size:22px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase;">ACCAD FARMS</div>
      <div style="font-size:11px; color:#a7f3d0; text-transform:uppercase; letter-spacing:2px; margin-top:6px; font-weight:700;">Password Reset</div>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="font-size:20px; font-weight:800; color:#0f172a; margin:0 0 12px 0;">Reset your password</h2>
      <p style="font-size:14px; line-height:1.6; color:#475569; margin-bottom:8px;">
        Hello ${user.fullName}, we received a request to reset the password for
        <strong style="color:#047857;">${user.email}</strong>.
      </p>
      <p style="font-size:14px; line-height:1.6; color:#475569; margin-bottom:24px;">
        Click the button below to choose a new password. This link works once and expires in
        <strong>${expiresInMinutes} minutes</strong>.
      </p>

      <a href="${resetUrl}" style="display:block; text-align:center; background:#059669; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:800; font-size:14px; margin:0 0 20px 0;">Choose a New Password &rarr;</a>

      <p style="font-size:11px; color:#64748b; line-height:1.6; margin-bottom:20px;">
        If the button does not work, copy this address into your browser:<br>
        <span style="word-break:break-all; color:#047857; font-family:Consolas,Monaco,monospace;">${resetUrl}</span>
      </p>

      <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:12px; padding:14px; font-size:12px; color:#92400e; line-height:1.5;">
        <strong>Didn't request this?</strong> You can ignore this email &mdash; your current password stays active and the link above will simply expire.
      </div>
    </div>
    <div style="background:#f1f5f9; padding:20px; text-align:center; font-size:11px; color:#64748b; line-height:1.6; border-top:1px solid #e2e8f0;">
      <strong>ACCAD FARMS LIMITED</strong><br>Agboopa Village, Awowo, Ewekoro LGA, Ogun State, Nigeria<br>
      Official Support: accadfarmsapp@gmail.com | +234 916 358 3220
    </div>
  </div>
</div>`;

  const text = `ACCAD FARMS - Reset Your Password

Hello ${user.fullName},

We received a request to reset the password for ${user.email}.

Open this link to choose a new password. It works once and expires in ${expiresInMinutes} minutes:

${resetUrl}

If you did not request this, you can ignore this email. Your current password stays active and
the link will simply expire.

ACCAD FARMS LIMITED
Official Support: accadfarmsapp@gmail.com | +234 916 358 3220
`;

  return await dispatchEmailWithInsForge({
    to: recipient,
    subject,
    html,
    text,
    fromName: 'ACCAD FARMS Security Hub',
    fromEmail: 'accadfarmsapp@gmail.com',
    replyTo: 'accadfarmsapp@gmail.com'
  });
}

/**
 * Sends a staff member the new password the Executive Director has just set for them.
 *
 * This message deliberately DOES carry the passcode: it is the whole point of the reset, and
 * the recipient is the account holder. The welcome email no longer carries one.
 */
export async function sendNewPasswordEmail(params: {
  user: User;
  newPassword: string;
  edCreator?: User;
}): Promise<EmailDispatchResult> {
  const { user, newPassword, edCreator } = params;
  const recipient = user.email.trim().toLowerCase();
  const subject = `ACCAD FARMS Portal - Your Password Has Been Reset`;
  const loginUrl = (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
    ? window.location.origin
    : 'https://accadfarms.pages.dev';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; padding:24px 12px; color:#1e293b;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#065f46 0%,#047857 100%); padding:32px 24px; text-align:center; color:#ffffff;">
      <div style="font-size:22px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase;">ACCAD FARMS</div>
      <div style="font-size:11px; color:#a7f3d0; text-transform:uppercase; letter-spacing:2px; margin-top:6px; font-weight:700;">Account Security Notice</div>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="font-size:20px; font-weight:800; color:#0f172a; margin:0 0 12px 0;">Your password has been reset</h2>
      <p style="font-size:14px; line-height:1.6; color:#475569; margin-bottom:20px;">
        Hello ${user.fullName}, the Executive Directorate has issued a new password for your ACCAD FARMS Management Portal account.
      </p>

      <table style="width:100%; border-collapse:collapse; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; font-size:13px;">
        <tr>
          <td style="padding:12px 16px; font-weight:700; color:#475569; background:#f8fafc; width:40%;">Portal Login Email</td>
          <td style="padding:12px 16px; font-weight:700; color:#047857; font-family:Consolas,Monaco,monospace;">${user.email}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px; font-weight:700; color:#475569; background:#f8fafc; border-top:1px solid #f1f5f9;">New Password</td>
          <td style="padding:12px 16px; border-top:1px solid #f1f5f9;">
            <span style="font-family:Consolas,Monaco,monospace; font-size:15px; font-weight:900; color:#065f46; background:#ecfdf5; padding:4px 10px; border-radius:8px; display:inline-block;">${newPassword}</span>
          </td>
        </tr>
      </table>

      <a href="${loginUrl}" style="display:block; text-align:center; background:#059669; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:800; font-size:14px; margin:28px 0;">Sign In to Farm Portal &rarr;</a>

      <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:12px; padding:14px; font-size:12px; color:#92400e; line-height:1.5;">
        <strong>Security reminder:</strong> Change this password from your User Profile after signing in, and keep it confidential. If you did not request this reset, contact the Executive Directorate immediately.
      </div>
    </div>
    <div style="background:#f1f5f9; padding:20px; text-align:center; font-size:11px; color:#64748b; line-height:1.6; border-top:1px solid #e2e8f0;">
      <strong>ACCAD FARMS LIMITED</strong><br>Agboopa Village, Awowo, Ewekoro LGA, Ogun State, Nigeria<br>
      Official Support: accadfarmsapp@gmail.com | +234 916 358 3220
    </div>
  </div>
</div>`;

  const text = `ACCAD FARMS - Your Password Has Been Reset

Hello ${user.fullName},

The Executive Directorate has issued a new password for your ACCAD FARMS Management Portal account.

- Portal Login Email: ${user.email}
- New Password: ${newPassword}
- Portal Web Address: ${loginUrl}

Please change this password from your User Profile after signing in, and keep it confidential.
If you did not request this reset, contact the Executive Directorate immediately.

ACCAD FARMS LIMITED
Official Support: accadfarmsapp@gmail.com | +234 916 358 3220
`;

  const result = await dispatchEmailWithInsForge({
    to: recipient,
    subject,
    html,
    text,
    fromName: 'ACCAD FARMS Security Hub',
    fromEmail: 'accadfarmsapp@gmail.com',
    replyTo: 'accadfarmsapp@gmail.com'
  });

  try {
    await createNotification({
      userId: user.id,
      userEmail: user.email,
      title: 'Password Reset by Executive Director',
      message: `Your portal password was reset by the Executive Directorate and sent to ${user.email}.`,
      type: 'warning'
    });
  } catch (e) {}

  try {
    await createAuditLog(
      edCreator?.fullName || 'Executive Director',
      edCreator?.email || 'accadfarmsapp@gmail.com',
      'PASSWORD_RESET_BY_ED',
      `Reset the portal password for ${user.fullName} (${user.email}) and dispatched it to their email`
    );
  } catch (e) {}

  return result;
}


/**
 * Dispatches an automated email notification when a new farm log is submitted.
 */
export async function sendReportSubmittedEmail(report: Report, submitterUser?: User): Promise<EmailDispatchResult> {
  const recipient = 'accadfarmsapp@gmail.com';
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
  const recipient = 'accadfarmsapp@gmail.com';
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

      <a href="https://accadfarms.netlify.app" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold;">Open ED Portal to Review & Approve</a>
    </div>
  `;

  const text = `Hatchery Batch Unlock Requested for ${changeReq.batchNumber} by ${requesterName}. Reason: "${changeReq.reason}". Review in ED Portal.`;

  return await dispatchEmailWithInsForge({
    to: recipient,
    subject,
    html,
    text,
    fromEmail: 'accadfarmsapp@gmail.com',
    metaPayload: {
      'Batch Number': changeReq.batchNumber,
      'Requester': requesterName,
      'Reason': changeReq.reason,
      'Report ID': changeReq.reportId
    }
  });
}

/**
 * Dispatches an automated email notification to the Executive Director when a user requests a password reset.
 */
export async function sendPasswordResetRequestEmail(params: {
  user: User;
  note?: string;
}): Promise<EmailDispatchResult> {
  const recipient = 'accadfarmsapp@gmail.com';
  const subject = `[ACCAD FARMS] URGENT: Password Reset Request from ${params.user.fullName}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
      <h2 style="color: #047857; margin-top: 0;">🔑 Password Reset Request</h2>
      <p>A staff member has submitted an official password reset request through the portal:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">User Name:</td><td style="padding: 8px; font-weight: bold;">${params.user.fullName}</td></tr>
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Login Email:</td><td style="padding: 8px; font-weight: bold; color: #047857;">${params.user.email}</td></tr>
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Assigned Role:</td><td style="padding: 8px;">${params.user.role}</td></tr>
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Department:</td><td style="padding: 8px;">${params.user.department || 'General Operations'}</td></tr>
        ${params.note ? `<tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Staff Note:</td><td style="padding: 8px; color: #0f172a; font-style: italic;">"${params.note}"</td></tr>` : ''}
        <tr><td style="padding: 8px; color: #64748b; font-weight: bold;">Timestamp:</td><td style="padding: 8px;">${new Date().toLocaleString()}</td></tr>
      </table>

      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        You can securely update this user's password directly from the <strong>User Management</strong> tab in the Executive Director portal.
      </p>

      <a href="https://accadfarms.netlify.app/#/ed" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; margin-top: 12px;">Open Executive Director Portal</a>
    </div>
  `;

  const text = `Password reset request from ${params.user.fullName} (${params.user.email}). Role: ${params.user.role}. Note: ${params.note || 'None'}. Review at https://accadfarms.netlify.app/#/ed`;

  return await dispatchEmailWithInsForge({
    to: recipient,
    subject,
    html,
    text,
    fromEmail: 'accadfarmsapp@gmail.com',
    fromName: 'ACCAD FARMS Security Hub',
    metaPayload: {
      'User Name': params.user.fullName,
      'User Email': params.user.email,
      'User Role': params.user.role,
      'Staff Note': params.note || 'None'
    }
  });
}

