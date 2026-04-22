BEGIN;

-- handle_new_user: trigger maakt nu ook de organisatie aan voor
-- legitieme nieuwe users (geen invite). Verplaatst van frontend
-- createOrganisatie — omzeilt RLS via SECURITY DEFINER.
--
-- Logica:
-- 1. Zoek geldige uitnodiging op email.
-- 2. Match: koppel profile aan bestaande org met rol uit uitnodiging.
-- 3. Geen match: INSERT nieuwe organisatie + koppel profile met rol=admin.
-- 4. INSERT profile met bepaalde org/rol.
-- 5. Markeer eventuele uitnodiging als geaccepteerd.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_uitnodiging RECORD;
  v_organisatie_id UUID;
  v_rol TEXT;
  v_uitgenodigd_door UUID;
BEGIN
  SELECT organisatie_id, rol, uitgenodigd_door
  INTO v_uitnodiging
  FROM public.uitnodigingen
  WHERE email = NEW.email
    AND status = 'verstuurd'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_uitnodiging.organisatie_id IS NOT NULL THEN
    v_organisatie_id := v_uitnodiging.organisatie_id;
    v_rol := COALESCE(v_uitnodiging.rol, 'medewerker');
    v_uitgenodigd_door := v_uitnodiging.uitgenodigd_door;
  ELSE
    INSERT INTO public.organisaties (
      naam, eigenaar_id, abonnement_status,
      onboarding_compleet, onboarding_stap, created_at
    )
    VALUES (
      'Mijn Bedrijf', NEW.id, 'trial',
      false, 0, NOW()
    )
    RETURNING id INTO v_organisatie_id;

    v_rol := 'admin';
    v_uitgenodigd_door := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, email, voornaam, achternaam,
    organisatie_id, rol, status,
    uitgenodigd_door, uitgenodigd_op
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'voornaam', ''),
    COALESCE(NEW.raw_user_meta_data->>'achternaam', ''),
    v_organisatie_id,
    v_rol,
    'actief',
    v_uitgenodigd_door,
    CASE WHEN v_uitgenodigd_door IS NOT NULL
         THEN NOW() ELSE NULL END
  );

  IF v_uitnodiging.organisatie_id IS NOT NULL THEN
    UPDATE public.uitnodigingen
    SET status = 'geaccepteerd'
    WHERE email = NEW.email
      AND status = 'verstuurd'
      AND expires_at > NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy-split op organisaties.
-- Was: FOR ALL USING (id = auth_organisatie_id())  — dekt ook INSERT
-- als WITH CHECK wanneer USING wordt hergebruikt.
-- Nu: aparte policies per command, met expliciete INSERT-policy
-- als defensieve backup (trigger doet de echte org-creatie via
-- SECURITY DEFINER en omzeilt RLS).

DROP POLICY IF EXISTS "Leden zien eigen organisatie" ON organisaties;

CREATE POLICY "Leden zien eigen organisatie" ON organisaties
  FOR SELECT USING (id = auth_organisatie_id());

CREATE POLICY "Leden updaten eigen organisatie" ON organisaties
  FOR UPDATE USING (id = auth_organisatie_id());

CREATE POLICY "Leden verwijderen eigen organisatie" ON organisaties
  FOR DELETE USING (id = auth_organisatie_id());

CREATE POLICY "Nieuwe gebruiker maakt eerste organisatie" ON organisaties
  FOR INSERT WITH CHECK (eigenaar_id = auth.uid());

COMMIT;
