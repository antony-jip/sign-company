-- 205: kindtabellen van user_id-RLS naar org-RLS
--
-- werkbon_items, werkbon_afbeeldingen, werkbon_regels, werkbon_fotos,
-- project_fotos, offerte_versies en voorraad_mutaties stonden nog op
-- "Users see own data" (user_id = auth.uid()). Binnen een team betekent dat:
-- een werkbon van een collega opent zonder regels en zonder foto's, en
-- voorraadhistorie toont alleen je eigen mutaties. Met 25 gebruikers in één
-- organisatie is dat direct zichtbaar dataverlies.
--
-- De live database heeft op een deel van deze tabellen al een
-- organisatie_id-kolom die in geen enkele migratie voorkomt (drift), dus
-- alles hier is idempotent en kolom-toevoeging is voorwaardelijk.

BEGIN;

-- 1. Kolommen (voorwaardelijk: live bestaan ze deels al)
ALTER TABLE werkbon_items        ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE werkbon_afbeeldingen ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE werkbon_regels       ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE werkbon_fotos        ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE project_fotos        ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE offerte_versies      ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE voorraad_mutaties    ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);

-- 2. Backfill via de parent; restanten via het profiel van de maker.
UPDATE werkbon_items wi SET organisatie_id = w.organisatie_id
  FROM werkbonnen w WHERE wi.werkbon_id = w.id AND wi.organisatie_id IS NULL;
UPDATE werkbon_items wi SET organisatie_id = p.organisatie_id
  FROM profiles p WHERE wi.user_id = p.id AND wi.organisatie_id IS NULL;

-- Na werkbon_items, want de afbeeldingen erven daarvan.
UPDATE werkbon_afbeeldingen wa SET organisatie_id = wi.organisatie_id
  FROM werkbon_items wi WHERE wa.werkbon_item_id = wi.id AND wa.organisatie_id IS NULL;

UPDATE werkbon_regels wr SET organisatie_id = w.organisatie_id
  FROM werkbonnen w WHERE wr.werkbon_id = w.id AND wr.organisatie_id IS NULL;
UPDATE werkbon_regels wr SET organisatie_id = p.organisatie_id
  FROM profiles p WHERE wr.user_id = p.id AND wr.organisatie_id IS NULL;
UPDATE werkbon_fotos wf SET organisatie_id = w.organisatie_id
  FROM werkbonnen w WHERE wf.werkbon_id = w.id AND wf.organisatie_id IS NULL;
UPDATE werkbon_fotos wf SET organisatie_id = p.organisatie_id
  FROM profiles p WHERE wf.user_id = p.id AND wf.organisatie_id IS NULL;

UPDATE project_fotos pf SET organisatie_id = pr.organisatie_id
  FROM projecten pr WHERE pf.project_id = pr.id AND pf.organisatie_id IS NULL;
UPDATE project_fotos pf SET organisatie_id = p.organisatie_id
  FROM profiles p WHERE pf.user_id = p.id AND pf.organisatie_id IS NULL;

UPDATE offerte_versies ov SET organisatie_id = o.organisatie_id
  FROM offertes o WHERE ov.offerte_id = o.id AND ov.organisatie_id IS NULL;
UPDATE offerte_versies ov SET organisatie_id = p.organisatie_id
  FROM profiles p WHERE ov.user_id = p.id AND ov.organisatie_id IS NULL;

UPDATE voorraad_mutaties vm SET organisatie_id = va.organisatie_id
  FROM voorraad_artikelen va WHERE vm.artikel_id = va.id AND vm.organisatie_id IS NULL;
UPDATE voorraad_mutaties vm SET organisatie_id = p.organisatie_id
  FROM profiles p WHERE vm.user_id = p.id AND vm.organisatie_id IS NULL;

-- 2b. Meting: rijen die na beide fallbacks NULL blijven (wees-rijen zonder
-- parent én zonder org op het maker-profiel) worden onder org-RLS alleen nog
-- voor service_role zichtbaar. Dat mag, maar niet stilletjes.
DO $$
DECLARE
  t text;
  n integer;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'werkbon_items','werkbon_afbeeldingen','werkbon_regels','werkbon_fotos',
    'project_fotos','offerte_versies','voorraad_mutaties'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE organisatie_id IS NULL', t) INTO n;
    IF n > 0 THEN
      RAISE WARNING 'Backfill-restant: % rijen met organisatie_id NULL in % (alleen service_role ziet die nog)', n, t;
    END IF;
  END LOOP;
END $$;

-- 3. Default: de client-inserts (werkbonService, offerteService) sturen geen
-- organisatie_id mee; zonder default zou de nieuwe WITH CHECK elke insert
-- weigeren. auth_organisatie_id() is SECURITY DEFINER en STABLE (048).
-- Let op voor toekomstige callpaden: een expliciete organisatie_id: null
-- omzeilt de DEFAULT en strandt op de WITH CHECK, en voor service_role is
-- auth.uid() NULL zodat de DEFAULT ook NULL oplevert; server-side inserts op
-- deze tabellen moeten de organisatie_id dus altijd zelf meesturen.
ALTER TABLE werkbon_items        ALTER COLUMN organisatie_id SET DEFAULT auth_organisatie_id();
ALTER TABLE werkbon_afbeeldingen ALTER COLUMN organisatie_id SET DEFAULT auth_organisatie_id();
ALTER TABLE werkbon_regels       ALTER COLUMN organisatie_id SET DEFAULT auth_organisatie_id();
ALTER TABLE werkbon_fotos        ALTER COLUMN organisatie_id SET DEFAULT auth_organisatie_id();
ALTER TABLE project_fotos        ALTER COLUMN organisatie_id SET DEFAULT auth_organisatie_id();
ALTER TABLE offerte_versies      ALTER COLUMN organisatie_id SET DEFAULT auth_organisatie_id();
ALTER TABLE voorraad_mutaties    ALTER COLUMN organisatie_id SET DEFAULT auth_organisatie_id();

-- 4. Org-policies, zelfde vorm als 048 + de write-lock uit 111 (deze tabellen
-- horen bij kern-entiteiten die bij verlopen abonnement read-only zijn).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'werkbon_items','werkbon_afbeeldingen','werkbon_regels','werkbon_fotos',
    'project_fotos','offerte_versies','voorraad_mutaties'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND policyname = format('Org members manage %s', t)
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL
           USING (organisatie_id = auth_organisatie_id())
           WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief())',
        format('Org members manage %s', t), t
      );
    END IF;
  END LOOP;
END $$;

-- 5. Legacy user_id-policies droppen op de naam die er ECHT staat (patroon
-- 195: lees pg_policies, want DROP op een geraden naam slaagt stil). Alleen
-- droppen als de tabel inmiddels een org-policy heeft.
DO $$
DECLARE
  r record;
  n_org integer;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'werkbon_items','werkbon_afbeeldingen','werkbon_regels','werkbon_fotos',
        'project_fotos','offerte_versies','voorraad_mutaties'
      )
      AND permissive = 'PERMISSIVE'
      -- INSERT-policies hebben qual NULL en alleen een with_check; die moeten
      -- net zo goed weg (denk aan "Users can insert own project_fotos" uit 026).
      AND COALESCE(qual, with_check) LIKE '%user_id%'
      AND COALESCE(qual, '') NOT LIKE '%organisatie_id%'
      AND COALESCE(with_check, '') NOT LIKE '%organisatie_id%'
    ORDER BY tablename, policyname
  LOOP
    SELECT count(*) INTO n_org
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = r.tablename
      AND permissive = 'PERMISSIVE'
      AND (qual LIKE '%organisatie_id%' OR with_check LIKE '%organisatie_id%');

    IF n_org > 0 THEN
      EXECUTE format('DROP POLICY %I ON %I', r.policyname, r.tablename);
      RAISE NOTICE 'Gedropt: % op %', r.policyname, r.tablename;
    ELSE
      RAISE WARNING 'Overgeslagen (geen org-policy aanwezig): % op %', r.policyname, r.tablename;
    END IF;
  END LOOP;
END $$;

-- 6. Elke query filtert voortaan op organisatie_id; de FK-indexen dragen de
-- huidige volumes, maar een directe index is goedkoop en consistent met 048.
CREATE INDEX IF NOT EXISTS idx_werkbon_items_organisatie_id        ON werkbon_items (organisatie_id);
CREATE INDEX IF NOT EXISTS idx_werkbon_afbeeldingen_organisatie_id ON werkbon_afbeeldingen (organisatie_id);
CREATE INDEX IF NOT EXISTS idx_werkbon_regels_organisatie_id       ON werkbon_regels (organisatie_id);
CREATE INDEX IF NOT EXISTS idx_werkbon_fotos_organisatie_id        ON werkbon_fotos (organisatie_id);
CREATE INDEX IF NOT EXISTS idx_project_fotos_organisatie_id        ON project_fotos (organisatie_id);
CREATE INDEX IF NOT EXISTS idx_offerte_versies_organisatie_id      ON offerte_versies (organisatie_id);
CREATE INDEX IF NOT EXISTS idx_voorraad_mutaties_organisatie_id    ON voorraad_mutaties (organisatie_id);

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('205_kindtabellen_org_rls.sql') ON CONFLICT DO NOTHING;
