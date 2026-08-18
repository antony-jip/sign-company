-- Mollie betaalintegratie
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS mollie_api_key text,
  ADD COLUMN IF NOT EXISTS mollie_enabled boolean DEFAULT false;

ALTER TABLE facturen
  ADD COLUMN IF NOT EXISTS mollie_payment_id text;
