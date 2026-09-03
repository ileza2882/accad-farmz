import { connect } from 'cloudflare:sockets';

interface Env {
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
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

  async function sendCmd(cmd: string, expectCode?: string): Promise<string> {
    await writer.write(encoder.encode(cmd + '\r\n'));
    const reply = await readReply();
    if (expectCode && !reply.startsWith(expectCode)) {
      throw new Error(`SMTP error for command [${cmd.substring(0, 15)}...]: ${reply.trim()}`);
    }
    return reply;
  }

  // 1. Initial 220 greeting from Gmail
  const greeting = await readReply();
  if (!greeting.startsWith('220')) {
    throw new Error('Invalid SMTP greeting from smtp.gmail.com: ' + greeting.trim());
  }

  // 2. EHLO handshake
  await sendCmd('EHLO localhost', '250');

  // 3. AUTH LOGIN credentials
  await sendCmd('AUTH LOGIN', '334');
  await sendCmd(btoa(gmailUser), '334');
  await sendCmd(btoa(cleanPass), '235');

  // 4. Sender & Recipient envelopes
  await sendCmd(`MAIL FROM:<${gmailUser}>`, '250');
  await sendCmd(`RCPT TO:<${to}>`, '250');

  // 5. DATA command
  await sendCmd('DATA', '354');

  // 6. Construct RFC 2822 multipart email
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@accadfarms.pages.dev>`;
  const dateStr = new Date().toUTCString();

  const headers = [
    `From: "${fromName}" <${gmailUser}>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `Date: ${dateStr}`,
    `Message-ID: ${messageId}`,
    `Reply-To: ${gmailUser}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].join('\r\n');

  const rawBody = [
    headers,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    '',
    text || '',
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    '',
    html || '',
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

  return { messageId, response: dataReply.trim() };
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

    console.log(`[Cloudflare Pages SMTPS] Dispatching real email to: ${recipient}`);

    const result = await sendViaGmailSMTP({
      gmailUser,
      gmailPass,
      to: recipient,
      fromName,
      subject,
      html,
      text
    });

    console.log(`[Cloudflare Pages SMTPS] Success! Delivered to ${recipient}. MessageId: ${result.messageId}`);

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'gmail_smtps_cloudflare',
        sender: gmailUser,
        recipient: recipient,
        messageId: result.messageId,
        deliveredAt: new Date().toISOString(),
        serverResponse: result.response
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
