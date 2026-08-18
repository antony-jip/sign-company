-- NIET AUTOMATISCH UITVOEREN
-- Herstelt de kwetsbare trigger en verwijdert de CHECK constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, voornaam, achternaam, organisatie_id, rol, status, uitgenodigd_door, uitgenodigd_op)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'voornaam', ''),
    COALESCE(NEW.raw_user_meta_data->>'achternaam', ''),
    (NEW.raw_user_meta_data->>'organisatie_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'medewerker'),
    'actief',
    (NEW.raw_user_meta_data->>'uitgenodigd_door')::UUID,
    CASE WHEN NEW.raw_user_meta_data->>'uitgenodigd_door' IS NOT NULL THEN NOW() ELSE NULL END
  );
  UPDATE public.uitnodigingen SET status = 'geaccepteerd' WHERE email = NEW.email AND status = 'verstuurd';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
