-- 146_security_definer_search_path.sql
-- Hardening: zet een vaste search_path op de SECURITY DEFINER-functies die er nog
-- geen hadden. Zonder pinned search_path kan een aanroeper die objecten in een
-- eigen schema kan aanmaken de functie potentieel laten resolven naar eigen
-- objecten (standaard Supabase-linter-finding). Gedrag blijft gelijk.
--
-- LET OP: auth_organisatie_id() en auth_abonnement_actief() worden ín RLS-policies
-- aangeroepen door de authenticated-rol; hun EXECUTE-recht blijft dus staan (een
-- REVOKE zou alle org-isolatie breken). We passen hier alleen search_path aan.
-- get_my_portaal_items (056) en check_rate_limit (145) hebben al een search_path.

ALTER FUNCTION auth_organisatie_id() SET search_path = public;
ALTER FUNCTION auth_abonnement_actief() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- handle_new_user is puur een trigger op auth.users; niemand hoort 'm direct aan
-- te roepen. De trigger vuurt onafhankelijk van dit EXECUTE-recht, dus dit kan
-- veilig weg als defense-in-depth.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
