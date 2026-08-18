-- 147_visualizer_credits_atomair.sql
-- Twee races op credits atomair maken:
--   1. Stripe-webhook telt credits op via read-then-write + een idempotency-check
--      op een NIET-unieke index → twee gelijktijdige (at-least-once) deliveries
--      passeren beide de check en tellen dubbel op.
--   2. De aftrek in generate-signing-mockup is een TOCTOU (select saldo → check →
--      update) → twee parallelle generaties op saldo=1 slagen beide.
--
-- Oplossing: UNIQUE-index op de sessie + twee RPC's die alles in één transactie
-- doen (claim + saldo-mutatie + transactie-log).

-- Idempotency-anker: één transactie per Stripe-sessie.
CREATE UNIQUE INDEX IF NOT EXISTS credit_transacties_stripe_session_unique
  ON credit_transacties (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Aankoop: claimt de sessie (ON CONFLICT DO NOTHING), telt bij ON CONFLICT op
-- user op, en logt de transactie. Retourneert het nieuwe saldo, of NULL als de
-- sessie al verwerkt was (duplicate webhook).
CREATE OR REPLACE FUNCTION visualizer_credits_koop(
  p_user uuid,
  p_credits integer,
  p_session_id text,
  p_payment_intent text,
  p_beschrijving text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo integer;
BEGIN
  -- Claim de sessie; als hij al bestaat doen we niets (idempotent).
  INSERT INTO credit_transacties (user_id, type, aantal, saldo_na, beschrijving, stripe_session_id, stripe_payment_intent)
  VALUES (p_user, 'aankoop', p_credits, 0, p_beschrijving, p_session_id, p_payment_intent)
  ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING;

  IF NOT FOUND THEN
    RETURN NULL;  -- sessie al verwerkt
  END IF;

  -- Sessie geclaimd → tel credits atomair bij.
  INSERT INTO visualizer_credits (user_id, saldo, totaal_gekocht, totaal_gebruikt, laatst_bijgewerkt)
  VALUES (p_user, p_credits, p_credits, 0, now())
  ON CONFLICT (user_id) DO UPDATE SET
    saldo = visualizer_credits.saldo + p_credits,
    totaal_gekocht = visualizer_credits.totaal_gekocht + p_credits,
    laatst_bijgewerkt = now()
  RETURNING saldo INTO v_saldo;

  -- Corrigeer saldo_na op de zojuist gelogde transactie.
  UPDATE credit_transacties
  SET saldo_na = v_saldo
  WHERE stripe_session_id = p_session_id;

  RETURN v_saldo;
END;
$$;

-- Verbruik: trekt alleen af als er genoeg saldo is (conditionele UPDATE) en logt
-- de transactie. Retourneert het nieuwe saldo, of NULL bij onvoldoende saldo.
CREATE OR REPLACE FUNCTION visualizer_credits_verbruik(
  p_user uuid,
  p_credits integer,
  p_beschrijving text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo integer;
BEGIN
  UPDATE visualizer_credits
  SET saldo = saldo - p_credits,
      totaal_gebruikt = totaal_gebruikt + p_credits,
      laatst_bijgewerkt = now()
  WHERE user_id = p_user AND saldo >= p_credits
  RETURNING saldo INTO v_saldo;

  IF NOT FOUND THEN
    RETURN NULL;  -- onvoldoende saldo (of geen rij)
  END IF;

  INSERT INTO credit_transacties (user_id, type, aantal, saldo_na, beschrijving)
  VALUES (p_user, 'gebruik', -p_credits, v_saldo, p_beschrijving);

  RETURN v_saldo;
END;
$$;

REVOKE ALL ON FUNCTION visualizer_credits_koop(uuid, integer, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION visualizer_credits_verbruik(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION visualizer_credits_koop(uuid, integer, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION visualizer_credits_verbruik(uuid, integer, text) TO service_role;
