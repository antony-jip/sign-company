-- ============================================================
-- 046: Fix SECURITY DEFINER functies
--
-- cleanup_old_data() draait met SECURITY DEFINER (bypassed RLS)
-- en verwijdert data van ALLE users. Fix: maak het SECURITY INVOKER
-- zodat RLS policies respecteert worden.
--
-- handle_new_user() MOET SECURITY DEFINER zijn (insert profile bij
-- registratie wanneer user nog geen RLS rechten heeft). Dat is correct.
-- ============================================================

-- Herdefinieer cleanup_old_data als SECURITY INVOKER
-- Zodat het alleen data verwijdert die de aanroepende user mag zien (via RLS)
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  -- Verwijder gelezen notificaties ouder dan 90 dagen
  DELETE FROM notificaties
  WHERE gelezen = true
    AND created_at < now() - interval '90 days';

  -- Verwijder oude portaal activiteiten ouder dan 180 dagen
  DELETE FROM portaal_activiteiten
  WHERE created_at < now() - interval '180 days';
END;
$$;

-- Documentatie: handle_new_user() blijft SECURITY DEFINER
-- omdat het een trigger is op auth.users die een profile moet aanmaken
-- voordat de user RLS rechten heeft. Dit is het verwachte Supabase patroon.
COMMENT ON FUNCTION handle_new_user() IS
  'SECURITY DEFINER: bewust — trigger op auth.users, user heeft nog geen profile/RLS rechten bij registratie';
