-- Functies-schakelaars per organisatie.
--
-- De handigheden uit de septemberronde 2026 komen achter losse
-- schakelaars zodat de app rustig blijft: wie ze niet gebruikt ziet ze niet.
-- Eén JSONB-kolom in plaats van twintig booleans; de sleutels en hun
-- standaardwaarden staan in src/lib/functies.ts. Ontbreekt een sleutel, dan
-- geldt de standaard uit dat bestand, dus een lege {} is een geldige stand.
--
-- Alleen admins mogen dit veld wijzigen: het staat in dezelfde guard als de
-- documentinstellingen (migratie 209/224).

BEGIN;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS functies JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION app_settings_document_velden_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  aanvrager uuid := auth.uid();
  is_admin boolean;
  kolom text;
  beschermde text[] := ARRAY[
    'offerte_prefix','offerte_volgnummer','offerte_geldigheid_dagen',
    'standaard_btw','offerte_intro_tekst','offerte_outro_tekst','offerte_voorwaarden',
    'offerte_levertijd','offerte_betalingsconditie',
    'factuur_prefix','factuur_volgnummer','creditnota_prefix','creditnota_doornummeren',
    'factuur_betaaltermijn_dagen','factuur_voorwaarden','factuur_intro_tekst','factuur_outro_tekst',
    'werkbon_prefix','werkbon_volgnummer','project_prefix',
    'functies'
  ];
BEGIN
  IF aanvrager IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT rol = 'admin' INTO is_admin FROM profiles WHERE id = aanvrager;
    IF NOT COALESCE(is_admin, false) THEN
      RAISE EXCEPTION 'Alleen admins kunnen organisatie-instellingen verwijderen';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.organisatie_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM app_settings WHERE organisatie_id = NEW.organisatie_id
    ) THEN
      SELECT rol = 'admin' INTO is_admin FROM profiles WHERE id = aanvrager;
      IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Alleen admins kunnen een extra instellingen-rij aanmaken';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  FOREACH kolom IN ARRAY beschermde LOOP
    IF (to_jsonb(NEW) -> kolom) IS DISTINCT FROM (to_jsonb(OLD) -> kolom) THEN
      SELECT rol = 'admin' INTO is_admin FROM profiles WHERE id = aanvrager;
      IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Alleen admins kunnen documentinstellingen wijzigen (veld: %)', kolom;
      END IF;
      RETURN NEW;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('234_functies_schakelaars.sql') ON CONFLICT DO NOTHING;
