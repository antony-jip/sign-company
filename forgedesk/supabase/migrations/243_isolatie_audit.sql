-- Isolatie-audit voor 50 organisaties (6 sep 2026): drie database-gaten.
--
-- 1. organisaties.eigenaar_id zat niet in de guard van migratie 217, dus elk
--    lid kon zichzelf eigenaar maken (billing-mail, support-toewijzing).
-- 2. visualizer_credits en credit_transacties waren door org-leden vanuit de
--    browser bij te schrijven (migratie 059): iedereen kon zichzelf credits
--    geven. Saldo loopt voortaan alleen via de RPC's van migratie 147 en de
--    billing-webhook (service_role); de browser mag alleen de welkomstrij maken.
-- 3. Storage: documenten-prive was voor elke ingelogde gebruiker op elk pad
--    schrijfbaar (185), en project-fotos accepteerde uploads in elke
--    projectmap (028). Het pad wordt nu aan de gebruiker of de organisatie
--    gebonden. Padvormen in gebruik in documenten-prive: {user}/...,
--    email-bijlagen/{user}/..., email-bijlagen-groot/{user}/...,
--    projects/{org}/..., montage-bijlagen/{org}/..., werkbon-fotos/{werkbon}/...,
--    werkbon-afbeeldingen/{werkbon_item}/... en werkbon-pdfs/{werkbon_item}/...
--    In project-fotos: {project_id}/... en taken/{taak_id}/...

BEGIN;

-- 1. Eigenaar alleen via de backend
CREATE OR REPLACE FUNCTION organisaties_staffel_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.max_gebruikers := 10;
    NEW.abonnement_bedrag_excl := NULL;
    NEW.ai_maandlimiet := NULL;
    NEW.abonnement_status := 'trial';
    NEW.is_betaald := false;
    NEW.abonnement_actief_tot := NULL;
    NEW.mollie_customer_id := NULL;
    NEW.mollie_subscription_id := NULL;
    NEW.trial_start := NOW();
    NEW.trial_einde := NOW() + INTERVAL '30 days';
    RETURN NEW;
  END IF;

  IF NEW.max_gebruikers IS DISTINCT FROM OLD.max_gebruikers
     OR NEW.abonnement_bedrag_excl IS DISTINCT FROM OLD.abonnement_bedrag_excl
     OR NEW.ai_maandlimiet IS DISTINCT FROM OLD.ai_maandlimiet
     OR NEW.abonnement_status IS DISTINCT FROM OLD.abonnement_status
     OR NEW.abonnement_actief_tot IS DISTINCT FROM OLD.abonnement_actief_tot
     OR NEW.is_betaald IS DISTINCT FROM OLD.is_betaald
     OR NEW.trial_start IS DISTINCT FROM OLD.trial_start
     OR NEW.trial_einde IS DISTINCT FROM OLD.trial_einde
     OR NEW.mollie_customer_id IS DISTINCT FROM OLD.mollie_customer_id
     OR NEW.mollie_subscription_id IS DISTINCT FROM OLD.mollie_subscription_id
     OR NEW.eigenaar_id IS DISTINCT FROM OLD.eigenaar_id THEN
    RAISE EXCEPTION
      'Staffel-, abonnements-, trial- en eigenaarvelden zijn alleen via de backend te wijzigen';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Credits: saldo wijzigen alleen via RPC (147) en de billing-webhook.
--    Vanuit de browser mag nog precies één ding: de welkomstrij van maximaal
--    10 credits aanmaken (visualizerService.getVisualizerCredits) plus de
--    bijbehorende logregel. Bijschrijven of aftrekken kan niet meer.
DROP POLICY IF EXISTS "Org members update credits" ON visualizer_credits;
DROP POLICY IF EXISTS "Org members insert credits" ON visualizer_credits;
CREATE POLICY "Org members insert credits" ON visualizer_credits
  FOR INSERT TO authenticated
  WITH CHECK (
    organisatie_id = auth_organisatie_id()
    AND user_id = auth.uid()
    AND saldo <= 10
    AND totaal_gekocht <= 10
    AND totaal_gebruikt = 0
  );

DROP POLICY IF EXISTS "Org members insert transactions" ON credit_transacties;
CREATE POLICY "Org members insert transactions" ON credit_transacties
  FOR INSERT TO authenticated
  WITH CHECK (
    organisatie_id = auth_organisatie_id()
    AND user_id = auth.uid()
    AND type = 'handmatig_toegevoegd'
    AND aantal <= 10
  );

-- 3a. documenten-prive: schrijven alleen in je eigen map of in een map van je organisatie
DROP POLICY IF EXISTS "documenten_prive_schrijven" ON storage.objects;
CREATE POLICY "documenten_prive_schrijven" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documenten-prive'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth_organisatie_id()::text
      OR (
        (storage.foldername(name))[1] = 'werkbon-fotos'
        AND EXISTS (
          SELECT 1 FROM werkbonnen w
          WHERE w.id::text = (storage.foldername(name))[2]
            AND w.organisatie_id = auth_organisatie_id()
        )
      )
      OR (
        (storage.foldername(name))[1] IN ('werkbon-afbeeldingen', 'werkbon-pdfs')
        AND EXISTS (
          SELECT 1 FROM werkbon_items wi
          WHERE wi.id::text = (storage.foldername(name))[2]
            AND wi.organisatie_id = auth_organisatie_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "documenten_prive_bijwerken" ON storage.objects;
CREATE POLICY "documenten_prive_bijwerken" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documenten-prive'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth_organisatie_id()::text
      OR (
        (storage.foldername(name))[1] = 'werkbon-fotos'
        AND EXISTS (
          SELECT 1 FROM werkbonnen w
          WHERE w.id::text = (storage.foldername(name))[2]
            AND w.organisatie_id = auth_organisatie_id()
        )
      )
      OR (
        (storage.foldername(name))[1] IN ('werkbon-afbeeldingen', 'werkbon-pdfs')
        AND EXISTS (
          SELECT 1 FROM werkbon_items wi
          WHERE wi.id::text = (storage.foldername(name))[2]
            AND wi.organisatie_id = auth_organisatie_id()
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'documenten-prive'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth_organisatie_id()::text
      OR (
        (storage.foldername(name))[1] = 'werkbon-fotos'
        AND EXISTS (
          SELECT 1 FROM werkbonnen w
          WHERE w.id::text = (storage.foldername(name))[2]
            AND w.organisatie_id = auth_organisatie_id()
        )
      )
      OR (
        (storage.foldername(name))[1] IN ('werkbon-afbeeldingen', 'werkbon-pdfs')
        AND EXISTS (
          SELECT 1 FROM werkbon_items wi
          WHERE wi.id::text = (storage.foldername(name))[2]
            AND wi.organisatie_id = auth_organisatie_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "documenten_prive_verwijderen" ON storage.objects;
CREATE POLICY "documenten_prive_verwijderen" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documenten-prive'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth_organisatie_id()::text
      OR (
        (storage.foldername(name))[1] = 'werkbon-fotos'
        AND EXISTS (
          SELECT 1 FROM werkbonnen w
          WHERE w.id::text = (storage.foldername(name))[2]
            AND w.organisatie_id = auth_organisatie_id()
        )
      )
      OR (
        (storage.foldername(name))[1] IN ('werkbon-afbeeldingen', 'werkbon-pdfs')
        AND EXISTS (
          SELECT 1 FROM werkbon_items wi
          WHERE wi.id::text = (storage.foldername(name))[2]
            AND wi.organisatie_id = auth_organisatie_id()
        )
      )
    )
  );

-- 3b. project-fotos: uploaden alleen in een project- of taakmap van je eigen organisatie.
--     Padvormen: {project_id}/... (projectfoto's) en taken/{taak_id}/... (taakfoto's).
--     De policy uit 035 ("Users can upload to own project-fotos") eist projecten.user_id
--     = auth.uid() en blokkeert dus collega's; die gaat mee weg. Policies zijn OR-gekoppeld,
--     dus de brede uit 028 moet weg om effect te hebben.
DROP POLICY IF EXISTS "Users upload project fotos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own project-fotos" ON storage.objects;
CREATE POLICY "Users upload project fotos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-fotos'
    AND (
      EXISTS (
        SELECT 1 FROM projecten p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.organisatie_id = auth_organisatie_id()
      )
      OR (
        (storage.foldername(name))[1] = 'taken'
        AND EXISTS (
          SELECT 1 FROM taken t
          WHERE t.id::text = (storage.foldername(name))[2]
            AND t.organisatie_id = auth_organisatie_id()
        )
      )
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('243_isolatie_audit.sql') ON CONFLICT DO NOTHING;
