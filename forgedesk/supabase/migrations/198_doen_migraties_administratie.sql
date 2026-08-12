-- 198_doen_migraties_administratie.sql
--
-- Niemand weet welke migraties gedraaid zijn. Dat is de oorzaak, niet het
-- symptoom.
--
-- De migratiemap loopt aantoonbaar uit de pas met de database: 072 maakt een
-- policy op `grootboek` terwijl 001 `grootboeken` aanmaakt, 047 en 078 noemen
-- een tabel `events` die niemand aanmaakt, en 004 is nooit gedraaid. Migratie
-- 195 moest daarom pg_policies uitlezen in plaats van een lijst met beloofde
-- policynamen droppen, want `DROP POLICY IF EXISTS` op een naam die niet
-- bestaat slaagt stil. Elke migratie die op "wat er zou moeten staan" vertrouwt
-- in plaats van op "wat er staat", is een gok.
--
-- CLAUDE.md verwijst naar `schema_migrations` als de administratie. Die tabel
-- bestaat hier niet als onze administratie: de naam is bezet door Supabase zelf
-- (supabase_migrations.schema_migrations, eigendom van het platform, en we
-- draaien onze migraties met de hand in de SQL Editor). Vandaar een eigen
-- tabel met een eigen naam.
--
-- ============================================================
-- ZO HOUD JE HEM BIJ
--
-- Zet onderaan ELKE nieuwe migratie deze ene regel, met de eigen bestandsnaam:
--
--     INSERT INTO doen_migraties (bestand)
--       VALUES ('199_mijn_migratie.sql') ON CONFLICT DO NOTHING;
--
-- Buiten de COMMIT, zodat een mislukte migratie zich niet als gedraaid
-- inschrijft. `ON CONFLICT DO NOTHING` maakt opnieuw draaien onschadelijk.
--
-- Volgend vrij nummer opzoeken:
--     SELECT bestand FROM doen_migraties ORDER BY bestand DESC LIMIT 10;
--
-- Deze tabel is administratie, geen bron van waarheid over het schema. Staat er
-- iets in dat de database tegenspreekt, dan heeft de database gelijk.
-- ============================================================
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS doen_migraties (
  bestand       text PRIMARY KEY,
  gedraaid_op   timestamptz NOT NULL DEFAULT now(),
  gedraaid_door text NOT NULL DEFAULT current_user
);

COMMENT ON TABLE doen_migraties IS
  'Handmatig bijgehouden administratie van gedraaide migraties. Eén INSERT onderaan elke migratie. Alleen service_role.';

-- Bewust GEEN organisatie_id en GEEN org-scoped policy, in afwijking van de
-- conventie: dit is infrastructuur van de database zelf, niet klantdata. Er is
-- geen organisatie die hier eigenaar van is.
ALTER TABLE doen_migraties ENABLE ROW LEVEL SECURITY;

-- De app heeft hier niets te zoeken. Met RLS aan en geen policy voor
-- authenticated of anon komt alleen de service role erbij (die RLS omzeilt) —
-- hetzelfde patroon als migratie 184 voor documenten-prive.
--
-- De GRANTs zijn de tweede laag: zonder table-privilege krijgt de client een
-- permission denied in plaats van een lege lijst, en dat is een duidelijker
-- signaal dan stille leegte.
DROP POLICY IF EXISTS "doen_migraties_service_role" ON doen_migraties;
CREATE POLICY "doen_migraties_service_role"
  ON doen_migraties FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON doen_migraties FROM anon, authenticated;
GRANT ALL ON doen_migraties TO service_role;

COMMIT;

-- ============================================================
-- Wat aantoonbaar gedraaid is. Bewust niet meer dan dit.
--
-- Deze drie zijn vastgesteld: 190 (organisatie-delete intrekken), 192
-- (organisatie_id backfill) en 195 (legacy user_id-policies droppen). Van de
-- rest van de map is het NIET vastgesteld, en een gok inschrijven maakt de
-- administratie erger dan geen administratie. Vul de rest alleen aan als je
-- per migratie in de database hebt gecontroleerd dat hij gedraaid is.
-- ============================================================
INSERT INTO doen_migraties (bestand) VALUES
  ('190_organisatie_delete_intrekken.sql'),
  ('192_organisatie_id_backfill.sql'),
  ('195_legacy_user_policies_droppen.sql')
ON CONFLICT DO NOTHING;

INSERT INTO doen_migraties (bestand)
  VALUES ('198_doen_migraties_administratie.sql')
  ON CONFLICT DO NOTHING;

-- ============================================================
-- Verificatie: hoort 4 rijen te geven, en de tabel hoort onbereikbaar te zijn
-- voor de app.
-- ============================================================
SELECT bestand, gedraaid_op, gedraaid_door FROM doen_migraties ORDER BY bestand;

-- Hoort 0 rijen te geven (geen policy voor anon of authenticated):
SELECT policyname, roles FROM pg_policies
 WHERE tablename = 'doen_migraties'
   AND roles::text[] && ARRAY['anon', 'authenticated'];
