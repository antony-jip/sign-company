-- Fix: partial unique index breekt PostgREST upsert
-- PostgREST's ON CONFLICT (user_id, message_id) matcht niet met een partial index
-- Oplossing: voeg een volledige unique constraint toe naast de partial index

-- Drop de oude partial index
DROP INDEX IF EXISTS emails_user_message_id_unique;

-- Maak een gewone unique constraint (PostgREST-compatible)
-- NULLs in message_id worden door PostgreSQL als distinct behandeld,
-- dus dit blokkeert geen inserts met NULL message_id
ALTER TABLE emails ADD CONSTRAINT emails_user_message_id_unique
  UNIQUE (user_id, message_id);

-- Index op uid + folder voor snelle duplicate check (emails zonder message_id)
CREATE INDEX IF NOT EXISTS emails_user_uid_folder_idx
  ON emails (user_id, uid, imap_folder);
