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

-- Kolom-privileges werken alleen als het table-brede SELECT-recht weg is;
-- daarna geven we expliciet alles terug behalve encrypted_app_password.
REVOKE SELECT ON user_email_settings FROM authenticated;

GRANT SELECT (
  id,
  user_id,
  gmail_address,
  smtp_host,
  smtp_port,
  imap_host,
  imap_port,
  is_verified,
  last_sync_at,
  created_at,
  updated_at
) ON user_email_settings TO authenticated;

-- NOG TE DOEN, bewust niet in deze migratie:
-- De `b64:`-rijen blijven bestaan tot iemand zijn wachtwoord opnieuw opslaat.
-- Ze zijn nu niet meer vanuit de browser te lezen, maar staan nog steeds als
-- leesbare tekst in de database. Een eenmalige backfill (service-role: lezen,
-- ontsleutelen met de bestaande 3-weg-logica, opnieuw versleutelen) kan dat
-- oplossen zonder dat een gebruiker iets hoeft te doen. Die stap raakt live
-- credentials en hoort apart en met de hand gedraaid te worden.
