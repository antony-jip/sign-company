-- ============================================================
-- Migration 165: Daan-nachtploeg (fase 2)
--
--   ai_sporen  · ruwe neerslag van elke AI-aanroep (alle negen endpoints),
--                de grondstof die de nachtelijke consolidatie terugleest.
--                Kan mail- en documentinhoud bevatten, dus bewust GEEN
--                client-policies: alleen service-role kan erbij. Retentie
--                (30 dagen) doet de nachtploeg-job zelf, Postgres heeft
--                hier geen scheduler.
--   ai_rondes  · één rij per consolidatieronde: lock, telling en kosten.
--                Kosten staan hier en NIET in ai_usage_org, zodat de
--                nachtploeg buiten de €15-maandcap van de organisatie
--                blijft (besluit fase 2: onderhoud is productkosten).
--
-- Plus twee doorgeschoven fase 1-fixes op ai_geheugen (REVIEW_NOTES.md):
-- de dedup-race en de ON DELETE-semantiek van user_id.
--
-- LET OP: nummer 165 vóór het draaien verifiëren tegen schema_migrations.
-- ============================================================

-- 1 · Sporen --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_sporen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Welk endpoint het spoor achterliet (ai-chat, ai-email, classificeer-…).
  agent TEXT NOT NULL,
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  -- Compacte kern per endpoint bepaald: { vraag, resultaat, … }. Bewust
  -- jsonb en geen kolommen: elk endpoint heeft een andere vorm.
  inhoud JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Gezet door de nachtploeg zodra het spoor in een ronde is meegenomen.
  verwerkt_in_ronde UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS aan zonder policies: dat sluit anon/authenticated volledig uit.
-- Alleen service-role (de endpoints en de nachtploeg) kan lezen/schrijven.
ALTER TABLE ai_sporen ENABLE ROW LEVEL SECURITY;

-- Het hete pad van de job: onverwerkte sporen per organisatie, op leeftijd.
CREATE INDEX IF NOT EXISTS idx_ai_sporen_onverwerkt
  ON ai_sporen(organisatie_id, created_at) WHERE verwerkt_in_ronde IS NULL;
-- Retentie-pad: alles ouder dan de bewaartermijn.
CREATE INDEX IF NOT EXISTS idx_ai_sporen_created ON ai_sporen(created_at);

-- 2 · Rondes --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_rondes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'bezig'
    CHECK (status IN ('bezig', 'klaar', 'mislukt', 'overgeslagen')),
  sporen_gelezen INTEGER NOT NULL DEFAULT 0,
  voorstellen INTEGER NOT NULL DEFAULT 0,
  -- EUR, zelfde eenheid als de rest van de app (USD * 0.92). Staat bewust
  -- niet in ai_usage_org: dan zou hij meetellen in de klant-cap.
  kosten_eur NUMERIC(10,4) NOT NULL DEFAULT 0,
  gestart_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  klaar_op TIMESTAMPTZ,
  fout TEXT
);

ALTER TABLE ai_rondes ENABLE ROW LEVEL SECURITY;

-- Logboek is leesbaar voor de organisatie (Instellingen > Daan); schrijven
-- doet alleen de job via service-role (zelfde afweging als migratie 154).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_rondes' AND policyname = 'Org members read ai_rondes'
  ) THEN
    CREATE POLICY "Org members read ai_rondes" ON ai_rondes
      FOR SELECT USING (organisatie_id = auth_organisatie_id());
  END IF;
END $$;

-- Lock: nooit twee rondes tegelijk voor dezelfde organisatie, anders
-- schrijven twee kandidaten over elkaar heen.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_rondes_bezig
  ON ai_rondes(organisatie_id) WHERE status = 'bezig';

CREATE INDEX IF NOT EXISTS idx_ai_rondes_org
  ON ai_rondes(organisatie_id, gestart_op DESC);

-- 3 · Doorgeschoven fase 1-fixes op ai_geheugen ---------------------------

-- 3a. Dedup-race: twee gelijktijdige identieke leg_vast-calls konden dubbel
-- inserteren. De index dekt precies wat de code-dedup checkt: zelfde feit,
-- zelfde onderwerp, zichtbare status. Afgewezen/verlopen blokkeren bewust
-- niet: een herverteld feit hoort dan een verse waargenomen-rij te krijgen.
--
-- Eerst eventuele bestaande duplicaten opruimen; de race die deze index
-- dicht kan ze al veroorzaakt hebben, en dan faalt CREATE UNIQUE INDEX
-- halverwege de migratie. De oudste rij blijft staan (id als tiebreak).
DELETE FROM ai_geheugen a
USING ai_geheugen b
WHERE a.organisatie_id = b.organisatie_id
  AND a.onderwerp_type = b.onderwerp_type
  AND COALESCE(a.onderwerp_id, '00000000-0000-0000-0000-000000000000'::uuid)
    = COALESCE(b.onderwerp_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND md5(a.inhoud) = md5(b.inhoud)
  AND a.status IN ('waargenomen', 'voorgesteld', 'actief')
  AND b.status IN ('waargenomen', 'voorgesteld', 'actief')
  AND (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id > b.id));

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_geheugen_feit
  ON ai_geheugen(
    organisatie_id,
    onderwerp_type,
    COALESCE(onderwerp_id, '00000000-0000-0000-0000-000000000000'::uuid),
    md5(inhoud)
  )
  WHERE status IN ('waargenomen', 'voorgesteld', 'actief');

-- 3b. user_id stond op ON DELETE SET NULL, maar NULL betekent hier
-- "org-gedeeld": persoonlijk geheugen zou bij het verwijderen van een
-- gebruiker stilletjes gedeeld worden. CASCADE ruimt het gewoon op.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ai_geheugen' AND constraint_name = 'ai_geheugen_user_id_fkey'
  ) THEN
    ALTER TABLE ai_geheugen DROP CONSTRAINT ai_geheugen_user_id_fkey;
  END IF;
  ALTER TABLE ai_geheugen
    ADD CONSTRAINT ai_geheugen_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
