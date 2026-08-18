-- Taak → Offerte koppeling
-- Voegt offerte_id kolom toe aan taken tabel zodat taken direct naar een offerte kunnen verwijzen
ALTER TABLE taken ADD COLUMN IF NOT EXISTS offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL;

-- Offerte → Medewerker toewijzing
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS toegewezen_aan TEXT;
