-- Migration 105: offerte_opvolg_schemas + offerte_opvolg_stappen
-- met expliciete org-scoped RLS-policies op alle DML-operaties.
--
-- Achtergrond: deze tabellen bestonden al in productie maar hebben
-- geen migration in deze repo. Een ontbrekende of onjuiste INSERT-policy
-- (RLS-error 42501 bij "Nieuw schema") blokkeerde de offerte-opvolging
-- subtab in de nieuwe Communicatie-supertab. Deze migration is
-- idempotent en kan ook door restores of nieuwe orgs gedraaid worden;
-- bestaande productie-rijen blijven intact.

-- ─── Tabellen ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offerte_opvolg_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  naam text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  actief boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offerte_opvolg_schemas_org
  ON offerte_opvolg_schemas (organisatie_id);

CREATE TABLE IF NOT EXISTS offerte_opvolg_stappen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id uuid NOT NULL REFERENCES offerte_opvolg_schemas(id) ON DELETE CASCADE,
  stap_nummer integer NOT NULL,
  dagen_na_versturen integer NOT NULL,
  actie text NOT NULL CHECK (actie IN ('email_klant', 'melding_intern', 'email_en_melding')),
  onderwerp text NOT NULL DEFAULT '',
  inhoud text NOT NULL DEFAULT '',
  alleen_als_niet_bekeken boolean NOT NULL DEFAULT false,
  alleen_als_niet_gereageerd boolean NOT NULL DEFAULT false,
  actief boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offerte_opvolg_stappen_schema
  ON offerte_opvolg_stappen (schema_id);

-- ─── RLS aanzetten ──────────────────────────────────────────

ALTER TABLE offerte_opvolg_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerte_opvolg_stappen ENABLE ROW LEVEL SECURITY;

-- ─── Policies: offerte_opvolg_schemas ───────────────────────
-- WITH CHECK op INSERT én UPDATE zodat een user de organisatie_id niet
-- naar een andere org kan herschrijven.

DROP POLICY IF EXISTS "Org leden zien opvolg_schemas" ON offerte_opvolg_schemas;
CREATE POLICY "Org leden zien opvolg_schemas"
  ON offerte_opvolg_schemas FOR SELECT
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden maken opvolg_schemas" ON offerte_opvolg_schemas;
CREATE POLICY "Org leden maken opvolg_schemas"
  ON offerte_opvolg_schemas FOR INSERT
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden updaten opvolg_schemas" ON offerte_opvolg_schemas;
CREATE POLICY "Org leden updaten opvolg_schemas"
  ON offerte_opvolg_schemas FOR UPDATE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org leden verwijderen opvolg_schemas" ON offerte_opvolg_schemas;
CREATE POLICY "Org leden verwijderen opvolg_schemas"
  ON offerte_opvolg_schemas FOR DELETE
  USING (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

-- ─── Policies: offerte_opvolg_stappen ───────────────────────
-- Geen FOR ALL: SELECT/INSERT/UPDATE/DELETE expliciet gesplitst, met
-- WITH CHECK op INSERT én UPDATE op schema_id zodat een user geen rij
-- naar een schema van een andere org kan koppelen.

DROP POLICY IF EXISTS "Org leden zien opvolg_stappen" ON offerte_opvolg_stappen;
CREATE POLICY "Org leden zien opvolg_stappen"
  ON offerte_opvolg_stappen FOR SELECT
  USING (
    schema_id IN (
      SELECT id FROM offerte_opvolg_schemas
      WHERE organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org leden maken opvolg_stappen" ON offerte_opvolg_stappen;
CREATE POLICY "Org leden maken opvolg_stappen"
  ON offerte_opvolg_stappen FOR INSERT
  WITH CHECK (
    schema_id IN (
      SELECT id FROM offerte_opvolg_schemas
      WHERE organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org leden updaten opvolg_stappen" ON offerte_opvolg_stappen;
CREATE POLICY "Org leden updaten opvolg_stappen"
  ON offerte_opvolg_stappen FOR UPDATE
  USING (
    schema_id IN (
      SELECT id FROM offerte_opvolg_schemas
      WHERE organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    schema_id IN (
      SELECT id FROM offerte_opvolg_schemas
      WHERE organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org leden verwijderen opvolg_stappen" ON offerte_opvolg_stappen;
CREATE POLICY "Org leden verwijderen opvolg_stappen"
  ON offerte_opvolg_stappen FOR DELETE
  USING (
    schema_id IN (
      SELECT id FROM offerte_opvolg_schemas
      WHERE organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid())
    )
  );
