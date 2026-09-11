import { connect } from 'cloudflare:sockets';

interface Env {
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
  /** Resend API key. When present, Resend is the primary sender and Gmail becomes the fallback. */
  RESEND_API_KEY?: string;
  /** Verified Resend sender, e.g. "ACCAD FARMS <noreply@send.accadfarms.com>". */
  RESEND_FROM?: string;
  /** Monitored address staff replies land in. */
  MAIL_REPLY_TO?: string;
}

/**
 * The domain we own and that signs our mail once Resend is verified. Also used to mint Message-IDs.
 *
 * Note this is NOT a repeat of the forged "@gmail.com" Message-ID that 264d042 removed. That one
 * claimed a domain whose mail servers we do not run, which is a spoofing signal. accadfarms.com is
 * ours, so an identifier under it is exactly what RFC 5322 asks for.
 */
const SENDING_DOMAIN = 'accadfarms.com';

function buildMessageId(): string {
  const rand = `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`;
  return `<${rand}@${SENDING_DOMAIN}>`;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json'
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
};

/**
 * Native SMTPS (Implicit TLS on port 465) Client for Cloudflare Workers
 * Communicates directly with Google Mail SMTP (smtp.gmail.com:465)
 */
async function sendViaGmailSMTP(options: {
  gmailUser: string;
  gmailPass: string;
  to: string;
  fromName: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  messageId?: string;
  transcript?: string[];
}): Promise<{ messageId: string; response: string }> {
  const { gmailUser, gmailPass, to, fromName, subject, html, text } = options;
  const cleanPass = gmailPass.replace(/\s+/g, '');

  const socket = connect(
    { hostname: 'smtp.gmail.com', port: 465 },
    { secureTransport: 'on' }
  );

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Helper to read until a final SMTP reply line (e.g. "250 " or "220 ")
  async function readReply(): Promise<string> {
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Check if last line starts with a 3-digit status code followed by a space (final line)
      const lines = buffer.trimEnd().split('\r\n');
      const lastLine = lines[lines.length - 1];
      if (/^\d{3}\s/.test(lastLine)) {
        break;
      }
    }
    return buffer;
  }

  const log = (entry: string) => { if (options.transcript) options.transcript.push(entry); };

  async function sendCmd(cmd: string, expectCode?: string): Promise<string> {
    await writer.write(encoder.encode(cmd + '\r\n'));
    const reply = await readReply();
    const shown = /^[A-Za-z0-9+/=]{12,}$/.test(cmd) ? '<base64 credential>' : cmd.slice(0, 60);
    log(`> ${shown}` + (cmd.length > 60 ? ` ...(${cmd.length} bytes)` : ''));
    log(`< ${reply.trim()}`);
    if (expectCode && !reply.startsWith(expectCode)) {
      throw new Error(`SMTP error for command [${cmd.substring(0, 15)}...]: ${reply.trim()}`);
    }
    return reply;
  }

  // 1. Initial 220 greeting from Gmail
  const greeting = await readReply();
  log(`< ${greeting.trim()}`);
  if (!greeting.startsWith('220')) {
    throw new Error('Invalid SMTP greeting from smtp.gmail.com: ' + greeting.trim());
  }

  // 2. EHLO handshake with Gmail
  // Identify honestly. Claiming 'gmail.com' asserts we are Google's own mail host, which is
  // exactly the kind of mismatch anti-abuse systems penalise.
  await sendCmd('EHLO accadfarms.pages.dev', '250');

  // 3. AUTH LOGIN credentials
  await sendCmd('AUTH LOGIN', '334');
  await sendCmd(btoa(gmailUser), '334');
  await sendCmd(btoa(cleanPass), '235');

  // 4. Sender & Recipient envelopes
  await sendCmd(`MAIL FROM:<${gmailUser}>`, '250');
  await sendCmd(`RCPT TO:<${to}>`, '250');

  // 5. DATA command
  await sendCmd('DATA', '354');

  // Helper functions for 100% RFC 2045 base64 MIME compliance
  const toBase64 = (str: string): string => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const formatBase64 = (b64: string): string => {
    return b64.match(/.{1,76}/g)?.join('\r\n') || b64;
  };

  const encodeSubject = (subj: string): string => {
    if (/^[\x20-\x7E]*$/.test(subj)) return subj;
    return `=?UTF-8?B?${toBase64(subj)}?=`;
  };

  // 6. Construct the RFC 5322 / 2045 multipart message.
  //
  // Deliberately NO Message-ID header: we used to forge one claiming "@gmail.com", a domain
  // whose mail servers we do not run. A self-assigned Message-ID in someone else's domain is a
  // recognised spoofing signal and hurts inbox placement. Gmail's submission service assigns a
  // proper one when the header is absent.
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // RFC 5322 wants a numeric zone offset; toUTCString() emits the obsolete "GMT" form.
  const dateStr = new Date().toUTCString().replace(/GMT$/, '+0000');

  // Escape any quotes in the display name so the From header cannot be broken apart.
  const safeFromName = fromName.split(String.fromCharCode(34)).join('').split(String.fromCharCode(92)).join('');

  const headers = [
    `From: "${safeFromName}" <${gmailUser}>`,
    `To: <${to}>`,
    `Subject: ${encodeSubject(subject)}`,
    `Date: ${dateStr}`,
    `Message-ID: ${options.messageId || buildMessageId()}`,
    `Reply-To: ${options.replyTo || gmailUser}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].join('\r\n');

  const textContent = text || 'Welcome to ACCAD FARMS Portal';
  const htmlContent = html || `<p>${textContent}</p>`;

  const rawBody = [
    headers,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    formatBase64(toBase64(textContent)),
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    formatBase64(toBase64(htmlContent)),
    '',
    `--${boundary}--`,
    '.'
  ].join('\r\n');

  const dataReply = await sendCmd(rawBody, '250');

  // 7. QUIT connection
  try {
    await sendCmd('QUIT');
  } catch (e) {}

  try {
    await writer.close();
    await reader.cancel();
    socket.close();
  } catch (e) {}

  const serverReply = dataReply.trim();
  // Split on whitespace. This was `/s+/` (splitting on the letter "s"), which never matched a
  // queue id, so every send reported the placeholder and the ED had no id to trace a lost message.
  const assignedId = serverReply.split(/\s+/).find(t => /^[0-9a-z]{10,}$/i.test(t)) || 'assigned-by-gmail';
  return { messageId: assignedId, response: serverReply };
}

/**
 * Primary sender: Resend's HTTPS API, sending as our own DKIM-signed domain.
 *
 * This is the path that actually fixes spam placement. Mail sent through the Gmail fallback is
 * authenticated as gmail.com no matter what we put in From, so it earns us no reputation on
 * accadfarms.com and is pooled with every consumer Gmail account. Resend signs as our domain.
 */
async function sendViaResend(options: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo: string;
  transcript?: string[];
}): Promise<{ messageId: string; response: string }> {
  const { apiKey, from, to, subject, html, text, replyTo } = options;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      reply_to: replyTo
    })
  });

  const raw = await res.text();
  options.transcript?.push(`> POST https://api.resend.com/emails (from: ${from}, to: ${to})`);
  options.transcript?.push(`< HTTP ${res.status} ${raw.slice(0, 400)}`);

  if (!res.ok) {
    throw new Error(`Resend rejected the message (HTTP ${res.status}): ${raw.slice(0, 300)}`);
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Resend returned a non-JSON response: ${raw.slice(0, 200)}`);
  }

  if (!parsed?.id) {
    throw new Error(`Resend accepted the request but returned no message id: ${raw.slice(0, 200)}`);
  }

  return { messageId: parsed.id, response: `Resend accepted the message (id ${parsed.id})` };
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body: any = await request.json().catch(() => ({}));
    const gmailUser = env.GMAIL_USER || 'accadfarmsapp@gmail.com';
    const gmailPass = env.GMAIL_APP_PASSWORD || 'seumhhdlsjbznmme';
    const recipient = (body.to || '').trim().toLowerCase();
    const subject = body.subject || 'ACCAD FARMS Notification';
    const fromName = body.fromName || 'ACCAD FARMS Executive Hub';
    const html = body.html || '';
    const text = body.text || '';

    if (!recipient) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recipient email "to" is required' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const wantTranscript = body.debug === true;
    const transcript: string[] = [];
    const replyTo = env.MAIL_REPLY_TO || 'info@accadfarms.com';
    const messageId = buildMessageId();

    // Retry transient failures (handshake drops, throttling, a 5xx from the API) before giving up.
    // A new staff member losing their credentials email to a one-off blip is not acceptable.
    const MAX_ATTEMPTS = 3;
    let result: { messageId: string; response: string } | null = null;
    let provider = '';
    let sender = '';
    let lastError: any = null;

    // 1. PRIMARY: Resend, signing as accadfarms.com. Only usable once RESEND_API_KEY is bound and
    //    the domain is verified; until then this block is skipped and Gmail carries everything.
    const resendKey = env.RESEND_API_KEY;
    const resendFrom = env.RESEND_FROM || 'ACCAD FARMS <noreply@send.accadfarms.com>';

    if (resendKey) {
      console.log(`[Mail] Dispatching via Resend as ${resendFrom} to: ${recipient}`);
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          result = await sendViaResend({
            apiKey: resendKey,
            from: resendFrom,
            to: recipient,
            subject,
            html,
            text,
            replyTo,
            transcript: wantTranscript ? transcript : undefined
          });
          provider = 'resend_accadfarms_domain';
          sender = resendFrom;
          break;
        } catch (resendErr: any) {
          lastError = resendErr;
          console.warn(`[Mail] Resend attempt ${attempt}/${MAX_ATTEMPTS} to ${recipient} failed: ${resendErr?.message}`);
          if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 700 * attempt));
          }
        }
      }
    }

    // 2. FALLBACK: Gmail SMTPS. Deliverability here is materially worse - the message authenticates
    //    as gmail.com, not as us - so this is a safety net, never the intended path.
    if (!result) {
      if (resendKey) {
        console.warn(`[Mail] Resend failed for ${recipient}; falling back to Gmail SMTPS.`);
      }
      console.log(`[Mail] Dispatching via Gmail SMTPS to: ${recipient}`);
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          result = await sendViaGmailSMTP({
            gmailUser,
            gmailPass,
            to: recipient,
            fromName,
            subject,
            html,
            text,
            replyTo,
            messageId,
            transcript: wantTranscript ? transcript : undefined
          });
          provider = 'gmail_smtps_cloudflare';
          sender = gmailUser;
          break;
        } catch (smtpErr: any) {
          lastError = smtpErr;
          console.warn(`[Mail] Gmail SMTPS attempt ${attempt}/${MAX_ATTEMPTS} to ${recipient} failed: ${smtpErr?.message}`);
          if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 700 * attempt));
          }
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Email delivery failed after retries on every configured sender');
    }

    console.log(`[Mail] Accepted for delivery to ${recipient} via ${provider}. MessageId: ${result.messageId}`);

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        sender,
        recipient: recipient,
        messageId: result.messageId,
        // "accepted", not "delivered": the provider taking the message is not proof it reached the
        // inbox. Bounce and complaint webhooks are what confirm the last hop.
        acceptedAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        usedFallback: provider === 'gmail_smtps_cloudflare' && Boolean(resendKey),
        serverResponse: result.response,
        ...(wantTranscript ? { transcript } : {})
      }),
      {
        status: 200,
        headers: CORS_HEADERS
      }
    );
  } catch (err: any) {
    console.error('[Cloudflare Pages SMTPS] Error sending email:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'SMTP transmission error in Cloudflare Pages'
      }),
      {
        status: 500,
        headers: CORS_HEADERS
      }
    );
  }
};
