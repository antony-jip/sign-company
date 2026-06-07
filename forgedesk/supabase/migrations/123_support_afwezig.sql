-- ============================================================
-- 123: Support — afwezigheid + e-mail-opvang
--
-- - support_presence: heartbeat van de support-beheerder. Klant krijgt
--   een afwezig-melding als de beheerder een paar minuten niet actief is.
-- - support_gesprekken.klant_email: e-mailadres dat de klant achterlaat
--   wanneer support offline is.
-- ============================================================

-- E-mail dat de klant achterlaat bij afwezigheid.
ALTER TABLE support_gesprekken ADD COLUMN IF NOT EXISTS klant_email TEXT;

-- Aanwezigheid van de support-beheerder (heartbeat).
CREATE TABLE IF NOT EXISTS support_presence (
  gebruiker_id UUID PRIMARY KEY,
  laatste_actief TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE support_presence ENABLE ROW LEVEL SECURITY;

-- Iedere gebruiker beheert alleen z'n eigen presence-rij.
DROP POLICY IF EXISTS "Eigen support_presence" ON support_presence;
CREATE POLICY "Eigen support_presence" ON support_presence
  FOR ALL
  USING (auth.uid() = gebruiker_id)
  WITH CHECK (auth.uid() = gebruiker_id);
