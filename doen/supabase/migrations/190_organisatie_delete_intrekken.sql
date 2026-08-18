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
--   (zie de toelichting daar, regel 18) en 173 zette alleen profiles.rol vast,
--   dus deze policy is nooit ingetrokken of versmald.
--
-- Waarom dit in de praktijk zelden losliep:
--   Een deel van de foreign keys naar organisaties(id) heeft ON DELETE CASCADE,
--   maar de kerntabellen niet: klanten, projecten, offertes, facturen en
--   werkbonnen krijgen hun kolom via 047:14-20 als
--   `organisatie_id UUID REFERENCES organisaties(id)`, zonder ON DELETE. Dat is
--   NO ACTION, dus Postgres blokkeert de DELETE zodra er ook maar één rij aan
--   hangt, en de statement is atomair. Een organisatie met echte data was dus
--   niet te verwijderen. Een lege of nieuwe organisatie wél, want die heeft geen
--   FK-rijen die hem beschermen.
--
--   Exacte verdeling niet uit de migratiemap te tellen: tabellen worden er
--   meermaals gedefinieerd en de map loopt uit de pas met de database. Wil je
--   het getal, vraag het de database:
--
--     SELECT confdeltype, count(*)
--     FROM pg_constraint
--     WHERE contype = 'f'
--       AND confrelid = 'public.organisaties'::regclass
--     GROUP BY confdeltype;
--
--   confdeltype 'c' = CASCADE, 'a' = NO ACTION.
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

-- Op naam, want dit is de enige DELETE-policy die ooit op organisaties is
-- aangemaakt. De volledige historische set is vijf: "Eigenaar ziet eigen
-- organisatie" (030, gedropt in 048), "Leden zien eigen organisatie" (048/085),
-- "Leden updaten eigen organisatie" (085/172), "Leden verwijderen eigen
-- organisatie" (085) en "Nieuwe gebruiker maakt eerste organisatie" (085/172).
-- De verificatie hieronder is het vangnet: die controleert op cmd = 'DELETE' en
-- niet op een naam, dus een policy die onder een andere naam is aangemaakt valt
-- daar alsnog op.
DROP POLICY IF EXISTS "Leden verwijderen eigen organisatie" ON public.organisaties;

COMMIT;

-- ============================================================
-- VERIFICATIE — plak de output hiervan terug.
--
-- De SQL Editor toont maar één resultatengrid, namelijk dat van het laatste
-- statement dat rijen teruggeeft. Daarom staat de policy-lijst hier als
-- LAATSTE: dat is de output die je ziet.
--
-- Verwacht: drie rijen (SELECT, UPDATE, INSERT) en geen enkele met cmd =
-- 'DELETE'. Staat er wel een DELETE-rij, dan is de policy onder een andere naam
-- aangemaakt; drop die dan op de naam die je hier ziet.
-- ============================================================

SELECT
  policyname,
  cmd,
  qual       AS using_expressie,
  with_check,
  (cmd = 'DELETE') AS dit_mag_niet_meer_bestaan
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organisaties'
ORDER BY cmd, policyname;
