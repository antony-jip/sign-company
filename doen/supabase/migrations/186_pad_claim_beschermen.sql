-- 186_pad_claim_beschermen.sql
--
-- Sluit het gat dat de securityreview vond in api/bestand.
--
-- HET PROBLEEM. api/bestand autoriseert met de vraag "noemt een rij in mijn
-- organisatie dit pad?". Dat leek een databasecontrole, maar documenten.
-- storage_path is een vrij tekstveld dat elk lid mag schrijven: de RLS van 048
-- staat een INSERT toe zolang organisatie_id je eigen organisatie is, en zegt
-- niets over de padwaarde.
--
-- Dus kon een lid van bedrijf X een rij aanmaken met het storage-pad van
-- bedrijf Y, /api/bestand aanroepen, een ondertekende link van een dag krijgen
-- en de rij daarna weer weggooien. De controle bewees bezit van het PAD, niet
-- recht op het BESTAND. En paden zijn niet geheim: tot vandaag stonden ze als
-- publieke URL in portalen, in mail en in de browsergeschiedenis van klanten.
--
-- DE OPLOSSING. Je mag een pad niet claimen dat al aan een andere organisatie
-- toebehoort. Dat is een regel over data, dus hij hoort in de database en niet
-- in een endpoint dat iemand later kan omzeilen.
--
-- Dit maakt de fabricage-aanval onmogelijk voor elk pad dat al ergens is
-- vastgelegd. Een pad dat in geen enkele tabel staat blijft claimbaar; dat zijn
-- de wezen, en daar hangt per definitie geen andermans data aan.

BEGIN;

CREATE OR REPLACE FUNCTION pad_claim_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  pad text;
  vreemde_org uuid;
BEGIN
  pad := NEW.storage_path;
  IF pad IS NULL OR btrim(pad) = '' THEN
    RETURN NEW;
  END IF;

  -- Ongewijzigd pad bij een UPDATE hoeft niet opnieuw getoetst.
  IF TG_OP = 'UPDATE' AND NEW.storage_path IS NOT DISTINCT FROM OLD.storage_path THEN
    RETURN NEW;
  END IF;

  SELECT organisatie_id INTO vreemde_org FROM (
    SELECT organisatie_id FROM documenten
      WHERE storage_path = pad AND id IS DISTINCT FROM NEW.id
    UNION ALL
    SELECT organisatie_id FROM portaal_bestanden WHERE url = pad OR thumbnail_url = pad
    UNION ALL
    SELECT organisatie_id FROM portaal_items WHERE foto_url = pad
    UNION ALL
    SELECT organisatie_id FROM werkbon_afbeeldingen WHERE url = pad
    UNION ALL
    SELECT organisatie_id FROM offerte_items WHERE foto_url = pad OR bijlage_url = pad
    UNION ALL
    SELECT organisatie_id FROM signing_visualisaties
      WHERE gebouw_foto_url = pad OR resultaat_url = pad OR logo_url = pad
  ) AS bestaand
  WHERE organisatie_id IS NOT NULL
    AND organisatie_id IS DISTINCT FROM NEW.organisatie_id
  LIMIT 1;

  IF vreemde_org IS NOT NULL THEN
    RAISE EXCEPTION 'Dit bestandspad hoort bij een andere organisatie';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documenten_pad_claim ON documenten;
CREATE TRIGGER documenten_pad_claim
  BEFORE INSERT OR UPDATE ON documenten
  FOR EACH ROW EXECUTE FUNCTION pad_claim_beschermen();

COMMIT;

-- Controle: bestaande rijen mogen niet in de weg zitten. Dit hoort 0 te geven,
-- anders zou een gewone update op zo'n rij voortaan gooien.
--   SELECT d.id, d.naam FROM documenten d
--    WHERE EXISTS (
--      SELECT 1 FROM werkbon_afbeeldingen w
--       WHERE w.url = d.storage_path
--         AND w.organisatie_id IS DISTINCT FROM d.organisatie_id);
--
-- Terugdraaien:
--   DROP TRIGGER IF EXISTS documenten_pad_claim ON documenten;
--   DROP FUNCTION IF EXISTS pad_claim_beschermen();
