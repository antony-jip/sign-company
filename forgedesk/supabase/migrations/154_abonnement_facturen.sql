-- 154: Facturen voor het doen.-abonnement zelf
--
-- Mollie incasseert wel, maar stuurt geen factuur naar de abonnee. Die maken
-- we hier: één rij per geslaagde incasso, met een eigen doorlopende
-- nummerreeks. De koppeling op mollie_payment_id is uniek, zodat een dubbele
-- webhook-levering nooit een tweede factuur oplevert.

CREATE TABLE IF NOT EXISTS abonnement_facturen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  nummer TEXT NOT NULL UNIQUE,
  mollie_payment_id TEXT NOT NULL UNIQUE,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  bedrag_excl NUMERIC(10,2) NOT NULL,
  btw_percentage NUMERIC(5,2) NOT NULL DEFAULT 21,
  btw_bedrag NUMERIC(10,2) NOT NULL,
  bedrag_incl NUMERIC(10,2) NOT NULL,
  omschrijving TEXT NOT NULL DEFAULT 'doen. abonnement',
  periode_start DATE,
  periode_eind DATE,
  verstuurd_naar TEXT,
  verstuurd_op TIMESTAMPTZ,
  pdf_pad TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abonnement_facturen_org
  ON abonnement_facturen(organisatie_id, datum DESC);

-- Doorlopende nummering. Eén ononderbroken reeks over alle jaren heen; dat is
-- toegestaan en voorkomt gaten bij de jaarwissel.
CREATE SEQUENCE IF NOT EXISTS abonnement_factuurnummer_seq START 1;

CREATE OR REPLACE FUNCTION volgend_abonnement_factuurnummer()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'DOEN-' || LPAD(nextval('abonnement_factuurnummer_seq')::text, 5, '0');
$$;

-- PUBLIC moet er expliciet bij: Postgres geeft nieuwe functies standaard
-- EXECUTE aan PUBLIC, en anon/authenticated erven daarvan. Zonder deze regel
-- kan elke ingelogde gebruiker de nummerreeks leegtrekken.
REVOKE EXECUTE ON FUNCTION volgend_abonnement_factuurnummer() FROM PUBLIC, anon, authenticated;

ALTER TABLE abonnement_facturen ENABLE ROW LEVEL SECURITY;

-- Leden mogen hun eigen facturen inzien. Aanmaken en wijzigen gebeurt
-- uitsluitend server-side met de service role, die RLS omzeilt; daarom staat
-- er bewust geen INSERT/UPDATE/DELETE-policy.
DROP POLICY IF EXISTS "Leden zien eigen abonnementsfacturen" ON abonnement_facturen;
CREATE POLICY "Leden zien eigen abonnementsfacturen" ON abonnement_facturen
  FOR SELECT USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Privébucket voor de PDF's; uitlevering loopt via een signed URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('abonnement-facturen', 'abonnement-facturen', false)
ON CONFLICT (id) DO NOTHING;
