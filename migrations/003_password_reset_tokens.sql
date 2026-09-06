-- Self-service password reset tokens.
--
-- Only the SHA-256 HASH of each token is stored. The raw token exists solely in the emailed
-- link. This table is readable by anything holding the anon key, so storing raw tokens would
-- hand out account takeover to any reader; a hash is useless without the original link.
--
-- Tokens are single use ("usedAt") and time limited ("expiresAt").

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id          TEXT PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "expiresAt" BIGINT NOT NULL,
  "usedAt"    BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_hash_idx
  ON public.password_reset_tokens ("tokenHash");

CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx
  ON public.password_reset_tokens (lower("userEmail"), "expiresAt" DESC);
