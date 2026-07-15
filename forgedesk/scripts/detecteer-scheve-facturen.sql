-- Detecteert facturen waarvan de kop-bedragen niet overeenkomen met de regels.
-- Oorzaak: de bewerk-tak van FactuurEditor schreef wel de kop maar nooit de
-- factuur_items weg. Draai dit in de Supabase SQL Editor.
--
-- Kolom `verschil` = kop-totaal minus regel-totaal.
--   negatief -> de kop is lager dan de regels (bv. handmatige deelfactuur)
--   positief -> de kop is hoger dan de regels (bv. voorschot zonder regels)
--
-- Alleen lezen. Wijzigt niets.

WITH regel_totalen AS (
  SELECT
    fi.factuur_id,
    COUNT(*) AS aantal_regels,
    ROUND(SUM(ROUND(fi.aantal * fi.eenheidsprijs, 2)
      - ROUND(ROUND(fi.aantal * fi.eenheidsprijs, 2) * (COALESCE(fi.korting_percentage, 0) / 100.0), 2)
    ), 2) AS regel_subtotaal,
    ROUND(SUM(ROUND(
      (ROUND(fi.aantal * fi.eenheidsprijs, 2)
        - ROUND(ROUND(fi.aantal * fi.eenheidsprijs, 2) * (COALESCE(fi.korting_percentage, 0) / 100.0), 2))
      * (COALESCE(fi.btw_percentage, 0) / 100.0), 2)
    ), 2) AS regel_btw
  FROM factuur_items fi
  GROUP BY fi.factuur_id
)
SELECT
  f.nummer,
  f.factuurdatum,
  f.status,
  f.klant_naam,
  COALESCE(rt.aantal_regels, 0) AS aantal_regels,
  f.totaal AS kop_totaal,
  COALESCE(rt.regel_subtotaal + rt.regel_btw, 0) AS regel_totaal,
  ROUND(f.totaal - COALESCE(rt.regel_subtotaal + rt.regel_btw, 0), 2) AS verschil,
  CASE
    WHEN COALESCE(rt.aantal_regels, 0) = 0 THEN 'geen regels — PDF toont lege regeltabel'
    WHEN f.totaal < COALESCE(rt.regel_subtotaal + rt.regel_btw, 0) THEN 'kop lager dan regels — PDF is tegenstrijdig'
    ELSE 'kop hoger dan regels — PDF is tegenstrijdig'
  END AS diagnose
FROM facturen f
LEFT JOIN regel_totalen rt ON rt.factuur_id = f.id
WHERE f.factuur_type IS DISTINCT FROM 'creditnota'
  AND ABS(f.totaal - COALESCE(rt.regel_subtotaal + rt.regel_btw, 0)) > 0.02
ORDER BY f.factuurdatum DESC;
