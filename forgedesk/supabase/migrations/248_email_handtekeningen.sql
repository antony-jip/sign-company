-- Meerdere handtekeningen per gebruiker.
--
-- Tot nu toe was er precies één handtekening, opgeslagen op het profiel. Dat
-- werkt zolang je één rol hebt. Wie zowel namens zichzelf als namens het
-- bedrijf mailt, of een tweede postvak koppelt met een ander adres, wil kunnen
-- kiezen.
--
-- Wat deze migratie doet:
-- 1. Tabel `email_handtekeningen`: naam, inhoud, banner, en een standaardvlag.
-- 2. De bestaande handtekening van elk profiel wordt overgezet als de
--    standaardhandtekening, zodat niemand iets kwijtraakt. Het profielveld
--    blijft staan en blijft leidend zolang deze tabel leeg is: dat is de
--    terugval waar de code op leunt.
-- 3. Een handtekening kan aan een postvak hangen (`account_id`). Dan wordt hij
--    voorgesteld zodra je vanuit dat postvak mailt.
--
-- Veilig om vóór of na de deploy te draaien, en veilig om opnieuw te draaien.
-- Raakt geen enkele drukke tabel, dus geen lock-gedoe.

BEGIN;
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '120s';

CREATE TABLE IF NOT EXISTS email_handtekeningen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisatie_id UUID REFERENCES organisaties(id),
  -- Hoe hij in de kiezer heet. "Zakelijk", "Kort", "Namens het team".
  naam TEXT NOT NULL,
  -- De handtekening zelf. Mag platte tekst zijn (oude vorm) of HTML; de app
  -- beslist dat met bevatOpmaak(), net als voorheen.
  inhoud TEXT NOT NULL DEFAULT '',
  -- De banner hoort bij de handtekening, niet bij de gebruiker: een zakelijke
  -- handtekening mag een andere banner hebben dan een korte.
  afbeelding_url TEXT,
  afbeelding_link TEXT,
  afbeelding_breedte INT,
  -- Welke er standaard wordt voorgesteld.
  is_standaard BOOLEAN NOT NULL DEFAULT false,
  -- Hangt hij aan één postvak, dan wint hij zodra je vanuit dat postvak mailt.
  -- ON DELETE SET NULL: een ontkoppeld postvak mag geen handtekening wissen.
  account_id UUID REFERENCES user_email_settings(id) ON DELETE SET NULL,
  volgorde INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_handtekeningen_user ON email_handtekeningen (user_id, volgorde);
CREATE INDEX IF NOT EXISTS idx_email_handtekeningen_account ON email_handtekeningen (account_id) WHERE account_id IS NOT NULL;

-- Hoogstens één standaard per gebruiker. Partieel mag hier: deze index is nooit
-- een ON CONFLICT-arbiter, hij bewaakt alleen.
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_handtekening_standaard
  ON email_handtekeningen (user_id) WHERE is_standaard;

-- Hoogstens één handtekening per postvak, anders is "welke hoort bij dit
-- postvak" geen vraag met één antwoord.
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_handtekening_per_postvak
  ON email_handtekeningen (account_id) WHERE account_id IS NOT NULL;

ALTER TABLE email_handtekeningen ENABLE ROW LEVEL SECURITY;

-- Handtekeningen zijn persoonlijk, net als de mailinstellingen zelf. Geen
-- org-brede policy: je collega hoort jouw ondertekening niet te kunnen wijzigen.
DROP POLICY IF EXISTS "Eigenaar beheert handtekeningen" ON email_handtekeningen;
CREATE POLICY "Eigenaar beheert handtekeningen" ON email_handtekeningen
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;

-- ── De bestaande handtekening overzetten ────────────────────────────────
-- Apart blok: mislukt dit, dan staat de tabel er in elk geval al en blijft de
-- app op het profielveld terugvallen.
BEGIN;
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '120s';

INSERT INTO email_handtekeningen (user_id, organisatie_id, naam, inhoud, afbeelding_url, afbeelding_link, afbeelding_breedte, is_standaard, volgorde)
SELECT
  p.id,
  p.organisatie_id,
  'Standaard',
  COALESCE(p.email_handtekening, ''),
  NULLIF(TRIM(p.handtekening_afbeelding), ''),
  NULLIF(TRIM(p.handtekening_afbeelding_link), ''),
  NULLIF(p.handtekening_afbeelding_grootte, 0),
  true,
  0
FROM profiles p
-- Deze kolommen zijn NOT NULL DEFAULT '' (migratie 091 en 155), dus leeg is
-- een lege string en niet NULL. Alleen wie echt iets heeft ingesteld krijgt een
-- rij; de rest houdt zijn lege profielveld en merkt niets.
WHERE COALESCE(NULLIF(TRIM(p.email_handtekening), ''), NULLIF(TRIM(p.handtekening_afbeelding), '')) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM email_handtekeningen h WHERE h.user_id = p.id);

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('248_email_handtekeningen.sql') ON CONFLICT DO NOTHING;
