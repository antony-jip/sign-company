-- 113: werkbon_afbeeldingen.grootte — per-image PDF size selector
--
-- Voegt een grootte-kolom toe aan werkbon_afbeeldingen zodat een monteur
-- per afbeelding kan kiezen hoe groot 'ie in de werkbon-PDF wordt
-- gerenderd: 'klein' (≈⅓ body-breedte), 'normaal' (≈½, default), 'groot'
-- (volle body-breedte, gecapt op 130mm hoogte).
--
-- Default 'normaal' = huidig render-gedrag, dus geen regressie op
-- bestaande rows. RLS dekt al via 'Users see own data' (zie migration
-- 022); geen policy-wijzigingen nodig.
--
-- Idempotent (re-runnable).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'werkbon_afbeeldingen'
      AND column_name = 'grootte'
  ) THEN
    ALTER TABLE public.werkbon_afbeeldingen
      ADD COLUMN grootte TEXT NOT NULL DEFAULT 'normaal'
        CHECK (grootte IN ('klein', 'normaal', 'groot'));
  END IF;
END $$;

COMMIT;
