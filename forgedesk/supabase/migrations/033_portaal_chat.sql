-- Portaal chat interface: extra kolommen voor berichten in de tijdlijn

-- bericht_type: 'item' (bestaand rich card), 'tekst' (vrij bericht), 'foto' (afbeelding), 'notitie_intern' (alleen intern zichtbaar)
ALTER TABLE portaal_items ADD COLUMN IF NOT EXISTS bericht_type text DEFAULT 'item';

-- Vrij tekstveld voor chat-berichten
ALTER TABLE portaal_items ADD COLUMN IF NOT EXISTS bericht_tekst text;

-- URL voor foto-berichten
ALTER TABLE portaal_items ADD COLUMN IF NOT EXISTS foto_url text;

-- Wie heeft dit bericht verstuurd: 'bedrijf' of 'klant'
ALTER TABLE portaal_items ADD COLUMN IF NOT EXISTS afzender text DEFAULT 'bedrijf';

-- Of er een email notificatie is verstuurd bij dit item
ALTER TABLE portaal_items ADD COLUMN IF NOT EXISTS email_notificatie boolean DEFAULT false;
