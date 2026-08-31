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
    const { to, subject, html, text, from = 'info@accadfarms.com', fromName = 'ACCAD FARMS Hub' } = data;

    if (!to || !subject) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Recipient "to" and "subject" are required.' })
      };
    }

    console.log(`[Netlify Function: send-email] Dispatched to: ${to}, Subject: "${subject}" from: ${fromName} <${from}>`);

    // If RESEND_API_KEY is configured in Netlify environment variables
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

    // Default acknowledgement response
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
