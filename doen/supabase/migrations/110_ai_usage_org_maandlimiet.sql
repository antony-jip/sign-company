-- Migration: ai_usage_org uitbreiden met maandlimiet
-- Antony draait deze handmatig in Supabase SQL Editor.
--
-- Voegt twee kolommen toe aan ai_usage_org (uit migration 093):
--   * maandlimiet         — hard cap per (organisatie_id, route, maand), default 10.00 EUR
--   * geblokkeerd_op      — moment waarop de cap geraakt werd (NULL = nog niet geraakt)
--
-- NB: 093 heeft al UNIQUE(organisatie_id, route, maand) en INDEX(organisatie_id, maand).
-- De prompt vroeg om een nieuwe UNIQUE(organisatie_id, maand) — die is geschrapt
-- omdat de bestaande tabel meerdere routes per (org, maand) toestaat (één rij per route).
-- De budget-check sommeert geschatte_kosten over alle routes voor (org, maand) en
-- gebruikt MAX(maandlimiet) als effectieve limiet.
--
-- RLS uit 093 blijft ongewijzigd (SELECT voor org-leden, writes via service_role).

ALTER TABLE ai_usage_org
  ADD COLUMN IF NOT EXISTS maandlimiet numeric(10,2) NOT NULL DEFAULT 10.00;

ALTER TABLE ai_usage_org
  ADD COLUMN IF NOT EXISTS geblokkeerd_op timestamptz;
