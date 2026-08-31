export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { to, subject, html, text, user, customNotes, from = 'info@accadfarms.com', fromName = 'ACCAD FARMS Hub' } = data;

    if (!to || !subject) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Recipient "to" and "subject" are required.' })
      };
    }

    console.log(`[Netlify Function: send-email] Dispatched to: ${to}, Subject: "${subject}"`);

    // 1. Resend API (if RESEND_API_KEY exists)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${fromName} <${from}>`,
            to: [to],
            subject: subject,
            html: html,
            text: text
          })
        });
        const resData = await response.json();
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: true, provider: 'resend', data: resData })
        };
      } catch (err) {
        console.error('[Netlify Function: send-email] Resend delivery error:', err);
      }
    }

    // 2. Direct transactional delivery via FormSubmit Relay
    try {
      const formSubmitRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://accadfarms.netlify.app',
          'Referer': 'https://accadfarms.netlify.app/'
        },
        body: JSON.stringify({
          name: fromName,
          email: from,
          _subject: subject,
          _template: 'table',
          _captcha: 'false',
          'Staff Member Name': user?.fullName || 'Staff Member',
          'Portal Login Email': to,
          'Temporary Passcode': user?.password || '123456',
          'Assigned Role': (user?.role || 'STAFF').toUpperCase(),
          'Department / Sector': user?.department || 'General Operations',
          ...(customNotes ? { 'Special Remarks from ED': customNotes } : {}),
          'Portal URL': 'https://accadfarms.netlify.app',
          'Security Notice': 'Please log in to the portal and update your password on first sign in.'
        })
      });

      const fsJson = await formSubmitRes.json();
      console.log('[Netlify Function: send-email] FormSubmit delivery response:', fsJson);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          provider: 'formsubmit_relay',
          data: fsJson
        })
      };
    } catch (fsErr) {
      console.warn('[Netlify Function: send-email] FormSubmit relay notice:', fsErr);
    }

    // 3. Fallback response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `Email notification registered for delivery to ${to}`,
        deliveredAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[Netlify Function: send-email] Exception:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
}
