-- ============================================================
-- 202: mailsync_taken — wachtrij voor de onbeheerde mailsync
--
-- WAAROM. Vandaag is de onbeheerde sync een fan-out-lus: één cron-run pakt
-- acht accounts tegelijk (api/cron-email-sync.ts:33, :147) en wat niet binnen
-- de deadline past wordt stil overgeslagen (:148-149, :184). Er is geen slot
-- per mailbox terwijl overlap de norm is, een mislukte sync is nergens
-- zichtbaar, en een account met een verkeerd wachtwoord blijft eeuwig elke
-- drie minuten een IMAP-slot kosten. Zie docs/plan-mailsync-queue.md §1.
--
-- Deze tabel zet daar claimbare taken voor in de plaats, met een lease. Dat
-- laatste is precies wat het bestaande queue-patroon (ingeplande_berichten,
-- migratie 061/120/130) mist: sterft het proces na de claim, dan blijft die
-- rij daar voor altijd op 'verwerken' staan en pakt niemand hem ooit nog op.
--
-- GEEN TWEEDE WATERMERK. De werker roept hetzelfde /api/fetch-emails aan en
-- dat schrijft hetzelfde email_sync_state.last_seen_uid. Deze tabel houdt dus
-- geen eigen voortgang bij; alleen wie wanneer aan de beurt is. Daardoor kan
-- de oude lus op elk moment weer overnemen zonder gat en zonder dubbele ronde.
--
-- RLS: SERVICE-ROLE ONLY. Anders dan email_sync_state (migratie 131) heeft de
-- client hier niets te zoeken: de wachtrij is uitvoeringsadministratie van de
-- cron, geen data van de gebruiker. Zelfde patroon als doen_migraties
-- (migratie 198): één policy voor service_role, plus REVOKE als tweede laag
-- op GRANT-niveau. Supabase geeft anon en authenticated standaard rechten op
-- nieuwe tabellen in public, dus zonder die REVOKE is RLS het enige slot.
--
-- Idempotent: veilig om meerdere keren te draaien.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.mailsync_taken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- user_id en niet organisatie_id: een mailbox is persoonlijk. Dat is de
  -- expliciete uitzondering op de organisatie_id-regel (CLAUDE.md §2),
  -- dezelfde keuze als emails, user_email_settings en email_sync_state.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder TEXT NOT NULL,
  soort TEXT NOT NULL DEFAULT 'incrementeel'
    CHECK (soort IN ('incrementeel', 'bootstrap', 'backfill', 'nabewerking')),
  status TEXT NOT NULL DEFAULT 'wachtend'
    CHECK (status IN ('wachtend', 'verwerken', 'gedaan', 'mislukt')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- De lease. geclaimd_door is het Vercel-request-id, zodat een vastgelopen
  -- taak aan een concrete functie-invocatie te koppelen is in de logs.
  geclaimd_op TIMESTAMPTZ,
  geclaimd_door TEXT,
  lease_tot TIMESTAMPTZ,

  -- Twee tellers, bewust gescheiden. retry_count is het foutbudget;
  -- uitstel_count telt de ronden waarin de tijd op was voordat het werk klaar
  -- was. Een grote mailbox die vier ronden nodig heeft om zijn achterstand in
  -- te lopen is niet aan het falen en mag zijn foutbudget daar niet aan
  -- opmaken.
  retry_count INTEGER NOT NULL DEFAULT 0,
  uitstel_count INTEGER NOT NULL DEFAULT 0,
  foutmelding TEXT,
  -- 'auth' krijgt géén backoff maar meteen de dodebrievenbus: een verkeerd
  -- wachtwoord herhaald aanbieden is de manier om het account door de
  -- mailserver zelf geblokkeerd te krijgen.
  fout_soort TEXT CHECK (fout_soort IN ('auth', 'netwerk', 'database', 'onbekend')),
  gemeld_op TIMESTAMPTZ,

  laatste_duur_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. Coalescing. Hoogstens één open taak per mailbox per soort. Dit is de
--    index die dubbel inplannen onmogelijk maakt: de producent hoeft niet te
--    weten of er al werk staat, de database weigert het tweede. Dat dekt ook
--    het aan- en uitzetten van de vlag: hoe vaak de producent het ook
--    probeert, er komt nooit een tweede open taak bij.
CREATE UNIQUE INDEX IF NOT EXISTS mailsync_taken_open_unique
  ON public.mailsync_taken (user_id, folder, soort)
  WHERE status IN ('wachtend', 'verwerken');

-- 2. Due-scan. Spiegel van idx_ingeplande_berichten_due (migratie 130).
CREATE INDEX IF NOT EXISTS mailsync_taken_due
  ON public.mailsync_taken (scheduled_at)
  WHERE status = 'wachtend';

-- 3. Opruimer. Verlopen leases vinden zonder de hele tabel te scannen.
CREATE INDEX IF NOT EXISTS mailsync_taken_lease
  ON public.mailsync_taken (lease_tot)
  WHERE status = 'verwerken';

COMMENT ON TABLE public.mailsync_taken IS
  'Wachtrij voor de onbeheerde mailsync. Alleen service_role; de app leest deze tabel niet. Houdt geen sync-voortgang bij, dat blijft email_sync_state.';
COMMENT ON COLUMN public.mailsync_taken.lease_tot IS
  'Berekend in de Vercel-runtime, niet met now(). De opruimer houdt 60s marge aan boven de lease van 90s om dat klokverschil te dekken.';
COMMENT ON COLUMN public.mailsync_taken.uitstel_count IS
  'Ronden waarin de tijd op was. Telt bewust NIET mee in het foutbudget van retry_count.';

ALTER TABLE public.mailsync_taken ENABLE ROW LEVEL SECURITY;

-- Droppen op exact de naam die de CREATE hieronder gebruikt. DROP POLICY IF
-- EXISTS op een andere naam slaagt stil en laat de oude policy staan; zo bleven
-- de legacy user_id-policies na migratie 048 een jaar onopgemerkt in de lucht.
DROP POLICY IF EXISTS "mailsync_taken_service_role" ON public.mailsync_taken;
CREATE POLICY "mailsync_taken_service_role"
  ON public.mailsync_taken
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Bewust GEEN policy voor anon of authenticated. De REVOKE is de tweede laag:
-- zonder table-privilege krijgt de client een permission denied nog voordat
-- RLS eraan te pas komt. Zelfde hardening als migratie 198 en 200.
REVOKE ALL ON public.mailsync_taken FROM anon, authenticated;
GRANT ALL ON public.mailsync_taken TO service_role;

COMMIT;

-- ── Verificatie (terugplakken in de SQL Editor) ──────────────
--
-- Kolommen — hoort 18 rijen te geven:
--
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'mailsync_taken'
--  ORDER BY ordinal_position;
--
-- Indexen — hoort de drie hierboven plus de primary key te geven:
--
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE schemaname = 'public' AND tablename = 'mailsync_taken'
--  ORDER BY indexname;
--
-- Policies — hoort precies één rij te geven, voor service_role:
--
-- SELECT policyname, cmd, roles FROM pg_policies
--  WHERE tablename = 'mailsync_taken';
--
-- Hoort 0 rijen te geven (geen enkel recht voor anon of authenticated):
--
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--  WHERE table_schema = 'public' AND table_name = 'mailsync_taken'
--    AND grantee IN ('anon', 'authenticated');
--
-- De wachtrij zelf, na de eerste ronde van de producent:
--
-- SELECT user_id, folder, soort, status, scheduled_at, retry_count,
--        uitstel_count, fout_soort, foutmelding, laatste_duur_ms
--   FROM public.mailsync_taken
--  ORDER BY scheduled_at;
--
-- Verwacht direct na deze migratie: 0 rijen. De producent in
-- api/cron-email-sync.ts schrijft pas zodra de vlag mailsync_queue op 'aan'
-- staat; zonder rij in feature_flags blijft deze tabel leeg en verandert er
-- niets aan de bestaande sync.
--
-- ── Aanzetten ────────────────────────────────────────────────
--
-- Zie docs/feature-flags.md. Eerst piloten bij één organisatie:
--
-- INSERT INTO public.feature_flags (naam, organisatie_id, aan, reden)
-- VALUES ('mailsync_queue', '<organisatie-uuid>', true, 'Pilot mailsync-wachtrij')
-- ON CONFLICT (naam, organisatie_id) WHERE organisatie_id IS NOT NULL DO UPDATE
--   SET aan = true, reden = EXCLUDED.reden, aangepast_op = now();
--
-- ── Terugdraaien ─────────────────────────────────────────────
--
-- Zet eerst de vlag uit; de tabel hoeft niet weg, een ongebruikte wachtrij
-- doet niets en de rijen zijn na een terugval nog geldig.
--
-- DROP TABLE IF EXISTS public.mailsync_taken;
-- DELETE FROM doen_migraties WHERE bestand = '202_mailsync_taken.sql';
--
-- ============================================================

-- Laatste statement, bewust ná COMMIT: doen_migraties komt uit migratie 198.
-- Is die hier nog niet gedraaid, dan faalt alleen deze regel met "relation
-- doen_migraties does not exist". Dat is onschuldig — de tabel, de indexen en
-- de policy hierboven zijn dan al aangelegd. Draai deze regel later los na.
INSERT INTO doen_migraties (bestand) VALUES ('202_mailsync_taken.sql') ON CONFLICT DO NOTHING;
