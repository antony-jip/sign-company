-- 142_werkbon_project_nummer_unique.sql
-- Nummer-race vangnet voor werkbon- en projectnummers (per organisatie).
-- Zonder deze indexen kan gelijktijdige aanmaak stille duplicaten opleveren.

-- STAP 1 (handmatig eerst draaien): controleer op bestaande duplicaten.
-- Beide queries moeten leeg zijn vóór STAP 2, anders faalt de index-creatie.
--
--   SELECT organisatie_id, werkbon_nummer, COUNT(*)
--   FROM werkbonnen
--   WHERE werkbon_nummer IS NOT NULL AND werkbon_nummer <> ''
--   GROUP BY organisatie_id, werkbon_nummer HAVING COUNT(*) > 1;
--
--   SELECT organisatie_id, project_nummer, COUNT(*)
--   FROM projecten
--   WHERE project_nummer IS NOT NULL AND project_nummer <> ''
--   GROUP BY organisatie_id, project_nummer HAVING COUNT(*) > 1;

-- STAP 2: partiële unique indexen. Geen CONCURRENTLY omdat de Supabase SQL
-- Editor elke query in een transactie draait; non-concurrent build houdt kort
-- een write-lock (verwaarloosbaar voor deze tabelgrootte).
CREATE UNIQUE INDEX IF NOT EXISTS werkbonnen_org_nummer_unique
  ON werkbonnen (organisatie_id, werkbon_nummer)
  WHERE werkbon_nummer IS NOT NULL AND werkbon_nummer <> '';

CREATE UNIQUE INDEX IF NOT EXISTS projecten_org_nummer_unique
  ON projecten (organisatie_id, project_nummer)
  WHERE project_nummer IS NOT NULL AND project_nummer <> '';
