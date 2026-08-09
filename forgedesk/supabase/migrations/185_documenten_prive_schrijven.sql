-- 185_documenten_prive_schrijven.sql
--
-- Laat ingelogde gebruikers schrijven in documenten-prive. Lezen blijft
-- server-bemiddeld via api/bestand.
--
-- WAAROM DIT NODIG IS. 184 haalde alle policies weg, waardoor alleen de service
-- role erbij kon. Dat is goed voor lezen en onwerkbaar voor schrijven: de app
-- uploadt vanaf de client. Zonder INSERT zou elke nieuwe bijlage falen, en
-- lezen en schrijven moeten in één keer om, anders geeft elk nieuw bestand 404.
--
-- WAAROM ZONDER EIGENAARSCONTROLE. Dat is de vraag die telt, en het antwoord is
-- niet "makkelijker". Een controle op het pad kan hier niet, om dezelfde reden
-- als in 184: werkbon-afbeeldingen/<werkbon-id>/... bevat geen user-id, en
-- werkbonService verwijdert juist zulke bestanden. Een policy op segment 1 of 2
-- zou het verwijderen van werkbonfoto's breken.
--
-- Wat dit acceptabel maakt is dat SELECT geweigerd blijft. Zonder leesrecht kan
-- niemand de bucket doorzoeken, dus je kunt alleen iets raken waarvan je het
-- volledige pad al kent, en die paden bestaan uit uuid's die nergens worden
-- prijsgegeven. Je kunt niet verwijderen wat je niet kunt vinden.
--
-- De grens die deze hele ronde verlegt, ligt bij lezen: dat was een publieke
-- URL en is nu een controle tegen organisatie_id. Schrijven kon al en blijft
-- kunnen.
--
-- Netter zou zijn: alle uploads onder <user-id>/... en dan wél een
-- eigenaarscontrole. Dat raakt elke upload-aanroeper en is opruimwerk voor
-- later, geen voorwaarde voor deze stap.

BEGIN;

DROP POLICY IF EXISTS "documenten_prive_schrijven" ON storage.objects;

CREATE POLICY "documenten_prive_schrijven" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documenten-prive');

DROP POLICY IF EXISTS "documenten_prive_bijwerken" ON storage.objects;

CREATE POLICY "documenten_prive_bijwerken" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documenten-prive')
  WITH CHECK (bucket_id = 'documenten-prive');

DROP POLICY IF EXISTS "documenten_prive_verwijderen" ON storage.objects;

CREATE POLICY "documenten_prive_verwijderen" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documenten-prive');

-- Nadrukkelijk GEEN policy voor SELECT. Dat is de hele beveiliging: lezen loopt
-- via api/bestand, dat de organisatie controleert tegen de databaserij.

COMMIT;

-- Controle: hoort INSERT, UPDATE en DELETE te tonen, en geen SELECT.
--   SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects'
--      AND policyname LIKE 'documenten_prive%';
--
-- Terugdraaien:
--   DROP POLICY IF EXISTS "documenten_prive_schrijven" ON storage.objects;
--   DROP POLICY IF EXISTS "documenten_prive_bijwerken" ON storage.objects;
--   DROP POLICY IF EXISTS "documenten_prive_verwijderen" ON storage.objects;
