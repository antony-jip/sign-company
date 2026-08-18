-- Enable Supabase Realtime voor notificaties tabel
-- Hierdoor krijgen gebruikers direct een melding bij nieuwe portaal reacties

ALTER PUBLICATION supabase_realtime ADD TABLE notificaties;
