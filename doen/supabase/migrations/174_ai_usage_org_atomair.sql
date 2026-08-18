-- 174_ai_usage_org_atomair.sql
--
-- De AI-teller was een read-modify-write: eerst de rij lezen, dan optellen, dan
-- terugschrijven. Twee serverless functies die tegelijk dezelfde
-- (organisatie, route, maand) bijwerken lezen dan dezelfde beginwaarde en
-- schrijven over elkaar heen. Het verlies is altijd in het nadeel van doen.:
-- de teller loopt achter op de echte Anthropic-factuur, dus de rem grijpt te
-- laat in. Bij acht gebruikers is de kans klein, bij twintig met een
-- ochtendpiek is het routine.
--
-- Dezelfde race is voor de Visualizer-credits al opgelost met een atomaire RPC
-- (migratie 147). De AI-teller heeft die behandeling nooit gekregen.
--
-- De unique index waar ON CONFLICT op mikt bestaat al sinds migratie 093:
--   ai_usage_org_unique ON ai_usage_org(organisatie_id, route, maand)
--
-- Alleen de backend telt bij; de frontend leest de teller voor de meter. Daarom
-- REVOKE op PUBLIC, anon en authenticated, gelijk aan migratie 154 en 164.

BEGIN;

CREATE OR REPLACE FUNCTION ai_usage_org_bijschrijf(
  p_organisatie_id uuid,
  p_route text,
  p_maand text,
  p_kosten numeric,
  p_calls integer DEFAULT 1
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO ai_usage_org (organisatie_id, route, maand, aantal_calls, geschatte_kosten)
  VALUES (p_organisatie_id, p_route, p_maand, p_calls, ROUND(p_kosten, 4))
  ON CONFLICT (organisatie_id, route, maand) DO UPDATE
     SET aantal_calls     = ai_usage_org.aantal_calls + EXCLUDED.aantal_calls,
         geschatte_kosten = ROUND(ai_usage_org.geschatte_kosten + EXCLUDED.geschatte_kosten, 4),
         updated_at       = now();
$$;

REVOKE ALL ON FUNCTION ai_usage_org_bijschrijf(uuid, text, text, numeric, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION ai_usage_org_bijschrijf(uuid, text, text, numeric, integer) FROM anon;
REVOKE ALL ON FUNCTION ai_usage_org_bijschrijf(uuid, text, text, numeric, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION ai_usage_org_bijschrijf(uuid, text, text, numeric, integer) TO service_role;

COMMIT;

-- Controle:
--   SELECT ai_usage_org_bijschrijf(
--            '<organisatie_id>'::uuid, 'test-route', to_char(now(),'YYYY-MM'), 0.0100, 1);
--   SELECT route, aantal_calls, geschatte_kosten
--     FROM ai_usage_org
--    WHERE organisatie_id = '<organisatie_id>' AND route = 'test-route';
--   -- twee keer aanroepen hoort 2 calls en 0.0200 te geven
--   DELETE FROM ai_usage_org WHERE route = 'test-route';
--
-- Terugdraaien:
--   DROP FUNCTION IF EXISTS ai_usage_org_bijschrijf(uuid, text, text, numeric, integer);
