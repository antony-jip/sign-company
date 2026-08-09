-- 184_documenten_prive_alleen_server.sql
--
-- Trekt de policy uit 183 in. Die was fout, en de meting laat zien waarom.
--
-- 183 ging ervan uit dat de uuid in het pad de eigenaar is, in een van twee
-- vormen. Nagemeten over de 508 verhuisde bestanden verwijst die uuid naar
-- drie verschillende dingen:
--
--     157  email-bijlagen/<user-id>/...          een gebruiker
--      50  <user-id>/offerte-bijlagen/...        een gebruiker
--      62  projects/<organisatie-id>/...         een ORGANISATIE
--     108  werkbon-afbeeldingen/<werkbon-id>/... noch gebruiker, noch organisatie
--      29  projects/<onbekend>/...
--      72  <onbekend>/portaal/...                gebruiker die niet meer bestaat
--       2  montage-bijlagen/<bestand>            geen id in het pad
--
-- Met de policy van 183 zouden 299 van de 508 bestanden onbereikbaar zijn
-- geweest voor iedereen behalve de service role. Dat zou pas zijn opgevallen
-- toen de app al omgeschakeld was.
--
-- DE ONDERLIGGENDE CONCLUSIE. Deze paden dragen geen betrouwbare eigenaar, dus
-- organisatie-isolatie is er niet uit af te leiden. Padgebaseerde RLS is
-- daarmee het verkeerde gereedschap voor deze bucket. Wat de bestanden wel aan
-- een organisatie koppelt, staat in de database: portaal_bestanden,
-- werkbon_afbeeldingen, project_documenten en offerte_items dragen allemaal een
-- organisatie_id.
--
-- Dus wordt lezen server-bemiddeld, zoals api/portaal-get het al doet: die
-- route kijkt de rij op, controleert de organisatie en ondertekent dan pas.
-- Daar hoort deze bucket bij, en daarom krijgt authenticated hier niets.
--
-- Dat is geen tussenoplossing. In de eindvorm heeft de client ook geen directe
-- toegang tot deze bucket nodig.

BEGIN;

DROP POLICY IF EXISTS "documenten_prive_org" ON storage.objects;
DROP POLICY IF EXISTS "Users manage own documenten-prive" ON storage.objects;

-- Geen policy voor authenticated of anon. Met RLS aan op storage.objects
-- betekent dat: alleen de service role komt erbij. Bewust, zie hierboven.

DROP FUNCTION IF EXISTS storage_pad_eigenaar(text);

-- Geen COMMENT ON SCHEMA storage: die is eigendom van Supabase en niet door
-- ons te wijzigen (42501 must be owner of schema storage). De uitleg staat
-- daarom bovenaan dit bestand in plaats van in de database.

COMMIT;

-- Controle: hoort 0 rijen te geven voor authenticated.
--   SELECT count(*) FROM pg_policies
--    WHERE tablename = 'storage.objects' AND qual LIKE '%documenten-prive%';
--
-- De bucket wordt op dit moment door NIETS gelezen. De app leest nog uit
-- documenten. Deze migratie is dus veilig en verandert geen gedrag.
