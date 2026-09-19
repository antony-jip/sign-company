-- Billit koppelen met eigen credentials van de organisatie, zoals bij Exact.
--
-- Twee routes naast de partner-OAuth van doen. (env BILLIT_CLIENT_ID):
--  1. billit_api_key: de API-key uit de eigen Billit-instellingen, samen met
--     het Party ID. Werkt direct, zonder aanvraag bij Billit. Billit bedoelt
--     API-keys voor eigen integraties; voor een pilot/demo bruikbaar, op
--     termijn vervangen door OAuth.
--  2. billit_client_id/secret: eigen OAuth-app van de organisatie
--     (aangevraagd bij Billit-support), gebruikt door api/billit-auth.ts en
--     api/billit-callback.ts in plaats van de env-credentials.
-- Beide secrets versleuteld via api/save-integration-settings.ts.

BEGIN;

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS billit_api_key TEXT,
  ADD COLUMN IF NOT EXISTS billit_client_id TEXT,
  ADD COLUMN IF NOT EXISTS billit_client_secret TEXT;

COMMENT ON COLUMN app_settings.billit_api_key IS 'Versleutelde Billit API-key van de organisatie (apikey-header); leeg = OAuth-tokens gebruiken';

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('256_billit_eigen_credentials.sql') ON CONFLICT DO NOTHING;
