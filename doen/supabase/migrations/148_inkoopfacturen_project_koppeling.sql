-- 148_inkoopfacturen_project_koppeling.sql
-- Inkoopfacturen koppelbaar aan een project. Bij goedkeuring stroomt de
-- koppeling door naar de aangemaakte uitgave (uitgaven.project_id), zodat
-- de factuur als kost in het project en de nacalculatie verschijnt. Wordt
-- de koppeling ná goedkeuring gewijzigd, dan werkt de app de uitgave bij.

ALTER TABLE inkoopfacturen
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projecten(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inkoopfacturen_project_id
  ON inkoopfacturen(project_id) WHERE project_id IS NOT NULL;
