-- ============================================================================
-- Kunstdoekje — sfeerfoto's (gallery) per artwork
-- ----------------------------------------------------------------------------
-- De WooCommerce-export bevat per product meerdere afbeeldingen: de eerste is
-- het hoofdbeeld (image_url), de rest zijn sfeerfoto's. Die laatste landen in
-- gallery_urls, gevuld door `npm run migrate:gallery` (scripts/migrate-gallery.ts).
--
-- Draai dit in de Supabase SQL Editor. Idempotent: opnieuw draaien mag.
-- ============================================================================

alter table artworks
  add column if not exists gallery_urls text[] not null default '{}';
