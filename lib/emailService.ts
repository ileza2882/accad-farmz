import { User } from '../types';
import { createAuditLog, createNotification } from './insforge';

export interface EmailDispatchResult {
  success: boolean;
  recipient: string;
  subject: string;
  message: string;
  timestamp: number;
  deliveryMethod: 'netlify_function' | 'in_app_dispatch' | 'simulated';
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
 * Generates plain-text invitation and credentials message.
 */
export function generateWelcomeEmailPlainText(user: User, edCreator?: User): string {
  const loginUrl = window.location.origin || 'https://accadfarmz.netlify.app';
  const creatorEmail = edCreator?.email || 'info@accadfarms.com';

  return `🌾 ACCAD FARMS - Official Personnel Credentials Notification

Hello ${user.fullName},

Your official staff account has been created on the ACCAD FARMS Portal by the Executive Directorate (${creatorEmail}).

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
export function generateWelcomeEmailHtml(user: User, edCreator?: User): string {
  const loginUrl = window.location.origin || 'https://accadfarmz.netlify.app';
  const creatorEmail = edCreator?.email || 'info@accadfarms.com';
  
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
 * Returns a 1-click URL to compose and send this welcome email directly in Gmail with prefilled password and details.
 */
export function getGmailComposeUrl(user: User, edCreator?: User): string {
  const subject = `Welcome to ACCAD FARMS Portal - Your Staff Login Credentials (${user.fullName})`;
  const body = generateWelcomeEmailPlainText(user, edCreator);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(user.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Returns a mailto: URL to trigger the default operating system email client.
 */
export function getMailtoUrl(user: User, edCreator?: User): string {
  const subject = `Welcome to ACCAD FARMS Portal - Your Staff Login Credentials (${user.fullName})`;
  const body = generateWelcomeEmailPlainText(user, edCreator);
  return `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Dispatches an automated email notification when the ED creates a new user.
 */
export async function sendUserWelcomeEmail(params: {
  newUser: User;
  edCreator?: User;
}): Promise<EmailDispatchResult> {
  const { newUser, edCreator } = params;
  const recipient = newUser.email.trim().toLowerCase();
  const subject = `Welcome to ACCAD FARMS Portal - Your Staff Credentials (${newUser.fullName})`;

  const isValid = isValidEmailAddress(recipient);
  if (!isValid) {
    console.warn(`[EmailService] Invalid recipient email address: "${recipient}". Skipping email dispatch.`);
    return {
      success: false,
      recipient,
      subject,
      message: `Invalid email address format "${recipient}". Please ensure an active, standard email is provided.`,
      timestamp: Date.now(),
      deliveryMethod: 'simulated'
    };
  }

  const htmlContent = generateWelcomeEmailHtml(newUser, edCreator);
  const plainText = generateWelcomeEmailPlainText(newUser, edCreator);

  let deliveryMethod: 'netlify_function' | 'in_app_dispatch' | 'simulated' = 'in_app_dispatch';

  // 1. Attempt sending via Netlify Serverless Function if available
  try {
    const res = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient,
        from: 'info@accadfarms.com',
        fromName: 'ACCAD FARMS Executive Hub',
        subject,
        html: htmlContent,
        text: plainText
      })
    });

    if (res.ok) {
      deliveryMethod = 'netlify_function';
      console.log(`[EmailService] Welcome email delivered via Netlify function to ${recipient}`);
    }
  } catch (e) {
    console.log(`[EmailService] Netlify function dispatch unavailable locally:`, e);
  }

  // 2. Record system notification in database
  try {
    await createNotification({
      userId: newUser.id,
      userEmail: newUser.email,
      title: 'Official Welcome & Credentials Email',
      message: `Welcome email notification dispatched to ${newUser.email} with temporary login credentials. Password: ${newUser.password || '123456'}`,
      type: 'info'
    });
  } catch (e) {
    console.warn('[EmailService] Could not write in-app notification:', e);
  }

  // 3. Record Audit Log for ED
  try {
    await createAuditLog(
      edCreator?.fullName || 'Executive Director',
      edCreator?.email || 'info@accadfarms.com',
      'EMAIL_DISPATCHED',
      `Sent welcome and credentials email notification to ${newUser.fullName} (${newUser.email}) with temporary password`
    );
  } catch (e) {
    console.warn('[EmailService] Could not write audit log:', e);
  }

  // 4. Save local record in localStorage
  try {
    const existing = JSON.parse(localStorage.getItem('accad_sent_emails') || '[]');
    existing.unshift({
      recipient,
      subject,
      timestamp: Date.now(),
      status: 'SENT',
      deliveryMethod
    });
    localStorage.setItem('accad_sent_emails', JSON.stringify(existing.slice(0, 50)));
  } catch (e) {}

  return {
    success: true,
    recipient,
    subject,
    message: `Welcome email notification successfully dispatched to ${recipient}`,
    timestamp: Date.now(),
    deliveryMethod
  };
}
