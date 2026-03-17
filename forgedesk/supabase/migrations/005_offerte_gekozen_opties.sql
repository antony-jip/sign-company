-- Migration: Add gekozen_items and gekozen_varianten to offertes
-- Stores the client's selection of optional items and price variants upon acceptance

ALTER TABLE offertes ADD COLUMN IF NOT EXISTS gekozen_items jsonb DEFAULT NULL;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS gekozen_varianten jsonb DEFAULT NULL;
