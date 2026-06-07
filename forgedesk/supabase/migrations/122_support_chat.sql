-- ============================================================
-- 122: Support-chat (cross-tenant)
--
-- Klanten sturen vanuit de app een bericht naar doen.-support.
-- Berichten landen in een admin-inbox bij de doen. / Sign Company org.
--
-- Twee tabellen:
--   support_gesprekken : één per klant-org (open/afgerond)
--   support_berichten  : losse berichten in een gesprek
--
-- RLS:
--   - Klant ziet/schrijft alleen gesprekken van de eigen organisatie
--   - Admin-org (ce6843e3-5cd9-4043-9461-55071bc91eb7) ziet/schrijft alles
--
-- Schrijven gebeurt in de praktijk via service-role API routes
-- (support-bericht.ts / support-inbox.ts) die RLS bypassen. De policies
-- hieronder gelden voor directe client-reads en de realtime-stream.
--
-- Hergebruikt de bestaande helper auth_organisatie_id() uit migratie 048.
-- ============================================================

-- ── Tabellen ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_gesprekken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  org_naam TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'afgerond')),
  aangemaakt_op TIMESTAMPTZ DEFAULT now(),
  laatste_bericht_op TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_berichten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gesprek_id UUID NOT NULL REFERENCES support_gesprekken(id) ON DELETE CASCADE,
  afzender TEXT NOT NULL CHECK (afzender IN ('klant', 'admin')),
  bericht TEXT NOT NULL,
  aangemaakt_op TIMESTAMPTZ DEFAULT now(),
  medewerker_id UUID REFERENCES profiles(id)
);

-- ── Indexen ─────────────────────────────────────────────────

-- Inbox-sortering en per-org lookup van het open gesprek
CREATE INDEX IF NOT EXISTS idx_support_gesprekken_org
  ON support_gesprekken (organisatie_id);
CREATE INDEX IF NOT EXISTS idx_support_gesprekken_laatste_bericht
  ON support_gesprekken (laatste_bericht_op DESC);

-- Thread ophalen per gesprek
CREATE INDEX IF NOT EXISTS idx_support_berichten_gesprek
  ON support_berichten (gesprek_id, aangemaakt_op);

-- ── RLS: support_gesprekken ─────────────────────────────────

ALTER TABLE support_gesprekken ENABLE ROW LEVEL SECURITY;

-- Klant: alleen eigen organisatie
CREATE POLICY "Klant beheert eigen support_gesprekken" ON support_gesprekken
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id());

-- Admin-org: alles
CREATE POLICY "Admin org beheert alle support_gesprekken" ON support_gesprekken
  FOR ALL
  USING (auth_organisatie_id() = 'ce6843e3-5cd9-4043-9461-55071bc91eb7')
  WITH CHECK (auth_organisatie_id() = 'ce6843e3-5cd9-4043-9461-55071bc91eb7');

-- ── RLS: support_berichten ──────────────────────────────────

ALTER TABLE support_berichten ENABLE ROW LEVEL SECURITY;

-- Klant: berichten van gesprekken van de eigen organisatie
CREATE POLICY "Klant beheert eigen support_berichten" ON support_berichten
  FOR ALL
  USING (
    gesprek_id IN (
      SELECT id FROM support_gesprekken
      WHERE organisatie_id = auth_organisatie_id()
    )
  )
  WITH CHECK (
    gesprek_id IN (
      SELECT id FROM support_gesprekken
      WHERE organisatie_id = auth_organisatie_id()
    )
  );

-- Admin-org: alles
CREATE POLICY "Admin org beheert alle support_berichten" ON support_berichten
  FOR ALL
  USING (auth_organisatie_id() = 'ce6843e3-5cd9-4043-9461-55071bc91eb7')
  WITH CHECK (auth_organisatie_id() = 'ce6843e3-5cd9-4043-9461-55071bc91eb7');

-- ── Realtime ────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE support_gesprekken;
ALTER PUBLICATION supabase_realtime ADD TABLE support_berichten;
