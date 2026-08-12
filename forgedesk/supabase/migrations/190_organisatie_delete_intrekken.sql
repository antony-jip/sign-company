BEGIN;

-- ============================================================
-- 190: DELETE-recht op organisaties intrekken
--
-- Het probleem:
--   Migratie 085 (regel 95-96) gaf ELK lid van een organisatie het recht om
--   die organisatie te verwijderen:
--
--     CREATE POLICY "Leden verwijderen eigen organisatie" ON organisaties
--       FOR DELETE USING (id = auth_organisatie_id());
--
--   Geen rolcheck. Een monteur, een verkoper, iedereen met een profiles-rij
--   die naar de organisatie wijst. Migratie 111 laat DELETE bewust ongemoeid
--   (zie de toelichting daar, regel 19-20) en 173 zette alleen profiles.rol
--   vast, dus deze policy is nooit ingetrokken of versmald.
--
-- Waarom dit in de praktijk zelden losliep:
--   Van de 77 foreign keys naar organisaties(id) hebben er 21 ON DELETE
--   CASCADE en 56 geen ON DELETE-clausule (dus NO ACTION), waaronder klanten,
--   projecten, offertes, facturen en werkbonnen. Postgres blokkeert de DELETE
--   daarop en de statement is atomair. Een organisatie met echte data was dus
--   niet te verwijderen. Een lege of nieuwe organisatie wél, en die heeft geen
--   FK-rijen die hem beschermen.
--
-- Waarom intrekken en niet versmallen naar de eigenaar:
--   Geen enkele regel in src/ of api/ doet een DELETE op organisaties
--   (gecontroleerd). De policy is dus ongebruikt door het product. Een
--   toekomstig "verwijder mijn account"-pad moet server-side lopen: het moet
--   ook de 56 niet-cascaderende tabellen en de storage-buckets opruimen, en
--   dat kan een losse client-DELETE per definitie niet. Die zou nu al falen
--   op een FK-violation.
--
-- Wat dit doet:
--   · dropt "Leden verwijderen eigen organisatie"
--   Zonder DELETE-policy weigert RLS elke delete voor de rol authenticated.
--   service_role omzeilt RLS, dus via de SQL Editor of een admin-endpoint kan
--   Antony een organisatie altijd nog verwijderen.
--
-- Wat dit NIET doet, bewust:
--   · SELECT, UPDATE en INSERT op organisaties blijven exact zoals ze zijn
--   · geen enkele rij wordt aangeraakt
--   · de trigger-guards uit 172/175 blijven ongemoeid
--
-- Terugdraaien, als dat ooit nodig is:
--   CREATE POLICY "Leden verwijderen eigen organisatie" ON organisaties
--     FOR DELETE USING (id = auth_organisatie_id());
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien (idempotent).
-- ============================================================

DROP POLICY IF EXISTS "Leden verwijderen eigen organisatie" ON public.organisaties;

-- Ook de historische naamvarianten, mocht er in de database iets anders staan
-- dan in de migratiemap. Er is geen schema_migrations, dus de bestanden en de
-- database lopen aantoonbaar uit de pas.
DROP POLICY IF EXISTS "Eigenaar verwijdert eigen organisatie" ON public.organisaties;
DROP POLICY IF EXISTS "Leden verwijderen organisatie" ON public.organisaties;

COMMIT;

-- ============================================================
-- VERIFICATIE — plak de output hiervan terug.
--
-- Verwacht: drie rijen (SELECT, UPDATE, INSERT), GEEN enkele met cmd = 'DELETE'.
-- ============================================================

SELECT policyname, cmd, qual AS using_expressie, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organisaties'
ORDER BY cmd, policyname;

-- Tweede controle: staat er ergens nog een DELETE-policy op organisaties?
-- Verwacht: 0.
SELECT count(*) AS delete_policies_op_organisaties
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organisaties'
  AND cmd = 'DELETE';
