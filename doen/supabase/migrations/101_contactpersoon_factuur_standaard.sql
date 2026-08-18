-- Mark which contactpersoon receives the invoices for a klant.
-- Resolver at send-time looks up by id in contactpersonen, then in
-- klanten.contactpersonen JSONB, then falls back to klanten.email.
-- contactpersoon_id on facturen intentionally has no FK (it holds
-- either a DB id or a JSONB-side id) -- the drop is a no-op guard.

ALTER TABLE facturen
  DROP CONSTRAINT IF EXISTS facturen_contactpersoon_id_fkey;

ALTER TABLE contactpersonen
  ADD COLUMN IF NOT EXISTS is_factuur_standaard boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS contactpersonen_factuur_standaard_per_klant
  ON contactpersonen(klant_id)
  WHERE is_factuur_standaard;
