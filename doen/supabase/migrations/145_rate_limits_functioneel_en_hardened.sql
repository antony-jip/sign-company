-- 145_rate_limits_functioneel_en_hardened.sql
-- De tabel rate_limits + functie check_rate_limit uit migratie 032 zijn nooit in
-- productie gedraaid (zie 074: "rate_limits tabel bestaat niet in productie").
-- Gevolg: 7 publieke endpoints (portaal-reactie/upload/bekeken, goedkeuring-
-- reactie, kvk-zoeken/basisprofiel, csp-report) roepen check_rate_limit aan maar
-- de helper is fail-open (data null → niet gelimiteerd), dus er is NU geen
-- rate-limiting op die endpoints.
--
-- Deze migratie maakt de tabel + functie alsnog aan, mét de hardening uit de
-- audit-bevinding ingebouwd:
--   1. RLS aan op rate_limits, geen policies → authenticated/anon kunnen de tabel
--      niet lezen/schrijven (alleen service_role via de functie, dat bypasst RLS).
--   2. check_rate_limit is NIET PUBLIC-uitvoerbaar → geen rate-limit-poisoning
--      door een browser-client. Alleen service_role (die de API gebruikt) mag 'm
--      aanroepen.

CREATE TABLE IF NOT EXISTS rate_limits (
  id text PRIMARY KEY,            -- 'endpoint:ip'
  count integer DEFAULT 1,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- Bewust geen policies: alleen service_role (RLS-bypass) schrijft via de functie.

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_max_count integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_reset timestamptz := v_now + (p_window_seconds || ' seconds')::interval;
  v_count integer;
BEGIN
  -- Verwijder verlopen entries (1% kans per aanroep)
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE reset_at < v_now;
  END IF;

  -- Atomic upsert: als verlopen of nieuw → reset, anders increment
  INSERT INTO rate_limits (id, count, reset_at)
  VALUES (p_key, 1, v_reset)
  ON CONFLICT (id) DO UPDATE SET
    count = CASE
      WHEN rate_limits.reset_at < v_now THEN 1
      ELSE rate_limits.count + 1
    END,
    reset_at = CASE
      WHEN rate_limits.reset_at < v_now THEN v_reset
      ELSE rate_limits.reset_at
    END
  RETURNING count INTO v_count;

  RETURN v_count > p_max_count;
END;
$$;

-- Hardening: haal het impliciete EXECUTE-recht van PUBLIC weg en geef het alleen
-- aan service_role (de API roept de functie met de service-role key aan).
REVOKE ALL ON FUNCTION check_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) TO service_role;
