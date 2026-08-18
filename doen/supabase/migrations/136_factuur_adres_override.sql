-- Per-factuur override van het adresblok op de factuur-PDF.
-- Alle velden nullable: leeg => val terug op de klantkaart. Ingevuld =>
-- bevroren snapshot voor deze ene factuur (klant blijft ongemoeid).
-- generateFactuurPDF bouwt het effectieve adres uit deze velden, anders klant.
-- Kolommen op bestaande facturen-tabel; bestaande org-scoped RLS dekt ze af.

ALTER TABLE facturen
  ADD COLUMN IF NOT EXISTS factuur_bedrijfsnaam text,
  ADD COLUMN IF NOT EXISTS factuur_tav text,
  ADD COLUMN IF NOT EXISTS factuur_adres text,
  ADD COLUMN IF NOT EXISTS factuur_postcode text,
  ADD COLUMN IF NOT EXISTS factuur_plaats text;
