-- ============================================================
-- 097: factuur_bijlagen — bijlagen koppelen aan facturen
-- ============================================================
-- Maakt het mogelijk om bestanden (klant-inkooporders, extra
-- offertes, ondersteunende docs) als bijlage aan een factuur
-- te hangen. Bijlagen leven in de private bucket
-- `factuur-bijlagen` (zie aparte storage-SQL); deze tabel houdt
-- de metadata en de koppeling naar factuur + organisatie bij.
--
-- Pad-conventie in bucket `factuur-bijlagen`:
--   {organisatie_id}/{factuur_id}/{timestamp}-{sanitized_filename}
--
-- Veld `bron_email_id` is voorbereid op V2 (auto-link vanuit
-- binnenkomende emails). In deze sprint blijft 'ie NULL.
--
-- Limieten (afgedwongen in service-laag, niet in DB):
--   - Max 5 bijlagen per factuur
--   - Max 20MB per bestand
--   - Toegestane mime-types: PDF, JPG, PNG, DOCX, XLSX
--
-- OPMERKING: Deze SQL draait Antony handmatig in het Supabase
-- dashboard. Dit bestand dient als documentatie en voor
-- toekomstige deployments.
-- ============================================================

CREATE TABLE factuur_bijlagen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id uuid NOT NULL REFERENCES organisaties(id) ON DELETE CASCADE,
  factuur_id uuid NOT NULL REFERENCES facturen(id) ON DELETE CASCADE,
  bestandsnaam text NOT NULL,
  mime_type text NOT NULL,
  grootte bigint NOT NULL,
  storage_path text NOT NULL,
  type text NOT NULL DEFAULT 'overig' CHECK (type IN ('inkooporder', 'overig')),
  bron_email_id uuid NULL REFERENCES emails(id) ON DELETE SET NULL,
  geupload_door uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_factuur_bijlagen_factuur_id ON factuur_bijlagen(factuur_id);
CREATE INDEX idx_factuur_bijlagen_organisatie_id ON factuur_bijlagen(organisatie_id);

ALTER TABLE factuur_bijlagen ENABLE ROW LEVEL SECURITY;

-- RLS — strict org-scope. Geen user_id; bijlagen zijn org-resource.
CREATE POLICY "Bekijken eigen org bijlagen" ON factuur_bijlagen
  FOR SELECT USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Aanmaken eigen org bijlagen" ON factuur_bijlagen
  FOR INSERT WITH CHECK (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Updaten eigen org bijlagen" ON factuur_bijlagen
  FOR UPDATE USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Verwijderen eigen org bijlagen" ON factuur_bijlagen
  FOR DELETE USING (
    organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE factuur_bijlagen IS 'Bijlagen bij facturen (bv klant inkooporders). Private bucket, signed URLs.';
COMMENT ON COLUMN factuur_bijlagen.bron_email_id IS 'Optionele koppeling naar bron-email voor V2 auto-link feature';
