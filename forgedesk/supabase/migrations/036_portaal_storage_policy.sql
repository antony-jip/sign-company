-- Public read access voor portaal bestanden in de documenten bucket
-- Portaal foto's/documenten worden opgeslagen als: {user_id}/portaal/{portaal_id}/{filename}
CREATE POLICY "Public read portaal bestanden" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documenten'
    AND (storage.foldername(name))[2] = 'portaal'
  );

-- Zorg dat portaal-bestanden bucket bestaat en publiek is
INSERT INTO storage.buckets (id, name, public)
VALUES ('portaal-bestanden', 'portaal-bestanden', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access voor portaal-bestanden bucket (klant uploads)
CREATE POLICY "Public read portaal-bestanden bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'portaal-bestanden'
  );
