-- 216: Interne check van een offerte door een collega
--
-- Een gebruiker kan een offerte "laten checken": een collega uit dezelfde
-- organisatie krijgt melding + mail, en kan de offerte goedkeuren of zelf
-- versturen. Dit is een TWEEDE as naast de klantstatus (offertes.status):
-- de klant-as blijft ongemoeid, dus geen botsing met de pipeline-filters.
--
-- check_status: NULL = geen check, 'open' = wacht op collega,
-- 'akkoord' = collega heeft goedgekeurd, 'verstuurd' = collega (of iemand
-- anders) heeft de offerte verstuurd terwijl de check open stond.
--
-- Alle schrijfacties lopen via api/offerte-check-vragen.ts en
-- api/offerte-check-reactie.ts (service_role), omdat de notificatie voor de
-- collega niet vanuit de client kan (notificaties-RLS is user_id-only).

BEGIN;

ALTER TABLE offertes
  ADD COLUMN IF NOT EXISTS check_status text CHECK (check_status IN ('open', 'akkoord', 'verstuurd')),
  ADD COLUMN IF NOT EXISTS check_gevraagd_aan uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS check_gevraagd_door uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS check_gevraagd_op timestamptz,
  ADD COLUMN IF NOT EXISTS check_notitie text,
  ADD COLUMN IF NOT EXISTS check_afgehandeld_op timestamptz;

COMMENT ON COLUMN offertes.check_status IS
  'Interne collega-check: NULL geen check, open wacht op collega, akkoord goedgekeurd, verstuurd afgerond doordat de offerte is verstuurd.';
COMMENT ON COLUMN offertes.check_gevraagd_aan IS
  'Collega (profiles.id) aan wie de check is gevraagd.';
COMMENT ON COLUMN offertes.check_gevraagd_door IS
  'Aanvrager (profiles.id) van de check; krijgt melding zodra de check is afgehandeld.';

-- Partieel: alleen open checks zijn interessant om op te zoeken, en dat is
-- een kleine minderheid van de rijen.
CREATE INDEX IF NOT EXISTS offertes_check_open_idx
  ON offertes (check_gevraagd_aan)
  WHERE check_status = 'open';

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('216_offerte_check.sql') ON CONFLICT DO NOTHING;
