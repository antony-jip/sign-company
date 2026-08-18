-- 173_profiles_rol_en_org_vastzetten.sql
--
-- Sluit een gat dat in productie openstond. De policies op profiles zijn:
--
--   profiles_select  SELECT  USING ((organisatie_id = auth_organisatie_id()) OR (id = auth.uid()))
--   profiles_insert  INSERT  WITH CHECK (id = auth.uid())
--   profiles_update  UPDATE  USING (id = auth.uid())        <- geen WITH CHECK
--   profiles_delete  DELETE  USING (id = auth.uid())
--
-- Op een UPDATE zonder WITH CHECK hergebruikt Postgres de USING-clausule als
-- check op de nieuwe rij. Die blijft waar zolang id gelijk blijft, dus elke
-- ingelogde gebruiker kon zijn eigen rij aanpassen:
--
--   * rol op 'admin' zetten. Daarmee komt hij door de adminchecks in
--     api/invite-team-member en api/manage-team-member.
--   * organisatie_id op de id van een ander bedrijf zetten. auth_organisatie_id()
--     leest die kolom, dus daarna ziet hij alle data van dat bedrijf. Dit is het
--     zwaardere van de twee: het is cross-org, niet alleen escalatie binnen de
--     eigen organisatie.
--
-- Via DELETE gevolgd door INSERT (beide toegestaan op de eigen rij) is hetzelfde
-- te bereiken, dus de INSERT hoort er ook in.
--
-- RLS kan niet per kolom, dus dit is een trigger, hetzelfde patroon als 172.
-- Rolbepaling via current_user: PostgREST zet de rol met SET LOCAL ROLE, en
-- handle_new_user draait als SECURITY DEFINER en valt daarmee in de allow-list.
--
-- Waarom dit bestaande flows niet breekt:
--   * src/services/profielService.ts doet een upsert met de volledige rij terug
--     (merged = {...existing, ...updates}). rol en organisatie_id gaan dus mee,
--     maar met dezelfde waarde, en IS DISTINCT FROM laat dat door.
--   * De enige andere frontend-schrijfactie op profiles is avatar_url.
--   * Alle api/-routes draaien op service_role en zijn vrijgesteld.
--
-- Op INSERT weigeren we niet, maar zetten we terug naar veilig: geen organisatie
-- en de laagste rol. Wie zijn profiel weggooit en opnieuw aanmaakt komt dan
-- zonder organisatie te zitten en moet zich melden, in plaats van in het bedrijf
-- van iemand anders te belanden.

BEGIN;

CREATE OR REPLACE FUNCTION profiles_rol_en_org_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.organisatie_id := NULL;
    NEW.rol := 'medewerker';
    RETURN NEW;
  END IF;

  IF NEW.rol IS DISTINCT FROM OLD.rol
     OR NEW.organisatie_id IS DISTINCT FROM OLD.organisatie_id THEN
    RAISE EXCEPTION
      'Rol en organisatie van een profiel zijn alleen via de backend te wijzigen';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_rol_en_org_beschermen_trigger ON profiles;
CREATE TRIGGER profiles_rol_en_org_beschermen_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_rol_en_org_beschermen();

COMMIT;

-- Controle: dit moet blijven werken (eigen naam wijzigen in Instellingen), en
-- dit moet gaan gooien, als gewone gebruiker in de browserconsole:
--   await supabase.from('profiles').update({ rol: 'admin' }).eq('id', <eigen id>)
--
-- Stand van de rollen op het moment van schrijven: 8 van de 9 profielen staan op
-- admin. Deze migratie bevriest dat; rollen opschonen is een aparte stap en moet
-- via de backend of de SQL-editor.
--
-- Terugdraaien:
--   DROP TRIGGER IF EXISTS profiles_rol_en_org_beschermen_trigger ON profiles;
--   DROP FUNCTION IF EXISTS profiles_rol_en_org_beschermen();
