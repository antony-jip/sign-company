-- 211: terugkoppeling Exact -> doen. voor betaalstatus
--
-- De cron api/cron-exact-betaalsync.ts leest dagelijks de gewijzigde
-- betaaltermijnen uit Exact (sync/Cashflow/PaymentTerms, delta op de
-- rowversion-Timestamp) en spiegelt ze in exact_betaaltermijnen. Termijnen
-- gaan bewust NIET als losse bedragen door factuur_betalingen: een factuur
-- die via Mollie betaald is duikt na het afletteren van de payout ook in
-- Exact op, en dan zou hetzelfde geld twee keer tellen. Pas als Exact een
-- factuur volledig afgeletterd meldt (alle termijnen status 50) boekt de
-- cron het nog openstaande restant als één betaling met bron 'exact', zodat
-- de invariant "betaald_bedrag = som(factuur_betalingen)" blijft gelden.

BEGIN;

CREATE TABLE IF NOT EXISTS exact_sync_state (
  organisatie_id uuid PRIMARY KEY REFERENCES organisaties(id) ON DELETE CASCADE,
  division text,
  -- Hoogste verwerkte Exact-Timestamp (Int64 rowversion, geen kloktijd).
  laatste_timestamp bigint NOT NULL DEFAULT 0,
  laatste_sync_op timestamptz,
  laatste_fout text,
  -- true zolang de eerste volledige inhaalslag nog pagina's tegoed heeft;
  -- de cron stelt het betaald-markeren uit tot de spiegel compleet is.
  inhaalslag_bezig boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exact_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exact_sync_state_org_select" ON exact_sync_state;
CREATE POLICY "exact_sync_state_org_select" ON exact_sync_state FOR SELECT
  USING (organisatie_id = auth_organisatie_id());

CREATE TABLE IF NOT EXISTS exact_betaaltermijnen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  term_id uuid NOT NULL,
  factuur_id uuid REFERENCES facturen(id) ON DELETE SET NULL,
  entry_number integer,
  invoice_number integer,
  your_ref text,
  bedrag numeric(12,2) NOT NULL DEFAULT 0,
  korting numeric(12,2),
  -- Exact-status: 20 open, 30 selected, 40 processed, 50 matched/afgeletterd.
  status integer,
  -- Exact-LineType: 20 = te ontvangen (debiteur), 22 = te betalen (crediteur).
  line_type integer,
  laatste_betaaldatum date,
  exact_timestamp bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS exact_betaaltermijnen_org_term_unique
  ON exact_betaaltermijnen(organisatie_id, term_id);
CREATE INDEX IF NOT EXISTS exact_betaaltermijnen_factuur_idx
  ON exact_betaaltermijnen(factuur_id);
CREATE INDEX IF NOT EXISTS exact_betaaltermijnen_org_ref_idx
  ON exact_betaaltermijnen(organisatie_id, your_ref);

ALTER TABLE exact_betaaltermijnen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exact_betaaltermijnen_org_select" ON exact_betaaltermijnen;
CREATE POLICY "exact_betaaltermijnen_org_select" ON exact_betaaltermijnen FOR SELECT
  USING (organisatie_id = auth_organisatie_id());

-- Openstaand volgens Exact (som van niet-afgeletterde termijnen) plus het
-- moment waarop die stand voor het laatst ververst is. De herinneringsmotor
-- gebruikt exact_stand_op straks als versheids-guard.
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS openstaand_exact numeric(12,2);
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS exact_stand_op timestamptz;

-- factuur_markeer_betaald krijgt een bron/referentie-variant zodat de
-- Exact-cron het restant onder bron 'exact' kan boeken. Ingelogde gebruikers
-- worden hard op 'handmatig' gezet; alleen service-processen (auth.uid()
-- is null) mogen een andere bron meegeven.
DROP FUNCTION IF EXISTS factuur_markeer_betaald(uuid);

CREATE OR REPLACE FUNCTION factuur_markeer_betaald(
  p_factuur_id uuid,
  p_bron text DEFAULT 'handmatig',
  p_referentie text DEFAULT NULL
) RETURNS TABLE (nieuw_betaald numeric, nieuwe_status text, bijgewerkt_op timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_totaal numeric;
  v_status text;
  v_betaald numeric;
  v_rest numeric;
  v_bron text;
  v_ref text;
  v_bijgewerkt_op timestamptz;
BEGIN
  SELECT f.organisatie_id, COALESCE(f.totaal, 0), f.status, COALESCE(f.betaald_bedrag, 0), f.updated_at
    INTO v_org, v_totaal, v_status, v_betaald, v_bijgewerkt_op
    FROM facturen f
   WHERE f.id = p_factuur_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'factuur % niet gevonden', p_factuur_id;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF v_org IS DISTINCT FROM auth_organisatie_id() THEN
      RAISE EXCEPTION 'geen toegang tot deze factuur';
    END IF;
    IF NOT auth_abonnement_actief() THEN
      RAISE EXCEPTION 'abonnement niet actief';
    END IF;
    v_bron := 'handmatig';
    v_ref := 'handmatig:' || gen_random_uuid();
  ELSE
    v_bron := COALESCE(p_bron, 'handmatig');
    v_ref := COALESCE(p_referentie, v_bron || ':' || gen_random_uuid());
  END IF;

  v_rest := round(v_totaal - v_betaald, 2);
  IF v_rest > 0 THEN
    RETURN QUERY SELECT r.nieuw_betaald, r.nieuwe_status, r.bijgewerkt_op
      FROM factuur_betaling_verwerk(p_factuur_id, v_bron, v_ref, v_rest, CURRENT_DATE) r;
  ELSE
    UPDATE facturen f
       SET status = 'betaald',
           betaaldatum = COALESCE(f.betaaldatum, CURRENT_DATE),
           updated_at = now()
     WHERE f.id = p_factuur_id
       AND f.status IN ('open', 'verzonden', 'vervallen')
     RETURNING f.updated_at INTO v_bijgewerkt_op;
    RETURN QUERY SELECT v_betaald, 'betaald'::text, v_bijgewerkt_op;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION factuur_markeer_betaald(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION factuur_markeer_betaald(uuid, text, text) TO authenticated, service_role;

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('211_exact_betaalsync.sql') ON CONFLICT DO NOTHING;
