-- Firebase Cloud Messaging device registration tokens.
--
-- One row per (user, browser/device). A single staff member legitimately has several: the phone
-- they check in the field, the office desktop, a second browser. All of them should ring, so the
-- primary key is the token itself rather than the user.
--
-- Tokens are not secrets in the way a password is - they authorise sending TO a device, not acting
-- AS the user - but they are still device identifiers, so nothing here is exposed to the client
-- beyond the row a device wrote for itself.
--
-- FCM tokens rotate. A token can be silently replaced by the browser, and one belonging to an
-- uninstalled/cleared browser goes permanently invalid. "lastSeenAt" lets us prune tokens that
-- have not re-registered, and the send path deletes any token FCM reports as UNREGISTERED.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  token        TEXT PRIMARY KEY,
  "userEmail"  TEXT NOT NULL,
  "userId"     TEXT,
  platform     TEXT,
  "userAgent"  TEXT,
  "createdAt"  BIGINT NOT NULL,
  "lastSeenAt" BIGINT NOT NULL
);

-- The send path always looks tokens up by recipient.
CREATE INDEX IF NOT EXISTS push_tokens_email_idx
  ON public.push_tokens (lower("userEmail"));

-- Supports pruning stale registrations.
CREATE INDEX IF NOT EXISTS push_tokens_last_seen_idx
  ON public.push_tokens ("lastSeenAt");
