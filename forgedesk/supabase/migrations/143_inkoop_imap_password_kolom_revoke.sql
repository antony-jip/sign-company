-- 143_inkoop_imap_password_kolom_revoke.sql
-- Het versleutelde IMAP-wachtwoord van de inkoop-inbox hoeft nooit naar de
-- browser. De RLS-policy "Org members manage inbox config" (FOR ALL) laat elk
-- org-lid via de eigen JWT de hele rij lezen, inclusief imap_password_encrypted.
-- Een client-side kolom-whitelist houdt een kwaadwillend org-lid niet tegen
-- (die kan zelf een query maken), dus we beperken het op DB-niveau met een
-- kolom-grant. Trigger.dev (service_role) leest de kolom gewoon door.

-- Kolom-privileges werken alleen als het table-brede SELECT-recht weg is;
-- daarna geven we expliciet alle kolommen behalve imap_password_encrypted terug.
REVOKE SELECT ON inkoopfactuur_inbox_config FROM authenticated;

GRANT SELECT (
  id,
  organisatie_id,
  imap_host,
  imap_port,
  imap_user,
  gmail_label,
  actief,
  laatst_gecheckt_op,
  laatste_uid,
  laatste_error,
  created_at,
  updated_at
) ON inkoopfactuur_inbox_config TO authenticated;
