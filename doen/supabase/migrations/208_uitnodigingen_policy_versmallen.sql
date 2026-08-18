-- 208: uitnodigingen-policy uit 207 versmallen tot SELECT en UPDATE
--
-- 207 gebruikte FOR ALL, en zonder aparte WITH CHECK geldt de USING-expressie
-- ook voor INSERT. Daarmee kon elke org-admin via PostgREST direct
-- uitnodigingsrijen inserten en zo de server-side plekkentelling tegen
-- organisaties.max_gebruikers in api/invite-team-member.ts omzeilen: de
-- signup-trigger (085) consumeert zo'n rij gewoon, inclusief rol. Lezen en
-- intrekken (UPDATE) is alles wat de client nodig heeft; aanmaken blijft
-- exclusief bij de service-role-API.

BEGIN;

DROP POLICY IF EXISTS "Org admins beheren uitnodigingen" ON uitnodigingen;

DO $$
DECLARE
  expressie text := $expr$
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organisatie_id = uitnodigingen.organisatie_id
        AND profiles.rol = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM organisaties
      WHERE organisaties.id = uitnodigingen.organisatie_id
        AND organisaties.eigenaar_id = auth.uid()
    )
  $expr$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'uitnodigingen'
      AND policyname = 'Org admins lezen uitnodigingen'
  ) THEN
    EXECUTE format('CREATE POLICY "Org admins lezen uitnodigingen" ON uitnodigingen FOR SELECT USING (%s)', expressie);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'uitnodigingen'
      AND policyname = 'Org admins trekken uitnodigingen in'
  ) THEN
    -- WITH CHECK eist status 'ingetrokken': intrekken is de enige toegestane
    -- client-mutatie. Anders kon een admin een verlopen of geaccepteerde rij
    -- heropenen (status terug naar 'verstuurd' met verse verloopt_op) en zo
    -- alsnog om de plekkentelling heen.
    EXECUTE format('CREATE POLICY "Org admins trekken uitnodigingen in" ON uitnodigingen FOR UPDATE USING (%s) WITH CHECK ((%s) AND status = ''ingetrokken'')', expressie, expressie);
  END IF;
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'uitnodigingen';
  RAISE NOTICE 'uitnodigingen heeft nu % policies (verwacht: 2, SELECT en UPDATE)', n;
END $$;

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('208_uitnodigingen_policy_versmallen.sql') ON CONFLICT DO NOTHING;
