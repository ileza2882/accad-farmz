# Email deliverability setup

## Why this exists

Staff welcome and password-reset emails were landing in recipients' spam folders. The cause was not
a bug in the sending code — Gmail accepted every message with `250 2.0.0 OK`. The cause was the
sender identity.

The app sent as `accadfarmsapp@gmail.com`, a free consumer Gmail account. SPF and DKIM passed, but
they authenticated **gmail.com**, not us. That has three consequences:

- `accadfarms.com` earns no sending reputation, no matter how much mail we send.
- Our mail is scored alongside every consumer Gmail account on the internet.
- `gmail.com` itself publishes `sp=quarantine`, so Google treats automated mail from consumer
  accounts as inherently suspect.

Add credential-and-login-shaped content sent to people who have never corresponded with the sender,
and the message is structurally indistinguishable from phishing. Filters score it accordingly.

**No configuration guarantees 100% inbox placement.** What this setup achieves is authenticated
sending on a domain we own, with a reputation we control and visibility when delivery does fail.

## Architecture

`lib/emailService.ts` (browser) → `POST /api/send-email` → `functions/api/send-email.ts` (Cloudflare)

The Cloudflare function tries two senders in order:

1. **Resend** (`RESEND_API_KEY` set) — HTTPS API, DKIM-signed as `send.accadfarms.com`.
2. **Gmail SMTPS** — the previous raw-socket path, kept as a fallback so nothing breaks while DNS
   propagates or if Resend has an outage.

`dev-server.mjs` implements the same two-tier order, so localhost and production exercise the same
sender rather than diverging.

Until `RESEND_API_KEY` is set, step 1 is skipped and Gmail carries all mail exactly as before.

## Step 1 — Resend account

1. Sign up at [resend.com](https://resend.com). The free tier is 3,000 emails/month, which is far
   above current volume.
2. **Domains → Add Domain** → enter `send.accadfarms.com`.

Use the `send.` subdomain, not the root. It isolates app sending reputation from the `info@`
mailboxes on Namecheap Private Email — a deliverability problem with automated mail then cannot
damage normal business correspondence.

## Step 2 — Namecheap DNS records

Current DNS for `accadfarms.com` (Namecheap, `dns1/dns2.namecheaphosting.com`):

| Type  | Host      | Value                                                                  |
|-------|-----------|------------------------------------------------------------------------|
| MX    | `@`       | `mx1-hosting.jellyfish.systems` (and mx2, mx3)                          |
| TXT   | `@`       | `v=spf1 +a +mx +ip4:185.61.154.57 include:spf.web-hosting.com ~all`      |
| TXT   | `_dmarc`  | `v=DMARC1; p=none;`                                                     |

**Leave all three alone.** They serve the existing `@accadfarms.com` mailboxes; changing them breaks
normal mail. Add these alongside, in Namecheap → Domain List → Manage → Advanced DNS:

| Type          | Host                        | Value                                          | Priority |
|---------------|-----------------------------|------------------------------------------------|----------|
| TXT           | `send`                      | `v=spf1 include:amazonses.com ~all`            | —        |
| TXT           | `resend._domainkey.send`    | *(the long DKIM key Resend shows you)*         | —        |
| MX            | `send`                      | `feedback-smtp.us-east-1.amazonses.com`        | 10       |

Copy the DKIM value from the Resend dashboard rather than this file — it is unique per account, and
Resend may show a different SES region in the MX record.

Namecheap's Host field is relative, so enter `send`, not `send.accadfarms.com`. Propagation is
usually minutes; Resend will flip the domain to **Verified**.

## Step 3 — Application configuration

Local (`.env`):

```
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=ACCAD FARMS <noreply@send.accadfarms.com>
MAIL_REPLY_TO=info@accadfarms.com
```

Production — Cloudflare dashboard → Pages → **accadfarms** → Settings → Environment variables →
Production. Add the same three. `RESEND_API_KEY` should be created as an **encrypted** variable.

Redeploy (`npm run deploy`) so the function picks them up.

## Step 4 — Verify

```bash
curl -s -X POST https://accadfarms.pages.dev/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","subject":"Deliverability check","text":"test","debug":true}'
```

Expect `"provider":"resend_accadfarms_domain"`. If it says `gmail_smtps_cloudflare` with
`"usedFallback":true`, Resend rejected the request — the `transcript` field carries the reason.

Then open the received message and use **Show original** (Gmail). Confirm:

- `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS` — all three showing `accadfarms.com`, not `gmail.com`
- a `Message-ID` header ending `@accadfarms.com`
- the message is in **Inbox**, not Spam

## Step 5 — Tighten DMARC

Only after a week or two of clean sending. Update the `_dmarc` TXT record in stages, checking the
aggregate reports at each step:

```
v=DMARC1; p=none; rua=mailto:dmarc@accadfarms.com; pct=100     ← start here, collect reports
v=DMARC1; p=quarantine; rua=mailto:dmarc@accadfarms.com        ← once reports are clean
v=DMARC1; p=reject; rua=mailto:dmarc@accadfarms.com            ← final
```

Do not jump straight to `p=reject`. If any legitimate sender is misconfigured, that mail starts
being rejected outright rather than filtered, and you will not find out gently.

Note that `p=reject` on the root domain will make the Gmail fallback path fail DMARC alignment. That
is intended — by then, Resend should be carrying all mail, and the fallback should be removed.

## Content rules

Deliverability is not only DNS. These matter for credential-shaped mail:

- **Never put a password in an email.** Already the case since commit `2d68480`; keep it that way.
- Always send a real `text/plain` part matching the HTML. A missing or stub text part is a spam
  signal.
- Keep a genuine `Message-ID` on a domain we own. Commit `264d042` correctly removed a forged
  `@gmail.com` identifier; the current one uses `accadfarms.com`, which we control.
- Avoid urgency language ("act now", "account will be closed"). Transactional tone only.
- Keep the sending volume steady. A sudden burst from a cold domain looks like a compromised account.

## Operational monitoring

Resend records every send with its delivery state and fires webhooks for bounces and complaints.
Wire those to the audit log so a bounce becomes visible in-app rather than being discovered when a
staff member says they never got their login.

Until that exists, the audit log distinguishes `EMAIL_DISPATCHED_GMAIL` from `EMAIL_DISPATCH_FAILED`
with the real failure reason. Note that both mean *the provider accepted the message*, which is not
the same as it reaching an inbox — only bounce webhooks close that gap.
