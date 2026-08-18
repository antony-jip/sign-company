-- ============================================================
-- 098: factuur_bijlagen — per-bijlage Exact-sync tracking
-- ============================================================
-- Voegt `exact_synced_op` toe aan factuur_bijlagen zodat we per
-- bijlage weten of de DocumentAttachment-POST naar Exact Online
-- geslaagd is. NULL = nog niet gesynced of laatste poging mislukt.
--
-- Use case: Exact kan op één enkele bijlage stuk gaan (corrupte
-- PDF, mime-rejection, size-limit) terwijl andere wel landen.
-- Zonder per-bijlage status zou de retry-knop alle bijlagen
-- opnieuw moeten posten — dubbel werk en risico op duplicates in
-- het Exact-dossier.
--
-- Partial index voor "welke bijlagen moet ik nog (re-)syncen?":
-- WHERE exact_synced_op IS NULL maakt deze query goedkoop, ook
-- als de tabel groeit naar tienduizenden rijen.
--
-- OPMERKING: Deze SQL draait Antony handmatig in het Supabase
-- dashboard. Dit bestand dient als documentatie en voor
-- toekomstige deployments.
-- ============================================================

ALTER TABLE factuur_bijlagen
  ADD COLUMN exact_synced_op timestamptz NULL;

COMMENT ON COLUMN factuur_bijlagen.exact_synced_op IS
  'Tijdstip van succesvolle sync naar Exact Online DocumentAttachment. NULL = nog niet gesynced of mislukt. Voor retry-knop in UI.';

CREATE INDEX idx_factuur_bijlagen_nog_te_syncen
  ON factuur_bijlagen(factuur_id)
  WHERE exact_synced_op IS NULL;
