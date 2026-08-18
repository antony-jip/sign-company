-- 212: herinneringsmotor v2 — configureerbare ladder, kill-switches en
-- aantoonbare verzendhistorie
--
-- De factuur-herinnering-cron (Trigger.dev, 09:30) had een hardcoded ladder
-- (7/14/30 dagen), geen pauzeknop per klant of factuur, en als enige
-- historie vier timestamp-vlaggen op de factuurrij. Deze migratie voegt toe:
--   - factuur_opvolg_stappen: dagen/kanaal/teksten/actief per stap per org,
--     naar analogie van offerte_opvolg_stappen. Geen rij = standaardladder.
--   - factuur_opvolg_log: per verzonden (of mislukte) herinnering een rij
--     met ontvanger, onderwerp en tijdstip — het antwoord op "ik heb nooit
--     een herinnering gehad". factuur_nummer gedenormaliseerd zodat het
--     bewijs blijft bestaan als de factuur ooit verdwijnt.
--   - kill-switches: klanten.geen_betalingsherinneringen (per klant) en
--     facturen.opvolging_actief (per factuur; null = volg de org-instelling).
-- Ook wordt offerte_opvolg_log gelegaliseerd: die tabel bestaat live (de
-- offerte-opvolging-cron schrijft erin) maar had geen CREATE in de map.

BEGIN;

CREATE TABLE IF NOT EXISTS factuur_opvolg_stappen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  stap_type text NOT NULL CHECK (stap_type IN ('herinnering_1', 'herinnering_2', 'herinnering_3', 'aanmaning')),
  dagen_na_vervaldatum integer NOT NULL CHECK (dagen_na_vervaldatum >= 1),
  kanaal text NOT NULL DEFAULT 'email' CHECK (kanaal IN ('email', 'intern')),
  onderwerp text,
  inhoud text,
  actief boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS factuur_opvolg_stappen_org_stap_unique
  ON factuur_opvolg_stappen(organisatie_id, stap_type);

ALTER TABLE factuur_opvolg_stappen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "factuur_opvolg_stappen_org" ON factuur_opvolg_stappen;
CREATE POLICY "factuur_opvolg_stappen_org" ON factuur_opvolg_stappen FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

CREATE TABLE IF NOT EXISTS factuur_opvolg_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  factuur_id uuid REFERENCES facturen(id) ON DELETE SET NULL,
  factuur_nummer text,
  stap text NOT NULL,
  kanaal text NOT NULL DEFAULT 'email',
  ontvanger text,
  onderwerp text,
  -- verstuurd | overgeslagen_idempotent | fout
  resultaat text NOT NULL,
  detail text,
  verzonden_op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS factuur_opvolg_log_org_factuur_idx
  ON factuur_opvolg_log(organisatie_id, factuur_id);

ALTER TABLE factuur_opvolg_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "factuur_opvolg_log_org_select" ON factuur_opvolg_log;
CREATE POLICY "factuur_opvolg_log_org_select" ON factuur_opvolg_log FOR SELECT
  USING (organisatie_id = auth_organisatie_id());

-- Kill-switches. opvolging_actief is bewust nullable: null = geen eigen
-- voorkeur, volg de organisatie-toggle; false = deze factuur nooit
-- automatisch manen; true gedraagt zich als null (expliciet hervat).
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS geen_betalingsherinneringen boolean NOT NULL DEFAULT false;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS opvolging_actief boolean;

-- Legalisering: bestaat live sinds de offerte-opvolging-cron (schrijft via
-- service role), maar had geen migratie. Structuur overgenomen van de echte
-- database (gecontroleerd 15-08-2026). RLS staat live al aan; de policy
-- geeft org-leden leesrecht op de historie van hun eigen offertes.
CREATE TABLE IF NOT EXISTS offerte_opvolg_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offerte_id uuid,
  stap_id uuid,
  actie text,
  resultaat text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE offerte_opvolg_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offerte_opvolg_log_org_select" ON offerte_opvolg_log;
CREATE POLICY "offerte_opvolg_log_org_select" ON offerte_opvolg_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM offertes o
     WHERE o.id = offerte_opvolg_log.offerte_id
       AND o.organisatie_id = auth_organisatie_id()
  ));

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('212_factuur_opvolging_v2.sql') ON CONFLICT DO NOTHING;
