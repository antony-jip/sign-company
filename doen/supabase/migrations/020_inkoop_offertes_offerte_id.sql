-- Koppel inkoopoffertes aan een specifieke offerte (per offerte uniek)
ALTER TABLE inkoop_offertes
  ADD COLUMN IF NOT EXISTS offerte_id uuid REFERENCES offertes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inkoop_offertes_offerte_id ON inkoop_offertes(offerte_id);
