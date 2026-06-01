-- ============================================================
-- 117: exact_owner_user_id in app_settings
-- ============================================================
-- Eén Exact Online-eigenaar per organisatie. De user die als eerste
-- OAuth doet wordt automatisch eigenaar. Andere admins in dezelfde org
-- zien de koppeling als read-only (kunnen syncen met hun eigen
-- exact_tokens-rij maar mogen niet zelf re-OAuth doen). Achtergrond:
-- Exact Online ondersteunt geen twee gelijktijdige OAuth-sessies per
-- bedrijfsaccount — een tweede autorisatie invalideert de eerste.
-- ============================================================

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS exact_owner_user_id UUID REFERENCES auth.users(id);

-- Backfill voor reeds gekoppelde organisaties.
--
-- FK-richting: profiles.id = auth.users.id (de facto, via de
-- handle_new_user trigger in migratie 028 die NEW.id uit auth.users
-- direct in profiles.id schrijft). exact_tokens.user_id verwijst óók
-- naar auth.users.id. We joinen via profiles om de organisatie_id van
-- de tokenhouder te bepalen. profiles.user_id is een vestigiale kolom
-- uit migratie 001 en wordt nergens gebruikt — niet inzetten voor de
-- join.
--
-- Keuze van eigenaar bij meerdere kandidaten: de user met de meest
-- recente exact_tokens.updated_at. Dat is de beste proxy voor "deze
-- user is de actuele OAuth-houder" — bij Exact's single-session-policy
-- is dit per definitie de laatste die OAuth'de.
UPDATE app_settings AS a
SET exact_owner_user_id = (
  SELECT et.user_id
  FROM exact_tokens et
  JOIN profiles p ON p.id = et.user_id
  WHERE p.organisatie_id = a.organisatie_id
  ORDER BY et.updated_at DESC
  LIMIT 1
)
WHERE a.exact_online_connected = true
  AND a.exact_owner_user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM exact_tokens et
    JOIN profiles p ON p.id = et.user_id
    WHERE p.organisatie_id = a.organisatie_id
  );
