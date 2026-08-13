-- 207: uitnodigingen zichtbaar en intrekbaar voor elke org-admin
--
-- De policy uit 030 was eigenaar-only: een tweede admin zag het tabblad
-- "Uitgenodigd" leeg, kon niets intrekken, en de client-side plekkentelling
-- telde voor hem te laag. Uitnodigen zelf loopt via de service-role-API met
-- een server-side admin-check, dus INSERT hoeft hier niet open; lezen en
-- intrekken (UPDATE) wel. De admin-rol komt uit profiles.rol, dezelfde bron
-- die de backend vertrouwt (173).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'uitnodigingen'
      AND policyname = 'Org admins beheren uitnodigingen'
  ) THEN
    CREATE POLICY "Org admins beheren uitnodigingen"
      ON uitnodigingen FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.organisatie_id = uitnodigingen.organisatie_id
            AND profiles.rol = 'admin'
        )
        -- Eigenaar blijft er altijd bij kunnen, ook als iemand zijn rol ooit
        -- terugzet naar medewerker.
        OR EXISTS (
          SELECT 1 FROM organisaties
          WHERE organisaties.id = uitnodigingen.organisatie_id
            AND organisaties.eigenaar_id = auth.uid()
        )
      );
  END IF;
END $$;

-- De eigenaar-policy mag weg: de eigenaar is admin (085 zet rol='admin' bij
-- org-creatie) en valt dus onder de nieuwe policy. Drop op de 030-naam; een
-- gedrifte variant vangen we niet blind af, dus meet het resultaat hieronder.
DROP POLICY IF EXISTS "Org eigenaar beheert uitnodigingen" ON uitnodigingen;

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'uitnodigingen';
  RAISE NOTICE 'uitnodigingen heeft nu % policies (verwacht: 1)', n;
END $$;

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('207_uitnodigingen_org_admins.sql') ON CONFLICT DO NOTHING;
