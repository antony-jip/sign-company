-- 178_ai_usage_atomair.sql
--
-- Migratie 174 maakte de org-teller atomair. De per-gebruiker teller op
-- ai_usage heeft precies dezelfde read-modify-write en dus dezelfde race: twee
-- serverless functies die tegelijk dezelfde (user_id, maand) bijwerken lezen
-- dezelfde beginwaarde en schrijven over elkaar heen.
--
-- Deze teller blokkeert in de praktijk niets: MONTHLY_LIMIT staat gelijk aan de
-- org-limiet, en het eigen verbruik is per definitie kleiner dan het org-totaal
-- (zie de comment in api/classificeer-aanvraag). Hij is er als vangnet voor
-- gebruikers zonder organisatie, en hij voedt het cijfer "eigen verbruik" in de
-- meter. Een teller die stil te laag telt is daar ook fout, alleen minder duur.
--
-- De unique index waar ON CONFLICT op mikt STAAT NIET in productie, ook al maakt
-- migratie 006 hem aan. Zonder die index geeft de RPC bij aanroep 42P10, "there
-- is no unique or exclusion constraint matching the ON CONFLICT specification":
-- de functie wordt dus wel aangemaakt en faalt pas als hij gebruikt wordt.
-- Gecontroleerd voor het aanmaken: 16 rijen, nul dubbele (user_id, maand), dus
-- de index kan zonder opschonen.
--
-- Weer een geval waarin de migraties niet vertellen wat er in de database staat.
-- Dat maakt het verifiëren ná het draaien geen formaliteit maar de enige manier
-- om te weten of iets werkt.
--
-- Zelfde afscherming als 174: alleen de backend telt bij.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_user_maand ON ai_usage(user_id, maand);

CREATE OR REPLACE FUNCTION ai_usage_bijschrijf(
  p_user_id uuid,
  p_maand text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_kosten numeric,
  p_calls integer DEFAULT 1
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO ai_usage (user_id, maand, aantal_calls, input_tokens, output_tokens, geschatte_kosten)
  VALUES (p_user_id, p_maand, p_calls, p_input_tokens, p_output_tokens, ROUND(p_kosten, 4))
  ON CONFLICT (user_id, maand) DO UPDATE
     SET aantal_calls     = ai_usage.aantal_calls + EXCLUDED.aantal_calls,
         input_tokens     = ai_usage.input_tokens + EXCLUDED.input_tokens,
         output_tokens    = ai_usage.output_tokens + EXCLUDED.output_tokens,
         geschatte_kosten = ROUND(ai_usage.geschatte_kosten + EXCLUDED.geschatte_kosten, 4),
         updated_at       = now();
$$;

REVOKE ALL ON FUNCTION ai_usage_bijschrijf(uuid, text, integer, integer, numeric, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION ai_usage_bijschrijf(uuid, text, integer, integer, numeric, integer) FROM anon;
REVOKE ALL ON FUNCTION ai_usage_bijschrijf(uuid, text, integer, integer, numeric, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION ai_usage_bijschrijf(uuid, text, integer, integer, numeric, integer) TO service_role;

COMMENT ON FUNCTION ai_usage_bijschrijf(uuid, text, integer, integer, numeric, integer) IS
  'Atomair bijschrijven van AI-verbruik per gebruiker (migratie 178). LET OP: de '
  'afscherming zit in de REVOKE-regels hierboven. CREATE OR REPLACE behoudt die, '
  'maar DROP FUNCTION gevolgd door CREATE zet EXECUTE terug op PUBLIC. Herhaal de '
  'REVOKE als je de functie ooit dropt.';

COMMIT;

-- Controle:
--   SELECT ai_usage_bijschrijf('<user_id>'::uuid, to_char(now(),'YYYY-MM'), 10, 20, 0.0100, 1);
--   -- twee keer aanroepen hoort 2 calls, 20 input, 40 output en 0.0200 te geven
--
-- Terugdraaien:
--   DROP FUNCTION IF EXISTS ai_usage_bijschrijf(uuid, text, integer, integer, numeric, integer);
