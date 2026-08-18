-- ============================================================
-- 135: Website-chat — live chat vanaf signcompany.nl
--
-- Bezoekers van signcompany.nl kunnen chatten als er iemand in
-- doen. online is; anders valt de widget terug op het
-- aanvraagformulier (website_aanvragen, migratie 134).
--
-- Drie tabellen:
--   website_chat_gesprekken   : één per chatsessie van een bezoeker
--   website_chat_berichten    : losse berichten in een gesprek
--   website_chat_aanwezigheid : heartbeat + handmatige toggle per org
--
-- Schrijven vanaf de website gebeurt via service-role API-routes op
-- het website-project (/api/chat-live); die bypassen RLS. De policies
-- hieronder gelden voor de app-kant (reads, antwoorden, realtime).
-- bezoeker_token is het geheim waarmee de bezoeker zijn eigen gesprek
-- pollt; dat token blijft server-side op het website-project en komt
-- nooit in app-queries terecht.
--
-- Hergebruikt auth_organisatie_id() uit migratie 048.
-- ============================================================

-- ── Tabellen ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS website_chat_gesprekken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  bezoeker_token UUID NOT NULL DEFAULT gen_random_uuid(),
  naam TEXT,
  email TEXT,
  telefoon TEXT,
  pagina_url TEXT,
  ip_adres TEXT,
  browser TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'gesloten')),
  laatste_bericht_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  team_laatst_gelezen_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR telefoon IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS website_chat_berichten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gesprek_id UUID NOT NULL REFERENCES website_chat_gesprekken(id) ON DELETE CASCADE,
  organisatie_id UUID NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('bezoeker', 'team')),
  medewerker_id UUID REFERENCES profiles(id),
  tekst TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_chat_aanwezigheid (
  organisatie_id UUID PRIMARY KEY,
  laatst_actief TIMESTAMPTZ NOT NULL DEFAULT now(),
  beschikbaar BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexen ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_website_chat_gesprekken_org
  ON website_chat_gesprekken (organisatie_id, status, laatste_bericht_op DESC);

CREATE INDEX IF NOT EXISTS idx_website_chat_berichten_gesprek
  ON website_chat_berichten (gesprek_id, created_at);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE website_chat_gesprekken ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_chat_berichten ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_chat_aanwezigheid ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'website_chat_gesprekken' AND policyname = 'Org members manage website_chat_gesprekken'
  ) THEN
    CREATE POLICY "Org members manage website_chat_gesprekken" ON website_chat_gesprekken
      FOR ALL USING (organisatie_id = auth_organisatie_id())
      WITH CHECK (organisatie_id = auth_organisatie_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'website_chat_berichten' AND policyname = 'Org members manage website_chat_berichten'
  ) THEN
    -- naast de org-kolom ook het gesprek zelf checken: een org-lid kan zo
    -- nooit een bericht onder een gesprek van een andere org hangen
    CREATE POLICY "Org members manage website_chat_berichten" ON website_chat_berichten
      FOR ALL USING (
        organisatie_id = auth_organisatie_id()
        AND gesprek_id IN (
          SELECT id FROM website_chat_gesprekken
          WHERE organisatie_id = auth_organisatie_id()
        )
      )
      WITH CHECK (
        organisatie_id = auth_organisatie_id()
        AND gesprek_id IN (
          SELECT id FROM website_chat_gesprekken
          WHERE organisatie_id = auth_organisatie_id()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'website_chat_aanwezigheid' AND policyname = 'Org members manage website_chat_aanwezigheid'
  ) THEN
    CREATE POLICY "Org members manage website_chat_aanwezigheid" ON website_chat_aanwezigheid
      FOR ALL USING (organisatie_id = auth_organisatie_id())
      WITH CHECK (organisatie_id = auth_organisatie_id());
  END IF;
END $$;

-- ── Realtime ────────────────────────────────────────────────
-- Alleen berichten streamen: de gesprekken-rij bevat bezoeker_token en
-- blijft daarom buiten de publication. Elk nieuw gesprek heeft direct
-- een eerste bericht, dus de inbox ververst alsnog realtime; status-
-- wijzigingen vangt de 30s-poll in de chat-tab op.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE website_chat_berichten;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
