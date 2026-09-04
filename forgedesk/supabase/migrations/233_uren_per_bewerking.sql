-- 233_uren_per_bewerking.sql
--
-- Sprint 1 · Uren op de regel (PLAN_UREN_OP_DE_REGEL.md).
-- Alleen nieuwe, nullable kolommen. Geen nieuwe tabellen, dus geen nieuwe
-- policies: de bestaande org-policies op deze tabellen dekken de kolommen.
-- De app werkt identiek zolang deze migratie nog niet gedraaid is.

BEGIN;

-- Bewerking (urenveld) op de urenregel. NULL = niet toegewezen, in de UI "Overig".
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS urenveld TEXT;
ALTER TABLE tijd_sessies      ADD COLUMN IF NOT EXISTS urenveld TEXT;

-- Bewerking waar een taak uit voortkomt. Uren op de taak erven dit veld.
ALTER TABLE taken ADD COLUMN IF NOT EXISTS urenveld TEXT;

-- Bewerking die een catalogusproduct vertegenwoordigt. Gevuld wint dit van de
-- naam-matching in de offerte-editor; leeg valt terug op de naam.
ALTER TABLE calculatie_producten ADD COLUMN IF NOT EXISTS urenveld TEXT;

-- Kostprijs per uur: wat een uur kost, niet wat het oplevert. Alleen admin.
-- Op de urenregel als momentopname bij schrijven, net als uurtarief, zodat een
-- latere wijziging van iemands kostprijs oude projecten niet herrekent.
ALTER TABLE medewerkers      ADD COLUMN IF NOT EXISTS kostprijs_uur NUMERIC(10,2);
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS kostprijs_uur NUMERIC(10,2);
ALTER TABLE app_settings     ADD COLUMN IF NOT EXISTS standaard_kostprijs_uur NUMERIC(10,2);

-- Werkbon-uren maar één keer boeken, en per organisatie kiezen op wie.
ALTER TABLE werkbonnen   ADD COLUMN IF NOT EXISTS uren_geboekt_op TIMESTAMPTZ;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS werkbon_uren_verdelen BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tijdregistraties_project_urenveld
  ON tijdregistraties (project_id, urenveld);

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('233_uren_per_bewerking.sql') ON CONFLICT DO NOTHING;
