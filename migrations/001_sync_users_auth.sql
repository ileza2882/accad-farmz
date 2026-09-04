-- Keep public.users (staff directory) and auth.users (login accounts) in lockstep.
--
-- Before this, deleting a staff member removed only the public.users row and left an orphaned
-- login account behind, and a delete made directly in the InsForge dashboard never reached the
-- app. Enforcing it in the database means no client can bypass it.
--
-- Both functions are SECURITY DEFINER so they can reach across schemas, and each guards against
-- the other re-firing: the partner row is already gone inside the same transaction, so the
-- second delete matches zero rows and the cascade terminates.

CREATE OR REPLACE FUNCTION public.sync_delete_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE lower(email) = lower(OLD.email);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_delete_app_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.users WHERE lower(email) = lower(OLD.email);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS users_delete_syncs_auth ON public.users;
CREATE TRIGGER users_delete_syncs_auth
AFTER DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_delete_auth_user();

DROP TRIGGER IF EXISTS auth_users_delete_syncs_app ON auth.users;
CREATE TRIGGER auth_users_delete_syncs_app
AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_delete_app_user();
