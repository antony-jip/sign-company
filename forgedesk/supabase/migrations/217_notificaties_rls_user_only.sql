-- 217: notificaties-RLS hard terug naar user-only
--
-- Geconstateerd op 17 aug 2026: ingelogd als gebruiker A geeft een SELECT op
-- notificaties de rijen van collega B terug ("Taak voor jou"-meldingen van
-- Yvonne verschenen in de bel van Antony). De migratiemap kent alleen
-- user_id-policies (001), dus de live database heeft een ruimere policy die
-- nergens in de map staat. Policies zijn OR-gestapeld: één rekkelijke erbij
-- maakt de strikte betekenisloos.
--
-- Daarom niet droppen op naam (die kennen we niet), maar introspectief: alle
-- bestaande policies op de tabel weg en de vier strikte opnieuw opbouwen.
-- Notificaties zijn persoonlijk, per ontwerp (zie 048): user_id, geen
-- organisatie_id. Aanmaken voor een ander gebeurt uitsluitend server-side
-- (service_role passeert RLS).

BEGIN;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notificaties'
  LOOP
    RAISE NOTICE 'drop policy op notificaties: %', p.policyname;
    EXECUTE format('DROP POLICY %I ON notificaties', p.policyname);
  END LOOP;
END $$;

ALTER TABLE notificaties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificaties_select_own" ON notificaties
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notificaties_insert_own" ON notificaties
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notificaties_update_own" ON notificaties
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notificaties_delete_own" ON notificaties
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;

-- Controle achteraf: precies deze vier, niets anders.
--   SELECT policyname, cmd, qual FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'notificaties';

INSERT INTO doen_migraties (bestand) VALUES ('217_notificaties_rls_user_only.sql') ON CONFLICT DO NOTHING;
