-- De VIES-stempel (profiles.btw_nummer_gevalideerd_op, migratie 255) is de
-- poort naar 0% btw op het doen.-abonnement. profiles is via RLS door de
-- eigenaar zelf te schrijven, dus zonder deze guard kan iemand de stempel
-- zetten zonder VIES. Zelfde mechaniek als migratie 173/179: niet gooien
-- maar stil terugzetten; alleen service_role (api/vies-check.ts) zet hem, en
-- een ander btw-nummer wist hem server-side.
--
-- btw_nummer_vies_naam bewaart de naam die VIES teruggaf: bewijs bij een
-- naheffing dat doen. redelijk gecontroleerd heeft, en zichtbaar naast de
-- bedrijfsnaam zodat een evidente mismatch opvalt.

BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS btw_nummer_vies_naam TEXT;

CREATE OR REPLACE FUNCTION profiles_rol_en_org_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.organisatie_id := NULL;
    NEW.rol := 'medewerker';
    NEW.btw_nummer_gevalideerd_op := NULL;
    NEW.btw_nummer_vies_naam := NULL;
    RETURN NEW;
  END IF;

  NEW.rol := OLD.rol;
  NEW.organisatie_id := OLD.organisatie_id;
  NEW.btw_nummer_gevalideerd_op := OLD.btw_nummer_gevalideerd_op;
  NEW.btw_nummer_vies_naam := OLD.btw_nummer_vies_naam;
  IF NEW.btw_nummer IS DISTINCT FROM OLD.btw_nummer THEN
    NEW.btw_nummer_gevalideerd_op := NULL;
    NEW.btw_nummer_vies_naam := NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('257_btw_validatie_beschermen.sql') ON CONFLICT DO NOTHING;
