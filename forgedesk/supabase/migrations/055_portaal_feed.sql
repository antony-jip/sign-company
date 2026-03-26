-- 055: Portaal feed model uitbreiding
-- foto_url op portaal_reacties voor klant foto uploads bij reacties
ALTER TABLE portaal_reacties ADD COLUMN IF NOT EXISTS foto_url text;

-- Documenteer het uitgebreide type veld
COMMENT ON COLUMN portaal_items.type IS 'offerte | tekening | factuur | bericht | afbeelding';
