-- ============================================================
-- BACKFILL: klanten.debiteurennummer
-- Bestand:   backfill_debiteurennummer_20260514.sql
-- Datum:     2026-05-14
-- Status:    EENMALIG — niet opnieuw draaien
-- ============================================================
--
-- Doel:
--   Geef alle bestaande klanten een debiteurennummer per organisatie,
--   uitgaande van de waardes in app_settings.debiteur_prefix en
--   app_settings.debiteur_volgnummer. Daarna wordt
--   debiteur_volgnummer per organisatie bijgewerkt naar het hoogste
--   uitgegeven nummer + 1, zodat de in-app generator
--   (generateDebiteurennummer in klantService.ts) naadloos doorloopt
--   bij nieuwe klanten.
--
-- Wanneer draaien:
--   Na deploy van de debiteurennummer-feature, ÉÉNMALIG, in Supabase
--   SQL Editor. Bij voorkeur buiten werktijd zodat geen parallelle
--   createKlant-aanroepen een nummer pakken dat dit script óók
--   uitdeelt.
--
-- Wat dit script doet:
--   1. STAP 1 (read-only): toont per organisatie het huidige aantal
--      klanten zonder debiteurennummer, met huidige prefix en
--      volgnummer. Lees deze output voor je STAP 2 draait.
--   2. STAP 2 (write, in transactie): wijst nummers toe via
--      ROW_NUMBER() OVER (PARTITION BY organisatie_id ORDER BY
--      created_at). Werkt debiteur_volgnummer bij. ROLLBACK bij fout.
--   3. STAP 3 (read-only): verificatie — toont per organisatie hoeveel
--      klanten een nummer kregen, het hoogste uitgegeven nummer en
--      het nieuwe debiteur_volgnummer.
--
-- Wat dit script NIET doet:
--   - Klanten met een al ingevulde debiteurennummer overschrijven.
--     Legacy/handmatige waardes blijven met rust (de WHERE-clause
--     in STAP 2 sluit non-lege rijen uit).
--   - Organisaties zonder app_settings-rij verwerken. Die worden
--     overgeslagen — eerst app_settings aanmaken voor die org.
--
-- Verifiëren achteraf:
--   - STAP 3-output: aantal_gekregen + max_nieuw_nummer + nieuw_volgnummer
--   - SELECT COUNT(*) FROM klanten WHERE debiteurennummer = ''
--     moet 0 zijn voor elke org waar je dit hebt gedraaid.
--   - Maak een nieuwe testklant via de app: het toegekende nummer
--     moet één hoger zijn dan max_nieuw_nummer uit STAP 3.
-- ============================================================


-- ============ STAP 1: Pre-flight inventaris ============
-- Read-only. Geen wijzigingen.

SELECT
  k.organisatie_id,
  COUNT(*) FILTER (WHERE k.debiteurennummer IS NULL OR k.debiteurennummer = '')
    AS klanten_zonder_nummer,
  COUNT(*) FILTER (WHERE k.debiteurennummer IS NOT NULL AND k.debiteurennummer <> '')
    AS klanten_met_nummer,
  s.debiteur_prefix,
  s.debiteur_volgnummer
FROM klanten k
LEFT JOIN app_settings s ON s.organisatie_id = k.organisatie_id
GROUP BY k.organisatie_id, s.debiteur_prefix, s.debiteur_volgnummer
ORDER BY k.organisatie_id;


-- ============ STAP 2: Backfill in transactie ============
-- Wijst nummers toe en update debiteur_volgnummer per organisatie.
-- Bij elke fout: ROLLBACK; herstel handmatig.

BEGIN;

WITH te_nummeren AS (
  SELECT
    k.id,
    k.organisatie_id,
    COALESCE(s.debiteur_prefix, '') AS prefix,
    COALESCE(s.debiteur_volgnummer, 1000) AS start_volgnummer,
    ROW_NUMBER() OVER (
      PARTITION BY k.organisatie_id
      ORDER BY k.created_at, k.id
    ) - 1 AS offset
  FROM klanten k
  LEFT JOIN app_settings s ON s.organisatie_id = k.organisatie_id
  WHERE k.debiteurennummer IS NULL OR k.debiteurennummer = ''
),
nummer_toewijzing AS (
  SELECT
    id,
    organisatie_id,
    prefix || (start_volgnummer + offset)::text AS nieuw_nummer,
    start_volgnummer + offset AS numeriek_nummer
  FROM te_nummeren
),
update_klanten AS (
  UPDATE klanten k
  SET debiteurennummer = nt.nieuw_nummer
  FROM nummer_toewijzing nt
  WHERE k.id = nt.id
  RETURNING k.organisatie_id, nt.numeriek_nummer
),
nieuw_volgnummer_per_org AS (
  SELECT
    organisatie_id,
    MAX(numeriek_nummer) + 1 AS nieuw_volgnummer
  FROM update_klanten
  GROUP BY organisatie_id
)
UPDATE app_settings s
SET debiteur_volgnummer = nv.nieuw_volgnummer
FROM nieuw_volgnummer_per_org nv
WHERE s.organisatie_id = nv.organisatie_id;

COMMIT;


-- ============ STAP 3: Verificatie ============
-- Read-only. Visuele check op het resultaat.

SELECT
  k.organisatie_id,
  COUNT(*) FILTER (WHERE k.debiteurennummer IS NOT NULL AND k.debiteurennummer <> '')
    AS klanten_met_nummer,
  COUNT(*) FILTER (WHERE k.debiteurennummer IS NULL OR k.debiteurennummer = '')
    AS klanten_zonder_nummer,
  s.debiteur_prefix,
  s.debiteur_volgnummer AS nieuw_volgnummer
FROM klanten k
LEFT JOIN app_settings s ON s.organisatie_id = k.organisatie_id
GROUP BY k.organisatie_id, s.debiteur_prefix, s.debiteur_volgnummer
ORDER BY k.organisatie_id;
