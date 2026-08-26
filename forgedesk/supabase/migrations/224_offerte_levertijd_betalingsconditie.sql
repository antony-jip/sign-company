-- Levertijd en betalingsconditie als echte velden op de offerte.
--
-- Tot nu toe stond de levertijd hardcoded als "in overleg" in pdfService en
-- was de betalingsconditie alleen te vinden als losse zin ergens in het vrije
-- voorwaarden-blok. Beide verschillen per offerte, dus krijgen ze een eigen
-- kolom plus een organisatie-standaard in app_settings.
--
-- LET OP: de DEFAULT-teksten hieronder moeten identiek blijven aan
-- DEFAULT_OFFERTE_LEVERTIJD en DEFAULT_OFFERTE_BETALINGSCONDITIE in
-- src/utils/defaults.ts. Bij wijziging beide bestanden updaten.

BEGIN;

ALTER TABLE offertes ADD COLUMN IF NOT EXISTS levertijd text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS betalingsconditie text;

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS offerte_levertijd text DEFAULT 'In overleg';
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS offerte_betalingsconditie text
  DEFAULT 'Betaling binnen 30 dagen na factuurdatum.';

UPDATE app_settings SET offerte_levertijd = 'In overleg'
WHERE offerte_levertijd IS NULL;
UPDATE app_settings SET offerte_betalingsconditie = 'Betaling binnen 30 dagen na factuurdatum.'
WHERE offerte_betalingsconditie IS NULL;

-- De guard uit 209 beschermt org-brede documentvelden tegen niet-admins. De
-- twee nieuwe standaarden horen in datzelfde rijtje, dus de functie krijgt ze
-- erbij. Verder ongewijzigd overgenomen uit 209.
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
    'werkbon_prefix','werkbon_volgnummer','project_prefix'
  ];
BEGIN
  -- service_role / SQL-editor: auth.uid() is NULL, alles toegestaan.
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
      RETURN NEW; -- admin bevestigd; verdere kolommen checken is overbodig
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('224_offerte_levertijd_betalingsconditie.sql') ON CONFLICT DO NOTHING;
