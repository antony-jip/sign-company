-- ============================================================
-- Migration 094: project-fotos bucket — MIME-uitbreiding
--
-- Bucket 'project-fotos' staat sinds migration 026 op alleen
-- image-MIMEs. Taak-bijlagen (uploadTaakBijlage) schrijven naar
-- dezelfde bucket en kunnen daardoor geen documenten opnemen,
-- terwijl de modal-accept-filter (image/*,.pdf,.doc,.docx) en
-- de service-laag dat al wel toelaten.
--
-- Deze migratie breidt allowed_mime_types uit met PDF, Word,
-- Excel en plain text. File-size limit (50MB) en RLS-policies
-- blijven ongewijzigd.
-- ============================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]
WHERE id = 'project-fotos';
