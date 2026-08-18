-- ============================================================
-- 200: feature_flags — een uitzetknop zonder deploy
--
-- WAAROM. Elke wijziging in doen. gaat in één keer naar iedereen. Er is
-- geen manier om iets bij één klant te proberen en geen manier om iets
-- weer uit te zetten zonder een nieuwe deploy. Bij de rewrites die nog
-- komen (mailsync naar een queue, echte PWA, paginatie, support-inbox)
-- is dat een alles-of-niets-ingreep op een app waar een echt bedrijf op
-- draait. Deze tabel is het vangnet dat vóór die rewrites af moet zijn.
--
-- ÉÉN TABEL, TWEE NIVEAUS. organisatie_id is hier bewust NULLABLE, en
-- dat is de enige tabel in doen. waar dat mag:
--
--   organisatie_id IS NULL     → de globale rij (Antony's hoofdschakelaar)
--   organisatie_id = <org>     → uitzondering voor één organisatie
--
-- Drie standen per flag, en de afwezigheid van een rij is er één van:
--
--   globale rij zegt UIT   → uit voor iedereen. Een org-rij kan dit NIET
--                            overrulen. Dat is het hele punt: als de
--                            hoofdschakelaar tijdens een incident om kan
--                            worden gezet door een rij die er al stond,
--                            is het geen noodstop.
--   globale rij zegt AAN   → aan voor iedereen, behalve organisaties met
--                            een eigen rij op false (opt-out tijdens
--                            uitrol).
--   geen globale rij       → alleen organisaties met een eigen rij op
--                            true doen mee. Dit is de pilot-stand: eerst
--                            bij één klant, de rest merkt niets.
--
-- Geen tweede tabel dus. Een aparte feature_flag_overrides-tabel zou
-- dezelfde drie kolommen hebben, dezelfde RLS nodig hebben en de
-- resolutie over twee queries verdelen; het enige dat je ermee wint is
-- een NOT NULL op organisatie_id. Dat weegt niet op tegen twee tabellen
-- die niet uit elkaar mogen lopen.
--
-- RLS. Lezen mag: een organisatie ziet de globale rijen en haar eigen
-- rijen, nooit die van een andere organisatie. Schrijven mag niemand —
-- er is geen INSERT-, UPDATE- of DELETE-policy, dus alleen service_role
-- (dat RLS overslaat) en de SQL Editor komen erbij. Een vlag die de
-- gebruiker zelf om kan zetten is een instelling, geen vlag; daarvoor
-- bestaat app_settings al.
--
-- Idempotent: veilig om meerdere keren te draaien.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Moet exact matchen met de naam in de code, daarom een vast formaat:
  -- kleine letters, cijfers en underscores. Een typefout in de SQL Editor
  -- levert anders een rij op die nooit gelezen wordt.
  naam TEXT NOT NULL CHECK (naam ~ '^[a-z][a-z0-9_]*$'),
  -- NULL = globale rij. Zie de kop van dit bestand.
  organisatie_id UUID REFERENCES public.organisaties(id) ON DELETE CASCADE,
  aan BOOLEAN NOT NULL,
  -- Waarom de rij zo staat. Bij een noodstop om 23:00 is dat het enige
  -- wat je een week later nog helpt.
  reden TEXT,
  aangepast_op TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Twee partiële unieke indexen in plaats van één UNIQUE(naam,
-- organisatie_id): in Postgres zijn NULL-waarden onderling niet gelijk,
-- dus een gewone unique constraint laat twee globale rijen voor dezelfde
-- flag toe. Precies de rij waar je bij een incident niet achter wilt
-- komen.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_feature_flags_globaal
  ON public.feature_flags(naam) WHERE organisatie_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_feature_flags_org
  ON public.feature_flags(naam, organisatie_id) WHERE organisatie_id IS NOT NULL;

COMMENT ON TABLE public.feature_flags IS
  'Serverzijdige aan/uit-schakelaars. Globaal (organisatie_id IS NULL) of per organisatie. Alleen service_role schrijft.';
COMMENT ON COLUMN public.feature_flags.organisatie_id IS
  'NULL = globale rij die voor alle organisaties geldt. Gevuld = uitzondering voor die ene organisatie.';
COMMENT ON COLUMN public.feature_flags.aan IS
  'Globale rij op false is een harde stop die een org-rij niet kan overrulen.';

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Lezen: globale rijen plus de eigen organisatie. Zelfde org-scoped
-- patroon als migratie 048, met organisatie_id IS NULL erbij omdat de
-- globale rij geen eigenaar heeft.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags' AND policyname = 'Org members read feature_flags'
  ) THEN
    -- TO authenticated, niet aan iedereen. De IS NULL-tak is bedoeld voor
    -- globale rijen, maar zonder rolbeperking kan een niet-ingelogde bezoeker
    -- met de anon-key ze uitlezen: alle flagnamen en hun stand. Geen
    -- cross-org-lek, wel het hele schakelbord publiek.
    CREATE POLICY "Org members read feature_flags" ON public.feature_flags
      FOR SELECT TO authenticated USING (
        organisatie_id IS NULL OR organisatie_id = auth_organisatie_id()
      );
  END IF;
END $$;

-- Bewust GEEN INSERT/UPDATE/DELETE-policy: dat sluit anon en
-- authenticated volledig uit van schrijven. Niet weghalen.
--
-- Tweede laag op GRANT-niveau, want RLS is anders het enige slot: Supabase
-- geeft anon en authenticated standaard rechten op nieuwe tabellen in public.
-- Zelfde hardening als migratie 160.
REVOKE INSERT, UPDATE, DELETE ON public.feature_flags FROM anon, authenticated;
REVOKE ALL ON public.feature_flags FROM anon;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

-- De eerste consument. Staat op true zodat de app zich vandaag precies
-- zo gedraagt als gisteren; de rij bestaat om de deur te kunnen sluiten,
-- niet om hem nu te sluiten.
INSERT INTO public.feature_flags (naam, organisatie_id, aan, reden)
VALUES (
  'module_studio',
  NULL,
  true,
  'Studio (visualizer) staat live sinds de lancering. Rij bestaat om de module zonder deploy te kunnen sluiten.'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ── Verificatie (terugplakken in de SQL Editor) ──────────────
--
-- SELECT naam,
--        COALESCE(organisatie_id::text, 'GLOBAAL') AS bereik,
--        aan,
--        reden,
--        aangepast_op
-- FROM public.feature_flags
-- ORDER BY naam, organisatie_id NULLS FIRST;
--
-- Verwacht na deze migratie: één rij, module_studio, bereik GLOBAAL, aan = true.
--
-- Policies moeten precies één regel geven (SELECT, geen schrijfpolicy):
--
-- SELECT policyname, cmd, qual
-- FROM pg_policies WHERE tablename = 'feature_flags';
--
-- ── Terugdraaien ─────────────────────────────────────────────
--
-- DROP TABLE IF EXISTS public.feature_flags;
-- DELETE FROM doen_migraties WHERE bestand = '200_feature_flags.sql';
--
-- ============================================================

-- Laatste statement, bewust ná COMMIT: doen_migraties komt uit migratie
-- 198. Is die hier nog niet gedraaid, dan faalt alleen deze regel met
-- "relation doen_migraties does not exist". Dat is onschuldig — de tabel,
-- de indexen en de policy hierboven zijn dan al aangelegd. Draai deze
-- regel later los na.
INSERT INTO doen_migraties (bestand) VALUES ('200_feature_flags.sql') ON CONFLICT DO NOTHING;
