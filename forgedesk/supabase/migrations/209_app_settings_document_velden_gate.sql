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
  nieuw jsonb := to_jsonb(NEW);
  oud jsonb := to_jsonb(OLD);
BEGIN
  -- service_role / SQL-editor: auth.uid() is NULL, alles toegestaan.
  IF aanvrager IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH kolom IN ARRAY beschermde LOOP
    IF (nieuw -> kolom) IS DISTINCT FROM (oud -> kolom) THEN
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
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION app_settings_document_velden_beschermen();

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('209_app_settings_document_velden_gate.sql') ON CONFLICT DO NOTHING;
