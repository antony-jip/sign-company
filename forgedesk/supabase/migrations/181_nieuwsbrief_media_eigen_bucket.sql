-- 181_nieuwsbrief_media_eigen_bucket.sql
--
-- Haalt de nieuwsbriefafbeeldingen uit de documenten-bucket.
--
-- WAAROM. De documenten-bucket staat publiek en bevat projectdocumenten,
-- offertebijlagen en klanthandtekeningen. Die hoort dicht te kunnen. Precies
-- een ding blokkeerde dat: nieuwsbriefService.uploadAfbeelding schreef er
-- afbeeldingen heen die IN E-MAILS worden getoond, en een mailclient kan geen
-- ondertekende, vervallende link openen. Zolang beide soorten in dezelfde
-- bucket zitten, is er geen instelling die allebei goed doet.
--
-- WAAROM DIT NU KAN. Gemeten in productie: de documenten-bucket bevat 453
-- bestanden en daarvan zijn er 0 nieuwsbrief-media. De functie bestaat wel maar
-- is nooit gebruikt. Er valt dus niets te verhuizen; dit is een omleiding voor
-- toekomstige uploads, niet een migratie van bestaande. Dat maakt het verschil
-- tussen een risicovolle verplaatsing en een lege bucket erbij.
--
-- De bucket is BEWUST publiek. Dat is geen slordigheid maar de eis: de
-- afbeelding moet nog laden als de ontvanger de nieuwsbrief over drie maanden
-- terugzoekt. Wat erin komt is marketingbeeld dat je zelf rondstuurt, geen
-- klantdocument.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nieuwsbrief-media',
  'nieuwsbrief-media',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Schrijven mag alleen in je eigen map, lezen mag iedereen: dat is wat
-- "publiek" hier betekent. Zelfde vorm als de briefpapier-policy uit 045.
DROP POLICY IF EXISTS "Users manage own nieuwsbrief-media" ON storage.objects;
CREATE POLICY "Users manage own nieuwsbrief-media" ON storage.objects
  FOR ALL USING (
    bucket_id = 'nieuwsbrief-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;

-- Controle:
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'nieuwsbrief-media';
--
-- En de reden dat dit bestaat, blijft toetsbaar:
--   SELECT count(*) FROM storage.objects
--    WHERE bucket_id = 'documenten' AND name LIKE '%nieuwsbrief-media%';
--   -- hoort 0 te blijven; loopt dit op, dan schrijft er nog iets naar de oude plek
--
-- Terugdraaien:
--   DROP POLICY IF EXISTS "Users manage own nieuwsbrief-media" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'nieuwsbrief-media';
--   -- alleen veilig zolang de bucket leeg is
