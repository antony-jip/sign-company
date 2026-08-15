-- 214: restpunten uit de zes-lenzen-reviewronde op de facturatie-keten
--
-- 1. facturen.exact_sync_gestart_op: claim-kolom voor de Exact-sync. De
--    idempotency-guard in exact-sync-factuur.ts was check-then-act: twee
--    gelijktijdige syncs (twee tabs/collega's) passeerden beide de guard en
--    boekten de factuur dubbel in Exact. De route claimt nu eerst
--    conditioneel deze kolom (WHERE exact_entry_id IS NULL AND
--    (claim IS NULL OR verlopen)) en weigert de tweede aanroep.
-- 2. INSERT-policy op factuur_opvolg_log: de handmatige herinnerings-flows
--    in de UI moeten ook in het bewijs-log kunnen schrijven (voorheen
--    service-role-only, waardoor handmatige verzendingen onherleidbaar
--    waren). Org-leden kunnen daarmee theoretisch logregels toevoegen;
--    dat is binnen een org acceptabel, het log is geen security-boundary.

BEGIN;

ALTER TABLE facturen ADD COLUMN IF NOT EXISTS exact_sync_gestart_op timestamptz;

-- 3. btw_percentage zonder schaalbeperking. De migratiemap spreekt zichzelf
--    tegen (schema.sql/001_missing_tables: DECIMAL(5,2); 001_create_all_tables:
--    kale NUMERIC). Een (5,2)-kolom zou een gewogen mengtarief (bv. 20,9952)
--    stil naar 21,00 quantiseren, waarmee het bedrag verschuift en een
--    mengvorm als zuiver 21% langs de sync-guard glipt. Kale numeric maakt
--    de opslag verliesvrij; op een al-kale kolom is dit een no-op.
ALTER TABLE factuur_items ALTER COLUMN btw_percentage TYPE numeric;
ALTER TABLE offerte_items ALTER COLUMN btw_percentage TYPE numeric;

DROP POLICY IF EXISTS "factuur_opvolg_log_org_insert" ON factuur_opvolg_log;
CREATE POLICY "factuur_opvolg_log_org_insert" ON factuur_opvolg_log FOR INSERT
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('214_facturatie_reviewronde.sql') ON CONFLICT DO NOTHING;
