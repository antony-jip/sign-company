-- ============================================================
-- Migration 124: planning_dag_notities — org-brede dagnotitie
-- Voer dit uit in Supabase SQL Editor.
--
-- Nummering: hoogste bestaande migratie is 123; 124 is vrij.
--
-- Eén korte notitie per kalenderdag, gedeeld binnen de organisatie.
-- Verschijnt boven de weekplanning onder de dag-header, bijvoorbeeld
-- "ZZP'er werkt vandaag". Org-breed: iedereen in de organisatie ziet
-- en bewerkt dezelfde notitie.
--
-- Data-isolatie: org-breed. RLS op organisatie_id volgens migratie-048
-- pattern (auth_organisatie_id()). Nooit user_id voor filtering.
-- UNIQUE(organisatie_id, datum) borgt precies één notitie per dag.
-- ============================================================

CREATE TABLE IF NOT EXISTS planning_dag_notities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  datum TEXT NOT NULL,
  notitie TEXT NOT NULL,
  aangemaakt_door UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organisatie_id, datum)
);

CREATE INDEX IF NOT EXISTS idx_planning_dag_notities_org_datum
  ON planning_dag_notities (organisatie_id, datum);

-- ============================================================
-- ROW LEVEL SECURITY — org-breed (migratie-048 pattern)
-- FOR ALL USING (...) dekt SELECT/INSERT/UPDATE/DELETE.
-- ============================================================

ALTER TABLE planning_dag_notities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage planning_dag_notities" ON planning_dag_notities;
CREATE POLICY "Org members manage planning_dag_notities" ON planning_dag_notities
  FOR ALL USING (organisatie_id = auth_organisatie_id());

-- ============================================================
-- updated_at trigger (hergebruikt bestaande functie)
-- ============================================================

DROP TRIGGER IF EXISTS update_planning_dag_notities_updated_at ON planning_dag_notities;
CREATE TRIGGER update_planning_dag_notities_updated_at
  BEFORE UPDATE ON planning_dag_notities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
