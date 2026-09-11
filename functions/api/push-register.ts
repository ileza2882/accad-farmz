/**
 * Device registration for Firebase Cloud Messaging.
 *
 * POST   stores or refreshes the token for a user's browser.
 * DELETE removes it when they turn notifications off.
 *
 * Writes go through the InsForge REST API with the anon key, the same key the browser already
 * holds, so this endpoint grants nothing the client could not do directly. It exists to keep the
 * table shape in one place and to normalise the email before it is written.
 */

interface Env {
  VITE_INSFORGE_URL?: string;
  VITE_INSFORGE_API_KEY?: string;
  INSFORGE_URL?: string;
  INSFORGE_API_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json'
};

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

function resolveInsforge(env: Env): { url: string; key: string } | null {
  const url = env.INSFORGE_URL || env.VITE_INSFORGE_URL || 'https://imf45qwi.us-east.insforge.app';
  const key = env.INSFORGE_API_KEY || env.VITE_INSFORGE_API_KEY || '';
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body: any = await request.json().catch(() => ({}));
    const token = (body.token || '').trim();
    const userEmail = (body.userEmail || '').trim().toLowerCase();

    if (!token || !userEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Both "token" and "userEmail" are required' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const db = resolveInsforge(env);
    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database is not configured on this host' }),
        { status: 503, headers: CORS_HEADERS }
      );
    }

    const now = Date.now();
    const row = {
      token,
      userEmail,
      userId: body.userId || null,
      platform: body.platform || 'web',
      userAgent: (body.userAgent || '').slice(0, 300),
      createdAt: now,
      lastSeenAt: now
    };

    // The token is the primary key, so an existing device re-registering must update rather than
    // insert. Prefer-resolution=merge-duplicates makes that a single round trip.
    const res = await fetch(`${db.url}/api/database/records/push_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${db.key}`,
        apikey: db.key,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify([row])
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`[Push] Token registration failed (HTTP ${res.status}): ${detail.slice(0, 300)}`);
      return new Response(
        JSON.stringify({ success: false, error: `Could not store device token: ${detail.slice(0, 200)}` }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    return new Response(JSON.stringify({ success: true, registeredAt: new Date(now).toISOString() }), {
      status: 200,
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Registration error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

export const onRequestDelete = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body: any = await request.json().catch(() => ({}));
    const token = (body.token || '').trim();
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: '"token" is required' }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    const db = resolveInsforge(env);
    if (!db) {
      return new Response(JSON.stringify({ success: true, note: 'No database configured' }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    await fetch(`${db.url}/api/database/records/push_tokens?token=eq.${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${db.key}`,
        apikey: db.key
      }
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Deletion error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
