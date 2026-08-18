-- Enable Supabase Realtime voor portaal tabellen
-- Hierdoor krijgen zowel de interne als publieke chat live updates

ALTER PUBLICATION supabase_realtime ADD TABLE portaal_items;
ALTER PUBLICATION supabase_realtime ADD TABLE portaal_reacties;
