-- 209: org-brede documentinstellingen alleen door admins te wijzigen
--
-- app_settings is sinds 112 een gedeelde org-rij. Nummerreeksen, prefixen,
-- betaaltermijn en voorwaarden staan daarin; de UI is sinds de 25-users-ronde
-- read-only voor niet-admins, maar de RLS stond elke org-genoot toe om die
-- velden via PostgREST te schrijven. Deze trigger dwingt het server-side af,
-- naar het patroon van de staffel-guard (172): service_role en admins mogen
-- alles, andere leden mogen deze velden niet aanraken. Overige velden
-- (pipeline, follow-up, weergave) blijven vrij: radicaal transparant.
--
-- Vergelijking via to_jsonb zodat een kolom die live (nog) niet bestaat geen
-- fout geeft; de map en de database lopen aantoonbaar uit de pas.

BEGIN;

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
    'factuur_prefix','factuur_volgnummer','creditnota_prefix','creditnota_doornummeren',
    'factuur_betaaltermijn_dagen','factuur_voorwaarden','factuur_intro_tekst','factuur_outro_tekst',
    'werkbon_prefix','werkbon_volgnummer','project_prefix'
  ];
BEGIN
  -- service_role / SQL-editor: auth.uid() is NULL, alles toegestaan.
  IF aanvrager IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- DELETE en heropbouw-INSERT zijn de omweg om de UPDATE-gate heen: een
  -- niet-admin die de org-rij dropt en opnieuw insert zou anders vrij spel
  -- hebben. De allereerste rij per org (onboarding) blijft toegestaan.
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

DROP TRIGGER IF EXISTS app_settings_document_velden_beschermen_trigger ON app_settings;
CREATE TRIGGER app_settings_document_velden_beschermen_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION app_settings_document_velden_beschermen();

-- Verifieer bij het draaien meteen of de één-rij-per-org-index uit 094 live
-- staat (de map loopt uit de pas); zonder die index is een tweede rij ook
-- voor de leeslaag verwarrend:
--   SELECT indexname FROM pg_indexes WHERE tablename = 'app_settings';

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('209_app_settings_document_velden_gate.sql') ON CONFLICT DO NOTHING;
