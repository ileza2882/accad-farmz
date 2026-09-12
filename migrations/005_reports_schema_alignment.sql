-- Align public.reports with the columns the application actually writes.
--
-- Why this exists: every farm log submitted since launch was silently discarded. createReport()
-- sends columns like "email", "fullName", "userId" and "rejectedBy", but the table was created
-- with a different vocabulary ("authorEmail", "author", "authorId", "managerComment", ...).
-- PostgREST rejects an insert naming columns that do not exist, and createReport() logged that
-- rejection to the console and carried on, writing only to the submitter's localStorage. The row
-- therefore never reached the database, so managers and the Executive Director saw an empty
-- review queue and could not approve anything. public.reports was literally empty (0 rows).
--
-- This adds the missing columns rather than renaming the app's fields, because the app's Report
-- model drives real features (resubmission counts, archiving, rejection attribution) that the
-- older column set has nowhere to store. Every statement is additive and nullable, and the table
-- holds no data, so there is nothing to migrate or lose. The legacy columns are left in place;
-- they are unused but harmless.

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "userId"                  TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "email"                   TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "fullName"                TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "isReEntry"               BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "computerName"            TEXT;

-- Epoch-millisecond columns are DOUBLE PRECISION, not INTEGER.
--
-- The InsForge schema API maps its "integer" type to int4, whose ~2.1e9 ceiling cannot hold a
-- Date.now() value (~1.79e12) - an insert carrying one fails outright with "value out of range
-- for type integer", taking the whole row with it. A double stores a millisecond epoch exactly,
-- far inside its 2^53 exact-integer range. The "Ms" suffix distinguishes these from the earlier
-- int4 columns of the same name, which remain in the table unused.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "updatedAtMs"             DOUBLE PRECISION;

-- Rejection trail. rejectedBy/rejectedAt are distinct from the manager/ED approval stamps: a
-- report can carry a manager approval AND a later ED rejection at the same time.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "rejectionReason"         TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "rejectedBy"              TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "rejectedAtMs"            DOUBLE PRECISION;

-- Approval attribution, as the app names it.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "managerApprovedBy"       TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "edApprovedBy"            TEXT;

-- Archiving.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "isArchived"              BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "archivedAtMs"            DOUBLE PRECISION;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "archivedBy"              TEXT;

-- Redo / resubmission tracking. resubmissionCount stays INTEGER - it counts attempts, not epochs.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "isResubmitted"           BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "resubmittedAtMs"         DOUBLE PRECISION;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "resubmissionCount"       INTEGER DEFAULT 0;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "previousRejectionReason" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "redoNotes"               TEXT;

-- The review queues filter on these on every dashboard load.
CREATE INDEX IF NOT EXISTS reports_status_idx     ON public.reports (status, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS reports_department_idx ON public.reports (department, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS reports_author_idx     ON public.reports (lower("email"));
