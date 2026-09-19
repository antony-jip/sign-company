-- Belgische factuurvereisten en btw-nummercontrole.
--
-- rpr_rechtbank: een Belgische factuur moet naast het ondernemingsnummer de
-- rechtspersonenregister-vermelding dragen ("RPR Antwerpen, afdeling
-- Antwerpen", WVV art. 2:20). Vrije tekst, alleen getoond als hij gevuld is.
--
-- btw_nummer_gevalideerd_op: moment waarop het btw-nummer via VIES geldig is
-- bevonden (api/vies-check.ts). Btw-verlegging op het doen.-abonnement
-- vereist een gevalideerd nummer; op klanten is het informatief.

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rpr_rechtbank TEXT,
  ADD COLUMN IF NOT EXISTS btw_nummer_gevalideerd_op TIMESTAMPTZ;

ALTER TABLE klanten
  ADD COLUMN IF NOT EXISTS btw_nummer_gevalideerd_op TIMESTAMPTZ;

COMMENT ON COLUMN profiles.rpr_rechtbank IS 'Belgische RPR-vermelding voor op de factuur, bv. "RPR Antwerpen, afdeling Antwerpen"';
COMMENT ON COLUMN profiles.btw_nummer_gevalideerd_op IS 'Laatste geslaagde VIES-controle van btw_nummer; NULL = niet gecontroleerd';

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('255_be_facturatie_vies.sql') ON CONFLICT DO NOTHING;
