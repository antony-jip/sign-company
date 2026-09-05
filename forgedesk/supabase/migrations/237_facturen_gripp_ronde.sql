-- Facturen en inkoop, Gripp-ronde september 2026.
--
-- 1. Deelfactuur: een factuurregel weet uit welke offerteregel hij komt, zodat
--    "Wat wil je factureren?" per regel kan bijhouden wat al gefactureerd is.
--    Bestaande regels hebben geen koppeling en tellen dus niet mee; dat is
--    eerlijker dan gokken.
-- 2. Leverancier onthouden: betaaltermijn en grootboek op de leverancier, en
--    een echte koppeling van inkoopfactuur naar leverancier (was alleen naam).
-- 3. Referentie van de klant (PO-nummer) op offerte en factuur.

BEGIN;

ALTER TABLE factuur_items ADD COLUMN IF NOT EXISTS offerte_item_id UUID;
CREATE INDEX IF NOT EXISTS idx_factuur_items_offerte_item ON factuur_items (offerte_item_id) WHERE offerte_item_id IS NOT NULL;

ALTER TABLE leveranciers ADD COLUMN IF NOT EXISTS betaaltermijn_dagen INTEGER CHECK (betaaltermijn_dagen IS NULL OR betaaltermijn_dagen >= 0);
ALTER TABLE leveranciers ADD COLUMN IF NOT EXISTS grootboek_code TEXT;

ALTER TABLE inkoopfacturen ADD COLUMN IF NOT EXISTS leverancier_id UUID REFERENCES leveranciers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inkoopfacturen_leverancier ON inkoopfacturen (leverancier_id) WHERE leverancier_id IS NOT NULL;

ALTER TABLE offertes ADD COLUMN IF NOT EXISTS klant_referentie TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS klant_referentie TEXT;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('237_facturen_gripp_ronde.sql') ON CONFLICT DO NOTHING;
