-- ROLLBACK 066: Herstel originele inkoopfacturen storage policies
-- NIET AUTOMATISCH UITVOEREN — alleen bij problemen na migratie 066

DROP POLICY IF EXISTS "inkoopfacturen_select_org" ON storage.objects;
DROP POLICY IF EXISTS "inkoopfacturen_insert_org" ON storage.objects;
DROP POLICY IF EXISTS "inkoopfacturen_delete_org" ON storage.objects;

-- Restore oude policies (geen org check)
CREATE POLICY "Org members upload inkoopfactuur PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inkoopfacturen');

CREATE POLICY "Org members read inkoopfactuur PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inkoopfacturen');

CREATE POLICY "Org members delete inkoopfactuur PDFs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inkoopfacturen');
