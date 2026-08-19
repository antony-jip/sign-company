-- 219: lopende inklok-sessies per project
--
-- `tijdregistraties` legt vast wat er geboekt IS. Wat er NU loopt hoort daar
-- niet in: een lopende sessie zou als 0-minutenrij meetellen in nacalculatie,
-- budgetbewaking, de klant-urentab, rapportages en facturatie. Daarom een
-- aparte tabel die bij uitklokken één rij in `tijdregistraties` schrijft en
-- zichzelf opruimt. Geen enkele bestaande lezer hoeft daardoor te filteren.
--
-- Org-scoped RLS: iedereen binnen de organisatie ziet wie er ingeklokt staat.
-- Dat is de hele bedoeling van de feature en past bij de productfilosofie.
-- Uitklokken voor een ander wordt in de UI geblokkeerd, niet in RLS — binnen
-- één organisatie is dat geen vertrouwensgrens.

BEGIN;

CREATE TABLE IF NOT EXISTS tijd_sessies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  medewerker_id UUID,
  medewerker_naam TEXT,
  project_id UUID REFERENCES projecten ON DELETE CASCADE NOT NULL,
  project_naam TEXT,
  taak_id UUID REFERENCES taken ON DELETE SET NULL,
  omschrijving TEXT,
  gestart_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eén lopende sessie per persoon is een databaseregel, geen UI-belofte:
-- dubbel inklokken op twee projecten kan hiermee technisch niet.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tijd_sessies_een_per_persoon
  ON tijd_sessies(user_id);
CREATE INDEX IF NOT EXISTS idx_tijd_sessies_project ON tijd_sessies(project_id);
CREATE INDEX IF NOT EXISTS idx_tijd_sessies_organisatie ON tijd_sessies(organisatie_id);

ALTER TABLE tijd_sessies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage tijd_sessies" ON tijd_sessies;
CREATE POLICY "Org members manage tijd_sessies" ON tijd_sessies
  FOR ALL USING (organisatie_id = auth_organisatie_id());

DROP TRIGGER IF EXISTS update_tijd_sessies_updated_at ON tijd_sessies;
CREATE TRIGGER update_tijd_sessies_updated_at BEFORE UPDATE ON tijd_sessies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Realtime buiten de transactie: ALTER PUBLICATION faalt als de tabel er al in
-- zit, en dat mag de rest van de migratie niet terugdraaien (patroon 170).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tijd_sessies;
EXCEPTION
  WHEN duplicate_object THEN RAISE NOTICE 'tijd_sessies zit al in supabase_realtime';
  WHEN undefined_object THEN RAISE NOTICE 'publicatie supabase_realtime bestaat niet';
END $$;

INSERT INTO doen_migraties (bestand) VALUES ('219_tijd_sessies.sql') ON CONFLICT DO NOTHING;
