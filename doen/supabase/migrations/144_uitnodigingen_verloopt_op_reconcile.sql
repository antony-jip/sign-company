-- 144_uitnodigingen_verloopt_op_reconcile.sql
-- Reconciliatie: de live DB heeft kolom `uitnodigingen.verloopt_op` (bevestigd),
-- terwijl migratie 030 nog `expires_at` definieert. De kolom is ooit handmatig
-- hernoemd; de default reisde mogelijk mee. handle_new_user (085) matcht een
-- uitnodiging alleen als `verloopt_op > NOW()`, dus een NULL betekent dat de
-- invite nooit matcht en de gebruiker een eigen org krijgt i.p.v. te joinen.
--
-- Deze migratie borgt de expiry op DB-niveau (idempotent) los van de app-code,
-- die verloopt_op nu ook expliciet zet.

-- 1. Kolom garanderen (voor omgevingen waar de handmatige rename niet draaide).
ALTER TABLE uitnodigingen
  ADD COLUMN IF NOT EXISTS verloopt_op TIMESTAMPTZ;

-- 2. Default vastzetten zodat toekomstige inserts zonder waarde tóch verlopen.
ALTER TABLE uitnodigingen
  ALTER COLUMN verloopt_op SET DEFAULT (NOW() + INTERVAL '7 days');

-- 3. Backfill: bestaande rijen zonder expiry krijgen er alsnog één op basis van
--    hun aanmaakmoment (anders blijven ze eeuwig "niet-matchend").
UPDATE uitnodigingen
SET verloopt_op = COALESCE(created_at, NOW()) + INTERVAL '7 days'
WHERE verloopt_op IS NULL;
