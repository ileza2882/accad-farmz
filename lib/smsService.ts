import { User } from '../types';
import { createAuditLog, createNotification } from './insforge';

export interface SmsDispatchResult {
  success: boolean;
  recipient: string;
  message: string;
  timestamp: number;
}

/**
 * Normalizes a phone number to the international format Termii requires (country code, no
 * leading '+', no spaces). Assumes Nigerian numbers when a local 0-prefixed number is given,
 * since that is this farm's operating country - override by entering a full international
 * number (e.g. +233...) for staff outside Nigeria.
 */
export function normalizePhoneForTermii(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.trim().replace(/[^\d+]/g, '');
  if (!digits) return null;

  if (digits.startsWith('+')) {
    return digits.slice(1);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }
  if (digits.startsWith('234')) {
    return digits;
  }
  // Already looks like a bare international number without '+' or a leading 0.
  return digits;
}

/**
 * Core SMS dispatcher. Routes through the same-origin edge endpoint, with failover to the
 * Cloudflare Pages production endpoint - mirrors dispatchEmailWithInsForge's endpoint failover
 * so a single transient blip never silently costs a new staff member their credentials text.
 */
export async function dispatchSms(params: { to: string; message: string }): Promise<SmsDispatchResult> {
  const normalized = normalizePhoneForTermii(params.to);
  if (!normalized) {
    return {
      success: false,
      recipient: params.to,
      message: `Invalid phone number "${params.to}" - could not normalize for SMS delivery.`,
      timestamp: Date.now()
    };
  }

  const candidateEndpoints = ['/api/send-sms', 'https://accadfarms.pages.dev/api/send-sms'];
  const MAX_ATTEMPTS_PER_ENDPOINT = 3;
  let lastError = '';

  for (const endpoint of candidateEndpoints) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_ENDPOINT; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ to: normalized, message: params.message })
        });
        clearTimeout(timeoutId);

        const rawResponse = await res.text().catch(() => '');
        let resData: any = null;
        try {
          resData = rawResponse ? JSON.parse(rawResponse) : null;
        } catch {
          resData = null;
        }

        if (res.ok && resData && resData.success !== false) {
          return {
            success: true,
            recipient: normalized,
            message: `SMS successfully dispatched to ${normalized}`,
            timestamp: Date.now()
          };
        }

        lastError = !res.ok
          ? `HTTP ${res.status}: ${rawResponse.slice(0, 200) || res.statusText}`
          : resData?.error || `Endpoint ${endpoint} reported a delivery failure`;
      } catch (e: any) {
        lastError = e?.name === 'AbortError' ? 'Connection timed out' : (e?.message || 'Network unreachable');
      }

      if (attempt < MAX_ATTEMPTS_PER_ENDPOINT) {
        await new Promise(resolve => setTimeout(resolve, 900 * attempt));
      }
    }
  }

  return {
    success: false,
    recipient: normalized,
    message: `Failed to dispatch SMS to ${normalized}: ${lastError}`,
    timestamp: Date.now()
  };
}

/**
 * Texts a newly-registered staff member their portal credentials via Termii, replacing the
 * onboarding email. Records the same in-app notification and audit trail the email path used to,
 * so the ED still has a durable record of whether the message actually went out.
 */
export async function sendUserWelcomeSms(params: {
  newUser: User;
  edCreator?: User;
  customNotes?: string;
}): Promise<SmsDispatchResult> {
  const { newUser, edCreator, customNotes } = params;

  if (!newUser.phone) {
    return {
      success: false,
      recipient: '',
      message: `${newUser.fullName} has no phone number on file - could not send onboarding SMS.`,
      timestamp: Date.now()
    };
  }

  const loginUrl = (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
    ? window.location.origin
    : 'https://accadfarms.pages.dev';

  const cleanNotes = customNotes?.trim();
  const message =
    `ACCAD FARMS: Your staff portal account is ready.\n` +
    `Login: ${newUser.email}\n` +
    `Passcode: ${newUser.password || '123456'}\n` +
    `Portal: ${loginUrl}\n` +
    (cleanNotes ? `Note from ED: ${cleanNotes}\n` : '') +
    `Please change your password after first login.`;

  const result = await dispatchSms({ to: newUser.phone, message });

  try {
    await createNotification({
      userId: newUser.id,
      userEmail: newUser.email,
      title: result.success ? 'Login Details Sent by SMS' : 'Onboarding SMS Could Not Be Delivered',
      message: result.success
        ? `Your portal credentials were texted to ${newUser.phone}.`
        : `We could not text your credentials to ${newUser.phone}. Please contact the Executive Director.`,
      type: result.success ? 'info' : 'warning'
    });
  } catch (e) {}

  try {
    await createAuditLog(
      edCreator?.fullName || 'Executive Director',
      edCreator?.email || 'info@accadfarms.com',
      result.success ? 'SMS_DISPATCHED_TERMII' : 'SMS_DISPATCH_FAILED',
      result.success
        ? `Sent onboarding credentials SMS to ${newUser.fullName} (${newUser.phone})`
        : `FAILED to send onboarding credentials SMS to ${newUser.fullName} (${newUser.phone}). Reason: ${result.message}`
    );
  } catch (e) {}

  return result;
}
