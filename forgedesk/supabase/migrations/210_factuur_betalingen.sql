-- 210: factuur_betalingen — één rij per betaling per bron, idempotent
--
-- Tot nu toe was een betaling twee kolommen op de factuurrij
-- (betaald_bedrag, betaaldatum). Dat maakt dubbele webhook-leveringen
-- ondetecteerbaar: elke herlevering van dezelfde Mollie-payment telde
-- betaald_bedrag opnieuw op (api/mollie-webhook.ts). Deze tabel legt elke
-- betaling vast met een bron-referentie (Mollie tr_-id, Exact-betaalterm,
-- of handmatig), zodat verwerking idempotent wordt en bank (Exact) en
-- iDEAL (Mollie) later verzoend kunnen worden zonder dubbeltelling.
--
-- De RPC factuur_betaling_verwerk is de enige schrijfroute voor
-- service-processen: hij lockt de factuurrij, berekent de delta t.o.v.
-- wat al geregistreerd was (0 bij een herlevering), en werkt
-- betaald_bedrag/status/betaaldatum in dezelfde transactie bij.

BEGIN;

CREATE TABLE IF NOT EXISTS factuur_betalingen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  factuur_id uuid NOT NULL REFERENCES facturen(id) ON DELETE CASCADE,
  bron text NOT NULL CHECK (bron IN ('mollie', 'exact', 'handmatig')),
  bron_referentie text NOT NULL,
  -- Effectief ontvangen bedrag voor deze referentie. Bij een refund of
  -- chargeback wordt dezelfde rij verlaagd (delta-verwerking), er komt
  -- geen tweede rij bij.
  bedrag numeric(12,2) NOT NULL,
  betaald_op date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS factuur_betalingen_bron_ref_unique
  ON factuur_betalingen(organisatie_id, bron, bron_referentie);

CREATE INDEX IF NOT EXISTS factuur_betalingen_factuur_idx
  ON factuur_betalingen(factuur_id);

ALTER TABLE factuur_betalingen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "factuur_betalingen_org" ON factuur_betalingen;
CREATE POLICY "factuur_betalingen_org" ON factuur_betalingen FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- Wanneer de factuur voor het laatst naar de klant is gemaild. Tot nu toe
-- veranderde alleen status naar 'verzonden', zonder tijdstip.
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS verzonden_op timestamptz;

CREATE OR REPLACE FUNCTION factuur_betaling_verwerk(
  p_factuur_id uuid,
  p_bron text,
  p_bron_referentie text,
  p_bedrag numeric,
  p_betaald_op date DEFAULT NULL
) RETURNS TABLE (
  delta numeric,
  nieuw_betaald numeric,
  volledig_voldaan boolean,
  vorige_status text,
  nieuwe_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_totaal numeric;
  v_status text;
  v_betaald numeric;
  v_bestaand_factuur uuid;
  v_oud_bedrag numeric;
  v_delta numeric;
  v_nieuw_betaald numeric;
  v_voldaan boolean;
  v_nieuwe_status text;
BEGIN
  SELECT f.organisatie_id, COALESCE(f.totaal, 0), f.status, COALESCE(f.betaald_bedrag, 0)
    INTO v_org, v_totaal, v_status, v_betaald
    FROM facturen f
   WHERE f.id = p_factuur_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'factuur % niet gevonden', p_factuur_id;
  END IF;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'factuur % heeft geen organisatie_id', p_factuur_id;
  END IF;

  -- Gelijktijdige aanroepen voor dezelfde factuur serialiseren op de
  -- FOR UPDATE-lock hierboven, dus dit select-dan-insert is race-vrij.
  SELECT fb.factuur_id, fb.bedrag INTO v_bestaand_factuur, v_oud_bedrag
    FROM factuur_betalingen fb
   WHERE fb.organisatie_id = v_org
     AND fb.bron = p_bron
     AND fb.bron_referentie = p_bron_referentie;

  IF v_bestaand_factuur IS NOT NULL AND v_bestaand_factuur <> p_factuur_id THEN
    RAISE EXCEPTION 'bron-referentie % (%) hoort al bij factuur %',
      p_bron_referentie, p_bron, v_bestaand_factuur;
  END IF;

  IF v_bestaand_factuur IS NULL THEN
    INSERT INTO factuur_betalingen (organisatie_id, factuur_id, bron, bron_referentie, bedrag, betaald_op)
    VALUES (v_org, p_factuur_id, p_bron, p_bron_referentie, round(p_bedrag, 2), p_betaald_op);
    v_delta := round(p_bedrag, 2);
  ELSE
    v_delta := round(p_bedrag - v_oud_bedrag, 2);
    IF v_delta <> 0 OR p_betaald_op IS NOT NULL THEN
      UPDATE factuur_betalingen fb
         SET bedrag = round(p_bedrag, 2),
             betaald_op = COALESCE(p_betaald_op, fb.betaald_op),
             updated_at = now()
       WHERE fb.organisatie_id = v_org
         AND fb.bron = p_bron
         AND fb.bron_referentie = p_bron_referentie;
    END IF;
  END IF;

  v_nieuw_betaald := round(v_betaald + v_delta, 2);
  v_voldaan := v_totaal > 0 AND v_nieuw_betaald + 0.01 >= v_totaal;
  v_nieuwe_status := v_status;

  IF v_delta <> 0 THEN
    -- concept en gecrediteerd blijven van de status-machine af.
    IF v_voldaan AND v_status IN ('open', 'verzonden', 'vervallen') THEN
      v_nieuwe_status := 'betaald';
    ELSIF NOT v_voldaan AND v_delta < 0 AND v_status = 'betaald' THEN
      -- Refund/chargeback maakte de dekking incompleet: terug naar open post.
      v_nieuwe_status := 'verzonden';
    END IF;

    UPDATE facturen f
       SET betaald_bedrag = v_nieuw_betaald,
           status = v_nieuwe_status,
           -- betaaldatum is in de live database DATE (geverifieerd 15-08-2026,
           -- ondanks TEXT in 001_create_all_tables.sql).
           betaaldatum = CASE
             WHEN v_nieuwe_status = 'betaald' AND v_status <> 'betaald' THEN COALESCE(p_betaald_op, CURRENT_DATE)
             WHEN v_nieuwe_status <> 'betaald' AND v_status = 'betaald' THEN NULL
             ELSE f.betaaldatum
           END,
           updated_at = now()
     WHERE f.id = p_factuur_id;
  END IF;

  RETURN QUERY SELECT v_delta, v_nieuw_betaald, v_voldaan, v_status, v_nieuwe_status;
END;
$$;

-- Alleen service-processen (webhook, Exact-cron) roepen de delta-RPC direct
-- aan; de app gaat via factuur_markeer_betaald hieronder.
REVOKE EXECUTE ON FUNCTION factuur_betaling_verwerk(uuid, text, text, numeric, date) FROM PUBLIC, anon, authenticated;

-- Handmatig "markeer als betaald" vanuit de UI: boekt het restant als
-- handmatige betaling door het grootboek, zodat betaald_bedrag nooit
-- buiten factuur_betalingen om verandert. Dubbelklik serialiseert op de
-- FOR UPDATE-lock: de tweede aanroep ziet restant 0 en boekt niets.
CREATE OR REPLACE FUNCTION factuur_markeer_betaald(p_factuur_id uuid)
RETURNS TABLE (nieuw_betaald numeric, nieuwe_status text)
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
BEGIN
  SELECT f.organisatie_id, COALESCE(f.totaal, 0), f.status, COALESCE(f.betaald_bedrag, 0)
    INTO v_org, v_totaal, v_status, v_betaald
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
  END IF;

  v_rest := round(v_totaal - v_betaald, 2);
  IF v_rest > 0 THEN
    RETURN QUERY SELECT r.nieuw_betaald, r.nieuwe_status
      FROM factuur_betaling_verwerk(
        p_factuur_id, 'handmatig', 'handmatig:' || gen_random_uuid(), v_rest, CURRENT_DATE
      ) r;
  ELSE
    UPDATE facturen f
       SET status = 'betaald',
           betaaldatum = COALESCE(f.betaaldatum, CURRENT_DATE),
           updated_at = now()
     WHERE f.id = p_factuur_id
       AND f.status IN ('open', 'verzonden', 'vervallen');
    RETURN QUERY SELECT v_betaald, 'betaald'::text;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION factuur_markeer_betaald(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION factuur_markeer_betaald(uuid) TO authenticated;

-- Backfill: elke factuur met betaald_bedrag > 0 krijgt precies één rij,
-- zodat de invariant "betaald_bedrag = som(factuur_betalingen)" vanaf dag
-- één geldt. Is er een Mollie-payment-id bekend, dan draagt die rij dat id
-- als referentie: een late webhook-herlevering of refund van diezelfde
-- payment rekent dan als delta tegen de bestaande stand. Kanttekening: bij
-- een factuur die deels handmatig én deels via Mollie betaald was, wordt
-- het hele bedrag aan de Mollie-referentie toegeschreven; een latere
-- refund op zo'n mengfactuur kan daardoor iets te veel aftrekken.
INSERT INTO factuur_betalingen (organisatie_id, factuur_id, bron, bron_referentie, bedrag, betaald_op)
SELECT f.organisatie_id, f.id, 'mollie', f.mollie_payment_id, round(f.betaald_bedrag::numeric, 2),
       f.betaaldatum
  FROM facturen f
 WHERE f.mollie_payment_id IS NOT NULL
   AND f.organisatie_id IS NOT NULL
   AND f.organisatie_id <> '08352d84-e2be-4760-9436-f468b4327438'
   AND COALESCE(f.betaald_bedrag, 0) > 0
ON CONFLICT (organisatie_id, bron, bron_referentie) DO NOTHING;

-- Vangnet voor de rest: geen Mollie-referentie (of die was al bezet door
-- een andere factuur) -> één handmatige backfill-rij.
INSERT INTO factuur_betalingen (organisatie_id, factuur_id, bron, bron_referentie, bedrag, betaald_op)
SELECT f.organisatie_id, f.id, 'handmatig', 'backfill:' || f.id, round(f.betaald_bedrag::numeric, 2),
       f.betaaldatum
  FROM facturen f
 WHERE f.organisatie_id IS NOT NULL
   AND f.organisatie_id <> '08352d84-e2be-4760-9436-f468b4327438'
   AND COALESCE(f.betaald_bedrag, 0) > 0
   AND NOT EXISTS (SELECT 1 FROM factuur_betalingen fb WHERE fb.factuur_id = f.id)
ON CONFLICT (organisatie_id, bron, bron_referentie) DO NOTHING;

COMMIT;

-- Controle na het draaien (moet 0 rijen geven):
--
--   SELECT f.id, f.nummer, f.betaald_bedrag, COALESCE(som.bedrag, 0) AS geboekt
--     FROM facturen f
--     LEFT JOIN (SELECT factuur_id, round(sum(bedrag), 2) AS bedrag
--                  FROM factuur_betalingen GROUP BY factuur_id) som
--       ON som.factuur_id = f.id
--    WHERE f.organisatie_id IS NOT NULL
--      AND f.organisatie_id <> '08352d84-e2be-4760-9436-f468b4327438'
--      AND round(COALESCE(f.betaald_bedrag, 0)::numeric, 2) <> COALESCE(som.bedrag, 0);

INSERT INTO doen_migraties (bestand) VALUES ('210_factuur_betalingen.sql') ON CONFLICT DO NOTHING;
