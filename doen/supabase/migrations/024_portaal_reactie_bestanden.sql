-- ============================================================
-- 024: Klantportaal reactie-bestanden koppeling
-- Voeg portaal_reactie_id toe aan portaal_bestanden
-- ============================================================

ALTER TABLE portaal_bestanden ADD COLUMN IF NOT EXISTS portaal_reactie_id UUID REFERENCES portaal_reacties(id) ON DELETE SET NULL;
