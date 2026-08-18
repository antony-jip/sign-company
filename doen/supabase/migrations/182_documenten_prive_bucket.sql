-- 182_documenten_prive_bucket.sql
--
-- Private tegenhanger van de documenten-bucket.
--
-- WAAROM NIET DE BESTAANDE BUCKET DICHTZETTEN. Dat was het oorspronkelijke plan
-- en het kan niet. E-mailhandtekeningen bevatten afbeeldingen uit documenten,
-- en die handtekening-HTML is meegestuurd in mail die al bij klanten ligt. Een
-- verstuurde mail valt niet meer te wijzigen, dus die URLs moeten blijven
-- werken. Op privaat zetten maakt afbeeldingen blanco in correspondentie die de
-- deur uit is, en geen codewijziging repareert dat achteraf.
--
-- Dus omgekeerd: het gevoelige gaat eruit, het publieke blijft staan.
--
-- Gemeten in productie: 529 bestanden, 552 MB. Daarvan zijn er 21 (1,4 MB)
-- handtekening-afbeeldingen die publiek moeten blijven. Er staan er maar 2 in
-- de huidige handtekeningen, maar de andere 19 zaten in eerdere versies die al
-- verstuurd zijn, dus alle 21 blijven staan. De overige 508 (projectdocumenten,
-- offertebijlagen, portaalbestanden, visualisaties) verhuizen hierheen.
--
-- Paden blijven identiek, zodat de waarden in de database ongewijzigd kunnen
-- blijven: alleen de bucket waaruit gelezen wordt verandert.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documenten-prive', 'documenten-prive', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Zelfde afscherming als de bestaande private buckets: schrijven en lezen
-- alleen binnen je eigen map. De eerste padsegment is de user-id, net als in
-- documenten.
DROP POLICY IF EXISTS "Users manage own documenten-prive" ON storage.objects;
CREATE POLICY "Users manage own documenten-prive" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documenten-prive'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;

-- Controle:
--   SELECT id, public FROM storage.buckets WHERE id = 'documenten-prive';
--   SELECT count(*) FROM storage.objects WHERE bucket_id = 'documenten-prive';
--
-- De originelen in documenten blijven bewust staan tot de omschakeling is
-- bevestigd. Opruimen is een aparte, onomkeerbare stap.
--
-- Terugdraaien (alleen zolang de code nog uit documenten leest):
--   DROP POLICY IF EXISTS "Users manage own documenten-prive" ON storage.objects;
--   DELETE FROM storage.objects WHERE bucket_id = 'documenten-prive';
--   DELETE FROM storage.buckets WHERE id = 'documenten-prive';
