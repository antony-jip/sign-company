-- NIET AUTOMATISCH UITVOEREN
CREATE POLICY "Allow all" ON storage.objects
FOR ALL USING (bucket_id = 'briefpapier'::text)
WITH CHECK (bucket_id = 'briefpapier'::text);
