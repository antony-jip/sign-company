-- Migration 132: Boekhoudkoppelingen (SnelStart, Moneybird, e-Boekhouden)
--
-- Generieke sync-state op facturen + per-pakket configuratie in app_settings.
-- Eén boekhoudpakket tegelijk actief via app_settings.boekhoud_pakket.
-- Exact Online behoudt zijn eigen exact_*-kolommen en blijft ongewijzigd.
-- Token-velden (snelstart_koppelsleutel, moneybird_api_token,
-- eboekhouden_api_token) worden encrypted opgeslagen via
-- api/save-integration-settings.ts (AES-256-CBC), zoals mollie_api_key.

ALTER TABLE facturen
  ADD COLUMN IF NOT EXISTS boekhoud_pakket TEXT
    CHECK (boekhoud_pakket IN ('snelstart', 'moneybird', 'eboekhouden')),
  ADD COLUMN IF NOT EXISTS boekhoud_extern_id TEXT,
  ADD COLUMN IF NOT EXISTS boekhoud_synced_at TIMESTAMPTZ;

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS boekhoud_pakket TEXT
    CHECK (boekhoud_pakket IN ('snelstart', 'moneybird', 'eboekhouden')),
  -- SnelStart
  ADD COLUMN IF NOT EXISTS snelstart_koppelsleutel TEXT,
  ADD COLUMN IF NOT EXISTS snelstart_grootboek_id TEXT,
  ADD COLUMN IF NOT EXISTS snelstart_grootboek_naam TEXT,
  -- Moneybird
  ADD COLUMN IF NOT EXISTS moneybird_api_token TEXT,
  ADD COLUMN IF NOT EXISTS moneybird_administration_id TEXT,
  ADD COLUMN IF NOT EXISTS moneybird_ledger_account_id TEXT,
  ADD COLUMN IF NOT EXISTS moneybird_tax_rate_hoog TEXT,
  ADD COLUMN IF NOT EXISTS moneybird_tax_rate_laag TEXT,
  ADD COLUMN IF NOT EXISTS moneybird_tax_rate_nul TEXT,
  -- e-Boekhouden
  ADD COLUMN IF NOT EXISTS eboekhouden_api_token TEXT,
  ADD COLUMN IF NOT EXISTS eboekhouden_debiteuren_ledger_id TEXT,
  ADD COLUMN IF NOT EXISTS eboekhouden_omzet_ledger_id TEXT;

COMMENT ON COLUMN facturen.boekhoud_pakket IS
  'Pakket waarnaar deze factuur is gesynchroniseerd (snelstart/moneybird/eboekhouden); NULL = niet gesynct';
COMMENT ON COLUMN facturen.boekhoud_extern_id IS
  'ID van de boeking/factuur in het externe boekhoudpakket';
COMMENT ON COLUMN app_settings.boekhoud_pakket IS
  'Actief boekhoudpakket voor de organisatie (één tegelijk, naast eventueel Exact Online)';
