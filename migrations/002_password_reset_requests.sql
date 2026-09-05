CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id           TEXT PRIMARY KEY,
  "userEmail"  TEXT NOT NULL,
  "userName"   TEXT,
  "userRole"   TEXT,
  department   TEXT,
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  "requestedAt" BIGINT NOT NULL,
  "resolvedAt"  BIGINT
);

CREATE INDEX IF NOT EXISTS password_reset_requests_pending_idx
  ON public.password_reset_requests (status, "requestedAt" DESC);

CREATE INDEX IF NOT EXISTS password_reset_requests_email_idx
  ON public.password_reset_requests (lower("userEmail"));
