-- ============================================================
-- 095: Factuur PDF storage + Exact Online bijlage-koppeling
-- ============================================================
-- Voegt persistente PDF-opslag toe voor uitgaande facturen
-- (bucket `facturen`, strict org-scoped policies) en de DB-state
-- om de Exact Online Document/Attachment-koppeling te volgen.
--
-- Pad-conventie in bucket `facturen`:
--   {organisatie_id}/{factuur_id}.pdf
--
-- Factuurnummer zit NIET in het pad — kan wijzigen en zou drift
-- met de DB geven. Herkenbare downloadnaam regelen we via
-- Content-Disposition op de signed URL bij download.
--
-- Bekende edge case (niet in deze migratie opgelost):
--   Verwijderde facturen laten orphan-PDFs in Storage achter.
--   Cleanup gepland als Trigger.dev-job na FESPA.
--
-- OPMERKING: Deze SQL draait Antony handmatig in het Supabase
-- dashboard. Dit bestand dient als documentatie en voor
-- toekomstige deployments.
-- ============================================================

-- 1. Kolommen op facturen-tabel
ALTER TABLE facturen
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_gegenereerd_op timestamptz,
  ADD COLUMN IF NOT EXISTS exact_document_id text,
  ADD COLUMN IF NOT EXISTS exact_bijlage_gesynced_op timestamptz;

COMMENT ON COLUMN facturen.pdf_storage_path IS
  'Pad in storage.buckets.facturen, conventie: {organisatie_id}/{factuur_id}.pdf';

-- 2. Kolommen op app_settings (Exact DocumentType-cache)
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS exact_document_type_id integer,
  ADD COLUMN IF NOT EXISTS exact_document_type_naam text;

-- 3. Storage bucket `facturen` (private)
-- Bucket-niveau COMMENT bestaat niet in Postgres; pad-conventie staat
-- gedocumenteerd op facturen.pdf_storage_path én in de header van dit bestand.
INSERT INTO storage.buckets (id, name, public)
VALUES ('facturen', 'facturen', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies — strikt org-scoped via EXISTS op facturen
-- factuur_id wordt uit het pad geëxtraheerd: segment 2 ('{id}.pdf')
-- gestript van de '.pdf'-extensie.
--
-- Service-role (SUPABASE_SERVICE_ROLE_KEY in Vercel functies) bypassed
-- RLS automatisch — server-side uploads vanuit api/* werken zonder dat
-- de policy verzwakt hoeft te worden.
DROP POLICY IF EXISTS "Org members read factuur PDFs" ON storage.objects;
CREATE POLICY "Org members read factuur PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'facturen'
    AND EXISTS (
      SELECT 1 FROM facturen
      WHERE facturen.id::text = split_part(split_part(name, '/', 2), '.', 1)
        AND facturen.organisatie_id = auth_organisatie_id()
    )
  );

DROP POLICY IF EXISTS "Org members upload factuur PDFs" ON storage.objects;
CREATE POLICY "Org members upload factuur PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'facturen'
    AND EXISTS (
      SELECT 1 FROM facturen
      WHERE facturen.id::text = split_part(split_part(name, '/', 2), '.', 1)
        AND facturen.organisatie_id = auth_organisatie_id()
    )
  );

DROP POLICY IF EXISTS "Org members update factuur PDFs" ON storage.objects;
CREATE POLICY "Org members update factuur PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'facturen'
    AND EXISTS (
      SELECT 1 FROM facturen
      WHERE facturen.id::text = split_part(split_part(name, '/', 2), '.', 1)
        AND facturen.organisatie_id = auth_organisatie_id()
    )
  )
  WITH CHECK (
    bucket_id = 'facturen'
    AND EXISTS (
      SELECT 1 FROM facturen
      WHERE facturen.id::text = split_part(split_part(name, '/', 2), '.', 1)
        AND facturen.organisatie_id = auth_organisatie_id()
    )
  );

DROP POLICY IF EXISTS "Org members delete factuur PDFs" ON storage.objects;
CREATE POLICY "Org members delete factuur PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'facturen'
    AND EXISTS (
      SELECT 1 FROM facturen
      WHERE facturen.id::text = split_part(split_part(name, '/', 2), '.', 1)
        AND facturen.organisatie_id = auth_organisatie_id()
    )
  );
