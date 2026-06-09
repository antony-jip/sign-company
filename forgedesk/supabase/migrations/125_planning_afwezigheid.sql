-- ============================================================
-- Migration 125: planning_afwezigheid — afwezigheid & structureel vrij
-- Voer dit uit in Supabase SQL Editor.
--
-- Nummering: hoogste bestaande migratie is 124; 125 is vrij.
--
-- Twee tabellen, org-breed (migratie-048 / 124 pattern, auth_organisatie_id()):
--   1. planning_vrij_patronen — terugkerend wekelijks vrij per monteur.
--      vrije_dagen = bitmask (bit0=ma ... bit6=zo). Permanent = bounds NULL,
--      tijdelijk = geldig_van/geldig_tot gezet (bv. parttime deze zomer).
--      Meerdere rijen per monteur mogen; de resolver OR't de masks.
--   2. planning_afwezigheid — datumbereik-afwezigheid (vakantie/ziek/
--      bijzonder/eenmalig vrij) per monteur. start/eind inclusief.
--
-- Data-isolatie: org-breed. RLS op organisatie_id. Nooit user_id voor
-- filtering. CASCADE ruimt rijen op als organisatie of medewerker verdwijnt.
-- ============================================================

CREATE TABLE IF NOT EXISTS planning_vrij_patronen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  vrije_dagen SMALLINT NOT NULL DEFAULT 0,   -- bitmask ma..zo (bit0..bit6)
  geldig_van TEXT,                            -- NULL = permanent vanaf altijd
  geldig_tot TEXT,                            -- NULL = permanent tot altijd
  opmerking TEXT,
  aangemaakt_door UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_vrij_patronen_org_mw
  ON planning_vrij_patronen (organisatie_id, medewerker_id);

CREATE TABLE IF NOT EXISTS planning_afwezigheid (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  medewerker_id UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vakantie',      -- 'vakantie'|'ziek'|'bijzonder'|'vrij'
  start_datum TEXT NOT NULL,                   -- YYYY-MM-DD, inclusief
  eind_datum TEXT NOT NULL,                    -- YYYY-MM-DD, inclusief
  opmerking TEXT,
  aangemaakt_door UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_afwezigheid_org_mw_datum
  ON planning_afwezigheid (organisatie_id, medewerker_id, start_datum, eind_datum);

-- ============================================================
-- ROW LEVEL SECURITY — org-breed (migratie-048 pattern)
-- FOR ALL USING (...) dekt SELECT/INSERT/UPDATE/DELETE.
-- ============================================================

ALTER TABLE planning_vrij_patronen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage planning_vrij_patronen" ON planning_vrij_patronen;
CREATE POLICY "Org members manage planning_vrij_patronen" ON planning_vrij_patronen
  FOR ALL USING (organisatie_id = auth_organisatie_id());

ALTER TABLE planning_afwezigheid ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage planning_afwezigheid" ON planning_afwezigheid;
CREATE POLICY "Org members manage planning_afwezigheid" ON planning_afwezigheid
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- ============================================================
-- updated_at triggers (hergebruikt bestaande functie)
-- ============================================================

DROP TRIGGER IF EXISTS update_planning_vrij_patronen_updated_at ON planning_vrij_patronen;
CREATE TRIGGER update_planning_vrij_patronen_updated_at
  BEFORE UPDATE ON planning_vrij_patronen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_planning_afwezigheid_updated_at ON planning_afwezigheid;
CREATE TRIGGER update_planning_afwezigheid_updated_at
  BEFORE UPDATE ON planning_afwezigheid
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
