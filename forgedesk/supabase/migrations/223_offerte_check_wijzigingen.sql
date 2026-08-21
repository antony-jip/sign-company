-- Offerte-check: collega kan wijzigingen aanvragen met een toelichting.
BEGIN;

ALTER TABLE offertes DROP CONSTRAINT IF EXISTS offertes_check_status_check;
ALTER TABLE offertes ADD CONSTRAINT offertes_check_status_check
  CHECK (check_status IN ('open', 'akkoord', 'verstuurd', 'wijzigingen'));

ALTER TABLE offertes ADD COLUMN IF NOT EXISTS check_reactie text;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('223_offerte_check_wijzigingen.sql') ON CONFLICT DO NOTHING;
