-- Contactpersonen kunnen voortaan ook aan een leverancier hangen, naast de
-- bestaande koppeling aan een klant.
--
-- Let op: er bestaan al contactpersonen zonder klant_id (losse contacten uit
-- de import). Die moeten geldig blijven. De regel is daarom "nooit aan allebei
-- tegelijk", niet "altijd aan precies een van beide".
--
-- Idempotent: veilig opnieuw te draaien.

BEGIN;

ALTER TABLE contactpersonen
  ADD COLUMN IF NOT EXISTS leverancier_id UUID REFERENCES leveranciers(id) ON DELETE CASCADE;

ALTER TABLE contactpersonen
  ALTER COLUMN klant_id DROP NOT NULL;

ALTER TABLE contactpersonen
  DROP CONSTRAINT IF EXISTS contactpersonen_een_eigenaar;
ALTER TABLE contactpersonen
  ADD CONSTRAINT contactpersonen_een_eigenaar CHECK (
    klant_id IS NULL OR leverancier_id IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_contactpersonen_leverancier
  ON contactpersonen(leverancier_id);

COMMIT;
