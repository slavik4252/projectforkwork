/*
# Pin search_path on touch_updated_at trigger function

The advisor reported `public.touch_updated_at` has a role-mutable search_path,
which lets a hostile role hijack function resolution. We recreate the function
with an explicit `search_path = public` so the lookup is fixed.

1. Drop the dependent triggers first (they block DROP FUNCTION).
2. Recreate `touch_updated_at()` with `SET search_path = public`.
3. Recreate the same triggers on leads / chat_sessions / deals.
4. No data changes.
*/

DROP TRIGGER IF EXISTS leads_touch ON leads;
DROP TRIGGER IF EXISTS chat_sessions_touch ON chat_sessions;
DROP TRIGGER IF EXISTS deals_touch ON deals;

DROP FUNCTION IF EXISTS public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER leads_touch BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER chat_sessions_touch BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER deals_touch BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
