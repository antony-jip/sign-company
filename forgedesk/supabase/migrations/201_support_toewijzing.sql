-- 201_support_toewijzing.sql
--
-- Een supportgesprek kan aan een medewerker van de supportorganisatie worden
-- toegewezen, zodat zichtbaar is wie het oppakt.
--
-- Waarom op support_gesprekken en niet op support_berichten:
-- support_berichten heeft al een medewerker_id (migratie 122), maar dat is de
-- AUTEUR van een admin-bericht, niet een toewijzing. Het wordt gezet in
-- api/support-inbox.ts bij elke plaatsing van een admin-bericht. Een toewijzing
-- hoort bij de conversatie, niet bij een losse regel erin, dus dat is een
-- nieuwe kolom op de parent.
--
-- Let op de tenant-vorm van deze twee tabellen, die afwijkt van de rest van de
-- app (CLAUDE.md sectie 3 zegt: elke tabel heeft organisatie_id):
--   * support_berichten heeft GEEN organisatie_id, en hoort die ook niet te
--     krijgen. Het is een kindtabel; de tenant zit op support_gesprekken en de
--     RLS in 122 drukt dat uit via een subquery op de parent.
--   * support_gesprekken.organisatie_id is de KLANT-org, niet de eigenaar van
--     de rij. Deze tabel is cross-tenant bij ontwerp.
-- Gevolg voor toewijzing: de toegewezen persoon zit per definitie in een ANDERE
-- organisatie dan organisatie_id van de rij. De org-scoped RLS-vorm uit 048 is
-- hier dus niet toepasbaar; wie mag toewijzen wordt bepaald door de
-- adminpolicy uit 122 (auth.uid() = de support-beheerder) plus de guard hieronder.

BEGIN;

ALTER TABLE support_gesprekken
  ADD COLUMN IF NOT EXISTS toegewezen_aan uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS toegewezen_op timestamptz;

COMMENT ON COLUMN support_gesprekken.toegewezen_aan IS
  'Medewerker van de supportorganisatie die dit gesprek oppakt. Geschreven door '
  'api/support-inbox.ts op service_role; NULL betekent niet toegewezen.';
COMMENT ON COLUMN support_gesprekken.toegewezen_op IS
  'Wanneer de huidige toewijzing is gezet. NULL zodra toegewezen_aan NULL is.';

-- Partieel: alleen toegewezen gesprekken zijn interessant om op te filteren,
-- en dat is de minderheid van de rijen.
CREATE INDEX IF NOT EXISTS support_gesprekken_toegewezen_idx
  ON support_gesprekken (toegewezen_aan)
  WHERE toegewezen_aan IS NOT NULL;

-- ── Guard op de nieuwe kolommen ──────────────────────────────
--
-- Migratie 122 gaf de klant FOR ALL op zijn eigen gesprekken:
--   CREATE POLICY "Klant beheert eigen support_gesprekken" ON support_gesprekken
--     FOR ALL USING (organisatie_id = auth_organisatie_id())
--             WITH CHECK (organisatie_id = auth_organisatie_id());
-- Dat is ruimer dan het klaarblijkelijke doel (zijn eigen gesprek kunnen lezen
-- en starten): het staat de klant ook UPDATE toe op de rij. Zonder guard kan een
-- klant zichzelf dus een supportmedewerker toewijzen of een bestaande toewijzing
-- wegpoetsen. RLS kan niet per kolom, dus dit is een trigger -- hetzelfde patroon
-- en dezelfde rolbepaling via current_user als in 172 en 173.
--
-- Bewust beperkt tot de twee kolommen van deze migratie. De bredere vraag of de
-- klant-policy uit 122 FOR ALL had moeten zijn blijft hier open staan; die
-- terugschroeven raakt de bestaande klantflow en hoort niet in deze migratie.

CREATE OR REPLACE FUNCTION support_toewijzing_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  -- Een verse INSERT door een klant mag nooit al een toewijzing meebrengen.
  -- Terugzetten in plaats van gooien, zodat het starten van een gesprek niet
  -- stukloopt op deze trigger.
  IF TG_OP = 'INSERT' THEN
    NEW.toegewezen_aan := NULL;
    NEW.toegewezen_op := NULL;
    RETURN NEW;
  END IF;

  -- Een UPDATE die deze kolommen ongemoeid laat gaat gewoon door; alleen een
  -- echte wijziging wordt geweigerd.
  IF NEW.toegewezen_aan IS DISTINCT FROM OLD.toegewezen_aan
     OR NEW.toegewezen_op IS DISTINCT FROM OLD.toegewezen_op THEN
    RAISE EXCEPTION 'Toewijzing is alleen via de backend te wijzigen';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_toewijzing_beschermen_trigger ON support_gesprekken;
CREATE TRIGGER support_toewijzing_beschermen_trigger
  BEFORE INSERT OR UPDATE ON support_gesprekken
  FOR EACH ROW EXECUTE FUNCTION support_toewijzing_beschermen();

COMMIT;

-- ── Verificatie ─────────────────────────────────────────────
-- Staan de kolommen er, met het juiste type en nullable?
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'support_gesprekken'
   AND column_name IN ('toegewezen_aan', 'toegewezen_op')
 ORDER BY column_name;

-- Staat de index er, en is de trigger actief?
SELECT indexname FROM pg_indexes
 WHERE schemaname = 'public' AND tablename = 'support_gesprekken'
   AND indexname = 'support_gesprekken_toegewezen_idx';

SELECT tgname, tgenabled FROM pg_trigger
 WHERE tgrelid = 'public.support_gesprekken'::regclass
   AND tgname = 'support_toewijzing_beschermen_trigger';

-- Terugdraaien:
--   DROP TRIGGER IF EXISTS support_toewijzing_beschermen_trigger ON support_gesprekken;
--   DROP FUNCTION IF EXISTS support_toewijzing_beschermen();
--   DROP INDEX IF EXISTS support_gesprekken_toegewezen_idx;
--   ALTER TABLE support_gesprekken
--     DROP COLUMN IF EXISTS toegewezen_aan,
--     DROP COLUMN IF EXISTS toegewezen_op;

-- Deze regel faalt zolang migratie 198 (die doen_migraties aanmaakt) nog niet
-- gedraaid is. Dat is onschuldig: alles hierboven is dan al toegepast, en de
-- regel is los opnieuw uit te voeren zodra 198 er wel is.
INSERT INTO doen_migraties (bestand) VALUES ('201_support_toewijzing.sql') ON CONFLICT DO NOTHING;
