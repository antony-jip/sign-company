-- 197_inkoopfacturen_referentie_kenmerk.sql
--
-- Twee velden die Claude al ziet maar tot nu toe weggooide.
--
-- api/inkoopfactuur-extract.ts stuurt de PDF één keer naar Claude en leest
-- daar leverancier, nummer, datums, bedragen en de regels uit. Op een
-- leveranciersfactuur staat vaak óók een PO-, order- of referentienummer en
-- soms de projectaanduiding zelf. Die stonden niet in het JSON-schema, dus
-- ging die informatie verloren en koos de gebruiker het project daarna met
-- de hand uit een lijst van álle projecten.
--
-- Deze twee kolommen kosten geen extra AI-call: zelfde PDF, zelfde request,
-- twee velden meer output.
--
-- BEWUST GEEN project_id-kolom en geen automatische koppeling. Wat hier
-- landt is ruwe tekst van de leverancier, geen besluit. De app matcht die
-- tekst bij het reviewen tegen de open projecten en zet de uitkomst als
-- VOORSTEL in de projectkiezer; de gebruiker bevestigt. Een factuur op het
-- verkeerde project vervuilt de nacalculatie, en dat is erger dan een klik.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien.
-- ============================================================

BEGIN;

ALTER TABLE inkoopfacturen
  ADD COLUMN IF NOT EXISTS referentie_kenmerk text,
  ADD COLUMN IF NOT EXISTS vermoedelijk_project text;

COMMENT ON COLUMN inkoopfacturen.referentie_kenmerk IS
  'PO-, order- of referentienummer zoals het op de factuur staat. Ruwe tekst uit de AI-extractie, geen koppeling.';
COMMENT ON COLUMN inkoopfacturen.vermoedelijk_project IS
  'Projectnaam of -aanduiding zoals die op de factuur staat. Ruwe tekst uit de AI-extractie, geen koppeling.';

COMMIT;

-- ============================================================
-- Verificatie: hoort 2 rijen te geven.
-- ============================================================
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'inkoopfacturen'
   AND column_name IN ('referentie_kenmerk', 'vermoedelijk_project')
 ORDER BY column_name;

-- Migratie-administratie: de tabel komt pas in 198, dus deze regel kan hier nog
-- niet draaien. Voer hem uit NADAT 198 gedraaid is.
-- INSERT INTO doen_migraties (bestand)
--   VALUES ('197_inkoopfacturen_referentie_kenmerk.sql')
--   ON CONFLICT DO NOTHING;
