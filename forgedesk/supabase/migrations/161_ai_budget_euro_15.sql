-- 161_ai_budget_euro_15.sql
--
-- Twee dingen die bij elkaar horen: de eenheid en het bedrag.
--
-- EENHEID. Migratie 110 documenteerde maandlimiet als EUR, maar de api's
-- rekenden geschatte_kosten uit met de tarieven van Anthropic, en die zijn in
-- dollars. De limiet werd dus in euro's bedoeld en in dollars gehandhaafd.
-- Vanaf nu schrijven alle AI-endpoints in euro's weg (USD * 0.92, dezelfde
-- koers die de Visualizer gebruikt). Deze migratie rekent de bestaande rijen
-- eenmalig om, zodat er geen maand ontstaat die half in dollars en half in
-- euro's is opgeteld.
--
-- BEDRAG. De limiet gaat van 10.00 naar 15.00 per organisatie per maand.
--
-- geblokkeerd_op wordt geleegd: organisaties die op de oude limiet van 10
-- vastliepen horen bij een limiet van 15 weer te kunnen werken. De kolom wordt
-- nergens als poort gelezen (de check herberekent per call), maar hij is wel
-- het spoor van "hier zat iemand vast" en dat klopt straks niet meer.

-- 1 · Dollars naar euro's, eenmalig. Alleen zinvol voor rijen die vóór deze
--     migratie zijn geschreven; daarna schrijven de api's al in euro's.
UPDATE ai_usage_org
   SET geschatte_kosten = ROUND(geschatte_kosten * 0.92, 4)
 WHERE geschatte_kosten > 0;

UPDATE ai_usage
   SET geschatte_kosten = ROUND(geschatte_kosten * 0.92, 4)
 WHERE geschatte_kosten > 0;

-- 2 · Nieuwe limiet, voor bestaande rijen en als default voor nieuwe.
ALTER TABLE ai_usage_org
  ALTER COLUMN maandlimiet SET DEFAULT 15.00;

UPDATE ai_usage_org
   SET maandlimiet = 15.00
 WHERE maandlimiet = 10.00;

-- 3 · Blokkades opheffen die op de oude limiet zijn gezet.
UPDATE ai_usage_org
   SET geblokkeerd_op = NULL
 WHERE geblokkeerd_op IS NOT NULL;

-- Controle:
--   SELECT organisatie_id, maand,
--          SUM(geschatte_kosten) AS gebruikt_eur,
--          MAX(maandlimiet)      AS limiet_eur
--     FROM ai_usage_org
--    GROUP BY organisatie_id, maand
--    ORDER BY maand DESC, gebruikt_eur DESC;

-- LET OP: deze migratie is NIET idempotent. Twee keer draaien rekent de
-- bedragen een tweede keer om met 0.92. Draai hem één keer.
