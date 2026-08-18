-- 183_documenten_prive_org_toegang.sql
--
-- Vervangt de policy uit 182. Die was fout, en op een manier die pas bij het
-- omschakelen zichtbaar zou zijn geworden.
--
-- WAT ER MIS WAS. 182 eist dat het eerste padsegment de user-id is, zoals bij
-- de briefpapier-bucket. Zo zitten deze paden niet in elkaar. Gemeten over de
-- 508 verhuisde bestanden:
--     122  <user-id>/offerte-bijlagen/...   eigenaar in segment 1
--     384  projects/<user-id>/...           eigenaar in segment 2
--                email-bijlagen/<user-id>/..., werkbon-afbeeldingen/..., enz.
--       2  montage-bijlagen/<bestand>       geen eigenaar in het pad
-- Met de policy van 182 zouden 384 bestanden onbereikbaar zijn geweest.
--
-- HET TWEEDE, GROTERE PROBLEEM. Een user-scoped policy is sowieso verkeerd
-- voor deze bucket. Zolang documenten publiek was, kon iedereen binnen een
-- organisatie elkaars projectdocumenten zien, en dat is precies hoe doen.
-- bedoeld is: alles is gedeeld binnen een bedrijf. Op user-scope zetten zou
-- een monteur de bijlagen van zijn collega ontnemen, en dat is geen
-- beveiliging maar een regressie, juist bij een team van twintig.
--
-- Dus: organisatiebreed toegang, niets daarbuiten. De grens die verdwijnt is
-- "de hele wereld", niet "je collega".
--
-- profiles.organisatie_id staat sinds migratie 173 vast en is niet door de
-- client te wijzigen, dus die kolom is hier een betrouwbaar anker.

BEGIN;

-- Haalt de user-id uit het pad, in welke van de twee vormen hij ook staat.
-- Geeft NULL als er geen geldige uuid in zit; de policy weigert dan.
CREATE OR REPLACE FUNCTION storage_pad_eigenaar(pad text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN (storage.foldername(pad))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN ((storage.foldername(pad))[1])::uuid
    WHEN (storage.foldername(pad))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN ((storage.foldername(pad))[2])::uuid
    ELSE NULL
  END
$$;

COMMENT ON FUNCTION storage_pad_eigenaar(text) IS
  'Leest de user-id uit een storage-pad. Twee vormen komen voor: <user-id>/... '
  'en <categorie>/<user-id>/... Zie migratie 183.';

DROP POLICY IF EXISTS "Users manage own documenten-prive" ON storage.objects;
DROP POLICY IF EXISTS "documenten_prive_org" ON storage.objects;

CREATE POLICY "documenten_prive_org" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'documenten-prive'
    AND (
      EXISTS (
        SELECT 1
          FROM profiles ik
          JOIN profiles eigenaar ON eigenaar.organisatie_id = ik.organisatie_id
         WHERE ik.id = auth.uid()
           AND ik.organisatie_id IS NOT NULL
           AND eigenaar.id = storage_pad_eigenaar(name)
      )
      -- Twee montagebijlagen van voor de padconventie dragen geen user-id.
      -- Ze horen bij montage binnen de app; de alternatieven waren ze
      -- onbereikbaar maken of ze publiek laten staan.
      OR (storage.foldername(name))[1] = 'montage-bijlagen'
    )
  )
  WITH CHECK (
    bucket_id = 'documenten-prive'
    AND storage_pad_eigenaar(name) = auth.uid()
  );

COMMIT;

-- Let op het verschil tussen USING en WITH CHECK: lezen mag organisatiebreed,
-- schrijven alleen op je eigen pad. Anders kan een lid bestanden neerzetten
-- onder de naam van een collega.
--
-- Controle, als gewone gebruiker in een teruggedraaide transactie:
--   SELECT storage_pad_eigenaar('projects/921cc844-c03f-4209-9e6c-b4d46b3e588b/x.jpg');
--   -- hoort de uuid terug te geven
--   SELECT storage_pad_eigenaar('montage-bijlagen/los.png');
--   -- hoort NULL te geven
--
-- Terugdraaien:
--   DROP POLICY IF EXISTS "documenten_prive_org" ON storage.objects;
--   DROP FUNCTION IF EXISTS storage_pad_eigenaar(text);
