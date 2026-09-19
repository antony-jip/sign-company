-- Inkomende Peppol-facturen (via Billit) landen in de bestaande
-- inkoopfacturen-reviewflow. bron onderscheidt ze van de mailbox-route;
-- billit_order_id is de idempotentiesleutel zodat webhook én cron dezelfde
-- order nooit twee keer inlezen.

BEGIN;

ALTER TABLE inkoopfacturen
  ADD COLUMN IF NOT EXISTS bron TEXT NOT NULL DEFAULT 'email'
    CHECK (bron IN ('email', 'peppol', 'upload')),
  ADD COLUMN IF NOT EXISTS billit_order_id TEXT,
  ADD COLUMN IF NOT EXISTS ubl_storage_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inkoopfacturen_billit_order
  ON inkoopfacturen (organisatie_id, billit_order_id)
  WHERE billit_order_id IS NOT NULL;

COMMENT ON COLUMN inkoopfacturen.bron IS 'email = mailbox-sync, peppol = ontvangen via Billit/Peppol, upload = handmatig';
COMMENT ON COLUMN inkoopfacturen.ubl_storage_path IS 'Originele UBL-XML uit Peppol in storage.inkoopfacturen; de PDF ernaast is door doen. gerenderd';

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('254_inkoopfacturen_peppol_bron.sql') ON CONFLICT DO NOTHING;
