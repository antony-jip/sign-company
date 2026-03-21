-- Taak bijlagen: foto's en bestanden koppelen aan taken
ALTER TABLE taken ADD COLUMN IF NOT EXISTS bijlagen TEXT[] DEFAULT '{}';
