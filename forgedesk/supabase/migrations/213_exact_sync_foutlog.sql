-- 213: laatste Exact-sync-fout zichtbaar op de factuur
--
-- Exact-syncfouten bestonden alleen als toast + console.error; na het
-- wegklikken was er niets meer van terug te vinden. Deze twee kolommen
-- bewaren de laatste fout per factuur; een geslaagde sync wist ze.

BEGIN;

ALTER TABLE facturen ADD COLUMN IF NOT EXISTS exact_sync_fout text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS exact_sync_fout_op timestamptz;

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('213_exact_sync_foutlog.sql') ON CONFLICT DO NOTHING;
