-- ============================================================
-- 096: Offerte voorwaarden per organisatie via app_settings
-- ============================================================
-- Voegt `offerte_voorwaarden` kolom toe aan app_settings zodat
-- organisaties de standaard voorwaardentekst voor offertes zelf
-- kunnen beheren. Bestaande per-offerte override
-- (`offertes.voorwaarden`) blijft prioriteit houden in de UI.
--
-- LET OP: de DEFAULT-tekst hieronder moet identiek blijven aan
-- de constante DEFAULT_OFFERTE_VOORWAARDEN in
-- src/utils/defaults.ts. Bij wijziging beide bestanden updaten.
--
-- OPMERKING: Deze SQL draait Antony handmatig in het Supabase
-- dashboard. Dit bestand dient als documentatie en voor
-- toekomstige deployments.
-- ============================================================

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS offerte_voorwaarden text
  DEFAULT '1. Deze offerte is geldig gedurende de aangegeven termijn.
2. Betaling dient te geschieden binnen 30 dagen na factuurdatum.
3. Alle genoemde bedragen zijn exclusief BTW, tenzij anders vermeld.
4. Levertijd wordt in overleg bepaald na akkoord op deze offerte.
5. Op al onze leveringen en diensten zijn onze algemene voorwaarden van toepassing.
6. Kleuren en materialen kunnen licht afwijken van getoonde voorbeelden.
7. Wijzigingen na akkoord kunnen tot meerkosten leiden.
8. Garantie: 2 jaar op materiaal en constructie, 1 jaar op elektronica.';

-- Backfill bestaande rijen die NULL hebben (de DEFAULT geldt
-- alleen voor nieuwe rijen, niet voor reeds bestaande)
UPDATE app_settings
SET offerte_voorwaarden = '1. Deze offerte is geldig gedurende de aangegeven termijn.
2. Betaling dient te geschieden binnen 30 dagen na factuurdatum.
3. Alle genoemde bedragen zijn exclusief BTW, tenzij anders vermeld.
4. Levertijd wordt in overleg bepaald na akkoord op deze offerte.
5. Op al onze leveringen en diensten zijn onze algemene voorwaarden van toepassing.
6. Kleuren en materialen kunnen licht afwijken van getoonde voorbeelden.
7. Wijzigingen na akkoord kunnen tot meerkosten leiden.
8. Garantie: 2 jaar op materiaal en constructie, 1 jaar op elektronica.'
WHERE offerte_voorwaarden IS NULL;
