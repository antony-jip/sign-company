-- ============================================================
-- Migration 100: CHECK constraints op Daan context-velden
--
-- Tot nu toe werden bedrijfscontext (500) en schrijfstijl (1000)
-- enkel client-side via .slice() afgekapt. Server had geen
-- enforcement · directe schrijfacties via supabase-js zouden
-- onbeperkt kunnen schrijven.
--
-- Cleanup-stap kapt eventuele bestaande overschrijdingen af zodat
-- de CHECK constraint succesvol kan landen.
-- ============================================================

-- Cleanup bestaande overschrijdingen (niet verwacht, maar safe)
UPDATE app_settings
SET forgie_bedrijfscontext = LEFT(forgie_bedrijfscontext, 500)
WHERE LENGTH(forgie_bedrijfscontext) > 500;

UPDATE app_settings
SET ai_tone_of_voice = LEFT(ai_tone_of_voice, 1000)
WHERE LENGTH(ai_tone_of_voice) > 1000;

-- CHECK constraints
ALTER TABLE app_settings
  ADD CONSTRAINT forgie_bedrijfscontext_max_500
  CHECK (LENGTH(forgie_bedrijfscontext) <= 500);

ALTER TABLE app_settings
  ADD CONSTRAINT ai_tone_of_voice_max_1000
  CHECK (LENGTH(ai_tone_of_voice) <= 1000);
