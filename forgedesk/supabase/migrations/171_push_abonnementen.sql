BEGIN;

-- ============================================================
-- 171: Pushabonnementen
--
-- Eén rij per toestel, niet per gebruiker: iemand met een telefoon én
-- een laptop hoort op beide een melding te krijgen. De endpoint van de
-- browser is de sleutel en is uniek per toestel-installatie.
--
-- RLS op user_id, niet op organisatie_id. Dit is dezelfde uitzondering
-- als bij de e-mailcredentials: een pushabonnement hoort bij het
-- toestel van één persoon, en je collega's horen daar niet bij te
-- kunnen. Zie CLAUDE.md, sectie Data-isolatie.
--
-- De sleutels (p256dh, auth) zijn de publieke helft van de
-- browser-sleutels; ze versleutelen de lading richting dat ene toestel
-- en zijn zonder de bijbehorende privésleutel in de browser waardeloos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_abonnementen (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dezelfde browser die opnieuw abonneert levert dezelfde endpoint op;
-- die hoort te overschrijven, niet te dupliceren.
CREATE UNIQUE INDEX IF NOT EXISTS push_abonnementen_endpoint_idx
  ON public.push_abonnementen (endpoint);

CREATE INDEX IF NOT EXISTS push_abonnementen_user_idx
  ON public.push_abonnementen (user_id);

ALTER TABLE public.push_abonnementen ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Eigen pushabonnementen lezen" ON public.push_abonnementen
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Eigen pushabonnementen toevoegen" ON public.push_abonnementen
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Eigen pushabonnementen bijwerken" ON public.push_abonnementen
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Eigen pushabonnementen verwijderen" ON public.push_abonnementen
    FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Voorkeur per gebruiker: zonder deze vlag zou uitzetten betekenen dat
-- je je abonnement moet weggooien en bij het weer aanzetten opnieuw om
-- toestemming moet vragen — en die vraag mag je maar één keer stellen.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_nieuwe_mail BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.push_nieuwe_mail IS
  'Meldingen bij nieuwe mail. Los van het bestaan van een abonnement.';

COMMIT;
