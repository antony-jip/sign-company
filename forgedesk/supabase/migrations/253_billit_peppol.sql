-- Billit als vierde boekhoudpakket en Peppol-status op facturen en klanten.
--
-- Billit is een Belgisch facturatiepakket én een gecertificeerd
-- Peppol-access-point. doen. boekt de factuur in Billit (zelfde patroon als
-- Moneybird: boekhoud_extern_id = Billit OrderID) en laat Billit hem via
-- Peppol afleveren. Tokens komen uit OAuth (Billit staat API-keys alleen toe
-- voor niet-commerciële eigen integraties) en worden versleuteld opgeslagen
-- via api/billit-callback.ts, zoals de Exact-tokens.
--
-- peppol_status op facturen is de afleverstatus; op klanten is het de
-- uitkomst van de laatste registratiecheck (api/billit-peppol-check.ts).

BEGIN;

ALTER TABLE facturen DROP CONSTRAINT IF EXISTS facturen_boekhoud_pakket_check;
ALTER TABLE facturen ADD CONSTRAINT facturen_boekhoud_pakket_check
  CHECK (boekhoud_pakket IS NULL OR boekhoud_pakket IN ('snelstart', 'moneybird', 'eboekhouden', 'billit'));

ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_boekhoud_pakket_check;
ALTER TABLE app_settings ADD CONSTRAINT app_settings_boekhoud_pakket_check
  CHECK (boekhoud_pakket IS NULL OR boekhoud_pakket IN ('snelstart', 'moneybird', 'eboekhouden', 'billit'));

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS billit_access_token TEXT,
  ADD COLUMN IF NOT EXISTS billit_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS billit_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billit_party_id TEXT,
  ADD COLUMN IF NOT EXISTS billit_omgeving TEXT NOT NULL DEFAULT 'productie'
    CHECK (billit_omgeving IN ('sandbox', 'productie')),
  ADD COLUMN IF NOT EXISTS billit_owner_user_id UUID,
  ADD COLUMN IF NOT EXISTS billit_webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS billit_inbox_gesynct_op TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS peppol_verzenden_standaard BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE facturen
  ADD COLUMN IF NOT EXISTS peppol_status TEXT
    CHECK (peppol_status IS NULL OR peppol_status IN ('niet_verzonden', 'in_wachtrij', 'verzonden', 'afgeleverd', 'mislukt')),
  ADD COLUMN IF NOT EXISTS peppol_verzonden_op TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS peppol_fout TEXT,
  ADD COLUMN IF NOT EXISTS peppol_bericht_id TEXT;

ALTER TABLE klanten
  ADD COLUMN IF NOT EXISTS peppol_status TEXT NOT NULL DEFAULT 'onbekend'
    CHECK (peppol_status IN ('onbekend', 'geregistreerd', 'niet_geregistreerd')),
  ADD COLUMN IF NOT EXISTS peppol_gecheckt_op TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS peppol_id TEXT;

ALTER TABLE klanten DROP CONSTRAINT IF EXISTS klanten_verzendvoorkeur_check;
ALTER TABLE klanten ADD CONSTRAINT klanten_verzendvoorkeur_check
  CHECK (verzendvoorkeur IS NULL OR verzendvoorkeur IN ('email', 'post', 'portaal', 'peppol'));

COMMENT ON COLUMN facturen.peppol_status IS 'Afleverstatus via Peppol (Billit); NULL = nooit via Peppol geprobeerd';
COMMENT ON COLUMN klanten.peppol_id IS 'Handmatige Peppol-identifier (schema:nummer); leeg = afgeleid uit btw-/KvK-nummer';
COMMENT ON COLUMN app_settings.billit_webhook_secret IS 'Geheim in de webhook-URL die bij Billit geregistreerd is; api/billit-webhook.ts weigert zonder';

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('253_billit_peppol.sql') ON CONFLICT DO NOTHING;
