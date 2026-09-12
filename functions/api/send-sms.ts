interface Env {
  TERMII_API_KEY?: string;
  /** Registered Termii Sender ID. Falls back to Termii's shared "N-Alert" ID, which works
   * without registration but is less recognizable to recipients than a custom brand ID. */
  TERMII_SENDER_ID?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json'
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body: any = await request.json().catch(() => ({}));
    const to = (body.to || '').trim();
    const message = (body.message || '').trim();

    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recipient phone number "to" is required' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMS "message" body is required' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const apiKey = env.TERMII_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'TERMII_API_KEY is not configured on this host' }),
        { status: 503, headers: CORS_HEADERS }
      );
    }

    const senderId = env.TERMII_SENDER_ID || 'N-Alert';

    const MAX_ATTEMPTS = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            to,
            from: senderId,
            sms: message,
            type: 'plain',
            channel: 'generic'
          })
        });

        const raw = await res.text();
        let parsed: any = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          parsed = null;
        }

        // Termii answers 200 with a message_id on success; an error payload otherwise, still
        // sometimes with HTTP 200. Treat "no message_id" as a failure, never as delivered.
        if (res.ok && parsed?.message_id) {
          return new Response(
            JSON.stringify({
              success: true,
              provider: 'termii',
              sender: senderId,
              recipient: to,
              messageId: parsed.message_id,
              balance: parsed.balance,
              acceptedAt: new Date().toISOString()
            }),
            { status: 200, headers: CORS_HEADERS }
          );
        }

        lastError = new Error(
          parsed?.message || `Termii rejected the message (HTTP ${res.status}): ${raw.slice(0, 300)}`
        );
      } catch (e: any) {
        lastError = e;
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 700 * attempt));
      }
    }

    throw lastError || new Error('SMS delivery failed after retries');
  } catch (err: any) {
    console.error('[Termii SMS] Error sending SMS:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'SMS transmission error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
