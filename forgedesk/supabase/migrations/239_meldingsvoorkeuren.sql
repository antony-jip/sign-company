-- Meldingen, septemberronde 2026.
--
-- Meldingsvoorkeuren per persoon op profiles: per categorie of hij in de app
-- en als push komt. Leeg object = alles aan, dus bestaande gebruikers merken
-- niets. Sleutels en standaarden in src/lib/meldingsvoorkeuren.ts.
-- notificaties.type is vrije tekst; 'genoemd' (collega noemen met @),
-- 'uren_herinnering' en 'conceptfacturen_klaar' komen erbij zonder CHECK.

BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meldingsvoorkeuren JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('239_meldingsvoorkeuren.sql') ON CONFLICT DO NOTHING;
