BEGIN;

-- Fix B1 + B5: handle_new_user gebruikt uitnodigingen als
-- waarheidsbron, niet user metadata. Expires_at wordt
-- gerespecteerd.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_uitnodiging RECORD;
BEGIN
  -- Zoek geldige uitnodiging (email match, nog verstuurd, niet verlopen)
  SELECT organisatie_id, rol, uitgenodigd_door
  INTO v_uitnodiging
  FROM public.uitnodigingen
  WHERE email = NEW.email
    AND status = 'verstuurd'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- INSERT profile met gevalideerde waarden uit uitnodiging
  -- Als geen uitnodiging: organisatie_id en rol blijven NULL,
  -- AuthContext maakt dan legitieme nieuwe org aan.
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
    v_uitnodiging.organisatie_id,
    COALESCE(v_uitnodiging.rol, 'medewerker'),
    'actief',
    v_uitnodiging.uitgenodigd_door,
    CASE WHEN v_uitnodiging.uitgenodigd_door IS NOT NULL
         THEN NOW() ELSE NULL END
  );

  -- Markeer uitnodiging als geaccepteerd (alleen geldige)
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

-- Fix B3: CHECK-constraint op rol whitelist
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_rol_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_rol_check
CHECK (rol IS NULL OR rol IN ('admin', 'medewerker', 'monteur', 'verkoop', 'productie'));

COMMIT;
