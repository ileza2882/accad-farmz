# Firebase Cloud Messaging — push notifications

## What this covers, and what it does not

Push reaches a device that has **already opted in**: the staff member opened the portal, granted
notification permission, and we stored their FCM token. It is the right channel for everything that
happens after that point — a report approved, a farm log needing review, a password reset by the ED.

It is **not** a delivery channel for a new account. Someone the ED registered thirty seconds ago has
never opened the app, has granted no permission, and has no token. There is physically nothing to
send to. Welcome credentials go by email — see [EMAIL_SETUP.md](EMAIL_SETUP.md). The two channels
are not interchangeable, and push does not remove the need to fix email deliverability.

Web push also has real platform limits worth knowing before you rely on it:

- **iOS/iPadOS**: only works if the user adds the portal to their Home Screen first. Safari in a
  normal tab cannot receive web push at all.
- **Permission is one-shot.** If a user denies the prompt, the browser will not ask again — they
  have to go into site settings. That is why the opt-in is a button on the Notifications page and
  never fires automatically on load.
- Push is best-effort. The in-app notification row in the database is the durable record.

## Architecture

```
createNotification()  ─┬─→ InsForge `notifications` table   (durable record)
  lib/insforge.ts      ├─→ localStorage                      (offline cache)
                       └─→ POST /api/push-send               (best-effort, not awaited)
                                    │
                                    ├─ look up push_tokens for the recipient
                                    ├─ mint an OAuth2 token from the service account (RS256 JWT)
                                    └─ FCM HTTP v1 → device
                                                      │
                                    public/firebase-messaging-sw.js
                                      ├─ onBackgroundMessage → showNotification
                                      └─ notificationclick   → focus tab, route to /notifications
```

Hooking into `createNotification` means all 14 existing call sites — report submitted, approved,
rejected, user registered, password reset — became push-capable without touching any of them.

The push call is deliberately **not awaited**. Callers await `createNotification`, several from
inside loops, and a push round trip on each would be felt in the UI. The database write is the
record of truth; push is a nudge layered on top and must never delay or fail it.

### Files

| File | Role |
|---|---|
| `lib/pushNotifications.ts` | Client: permission, token, foreground messages, opt-out |
| `public/firebase-messaging-sw.js` | Service worker: background messages, click routing |
| `functions/api/push-register.ts` | Stores/removes a device token |
| `functions/api/push-send.ts` | FCM HTTP v1 sender with service-account auth |
| `migrations/004_push_tokens.sql` | Token table |
| `dev-server.mjs` | Same two endpoints for localhost |

The Firebase SDK is pulled from Google's CDN on demand rather than bundled. `build-wasm.mjs` already
carries hand-written shims for node built-ins, and adding a dependency that reaches for them is a
good way to break the build for a feature that is inert by default. It also means an install with no
Firebase config downloads nothing.

## Setup

### 1. Firebase project

[console.firebase.google.com](https://console.firebase.google.com) → create or select a project.

- **Project settings → General → Your apps → Web** — gives you `apiKey`, `authDomain`, `projectId`,
  `storageBucket`, `messagingSenderId`, `appId`.
- **Project settings → Cloud Messaging → Web Push certificates → Generate key pair** — the public
  key is `VITE_FIREBASE_VAPID_KEY`.
- **Project settings → Service accounts → Generate new private key** — downloads a JSON file. The
  entire contents, as one line, is `FIREBASE_SERVICE_ACCOUNT`.

### 2. Database

Apply `migrations/004_push_tokens.sql` to InsForge.

### 3. Environment

Local `.env` — all seven `VITE_FIREBASE_*` values plus `FIREBASE_SERVICE_ACCOUNT`.

Cloudflare → Pages → **accadfarms** → Settings → Environment variables → Production. The `VITE_*`
ones are read at build time; `FIREBASE_SERVICE_ACCOUNT` is read at request time and must be marked
**encrypted**.

> `FIREBASE_SERVICE_ACCOUNT` must never be given a `VITE_` prefix. Anything with that prefix is
> substituted into the client bundle and served to every visitor. This key can send notifications to
> every device on the project.

### 4. Deploy and verify

```bash
npm run deploy
```

Then, signed in as any user, go to **Notifications** and click **Turn On**. Accept the browser
prompt. Confirm the row landed:

```bash
curl -s "https://imf45qwi.us-east.insforge.app/api/database/records/push_tokens?select=userEmail,platform,lastSeenAt" \
  -H "apikey: $INSFORGE_KEY" -H "Authorization: Bearer $INSFORGE_KEY"
```

Then trigger any notification — submit a farm log, approve a report — and confirm it arrives with
the tab closed.

To test the send path directly:

```bash
curl -s -X POST https://accadfarms.pages.dev/api/push-send \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"you@example.com","title":"Test","message":"Push is working"}'
```

Responses are deliberately non-alarming when there is nothing to do:

| Response | Meaning |
|---|---|
| `{"success":true,"sent":1,"devices":1}` | Delivered |
| `{"success":true,"sent":0,"skipped":true,...}` | User has no registered device — normal |
| `{"success":false,"skipped":true,...}` | `FIREBASE_SERVICE_ACCOUNT` not set — push is off |
| `{"success":false,"error":...}` | A real failure |

## Token hygiene

FCM tokens rotate, and tokens for cleared or uninstalled browsers go permanently invalid.

- `refreshPushRegistration()` runs on every authenticated load in `App.tsx`. It never prompts, and
  it bumps `lastSeenAt` so live devices are distinguishable from abandoned ones.
- The send path deletes any token FCM reports as `UNREGISTERED` or `INVALID_ARGUMENT`. Without that,
  every future send retries dead devices forever and the table fills with garbage.

## Not yet built

- **Delivery receipts.** FCM accepting a message is not proof it was displayed. Same distinction as
  email: the provider taking it is not the last hop.
- **Per-user preferences.** Right now opting in means all notifications. Some staff will want
  approvals only.
- **Pruning job.** Tokens that stop re-registering are never cleaned up on a schedule — only when a
  send fails against them.
