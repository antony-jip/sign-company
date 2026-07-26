-- 160_user_email_settings_wachtwoord_kolom_revoke.sql
--
-- Het versleutelde mailwachtwoord hoeft nooit naar de browser. De RLS-policy
-- op user_email_settings is FOR ALL USING (user_id = auth.uid()), dus elke
-- ingelogde gebruiker kan met zijn eigen JWT de hele eigen rij opvragen —
-- inclusief encrypted_app_password. Voor historische rijen die nog met het
-- oude `b64:`-prefix zijn opgeslagen is dat geen versleuteling maar base64,
-- en dus leesbaar na één atob() in de console.
--
-- Een kolom-whitelist in de client houdt dat niet tegen (die kan zelf een
-- query opstellen), dus we beperken het op DB-niveau. Zelfde patroon als
-- migratie 143 voor inkoopfactuur_inbox_config.
--
-- De api/-endpoints en de Trigger.dev-taken lezen de kolom via service_role
-- en worden hier niet door geraakt: die bypassen grants én RLS.
--
-- Geverifieerd: de enige twee client-side reads vragen alleen `id`
--   · src/services/gmailService.ts        .select('id')
--   · src/hooks/useAanDeSlagStatus.ts     .select('id', { head: true })
-- Schrijven gaat volledig via api/email-settings.ts (service_role).
--
-- De kolomlijst wordt uit het schema gelezen in plaats van hier uitgeschreven.
-- Er staan twee conflicterende CREATE TABLE-definities voor deze tabel in de
-- migratiehistorie (001_create_all_tables vs 001_missing_tables) en 004 voegt
-- IMAP-kolommen toe met IF NOT EXISTS, dus welke kolommen een omgeving
-- werkelijk heeft verschilt per database. Een hardgecodeerde lijst faalt dan
-- op de ene omgeving en klopt op de andere.

DO $$
DECLARE
  kolommen text;
BEGIN
  -- Kolom-privileges werken alleen als het table-brede SELECT-recht weg is;
  -- daarna geven we expliciet alles terug behalve het wachtwoord.
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO kolommen
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'user_email_settings'
     AND column_name <> 'encrypted_app_password';

  IF kolommen IS NULL THEN
    RAISE EXCEPTION 'Tabel public.user_email_settings niet gevonden';
  END IF;

  EXECUTE 'REVOKE SELECT ON public.user_email_settings FROM authenticated';
  EXECUTE format(
    'GRANT SELECT (%s) ON public.user_email_settings TO authenticated',
    kolommen
  );
END $$;

-- Controle: encrypted_app_password mag hier NIET tussen staan.
--   SELECT column_name FROM information_schema.column_privileges
--    WHERE table_name = 'user_email_settings'
--      AND grantee = 'authenticated' AND privilege_type = 'SELECT'
--    ORDER BY column_name;

-- LET OP bij nieuwe kolommen: een kolom die later wordt toegevoegd erft geen
-- grant, want het table-brede SELECT is ingetrokken. Voeg je een kolom toe aan
-- deze tabel, draai dan dit blok opnieuw — het is idempotent.

-- NOG TE DOEN, bewust niet in deze migratie:
-- De `b64:`-rijen blijven bestaan tot iemand zijn wachtwoord opnieuw opslaat.
-- Ze zijn nu niet meer vanuit de browser te lezen, maar staan nog steeds als
-- leesbare tekst in de database. Een eenmalige backfill (service-role: lezen,
-- ontsleutelen met de bestaande 3-weg-logica, opnieuw versleutelen) kan dat
-- oplossen zonder dat een gebruiker iets hoeft te doen. Die stap raakt live
-- credentials en hoort apart en met de hand gedraaid te worden.
