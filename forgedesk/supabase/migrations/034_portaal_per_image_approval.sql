-- Per-afbeelding goedkeuring voor drukproeven
-- Wanneer portaal_bestand_id NULL is: reactie op het hele item (offerte signing)
-- Wanneer gevuld: reactie op specifieke afbeelding (drukproeven)

ALTER TABLE portaal_reacties
  ADD COLUMN IF NOT EXISTS portaal_bestand_id UUID REFERENCES portaal_bestanden(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portaal_reacties_bestand
  ON portaal_reacties(portaal_bestand_id) WHERE portaal_bestand_id IS NOT NULL;
