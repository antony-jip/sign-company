-- Portaal items: sort order, notitie, en toewijzing
ALTER TABLE portaal_items ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE portaal_items ADD COLUMN IF NOT EXISTS notitie text;
ALTER TABLE portaal_items ADD COLUMN IF NOT EXISTS toegewezen_aan uuid REFERENCES auth.users(id);
