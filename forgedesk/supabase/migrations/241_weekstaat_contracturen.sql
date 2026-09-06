-- Weekstaat, uren goedkeuren en contracturen (septemberronde 2026, deel 2).
--
-- 1. Status op de urenregel: concept, definitief (week ingediend), goedgekeurd.
--    Default 'goedgekeurd' zodat bestaande rijen en organisaties zonder
--    goedkeuren (schakelaar uren_goedkeuren uit) niets merken. Staat de
--    schakelaar aan, dan schrijft de app 'concept' en gaat alleen
--    'goedgekeurd' naar de factuur.
-- 2. Guard: alleen admins keuren goed of wijzigen goedgekeurde/gefactureerde uren.
-- 3. Contracturen per medewerker per weekdag. medewerker_id is TEXT, net als
--    planning_afwezigheid: het kan een medewerkers.id zijn of 'profile-<uuid>'
--    voor een teamlid zonder medewerker-record.

BEGIN;

ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'goedgekeurd'
  CHECK (status IN ('concept', 'definitief', 'goedgekeurd'));
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS definitief_op TIMESTAMPTZ;
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS goedgekeurd_door_id UUID;
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS goedgekeurd_op TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_org_status_datum
  ON tijdregistraties (organisatie_id, status, datum);
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_medewerker_datum
  ON tijdregistraties (medewerker_id, datum);

-- Goedkeuren is een beheerdersstap (alleen actief als de organisatie de
-- schakelaar uren_goedkeuren aan heeft). De RLS op tijdregistraties is org-breed,
-- dus zonder guard kan iedere gebruiker zijn eigen uren op 'goedgekeurd'
-- zetten of een goedgekeurde of gefactureerde regel nog aanpassen. Deze
-- trigger laat dat alleen toe voor admins (profiles.rol) en voor service_role
-- (auth.uid() IS NULL). Wijzigen van velden die niets met uren te maken
-- hebben (updated_at, factuur_id, gefactureerd) blijft toegestaan, anders
-- kan factureren goedgekeurde regels niet meer afvinken.
CREATE OR REPLACE FUNCTION tijdregistraties_status_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  aanvrager uuid := auth.uid();
  is_admin boolean;
  goedkeuren_aan boolean;
  org uuid := COALESCE(NEW.organisatie_id, OLD.organisatie_id);
BEGIN
  IF aanvrager IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  -- De guard hoort bij de schakelaar uren_goedkeuren. Staat die uit, dan is
  -- 'goedgekeurd' alleen de standaardwaarde en blijft alles zoals het was.
  SELECT COALESCE((functies->>'uren_goedkeuren')::boolean, false) INTO goedkeuren_aan
  FROM app_settings WHERE organisatie_id = org ORDER BY updated_at DESC LIMIT 1;
  IF NOT COALESCE(goedkeuren_aan, false) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT rol = 'admin' INTO is_admin FROM profiles WHERE id = aanvrager;
  is_admin := COALESCE(is_admin, false);

  IF TG_OP = 'DELETE' THEN
    IF NOT is_admin AND (OLD.status = 'goedgekeurd' OR OLD.gefactureerd = true) THEN
      RAISE EXCEPTION 'Goedgekeurde of gefactureerde uren kan alleen een beheerder verwijderen';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT is_admin THEN
    IF NEW.status = 'goedgekeurd' AND OLD.status IS DISTINCT FROM 'goedgekeurd' THEN
      RAISE EXCEPTION 'Alleen een beheerder kan uren goedkeuren';
    END IF;
    IF (OLD.status = 'goedgekeurd' OR OLD.gefactureerd = true) AND (
      NEW.duur_minuten IS DISTINCT FROM OLD.duur_minuten
      OR NEW.datum IS DISTINCT FROM OLD.datum
      OR NEW.project_id IS DISTINCT FROM OLD.project_id
      OR NEW.urenveld IS DISTINCT FROM OLD.urenveld
      OR NEW.uurtarief IS DISTINCT FROM OLD.uurtarief
      OR NEW.facturabel IS DISTINCT FROM OLD.facturabel
      OR NEW.medewerker_id IS DISTINCT FROM OLD.medewerker_id
      OR (NEW.status IS DISTINCT FROM OLD.status AND OLD.status = 'goedgekeurd')
    ) THEN
      RAISE EXCEPTION 'Goedgekeurde of gefactureerde uren kan alleen een beheerder wijzigen';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tijdregistraties_status_beschermen ON tijdregistraties;
CREATE TRIGGER trg_tijdregistraties_status_beschermen
  BEFORE UPDATE OR DELETE ON tijdregistraties
  FOR EACH ROW EXECUTE FUNCTION tijdregistraties_status_beschermen();

CREATE TABLE IF NOT EXISTS medewerker_contracten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  medewerker_id TEXT NOT NULL,
  geldig_van DATE NOT NULL DEFAULT CURRENT_DATE,
  geldig_tot DATE,
  uren_ma NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_di NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_wo NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_do NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_vr NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_za NUMERIC(4,2) NOT NULL DEFAULT 0,
  uren_zo NUMERIC(4,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (geldig_tot IS NULL OR geldig_tot >= geldig_van)
);
CREATE INDEX IF NOT EXISTS idx_medewerker_contracten_org_mw
  ON medewerker_contracten (organisatie_id, medewerker_id, geldig_van);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_medewerker_contracten_ingang
  ON medewerker_contracten (organisatie_id, medewerker_id, geldig_van);
ALTER TABLE medewerker_contracten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Org members select medewerker_contracten" ON medewerker_contracten FOR SELECT USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members insert medewerker_contracten" ON medewerker_contracten FOR INSERT WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members update medewerker_contracten" ON medewerker_contracten FOR UPDATE USING (organisatie_id = auth_organisatie_id()) WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members delete medewerker_contracten" ON medewerker_contracten FOR DELETE USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('241_weekstaat_contracturen.sql') ON CONFLICT DO NOTHING;
