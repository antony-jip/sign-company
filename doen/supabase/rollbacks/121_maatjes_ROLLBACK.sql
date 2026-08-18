-- ============================================================
-- ROLLBACK migratie 121: maatjes
-- NIET AUTOMATISCH UITVOEREN — alleen handmatig in de SQL Editor.
--
-- Let op: dit verwijdert de maatjes-tabel (incl. alle rijen) en de
-- storage-policies. Bestanden in de 'maatjes'-bucket moeten apart
-- worden opgeruimd voordat de bucket te verwijderen is.
-- ============================================================

DROP TRIGGER IF EXISTS update_maatjes_updated_at ON maatjes;

DROP POLICY IF EXISTS "Org members manage maatjes" ON maatjes;

DROP TABLE IF EXISTS maatjes;

DROP POLICY IF EXISTS "Org members upload maatje afbeeldingen" ON storage.objects;
DROP POLICY IF EXISTS "Org members read maatje afbeeldingen" ON storage.objects;
DROP POLICY IF EXISTS "Org members update maatje afbeeldingen" ON storage.objects;
DROP POLICY IF EXISTS "Org members delete maatje afbeeldingen" ON storage.objects;

-- Bucket pas verwijderen nadat alle objecten zijn opgeruimd:
-- DELETE FROM storage.objects WHERE bucket_id = 'maatjes';
-- DELETE FROM storage.buckets WHERE id = 'maatjes';
