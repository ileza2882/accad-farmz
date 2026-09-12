import fs from 'fs';
import path from 'path';
import http from 'http';
import esbuild from 'esbuild-wasm';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '.');

// Simple .env and .env.local file loader
function loadEnv() {
  ['.env', '.env.local'].forEach(file => {
    const envPath = path.join(root, file);
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  });
}
loadEnv();

const PORT = 3300;
const distDir = path.join(root, 'dist');
const distAssetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });

// Initialize esbuild-wasm
await esbuild.initialize({});

const browserShimsPlugin = {
  name: 'browser-shims',
  setup(build) {
    build.onResolve({ filter: /^crypto$/ }, () => ({ path: 'crypto', namespace: 'crypto-poly' }));
    build.onLoad({ filter: /.*/, namespace: 'crypto-poly' }, () => ({
      contents: `
        export const webcrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : {};
        export default { webcrypto };
      `,
      loader: 'js'
    }));

    build.onResolve({ filter: /^core-js/ }, () => ({ path: 'core-js-shim', namespace: 'core-js-shim' }));
    build.onLoad({ filter: /.*/, namespace: 'core-js-shim' }, () => ({
      contents: 'export default {};',
      loader: 'js'
    }));
  }
};

let isBuilding = false;

async function bundleApp() {
  if (isBuilding) return;
  isBuilding = true;
  const start = Date.now();
  try {
    const jsBundleName = `index-bundle.js`;
    const jsBundlePath = path.join(distAssetsDir, jsBundleName);

    await esbuild.build({
      entryPoints: [path.join(root, 'index.tsx')],
      bundle: true,
      minify: false,
      sourcemap: 'inline',
      format: 'esm',
      target: 'es2020',
      outfile: jsBundlePath,
      plugins: [browserShimsPlugin],
      define: {
        'process.env.NODE_ENV': '"development"',
        'process.env.API_KEY': '""',
        'process.env.GEMINI_API_KEY': '""',
        'import.meta.env.VITE_INSFORGE_PROJECT_NAME': '"accadfarmz"',
        'import.meta.env.VITE_INSFORGE_URL': '"https://imf45qwi.us-east.insforge.app"',
        'import.meta.env.VITE_INSFORGE_API_KEY': '"ik_56a71ca7e6aa4249545fc5bd8f983c38"',
        'import.meta.env.VITE_DISCONNECT_DATABASE': '"false"',
        // Firebase web config. Public by design; the service account key is server-side only.
        // Mirrors firebaseDefines() in build-wasm.mjs so dev and production agree.
        ...Object.fromEntries(
          [
            'VITE_FIREBASE_API_KEY',
            'VITE_FIREBASE_AUTH_DOMAIN',
            'VITE_FIREBASE_PROJECT_ID',
            'VITE_FIREBASE_STORAGE_BUCKET',
            'VITE_FIREBASE_MESSAGING_SENDER_ID',
            'VITE_FIREBASE_APP_ID',
            'VITE_FIREBASE_VAPID_KEY'
          ].map(key => [`import.meta.env.${key}`, JSON.stringify(process.env[key] || '')])
        )
      },
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.css': 'css',
        '.svg': 'dataurl',
        '.png': 'dataurl',
        '.jpg': 'dataurl'
      }
    });

    const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    const finalHtml = sourceHtml.replace(
      '<script type="module" src="/index.tsx"></script>',
      `<script type="module" src="/assets/${jsBundleName}"></script>`
    );
    fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml, 'utf-8');
    console.log(`⚡ Rebuild completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('❌ Build error:', err);
  } finally {
    isBuilding = false;
  }
}

// Initial bundle
console.log('📦 Performing initial development build...');
await bundleApp();

// Watch directories for changes
const watchDirs = ['components', 'pages', 'lib', 'src'];
watchDirs.forEach(dir => {
  const fullPath = path.join(root, dir);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.css') || filename.endsWith('.json'))) {
        console.log(`🔄 Changed: ${dir}/${filename} -> rebuilding...`);
        bundleApp();
      }
    });
  }
});

// Watch root files
['App.tsx', 'index.tsx', 'index.html', 'types.ts'].forEach(file => {
  const fullPath = path.join(root, file);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, () => {
      console.log(`🔄 Changed: ${file} -> rebuilding...`);
      bundleApp();
    });
  }
});

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);

  // Handle send-email serverless endpoint in dev server
  if (reqPath === '/.netlify/functions/send-email' || reqPath === '/api/send-email') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const gmailUser = process.env.GMAIL_USER || 'accadfarmsapp@gmail.com';
          const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GOOGLE_APP_PASSWORD;
          const replyTo = process.env.MAIL_REPLY_TO || 'info@accadfarms.com';

          // PRIMARY: Resend, signing as accadfarms.com. Mirrors functions/api/send-email.ts so
          // localhost and production exercise the same sender, not two different ones.
          const resendKey = process.env.RESEND_API_KEY;
          const resendFrom = process.env.RESEND_FROM || 'ACCAD FARMS <noreply@send.accadfarms.com>';

          if (resendKey) {
            try {
              const rRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: resendFrom,
                  to: [parsed.to],
                  subject: parsed.subject,
                  ...(parsed.html ? { html: parsed.html } : {}),
                  ...(parsed.text ? { text: parsed.text } : {}),
                  reply_to: replyTo
                })
              });
              const rRaw = await rRes.text();
              if (!rRes.ok) throw new Error(`HTTP ${rRes.status}: ${rRaw.slice(0, 300)}`);
              const rJson = JSON.parse(rRaw);
              if (!rJson?.id) throw new Error(`no message id returned: ${rRaw.slice(0, 200)}`);

              console.log(`\n📧 [Resend] Email accepted as ${resendFrom}`);
              console.log(`   To: ${parsed.to}`);
              console.log(`   Subject: "${parsed.subject}"`);
              console.log(`   Message ID: ${rJson.id}\n`);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                provider: 'resend_accadfarms_domain',
                sender: resendFrom,
                recipient: parsed.to,
                messageId: rJson.id,
                acceptedAt: new Date().toISOString(),
                deliveredAt: new Date().toISOString()
              }));
              return;
            } catch (resendErr) {
              console.warn(`⚠️  [Resend] Failed (${resendErr.message}) - falling back to Gmail SMTP.`);
            }
          }

          if (gmailPass) {
            try {
              const cleanPass = gmailPass.replace(/\s+/g, '');
              const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                  user: gmailUser,
                  pass: cleanPass
                }
              });

              const info = await transporter.sendMail({
                from: `"${parsed.fromName || 'ACCAD FARMS'}" <${gmailUser}>`,
                to: parsed.to,
                replyTo,
                // Minted under accadfarms.com, a domain we actually own. This is not the forged
                // "@gmail.com" identifier that 264d042 removed.
                messageId: `<${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}@accadfarms.com>`,
                envelope: {
                  from: gmailUser,
                  to: parsed.to
                },
                subject: parsed.subject,
                text: parsed.text || '',
                html: parsed.html || '',
                date: new Date()
              });

              console.log(`\n📧 [Google Mail SMTP] Live email dispatched via smtp.gmail.com!`);
              console.log(`   To: ${parsed.to}`);
              console.log(`   From: ${gmailUser}`);
              console.log(`   Subject: "${parsed.subject}"`);
              console.log(`   Message ID: ${info.messageId}`);
              console.log(`   Server Response: ${info.response}\n`);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                provider: 'gmail_smtp',
                sender: gmailUser,
                messageId: info.messageId,
                deliveredAt: new Date().toISOString()
              }));
              return;
            } catch (gmailErr) {
              console.error('❌ [Google Mail SMTP] Error sending via Gmail SMTP:', gmailErr.message);
              // Report the real failure. Never claim delivery we did not achieve: the ED relies on
              // this status to know whether a new staff member actually received their credentials.
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                sender: gmailUser,
                error: `Gmail SMTP rejected the message: ${gmailErr.message}`
              }));
              return;
            }
          }

          // No Gmail app password configured - nothing was actually sent. Say so.
          console.log(`\n📧 [Dev Server Mail Hub] Email NOT sent - no GMAIL_APP_PASSWORD configured:`);
          console.log(`   To: ${parsed.to}`);
          console.log(`   Subject: "${parsed.subject}"`);
          console.log(`   💡 Add GMAIL_APP_PASSWORD in .env to send live emails via smtp.gmail.com\n`);

          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            sender: gmailUser,
            error: 'No GMAIL_APP_PASSWORD configured on this host - email was not sent.'
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // Termii SMS endpoint. Mirrors functions/api/send-sms.ts so localhost exercises the same
  // contract as production.
  if (reqPath === '/api/send-sms') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const to = (parsed.to || '').trim();
          const message = (parsed.message || '').trim();
          const apiKey = process.env.TERMII_API_KEY;
          const senderId = process.env.TERMII_SENDER_ID || 'N-Alert';

          if (!to || !message) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: '"to" and "message" are required' }));
            return;
          }

          if (!apiKey) {
            console.log(`\n📱 [Dev Server SMS Hub] SMS NOT sent - no TERMII_API_KEY configured:`);
            console.log(`   To: ${to}`);
            console.log(`   Message: "${message}"`);
            console.log(`   💡 Add TERMII_API_KEY in .env to send live SMS via Termii\n`);
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'No TERMII_API_KEY configured on this host - SMS was not sent.' }));
            return;
          }

          try {
            const tRes = await fetch('https://api.ng.termii.com/api/sms/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ api_key: apiKey, to, from: senderId, sms: message, type: 'plain', channel: 'generic' })
            });
            const tRaw = await tRes.text();
            let tJson = null;
            try { tJson = tRaw ? JSON.parse(tRaw) : null; } catch {}

            if (tRes.ok && tJson?.message_id) {
              console.log(`\n📱 [Termii] SMS accepted for delivery to ${to} (id ${tJson.message_id})\n`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, provider: 'termii', sender: senderId, recipient: to, messageId: tJson.message_id }));
              return;
            }

            throw new Error(tJson?.message || `Termii rejected the message (HTTP ${tRes.status}): ${tRaw.slice(0, 300)}`);
          } catch (smsErr) {
            console.error('❌ [Termii] Error sending SMS:', smsErr.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: smsErr.message }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // Firebase Cloud Messaging endpoints. Mirrors functions/api/push-register.ts and
  // functions/api/push-send.ts so localhost exercises the same contract as production.
  if (reqPath === '/api/push-register' || reqPath === '/api/push-send') {
    const readBody = () =>
      new Promise(resolve => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
        });
      });

    const insforgeUrl = (process.env.VITE_INSFORGE_URL || 'https://imf45qwi.us-east.insforge.app').replace(/\/+$/, '');
    const insforgeKey = process.env.VITE_INSFORGE_API_KEY || 'ik_56a71ca7e6aa4249545fc5bd8f983c38';
    const dbHeaders = { Authorization: `Bearer ${insforgeKey}`, apikey: insforgeKey, 'Content-Type': 'application/json' };
    const json = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (reqPath === '/api/push-register' && (req.method === 'POST' || req.method === 'DELETE')) {
      const body = await readBody();
      const token = (body.token || '').trim();

      if (req.method === 'DELETE') {
        if (token) {
          await fetch(`${insforgeUrl}/api/database/records/push_tokens?token=eq.${encodeURIComponent(token)}`, {
            method: 'DELETE', headers: dbHeaders
          }).catch(() => {});
        }
        console.log(`🔕 [Push] Device unregistered`);
        return json(200, { success: true });
      }

      const userEmail = (body.userEmail || '').trim().toLowerCase();
      if (!token || !userEmail) return json(400, { success: false, error: 'Both "token" and "userEmail" are required' });

      const now = Date.now();
      const r = await fetch(`${insforgeUrl}/api/database/records/push_tokens`, {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          token, userEmail,
          userId: body.userId || null,
          platform: body.platform || 'web',
          userAgent: (body.userAgent || '').slice(0, 300),
          createdAt: now, lastSeenAt: now
        }])
      }).catch(e => ({ ok: false, status: 0, text: async () => e.message }));

      if (!r.ok) {
        const detail = await r.text().catch(() => '');
        console.warn(`⚠️  [Push] Token registration failed (HTTP ${r.status}): ${detail.slice(0, 200)}`);
        return json(502, { success: false, error: `Could not store device token: ${detail.slice(0, 200)}` });
      }
      console.log(`🔔 [Push] Device registered for ${userEmail}`);
      return json(200, { success: true, registeredAt: new Date(now).toISOString() });
    }

    if (reqPath === '/api/push-send' && req.method === 'POST') {
      const body = await readBody();
      const userEmail = (body.userEmail || '').trim().toLowerCase();
      if (!userEmail) return json(400, { success: false, error: '"userEmail" is required' });

      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log(`🔕 [Push] Skipped for ${userEmail} - FIREBASE_SERVICE_ACCOUNT not set.`);
        return json(200, { success: false, skipped: true, reason: 'Push notifications are not configured on this host' });
      }

      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const tokRes = await fetch(
          `${insforgeUrl}/api/database/records/push_tokens?select=token&userEmail=eq.${encodeURIComponent(userEmail)}`,
          { headers: dbHeaders }
        );
        const rows = tokRes.ok ? await tokRes.json().catch(() => []) : [];
        const tokens = rows.map(r => r.token).filter(Boolean);
        if (!tokens.length) {
          console.log(`🔕 [Push] No registered devices for ${userEmail}`);
          return json(200, { success: true, sent: 0, skipped: true, reason: 'No registered devices for this user' });
        }

        // Same OAuth2 service-account flow as the Worker. Node 24 exposes WebCrypto globally, so
        // the signing code is identical rather than a node:crypto variant that could drift.
        const b64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const nowSec = Math.floor(Date.now() / 1000);
        const unsigned =
          `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.` +
          `${b64url(JSON.stringify({
            iss: sa.client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token',
            iat: nowSec, exp: nowSec + 3600
          }))}`;
        const pem = sa.private_key.replace(/\\n/g, '\n')
          .replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
        const key = await crypto.subtle.importKey(
          'pkcs8', Buffer.from(pem, 'base64'),
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(unsigned));
        const tRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${unsigned}.${b64url(sig)}`
          }).toString()
        });
        const tJson = await tRes.json();
        if (!tJson.access_token) throw new Error(`No access_token: ${JSON.stringify(tJson).slice(0, 200)}`);

        let sent = 0;
        for (const token of tokens) {
          const fRes = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tJson.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: {
                token,
                data: {
                  title: String(body.title || 'ACCAD FARMS'),
                  message: String(body.message || ''),
                  type: String(body.type || 'info'),
                  url: String(body.url || '/notifications'),
                  notificationId: String(body.notificationId || ''),
                  kind: String(body.kind || '')
                },
                webpush: { headers: { Urgency: 'high', TTL: '86400' }, fcmOptions: { link: String(body.url || '/notifications') } }
              }
            })
          });
          if (fRes.ok) { sent++; continue; }
          const detail = await fRes.text().catch(() => '');
          if (fRes.status === 404 || detail.includes('UNREGISTERED') || detail.includes('INVALID_ARGUMENT')) {
            await fetch(`${insforgeUrl}/api/database/records/push_tokens?token=eq.${encodeURIComponent(token)}`, {
              method: 'DELETE', headers: dbHeaders
            }).catch(() => {});
            console.warn(`🧹 [Push] Pruned dead token for ${userEmail}`);
          } else {
            console.warn(`⚠️  [Push] FCM error (HTTP ${fRes.status}): ${detail.slice(0, 200)}`);
          }
        }
        console.log(`🔔 [Push] Delivered to ${sent}/${tokens.length} device(s) for ${userEmail}`);
        return json(200, { success: sent > 0, sent, devices: tokens.length });
      } catch (e) {
        console.error(`❌ [Push] Send failed: ${e.message}`);
        return json(500, { success: false, error: e.message });
      }
    }

    return json(405, { success: false, error: 'Method not allowed' });
  }

  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(distDir, reqPath);

  // Check if file exists in dist
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Check in public dir
    const publicPath = path.join(root, 'public', reqPath);
    if (fs.existsSync(publicPath) && !fs.statSync(publicPath).isDirectory()) {
      filePath = publicPath;
    } else {
      // SPA Fallback
      filePath = path.join(distDir, 'index.html');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
=====================================================
🌾 ACCAD FARMS DEV SERVER RUNNING!
👉 Local:   http://localhost:${PORT}
👉 Network: http://127.0.0.1:${PORT}
=====================================================
`);
});
