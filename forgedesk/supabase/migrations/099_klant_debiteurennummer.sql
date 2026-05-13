-- ============================================================
-- Migration 099: Klant kvk_nummer -> debiteurennummer
-- ============================================================
-- Het veld klanten.kvk_nummer wordt in de praktijk gebruikt als
-- debiteurennummer, niet als KvK-nummer. Deze migratie:
--   1. Hernoemt klanten.kvk_nummer naar debiteurennummer
--   2. Voegt app_settings.debiteur_prefix + debiteur_volgnummer toe
--      (consistent met factuur_prefix/factuur_volgnummer pattern)
--   3. Voegt een partial unique index toe op (organisatie_id,
--      debiteurennummer) zodat debiteurnummers binnen een organisatie
--      uniek zijn.
--
-- profiles.kvk_nummer en leveranciers.kvk_nummer blijven onveranderd —
-- die zijn echte KvK-handelsregisternummers.
--
-- DRAAI DEZE STAPPEN ÉÉN VOOR ÉÉN in Supabase SQL Editor.
-- Beoordeel de output van STAP 1 voor je STAP 3 draait.
-- ============================================================


-- ============ STAP 1: Pre-flight duplicaten-check ============
-- Read-only. Geen wijzigingen.
-- Doel: detecteren of er klanten zijn binnen dezelfde organisatie die
-- nu hetzelfde niet-lege kvk_nummer hebben. Zulke duplicaten breken
-- de partial unique index in STAP 3.
--
-- VERWACHTE OUTPUT BIJ SCHONE DATA: 0 rijen.
-- BIJ DUPLICATEN: lijst met organisatie_id + kvk_nummer + aantal +
--   klant_ids + bedrijfsnamen. Fix die handmatig (één van de
--   duplicaten leegmaken of een uniek nummer geven) voordat je STAP 3
--   draait.

SELECT
  organisatie_id,
  kvk_nummer,
  COUNT(*) AS aantal,
  array_agg(id ORDER BY created_at)            AS klant_ids,
  array_agg(bedrijfsnaam ORDER BY created_at)  AS bedrijfsnamen
FROM klanten
WHERE kvk_nummer IS NOT NULL
  AND kvk_nummer <> ''
GROUP BY organisatie_id, kvk_nummer
HAVING COUNT(*) > 1
ORDER BY organisatie_id, kvk_nummer;


-- ============ STAP 2: Schema-wijzigingen ============
-- Veilig om te draaien ongeacht de output van STAP 1.
-- - RENAME COLUMN behoudt automatisch NOT NULL en DEFAULT.
-- - ADD COLUMN IF NOT EXISTS is idempotent.

ALTER TABLE klanten
  RENAME COLUMN kvk_nummer TO debiteurennummer;

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS debiteur_prefix TEXT NOT NULL DEFAULT '';

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS debiteur_volgnummer INTEGER NOT NULL DEFAULT 1000;

COMMENT ON COLUMN klanten.debiteurennummer IS
  'Debiteurennummer van de klant binnen deze organisatie. Auto-gegenereerd '
  'bij klant-aanmaak via generateDebiteurennummer(), kan handmatig '
  'overschreven worden. Uniek per organisatie (zie partial unique index).';

COMMENT ON COLUMN app_settings.debiteur_prefix IS
  'Optionele prefix voor debiteurennummer (bv. ''DEB-''). Default leeg '
  '(puur numeriek). Consistent met factuur_prefix/offerte_prefix pattern.';

COMMENT ON COLUMN app_settings.debiteur_volgnummer IS
  'Startnummer voor debiteurennummer. Fungeert als floor bij '
  'MAX(nummer)+1 generatie zodat een organisatie bij overstap vanuit '
  'een ander systeem een specifiek beginpunt kan kiezen.';


-- ============ STAP 3: Partial unique index ============
-- ALLEEN draaien als STAP 1 geen duplicaten toonde (of nadat je de
-- gevonden duplicaten handmatig hebt opgelost).
--
-- WHERE-clause sluit lege strings uit zodat bestaande klanten zonder
-- debiteurennummer geen conflict opleveren.

CREATE UNIQUE INDEX IF NOT EXISTS klanten_org_debiteurennummer_unique
  ON klanten (organisatie_id, debiteurennummer)
  WHERE debiteurennummer <> '';


-- ============ STAP 4 (optioneel): inspectie Sign Makers ============
-- Toont de eerste 20 klanten van Sign Makers met hun (gerenamde)
-- debiteurennummer. Gebruik dit om te besluiten of/hoe de bestaande
-- waardes opgeschoond moeten worden (los van deze migratie).

SELECT id, bedrijfsnaam, debiteurennummer, created_at
FROM klanten
WHERE organisatie_id = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'
ORDER BY bedrijfsnaam
LIMIT 20;
