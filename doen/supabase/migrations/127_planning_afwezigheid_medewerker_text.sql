-- ============================================================
-- Migration 127: planning afwezigheid — medewerker_id naar TEXT
-- Voer dit uit in Supabase SQL Editor.
--
-- De planning gebruikt voor teamleden zonder eigen medewerkers-rij een id
-- als 'profile-<uuid>' (getMedewerkers voegt medewerkers + profiles samen,
-- net als montage_afspraken.monteurs TEXT[]). Een UUID-kolom met FK naar
-- medewerkers weigert die ids. Daarom: TEXT, zonder FK — gelijk aan hoe
-- montage_afspraken de monteurs opslaat. Org-isolatie blijft via
-- organisatie_id + RLS.
-- ============================================================

ALTER TABLE planning_vrij_patronen DROP CONSTRAINT IF EXISTS planning_vrij_patronen_medewerker_id_fkey;
ALTER TABLE planning_vrij_patronen ALTER COLUMN medewerker_id TYPE TEXT USING medewerker_id::text;

ALTER TABLE planning_afwezigheid DROP CONSTRAINT IF EXISTS planning_afwezigheid_medewerker_id_fkey;
ALTER TABLE planning_afwezigheid ALTER COLUMN medewerker_id TYPE TEXT USING medewerker_id::text;
