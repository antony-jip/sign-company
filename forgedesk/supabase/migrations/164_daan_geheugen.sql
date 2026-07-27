-- ============================================================
-- Migration 164: Daan-geheugen (fase 1)
--
-- Twee lagen onder de AI-endpoints:
--   ai_conventies  · hoe dit bedrijf werkt, door mensen vastgesteld,
--                    read-only voor agents, gaat compleet mee in prompts.
--   ai_geheugen    · observaties uit gebruik, per onderwerp (klant/
--                    project/leverancier/algemeen). Een agent schrijft
--                    status 'waargenomen'; alleen 'actief' gaat mee in
--                    prompts. 'voorgesteld' en ronde_id zijn er alvast
--                    voor de nachtelijke consolidatie (fase 2).
--
-- Plus één RPC daan_context() zodat alle api/-endpoints (die wegens de
-- Vercel-regel geen helpers kunnen delen) dezelfde contextlogica uit de
-- database halen in plaats van elk hun eigen kopie.
--
-- LET OP: nummer 164 vóór het draaien verifiëren tegen schema_migrations
-- in productie (repo-hoogste is 163; het 093/094-conflict niet herhalen).
-- ============================================================

-- 1 · Conventies ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_conventies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL DEFAULT 'algemeen'
    CHECK (categorie IN ('verkoop', 'communicatie', 'facturatie', 'uitvoering', 'algemeen')),
  -- Kort en imperatief: dit gaat woordelijk in elk systeemblok, dus de
  -- lengte-cap beschermt het promptbudget van de organisatie.
  inhoud TEXT NOT NULL CHECK (LENGTH(inhoud) <= 300),
  -- Uitzetten zonder verwijderen: een agent kan er eerder naar hebben
  -- verwezen in verstuurde output.
  actief BOOLEAN NOT NULL DEFAULT true,
  bron TEXT NOT NULL DEFAULT 'handmatig'
    CHECK (bron IN ('handmatig', 'uit_onboarding', 'gepromoveerd_uit_geheugen')),
  -- Bij tegenstrijdige regels wint de laagste volgorde; zonder rangorde
  -- gaat het model gokken.
  volgorde INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_conventies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_conventies' AND policyname = 'Org members manage ai_conventies'
  ) THEN
    CREATE POLICY "Org members manage ai_conventies" ON ai_conventies
      FOR ALL USING (organisatie_id = auth_organisatie_id())
      WITH CHECK (organisatie_id = auth_organisatie_id());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_conventies_org_actief
  ON ai_conventies(organisatie_id, volgorde) WHERE actief;

-- 2 · Geheugen -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_geheugen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  -- NULL = gedeeld binnen de organisatie; ingevuld = persoonlijk
  -- werkgeheugen van die gebruiker.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  onderwerp_type TEXT NOT NULL
    CHECK (onderwerp_type IN ('klant', 'project', 'leverancier', 'algemeen')),
  onderwerp_id UUID,
  -- Eén observatie per rij; samengestelde regels kun je later niet
  -- gericht intrekken.
  inhoud TEXT NOT NULL CHECK (LENGTH(inhoud) <= 300),
  -- Alleen 'actief' gaat mee in prompts. Een agent schrijft 'waargenomen';
  -- 'voorgesteld' is gereserveerd voor de nachtelijke consolidatie
  -- (fase 2), de gebruiker maakt actief of wijst af.
  status TEXT NOT NULL DEFAULT 'waargenomen'
    CHECK (status IN ('waargenomen', 'voorgesteld', 'actief', 'afgewezen', 'verlopen')),
  -- Welk endpoint dit schreef; zonder herkomst is een ontsporende agent
  -- niet terug te draaien.
  agent TEXT NOT NULL,
  -- Verwijzing naar waar de observatie vandaan komt (mail-id, gesprek,
  -- werkbon), vorm vrij per agent.
  bewijs JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Scheidt een patroon van eenmalig toeval en voedt later verval.
  bevestigd_aantal INTEGER NOT NULL DEFAULT 1,
  laatst_bevestigd_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Fase 2: alles uit dezelfde consolidatieronde deelt één ronde_id,
  -- zodat een nacht in één keer aangenomen of weggegooid kan worden.
  ronde_id UUID,
  -- Wijst naar de rij die dit voorstel vervangt, zodat opruimen zichtbaar
  -- blijft in plaats van stil.
  vervangt UUID REFERENCES ai_geheugen(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_geheugen ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_geheugen' AND policyname = 'Org members manage ai_geheugen'
  ) THEN
    CREATE POLICY "Org members manage ai_geheugen" ON ai_geheugen
      FOR ALL USING (organisatie_id = auth_organisatie_id())
      WITH CHECK (organisatie_id = auth_organisatie_id());
  END IF;
END $$;

-- De twee hete paden: statusfilter (prompts en klantkaart) en
-- onderwerp-ophaal (context per klant).
CREATE INDEX IF NOT EXISTS idx_ai_geheugen_org_status
  ON ai_geheugen(organisatie_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_geheugen_onderwerp
  ON ai_geheugen(organisatie_id, onderwerp_type, onderwerp_id);

-- 3 · RPC daan_context ---------------------------------------------------
-- Eén plek voor de promptcontext van alle AI-endpoints. Bewust in de
-- database: api/-bestanden zijn standalone (geen gedeelde helpers), dus
-- centralisatie kan alleen hier. Alleen service-role roept dit aan; de
-- frontend leest de tabellen rechtstreeks via RLS.

CREATE OR REPLACE FUNCTION daan_context(
  p_organisatie_id UUID,
  p_klant_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'bedrijfscontext', COALESCE((
      SELECT forgie_bedrijfscontext FROM app_settings
      WHERE organisatie_id = p_organisatie_id
      ORDER BY updated_at DESC LIMIT 1
    ), ''),
    'schrijfstijl', COALESCE((
      SELECT ai_tone_of_voice FROM app_settings
      WHERE organisatie_id = p_organisatie_id
      ORDER BY updated_at DESC LIMIT 1
    ), ''),
    'conventies', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('categorie', c.categorie, 'inhoud', c.inhoud)
                       ORDER BY c.volgorde, c.created_at)
      FROM (
        SELECT categorie, inhoud, volgorde, created_at
        FROM ai_conventies
        WHERE organisatie_id = p_organisatie_id AND actief
        ORDER BY volgorde, created_at
        LIMIT 25
      ) c
    ), '[]'::jsonb),
    'geheugen', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'onderwerp_type', g.onderwerp_type,
               'onderwerp_id', g.onderwerp_id,
               'inhoud', g.inhoud)
             ORDER BY g.laatst_bevestigd_op DESC)
      FROM (
        SELECT onderwerp_type, onderwerp_id, inhoud, laatst_bevestigd_op
        FROM ai_geheugen
        WHERE organisatie_id = p_organisatie_id
          AND status = 'actief'
          AND (user_id IS NULL OR user_id = p_user_id)
          AND (
            onderwerp_type = 'algemeen'
            OR (p_klant_id IS NOT NULL AND onderwerp_type = 'klant' AND onderwerp_id = p_klant_id)
          )
        ORDER BY laatst_bevestigd_op DESC
        LIMIT 30
      ) g
    ), '[]'::jsonb)
  )
$$;

-- Postgres geeft nieuwe functies standaard EXECUTE aan PUBLIC; deze is
-- alleen voor service-role (zelfde afweging als migratie 154).
REVOKE EXECUTE ON FUNCTION daan_context(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
