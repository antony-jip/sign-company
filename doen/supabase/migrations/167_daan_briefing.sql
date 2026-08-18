-- ============================================================
-- Migration 167: Daan dagelijkse briefing (fase 4)
--
-- Eén rij per organisatie per dag: de gewogen ochtendbriefing die de
-- nachtploeg-job als laatste stap genereert. De signalen zelf (open
-- offertes, onbeantwoorde wacht-mails, verstreken projectdatums,
-- vervallen facturen) komen deterministisch uit de live tabellen; het
-- model weegt ze alleen en verwoordt ze met het actieve geheugen erbij.
--
-- Kosten staan hier (zelfde afweging als ai_rondes, migratie 165):
-- buiten de €15-cap van de organisatie, dit is productkosten.
--
-- LET OP: nummer 167 vóór het draaien verifiëren tegen schema_migrations.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  -- Kalenderdag (Europe/Amsterdam) waarvoor de briefing geldt.
  datum DATE NOT NULL,
  -- Inleidende zin van Daan plus de gewogen punten:
  -- { intro: string, punten: [{ titel, toelichting, href, soort }] }
  inhoud JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Hoeveel signalen de verzamelaar aanleverde; 0 signalen = geen rij,
  -- dus deze kolom is er voor context bij wat het model wegliet.
  signalen INTEGER NOT NULL DEFAULT 0,
  kosten_eur NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_briefings ENABLE ROW LEVEL SECURITY;

-- Lezen mag de organisatie (dashboard + popup); schrijven doet alleen de
-- job via service-role (zelfde patroon als ai_rondes, migratie 165).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_briefings' AND policyname = 'Org members read ai_briefings'
  ) THEN
    CREATE POLICY "Org members read ai_briefings" ON ai_briefings
      FOR SELECT USING (organisatie_id = auth_organisatie_id());
  END IF;
END $$;

-- Eén briefing per organisatie per dag; een herdraai van de job vervangt
-- niets maar botst, en dat is de bedoeling (idempotente nachten).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_briefings_org_datum
  ON ai_briefings(organisatie_id, datum);
