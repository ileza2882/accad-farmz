/**
 * Sends a Firebase Cloud Messaging notification to every device registered to a staff member.
 *
 * Uses FCM HTTP v1. The old "server key" endpoint (fcm.googleapis.com/fcm/send) was shut down in
 * 2024, so authentication is an OAuth2 access token minted from a service account - which means
 * signing a JWT with RS256 here in the Worker.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT: the full service account JSON from
 * Firebase Console -> Project settings -> Service accounts -> Generate new private key.
 * Store it as an ENCRYPTED Cloudflare environment variable. It grants send rights on the project.
 */

interface Env {
  FIREBASE_SERVICE_ACCOUNT?: string;
  VITE_INSFORGE_URL?: string;
  VITE_INSFORGE_API_KEY?: string;
  INSFORGE_URL?: string;
  INSFORGE_API_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json'
};

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function base64UrlEncode(input: ArrayBuffer | string): string {
  let binary = '';
  if (typeof input === 'string') {
    const bytes = new TextEncoder().encode(input);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  } else {
    const bytes = new Uint8Array(input);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** PEM (PKCS#8) to the raw DER bytes crypto.subtle.importKey expects. */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Access tokens last an hour. A Worker isolate is reused across requests for a while, so caching
// here saves a full JWT sign plus round trip on most sends.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;

  // The JSON form of a service account escapes newlines in the key; undo that before parsing.
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString()
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Google refused the service account assertion (HTTP ${res.status}): ${raw.slice(0, 300)}`);
  }

  const parsed = JSON.parse(raw);
  if (!parsed.access_token) {
    throw new Error(`Token endpoint returned no access_token: ${raw.slice(0, 200)}`);
  }

  cachedToken = {
    value: parsed.access_token,
    expiresAt: Date.now() + (parsed.expires_in || 3600) * 1000
  };
  return cachedToken.value;
}

function resolveInsforge(env: Env): { url: string; key: string } | null {
  const url = env.INSFORGE_URL || env.VITE_INSFORGE_URL || 'https://imf45qwi.us-east.insforge.app';
  const key = env.INSFORGE_API_KEY || env.VITE_INSFORGE_API_KEY || '';
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

async function getTokensForUser(db: { url: string; key: string }, userEmail: string): Promise<string[]> {
  const res = await fetch(
    `${db.url}/api/database/records/push_tokens?select=token&userEmail=eq.${encodeURIComponent(userEmail)}`,
    { headers: { Authorization: `Bearer ${db.key}`, apikey: db.key } }
  );
  if (!res.ok) return [];
  const rows: any[] = await res.json().catch(() => []);
  return rows.map(r => r.token).filter(Boolean);
}

async function deleteToken(db: { url: string; key: string }, token: string): Promise<void> {
  try {
    await fetch(`${db.url}/api/database/records/push_tokens?token=eq.${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${db.key}`, apikey: db.key }
    });
  } catch (e) {}
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body: any = await request.json().catch(() => ({}));
    const userEmail = (body.userEmail || '').trim().toLowerCase();
    const title = body.title || 'ACCAD FARMS';
    const message = body.message || '';

    if (!userEmail) {
      return new Response(JSON.stringify({ success: false, error: '"userEmail" is required' }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    if (!env.FIREBASE_SERVICE_ACCOUNT) {
      // Not an error. Push is optional, and the in-app notification has already been written by the
      // caller - reporting a hard failure here would make every notification look broken.
      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: 'Push notifications are not configured on this host' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    let sa: ServiceAccount;
    try {
      sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'FIREBASE_SERVICE_ACCOUNT is not valid JSON' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const db = resolveInsforge(env);
    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database is not configured on this host' }),
        { status: 503, headers: CORS_HEADERS }
      );
    }

    const tokens = await getTokensForUser(db, userEmail);
    if (tokens.length === 0) {
      // The overwhelmingly common case for a new staff member: registered, but has never opened the
      // portal to grant permission. Nothing is wrong; there is simply no device to reach.
      return new Response(
        JSON.stringify({ success: true, sent: 0, skipped: true, reason: 'No registered devices for this user' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const accessToken = await getAccessToken(sa);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

    let sent = 0;
    const pruned: string[] = [];
    const errors: string[] = [];

    for (const token of tokens) {
      // Data-only payload. A "notification" block would make the browser render its own default
      // popup as well as the service worker's, which shows the user two copies of everything.
      const payload = {
        message: {
          token,
          data: {
            title: String(title),
            message: String(message),
            type: String(body.type || 'info'),
            url: String(body.url || '/notifications'),
            notificationId: String(body.notificationId || ''),
            kind: String(body.kind || '')
          },
          webpush: {
            headers: { Urgency: 'high', TTL: '86400' },
            fcmOptions: { link: String(body.url || '/notifications') }
          }
        }
      };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          sent++;
          continue;
        }

        const detail = await res.text().catch(() => '');

        // A dead registration must be removed, or every future send retries it forever and the
        // table fills with tokens for browsers that no longer exist.
        if (res.status === 404 || detail.includes('UNREGISTERED') || detail.includes('INVALID_ARGUMENT')) {
          await deleteToken(db, token);
          pruned.push(token.slice(0, 12) + '...');
        } else {
          errors.push(`HTTP ${res.status}: ${detail.slice(0, 150)}`);
        }
      } catch (e: any) {
        errors.push(e?.message || 'network error');
      }
    }

    return new Response(
      JSON.stringify({
        success: sent > 0,
        sent,
        devices: tokens.length,
        pruned: pruned.length,
        ...(errors.length ? { errors } : {})
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[Push] Send failed:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Push send error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
