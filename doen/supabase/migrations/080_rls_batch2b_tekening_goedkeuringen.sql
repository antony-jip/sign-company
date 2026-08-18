BEGIN;

-- Drop de permissive public policy.
-- Publieke flow werkt al via api/portaal-get.ts +
-- api/goedkeuring-reactie.ts met SERVICE_ROLE (bypass RLS).
-- Admin flow is gedekt door "Users can view own" (user_id = auth.uid()).
DROP POLICY IF EXISTS "Public can view by token" ON public.tekening_goedkeuringen;

COMMIT;
