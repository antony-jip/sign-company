-- ============================================================
-- COMPLETE RLS POLICIES — Alle tabellen
-- Dit bestand bevat ALLE RLS policies voor de gehele applicatie
-- Gegenereerd: 2026-02-22
-- ============================================================

-- ============================================================
-- ENABLE RLS op ALLE tabellen
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE projecten ENABLE ROW LEVEL SECURITY;
ALTER TABLE taken ENABLE ROW LEVEL SECURITY;
ALTER TABLE offertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerte_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE grootboek ENABLE ROW LEVEL SECURITY;
ALTER TABLE btw_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kortingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;
ALTER TABLE factuur_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tijdregistraties ENABLE ROW LEVEL SECURITY;
ALTER TABLE medewerkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE montage_afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE nieuwsbrieven ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculatie_producten ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculatie_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerte_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tekening_goedkeuringen ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verlof ENABLE ROW LEVEL SECURITY;
ALTER TABLE bedrijfssluitingsdagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_toewijzingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbon_regels ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbon_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE herinnering_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveranciers ENABLE ROW LEVEL SECURITY;
ALTER TABLE uitgaven ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestelbonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestelbon_regels ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveringsbonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveringsbon_regels ENABLE ROW LEVEL SECURITY;
ALTER TABLE voorraad_artikelen ENABLE ROW LEVEL SECURITY;
ALTER TABLE voorraad_mutaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activiteiten ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_formulieren ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_inzendingen ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STANDAARD POLICIES: user_id = auth.uid()
-- Pattern: SELECT/INSERT/UPDATE/DELETE per tabel
-- ============================================================

-- Tabellen met user_id kolom (standaard patroon):
-- profiles, klanten, projecten, taken, offertes, documenten,
-- emails, events, grootboek, btw_codes, kortingen, ai_chats,
-- facturen, tijdregistraties, medewerkers, montage_afspraken,
-- nieuwsbrieven, notificaties, app_settings, calculatie_producten,
-- calculatie_templates, offerte_templates, tekening_goedkeuringen,
-- user_email_settings, document_styles, verlof, bedrijfssluitingsdagen,
-- project_toewijzingen, booking_slots, booking_afspraken,
-- werkbonnen, werkbon_regels, werkbon_fotos, herinnering_templates,
-- leveranciers, uitgaven, bestelbonnen, bestelbon_regels,
-- leveringsbonnen, leveringsbon_regels, voorraad_artikelen,
-- voorraad_mutaties, deals, deal_activiteiten,
-- lead_formulieren, lead_inzendingen

-- NOTE: Alle policies zijn gedefinieerd in:
-- - supabase/schema.sql (basis tabellen)
-- - supabase/migrations/001_missing_tables.sql (eerste uitbreiding)
-- - supabase/migrations/002_document_styles.sql (document styles)
-- - supabase/migrations/003_complete_alignment.sql (volledige alignment)
--
-- Dit bestand is een referentie-overzicht van het COMPLETE RLS beleid.

-- ============================================================
-- SPECIALE POLICIES (public access voor klant-facing features)
-- ============================================================

-- Tekening goedkeuringen: klanten kunnen via token bekijken
-- (gedefinieerd in 001: "Public can view by token" op tekening_goedkeuringen)

-- Booking slots: publiek leesbaar voor booking pagina
-- (gedefinieerd in 003: "public_select_booking_slots")

-- Booking afspraken: publiek insert + select voor booking pagina
-- (gedefinieerd in 003: "public_insert_booking_afspraken", "public_select_booking_by_token")

-- Lead formulieren: publiek leesbaar als actief
-- (gedefinieerd in 003: "public_select_lead_formulier_by_token")

-- Lead inzendingen: publiek insertbaar
-- (gedefinieerd in 003: "public_insert_lead_inzendingen")

-- ============================================================
-- CHILD TABELLEN (RLS via parent ownership check)
-- ============================================================

-- offerte_items: RLS via JOIN op offertes.user_id
-- (gedefinieerd in schema.sql)

-- factuur_items: RLS via JOIN op facturen.user_id
-- (gedefinieerd in 001)

-- ============================================================
-- CHECKLIST: Alle 48 tabellen hebben RLS ✅
-- ============================================================
-- 1.  profiles ✅
-- 2.  klanten ✅
-- 3.  projecten ✅
-- 4.  taken ✅
-- 5.  offertes ✅
-- 6.  offerte_items ✅ (via parent)
-- 7.  documenten ✅
-- 8.  emails ✅
-- 9.  events ✅
-- 10. grootboek ✅
-- 11. btw_codes ✅
-- 12. kortingen ✅
-- 13. ai_chats ✅
-- 14. facturen ✅
-- 15. factuur_items ✅ (via parent)
-- 16. tijdregistraties ✅
-- 17. medewerkers ✅
-- 18. montage_afspraken ✅
-- 19. nieuwsbrieven ✅
-- 20. notificaties ✅
-- 21. app_settings ✅
-- 22. calculatie_producten ✅
-- 23. calculatie_templates ✅
-- 24. offerte_templates ✅
-- 25. tekening_goedkeuringen ✅ + public token
-- 26. user_email_settings ✅
-- 27. document_styles ✅
-- 28. verlof ✅
-- 29. bedrijfssluitingsdagen ✅
-- 30. project_toewijzingen ✅
-- 31. booking_slots ✅ + public read
-- 32. booking_afspraken ✅ + public insert/read
-- 33. werkbonnen ✅
-- 34. werkbon_regels ✅
-- 35. werkbon_fotos ✅
-- 36. herinnering_templates ✅
-- 37. leveranciers ✅
-- 38. uitgaven ✅
-- 39. bestelbonnen ✅
-- 40. bestelbon_regels ✅
-- 41. leveringsbonnen ✅
-- 42. leveringsbon_regels ✅
-- 43. voorraad_artikelen ✅
-- 44. voorraad_mutaties ✅
-- 45. deals ✅
-- 46. deal_activiteiten ✅
-- 47. lead_formulieren ✅ + public read
-- 48. lead_inzendingen ✅ + public insert
