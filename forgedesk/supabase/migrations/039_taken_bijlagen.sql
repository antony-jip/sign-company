-- Bijlagen kolom toevoegen aan taken tabel
ALTER TABLE taken ADD COLUMN IF NOT EXISTS bijlagen JSONB DEFAULT '[]'::jsonb;
