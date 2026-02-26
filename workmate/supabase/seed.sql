-- Workmate Seed Data
-- Voer dit uit in de Supabase SQL Editor NA het schema.sql
-- BELANGRIJK: Vervang 'YOUR_USER_UUID' met je eigen user UUID na registratie
-- Je kunt je UUID vinden in de Supabase Auth dashboard

-- Voorbeeld: als je UUID is 'a1b2c3d4-...', dan:
-- SET my_user_id = 'a1b2c3d4-...';

DO $$
DECLARE
  uid UUID := 'YOUR_USER_UUID'; -- Vervang dit met je eigen user UUID

  -- Klant IDs (zodat we ze kunnen refereren in projecten en offertes)
  klant_vdberg UUID := gen_random_uuid();
  klant_bakker UUID := gen_random_uuid();
  klant_dejong UUID := gen_random_uuid();
  klant_smit UUID := gen_random_uuid();
  klant_visser UUID := gen_random_uuid();
  klant_mulder UUID := gen_random_uuid();
  klant_bos UUID := gen_random_uuid();
  klant_hendriks UUID := gen_random_uuid();

  -- Project IDs (zodat we ze kunnen refereren in taken en events)
  proj_kantoor UUID := gen_random_uuid();
  proj_website UUID := gen_random_uuid();
  proj_verbouwing UUID := gen_random_uuid();
  proj_branding UUID := gen_random_uuid();
  proj_app UUID := gen_random_uuid();
  proj_interieur UUID := gen_random_uuid();
  proj_marketing UUID := gen_random_uuid();
  proj_signage UUID := gen_random_uuid();
  proj_wayfinding UUID := gen_random_uuid();
  proj_lichtreclame UUID := gen_random_uuid();

  -- Offerte IDs (zodat we ze kunnen refereren in offerte_items)
  off_1 UUID := gen_random_uuid();
  off_2 UUID := gen_random_uuid();
  off_3 UUID := gen_random_uuid();
  off_4 UUID := gen_random_uuid();
  off_5 UUID := gen_random_uuid();
  off_6 UUID := gen_random_uuid();

BEGIN

-- ============================================================
-- KLANTEN (8 stuks)
-- ============================================================

INSERT INTO klanten (id, user_id, bedrijfsnaam, contactpersoon, email, telefoon, adres, postcode, stad, status, tags, notities) VALUES
(klant_vdberg, uid, 'Van der Berg Architecten', 'Jan van der Berg', 'jan@vdberg-architecten.nl', '020-5551234', 'Keizersgracht 142', '1015CZ', 'Amsterdam', 'actief', ARRAY['architectuur', 'premium'], 'Grote klant, maandelijks overleg. Werkt aan meerdere projecten tegelijk.'),
(klant_bakker, uid, 'Bakker & Zonen Bouw B.V.', 'Pieter Bakker', 'p.bakker@bakkerbouw.nl', '030-5559876', 'Oudegracht 88', '3511AR', 'Utrecht', 'actief', ARRAY['bouw', 'zakelijk'], 'Betrouwbare aannemer. Betaalt altijd op tijd. Voorkeur voor maandelijkse facturering.'),
(klant_dejong, uid, 'De Jong Interieurs', 'Lisa de Jong', 'lisa@dejonginterieurs.nl', '010-5554321', 'Witte de Withstraat 56', '3012BR', 'Rotterdam', 'actief', ARRAY['interieur', 'design'], 'Interieurontwerp bureau. Gespecialiseerd in horeca en kantoorruimtes.'),
(klant_smit, uid, 'Smit Makelaardij', 'Robert Smit', 'robert@smitmakelaardij.nl', '070-5556789', 'Lange Voorhout 12', '2514ED', 'Den Haag', 'actief', ARRAY['vastgoed', 'premium'], 'Makelaarskantoor met 3 vestigingen. Interesse in digitale signage voor etalages.'),
(klant_visser, uid, 'Visser Horeca Groep', 'Anne Visser', 'anne@visserhoreca.nl', '020-5553456', 'Leidseplein 28', '1017PT', 'Amsterdam', 'actief', ARRAY['horeca', 'keten'], 'Keten van 5 restaurants in Amsterdam. Zoekt uniforme signing voor alle locaties.'),
(klant_mulder, uid, 'Mulder Advocaten', 'Thomas Mulder', 'thomas@mulderadvocaten.nl', '020-5557890', 'Herengracht 450', '1017CA', 'Amsterdam', 'prospect', ARRAY['juridisch', 'zakelijk'], 'Kennismakingsgesprek gehad op 15 november. Interesse in gevelreclame en wayfinding.'),
(klant_bos, uid, 'Bos Techniek B.V.', 'Erik Bos', 'erik@bostechniek.nl', '040-5552345', 'Strijp-S Torenallee 42', '5617BD', 'Eindhoven', 'actief', ARRAY['techniek', 'industrie'], 'Technisch bedrijf op Strijp-S. Project voor LED-lichtreclame aan de gevel.'),
(klant_hendriks, uid, 'Hendriks Retail Solutions', 'Sophie Hendriks', 'sophie@hendriksretail.nl', '050-5558901', 'Grote Markt 7', '9712HR', 'Groningen', 'inactief', ARRAY['retail', 'winkels'], 'Vorig project afgerond in Q2 2024. Mogelijk nieuw project in Q1 2025 voor winkelcentrum.');

-- ============================================================
-- PROJECTEN (10 stuks)
-- ============================================================

INSERT INTO projecten (id, user_id, klant_id, naam, beschrijving, status, prioriteit, start_datum, eind_datum, budget, besteed, voortgang, team_leden) VALUES
(proj_kantoor, uid, klant_vdberg, 'Kantoor signing Keizersgracht', 'Complete signing pakket voor het nieuwe kantoorpand aan de Keizersgracht. Inclusief gevelletters, receptiebalie logo, en etage-aanduiding.', 'actief', 'hoog', '2024-11-01', '2025-02-28', 18500.00, 8750.00, 45, ARRAY['Mark', 'Sandra', 'Kevin']),
(proj_website, uid, klant_bakker, 'Website redesign Bakker Bouw', 'Volledig nieuw ontwerp voor de bedrijfswebsite met portfolio, team-pagina en contactformulier. Responsive design met CMS.', 'actief', 'medium', '2024-12-01', '2025-03-15', 12000.00, 4200.00, 35, ARRAY['Linda', 'Tim']),
(proj_verbouwing, uid, klant_dejong, 'Restaurant De Eethoek interieur', 'Interieurontwerp en productie van decoratieve wandpanelen, menukaarthouders en verlichte naamgeving voor Restaurant De Eethoek in Rotterdam.', 'in-review', 'hoog', '2024-09-15', '2025-01-15', 24000.00, 21600.00, 90, ARRAY['Mark', 'Sandra', 'Piet']),
(proj_branding, uid, klant_smit, 'Branding Smit Makelaardij', 'Huisstijl vernieuwing inclusief logo, visitekaartjes, briefpapier, en sjablonen voor verkoopbrochures. Drie vestigingen.', 'gepland', 'medium', '2025-01-15', '2025-04-30', 8500.00, 0, 0, ARRAY['Linda']),
(proj_app, uid, klant_visser, 'Digitale menukaart app', 'Ontwikkeling van een tablet-gebaseerde digitale menukaart voor alle 5 restaurantlocaties. Inclusief CMS voor menu-aanpassingen.', 'actief', 'hoog', '2024-10-01', '2025-02-15', 32000.00, 22400.00, 70, ARRAY['Tim', 'Kevin', 'Sandra']),
(proj_interieur, uid, klant_dejong, 'Hotellobby signing De Graaf', 'Luxe signing voor de lobby van Hotel De Graaf. Vrijstaande letters in messing, verlichte receptiebalie, en kamernummering.', 'gepland', 'medium', '2025-02-01', '2025-05-31', 15000.00, 0, 0, ARRAY['Mark', 'Piet']),
(proj_marketing, uid, klant_visser, 'Social media campagne voorjaar', 'Voorjaarscampagne voor alle 5 restaurants. Inclusief fotografie, contentcreatie en advertentiebeheer op Instagram en Facebook.', 'actief', 'medium', '2025-01-01', '2025-03-31', 6500.00, 2100.00, 30, ARRAY['Linda', 'Sandra']),
(proj_signage, uid, klant_bos, 'Gevelreclame Bos Techniek', 'Groot formaat LED-verlichte gevelreclame voor het bedrijfspand op Strijp-S. Inclusief lichtplan en vergunningsaanvraag.', 'actief', 'kritiek', '2024-11-15', '2025-01-31', 28000.00, 19600.00, 75, ARRAY['Mark', 'Kevin', 'Piet']),
(proj_wayfinding, uid, klant_mulder, 'Wayfinding systeem kantoor', 'Ontwerp en productie van een compleet wayfinding systeem voor het advocatenkantoor. Inclusief richtingaanwijzers, deurplaatjes en etage-overzichten.', 'gepland', 'laag', '2025-03-01', '2025-06-30', 11000.00, 0, 0, ARRAY['Sandra']),
(proj_lichtreclame, uid, klant_vdberg, 'Lichtreclame nieuw filiaal', 'Ontwerp en installatie van lichtreclame voor het nieuwe filiaal in Amsterdam-Zuid. Inclusief vergunning en montage.', 'on-hold', 'medium', '2025-01-01', '2025-04-15', 14000.00, 2800.00, 15, ARRAY['Mark', 'Piet']);

-- ============================================================
-- TAKEN (30 stuks)
-- ============================================================

INSERT INTO taken (user_id, project_id, titel, beschrijving, status, prioriteit, toegewezen_aan, deadline, geschatte_tijd, bestede_tijd) VALUES
-- Taken voor proj_kantoor (Kantoor signing Keizersgracht)
(uid, proj_kantoor, 'Inmeting locatie Keizersgracht', 'Alle gevelmaten en binnenmaten opmeten voor de signing. Inclusief fotodocumentatie.', 'klaar', 'hoog', 'Mark', '2024-11-15', 4.00, 3.50),
(uid, proj_kantoor, 'Ontwerp gevelletters', 'Ontwerp van RVS gevelletters met LED-verlichting. Lettertype conform huisstijl klant.', 'klaar', 'hoog', 'Sandra', '2024-12-01', 8.00, 10.00),
(uid, proj_kantoor, 'Productie gevelletters', 'Productie van de goedgekeurde gevelletters bij leverancier. Levertijd 3-4 weken.', 'bezig', 'hoog', 'Kevin', '2025-01-15', 2.00, 1.00),
(uid, proj_kantoor, 'Ontwerp receptie logo', 'Groot formaat logo achter de receptiebalie. Vrijstaand op afstandhouders met indirecte verlichting.', 'bezig', 'medium', 'Sandra', '2025-01-20', 6.00, 4.00),
(uid, proj_kantoor, 'Montage gevelletters', 'Planning en uitvoering montage gevelletters. Hoogwerker nodig. Vergunning aangevraagd.', 'todo', 'hoog', 'Mark', '2025-02-15', 8.00, 0),
(uid, proj_kantoor, 'Etage-aanduiding ontwerpen', 'Ontwerp van etage-aanduidingen voor 4 verdiepingen. Materiaal: geborsteld aluminium.', 'todo', 'medium', 'Sandra', '2025-02-01', 4.00, 0),

-- Taken voor proj_website (Website redesign)
(uid, proj_website, 'Wireframes website', 'Wireframes maken voor alle hoofdpaginas: home, portfolio, over ons, contact.', 'klaar', 'hoog', 'Linda', '2024-12-15', 12.00, 14.00),
(uid, proj_website, 'Visueel ontwerp homepage', 'High-fidelity ontwerp van de homepage in Figma. Inclusief desktop en mobiele versie.', 'klaar', 'hoog', 'Linda', '2025-01-05', 10.00, 8.00),
(uid, proj_website, 'Frontend ontwikkeling', 'HTML/CSS/JS ontwikkeling van alle paginas. Framework: Next.js met Tailwind CSS.', 'bezig', 'hoog', 'Tim', '2025-02-15', 40.00, 18.00),
(uid, proj_website, 'CMS integratie', 'Koppeling met headless CMS (Sanity) voor portfolio en nieuwsberichten.', 'todo', 'medium', 'Tim', '2025-02-28', 16.00, 0),
(uid, proj_website, 'Fotografie bedrijfspand', 'Professionele fotografie van het bedrijfspand en team voor de website.', 'todo', 'laag', 'Linda', '2025-02-10', 6.00, 0),

-- Taken voor proj_verbouwing (Restaurant interieur)
(uid, proj_verbouwing, 'Ontwerp wandpanelen', 'Decoratieve wandpanelen met houtstructuur en indirecte verlichting.', 'klaar', 'hoog', 'Sandra', '2024-10-15', 12.00, 11.00),
(uid, proj_verbouwing, 'Productie wandpanelen', 'Productie van 8 wandpanelen bij meubelmaker. Materiaal: eikenhout met epoxy details.', 'klaar', 'hoog', 'Piet', '2024-11-30', 4.00, 5.00),
(uid, proj_verbouwing, 'Montage wandpanelen', 'Installatie van alle wandpanelen op locatie. Inclusief elektra-aansluiting verlichting.', 'klaar', 'medium', 'Piet', '2024-12-15', 16.00, 14.00),
(uid, proj_verbouwing, 'Verlichte naamgeving boven ingang', 'LED-verlichte letters "De Eethoek" boven de hoofdingang. Materiaal: mat zwart aluminium.', 'review', 'hoog', 'Mark', '2025-01-10', 8.00, 7.50),
(uid, proj_verbouwing, 'Eindoplevering en fotografie', 'Eindinspectie met klant en professionele opleverfotografie voor portfolio.', 'todo', 'medium', 'Sandra', '2025-01-15', 4.00, 0),

-- Taken voor proj_app (Digitale menukaart)
(uid, proj_app, 'UX/UI ontwerp menukaart', 'Ontwerp van de tablet interface. Inclusief categorienavigatie, fotogalerij en bestelfunctie.', 'klaar', 'hoog', 'Sandra', '2024-11-01', 20.00, 22.00),
(uid, proj_app, 'Backend API ontwikkeling', 'REST API voor menu-items, categorieeen, prijzen en afbeeldingen. Node.js met PostgreSQL.', 'klaar', 'hoog', 'Tim', '2024-12-01', 30.00, 28.00),
(uid, proj_app, 'Frontend app ontwikkeling', 'React Native app voor iPad tablets. Offline-first architectuur.', 'bezig', 'hoog', 'Kevin', '2025-01-15', 40.00, 32.00),
(uid, proj_app, 'CMS voor menu-beheer', 'Web-based CMS waarmee de klant zelf menu-items kan aanpassen, prijzen wijzigen en fotos uploaden.', 'bezig', 'medium', 'Tim', '2025-01-31', 20.00, 12.00),
(uid, proj_app, 'Testfase locatie 1', 'Pilot uitrol op de eerste locatie (Leidseplein). 2 weken testperiode met feedback.', 'todo', 'hoog', 'Kevin', '2025-02-01', 8.00, 0),
(uid, proj_app, 'Uitrol overige 4 locaties', 'Na succesvolle pilot uitrollen naar de overige 4 restaurantlocaties.', 'todo', 'medium', 'Kevin', '2025-02-15', 12.00, 0),

-- Taken voor proj_signage (Gevelreclame Bos Techniek)
(uid, proj_signage, 'Lichtplan opstellen', 'Lichtplan voor de LED-gevelreclame. Inclusief lichtsterkte berekening en energieverbruik.', 'klaar', 'kritiek', 'Mark', '2024-12-01', 8.00, 9.00),
(uid, proj_signage, 'Vergunningsaanvraag gemeente', 'Aanvraag omgevingsvergunning bij gemeente Eindhoven voor de gevelreclame. Inclusief tekeningen.', 'klaar', 'kritiek', 'Mark', '2024-12-15', 6.00, 8.00),
(uid, proj_signage, 'Productie LED-letters', 'Productie van groot formaat LED-letters. Afmeting: 2.5m breed, 80cm hoog. Kleur: bedrijfsblauw.', 'bezig', 'hoog', 'Piet', '2025-01-15', 4.00, 2.00),
(uid, proj_signage, 'Montage gevelreclame', 'Montage op hoogte (12m). Hoogwerker + 2 monteurs. Afstemming met gebouweigenaar.', 'todo', 'hoog', 'Kevin', '2025-01-31', 12.00, 0),

-- Taken voor proj_marketing (Social media campagne)
(uid, proj_marketing, 'Contentstrategie opstellen', 'Strategie voor 3 maanden social media content. Themas, posting schema en hashtag-strategie.', 'klaar', 'medium', 'Linda', '2025-01-10', 8.00, 7.00),
(uid, proj_marketing, 'Fotoshoot gerechten', 'Professionele foodfotografie bij alle 5 locaties. Minimaal 10 gerechten per restaurant.', 'bezig', 'medium', 'Sandra', '2025-01-31', 16.00, 8.00),
(uid, proj_marketing, 'Content creatie februari', 'Posts en stories voor februari. 4x per week posten op Instagram, 3x op Facebook.', 'todo', 'medium', 'Linda', '2025-02-28', 12.00, 0),
(uid, proj_marketing, 'Advertentiebeheer Q1', 'Setup en beheer van betaalde advertenties op Meta. Budget: EUR 1500/maand.', 'todo', 'hoog', 'Linda', '2025-03-31', 10.00, 0);

-- ============================================================
-- OFFERTES (6 stuks) met items
-- ============================================================

INSERT INTO offertes (id, user_id, klant_id, nummer, titel, status, subtotaal, btw_bedrag, totaal, geldig_tot, notities, voorwaarden) VALUES
(off_1, uid, klant_vdberg, 'OFF-2024-001', 'Kantoor signing pakket Keizersgracht', 'goedgekeurd', 15289.26, 3210.74, 18500.00, '2025-01-15', 'Inclusief montage en 2 jaar garantie op verlichting.', 'Betaling in 3 termijnen: 40% bij opdracht, 40% bij levering, 20% bij oplevering. Levertijd 8-10 weken na goedkeuring.'),
(off_2, uid, klant_bakker, 'OFF-2024-002', 'Website redesign inclusief CMS', 'goedgekeurd', 9917.36, 2082.64, 12000.00, '2025-01-31', 'Next.js website met Sanity CMS. Inclusief 3 maanden support na oplevering.', 'Betaling in 2 termijnen: 50% bij start, 50% bij oplevering. Meerwerk wordt vooraf besproken en gefactureerd op basis van uurtarief EUR 95.'),
(off_3, uid, klant_dejong, 'OFF-2024-003', 'Interieur signing Restaurant De Eethoek', 'goedgekeurd', 19834.71, 4165.29, 24000.00, '2024-10-15', 'Wandpanelen, menukaarthouders en verlichte naamgeving.', 'Betaling in 3 termijnen: 30% bij opdracht, 40% bij levering materialen, 30% bij eindoplevering.'),
(off_4, uid, klant_smit, 'OFF-2025-001', 'Huisstijl vernieuwing 3 vestigingen', 'verzonden', 7024.79, 1475.21, 8500.00, '2025-02-28', 'Complete huisstijl inclusief logo, drukwerk en templates.', 'Betaling: 50% bij opdracht, 50% bij oplevering. Maximaal 3 revisierondes inbegrepen.'),
(off_5, uid, klant_bos, 'OFF-2024-004', 'LED gevelreclame Strijp-S', 'goedgekeurd', 23140.50, 4859.50, 28000.00, '2024-12-31', 'Groot formaat LED-verlichte gevelletters inclusief vergunning en montage.', 'Betaling in 3 termijnen. Vergunningskosten worden doorberekend. Garantie: 5 jaar op LED-modules, 10 jaar op constructie.'),
(off_6, uid, klant_mulder, 'OFF-2025-002', 'Wayfinding systeem advocatenkantoor', 'concept', 9090.91, 1909.09, 11000.00, '2025-04-30', 'Compleet wayfinding systeem voor 4 verdiepingen.', 'Betaling: 50% bij opdracht, 50% bij oplevering. Inclusief montagemateriaal en installatiekosten.');

-- Offerte items voor OFF-2024-001 (Kantoor signing)
INSERT INTO offerte_items (offerte_id, beschrijving, aantal, eenheidsprijs, btw_percentage, korting_percentage, totaal, volgorde) VALUES
(off_1, 'RVS gevelletters met LED-verlichting (set)', 1, 6500.00, 21, 0, 6500.00, 1),
(off_1, 'Receptie logo op afstandhouders met indirecte verlichting', 1, 3200.00, 21, 0, 3200.00, 2),
(off_1, 'Etage-aanduiding geborsteld aluminium (per stuk)', 4, 450.00, 21, 0, 1800.00, 3),
(off_1, 'Montage en installatie (inclusief hoogwerker)', 1, 2800.00, 21, 0, 2800.00, 4),
(off_1, 'Ontwerp en projectbegeleiding', 1, 989.26, 21, 0, 989.26, 5);

-- Offerte items voor OFF-2024-002 (Website redesign)
INSERT INTO offerte_items (offerte_id, beschrijving, aantal, eenheidsprijs, btw_percentage, korting_percentage, totaal, volgorde) VALUES
(off_2, 'UX/UI ontwerp (wireframes + visueel ontwerp)', 1, 2400.00, 21, 0, 2400.00, 1),
(off_2, 'Frontend ontwikkeling Next.js', 1, 4200.00, 21, 0, 4200.00, 2),
(off_2, 'CMS integratie Sanity', 1, 1800.00, 21, 0, 1800.00, 3),
(off_2, 'Professionele fotografie', 1, 850.00, 21, 0, 850.00, 4),
(off_2, 'Hosting setup + 3 maanden support', 1, 667.36, 21, 0, 667.36, 5);

-- Offerte items voor OFF-2024-003 (Restaurant interieur)
INSERT INTO offerte_items (offerte_id, beschrijving, aantal, eenheidsprijs, btw_percentage, korting_percentage, totaal, volgorde) VALUES
(off_3, 'Decoratieve wandpanelen eikenhout met epoxy (per stuk)', 8, 1450.00, 21, 0, 11600.00, 1),
(off_3, 'Menukaarthouders op maat (set van 20)', 1, 1200.00, 21, 0, 1200.00, 2),
(off_3, 'LED-verlichte naamgeving "De Eethoek"', 1, 3800.00, 21, 0, 3800.00, 3),
(off_3, 'Montage en installatiekosten', 1, 2234.71, 21, 0, 2234.71, 4),
(off_3, 'Ontwerp en projectbegeleiding', 1, 1000.00, 21, 0, 1000.00, 5);

-- Offerte items voor OFF-2025-001 (Huisstijl Smit)
INSERT INTO offerte_items (offerte_id, beschrijving, aantal, eenheidsprijs, btw_percentage, korting_percentage, totaal, volgorde) VALUES
(off_4, 'Logo ontwerp (inclusief 3 concepten)', 1, 2200.00, 21, 0, 2200.00, 1),
(off_4, 'Visitekaartjes ontwerp + drukwerk (3 vestigingen, 500 st. per vestiging)', 3, 285.00, 21, 0, 855.00, 2),
(off_4, 'Briefpapier en enveloppen ontwerp + drukwerk', 1, 680.00, 21, 0, 680.00, 3),
(off_4, 'Verkoopbrochure template (InDesign)', 1, 1800.00, 21, 0, 1800.00, 4),
(off_4, 'Huisstijlhandboek (digitaal)', 1, 1489.79, 21, 0, 1489.79, 5);

-- Offerte items voor OFF-2024-004 (LED gevelreclame)
INSERT INTO offerte_items (offerte_id, beschrijving, aantal, eenheidsprijs, btw_percentage, korting_percentage, totaal, volgorde) VALUES
(off_5, 'LED-verlichte letters (2.5m x 0.8m)', 1, 12500.00, 21, 0, 12500.00, 1),
(off_5, 'Stalen constructie en bevestigingsframe', 1, 4200.00, 21, 0, 4200.00, 2),
(off_5, 'Elektra-installatie en voeding', 1, 1800.00, 21, 0, 1800.00, 3),
(off_5, 'Vergunningsaanvraag en lichtplan', 1, 1450.00, 21, 0, 1450.00, 4),
(off_5, 'Montage op hoogte (hoogwerker + 2 monteurs)', 1, 3190.50, 21, 0, 3190.50, 5);

-- Offerte items voor OFF-2025-002 (Wayfinding)
INSERT INTO offerte_items (offerte_id, beschrijving, aantal, eenheidsprijs, btw_percentage, korting_percentage, totaal, volgorde) VALUES
(off_6, 'Ontwerp wayfinding systeem (4 verdiepingen)', 1, 2800.00, 21, 0, 2800.00, 1),
(off_6, 'Richtingaanwijzers aluminium (per stuk)', 12, 185.00, 21, 0, 2220.00, 2),
(off_6, 'Deurplaatjes met naamsaanduiding (per stuk)', 18, 95.00, 21, 0, 1710.00, 3),
(off_6, 'Etage-overzichtsborden (per stuk)', 4, 340.00, 21, 0, 1360.00, 4),
(off_6, 'Montage en installatiekosten', 1, 1000.91, 21, 0, 1000.91, 5);

-- ============================================================
-- DOCUMENTEN (10 stuks)
-- ============================================================

INSERT INTO documenten (user_id, project_id, klant_id, naam, type, grootte, map, status, tags) VALUES
(uid, proj_kantoor, klant_vdberg, 'Ontwerp gevelletters v3.pdf', 'application/pdf', 2450000, 'Ontwerpen', 'definitief', ARRAY['ontwerp', 'goedgekeurd']),
(uid, proj_kantoor, klant_vdberg, 'Inmeting rapport Keizersgracht.pdf', 'application/pdf', 1200000, 'Rapporten', 'definitief', ARRAY['inmeting', 'rapport']),
(uid, proj_website, klant_bakker, 'Wireframes website Bakker v2.fig', 'application/figma', 8900000, 'Ontwerpen', 'review', ARRAY['wireframe', 'design']),
(uid, proj_verbouwing, klant_dejong, 'Wandpanelen specificatie.xlsx', 'application/xlsx', 340000, 'Specificaties', 'definitief', ARRAY['specificatie', 'productie']),
(uid, proj_verbouwing, klant_dejong, 'Opleverfoto restaurant 01.jpg', 'image/jpeg', 5600000, 'Fotos', 'concept', ARRAY['foto', 'portfolio']),
(uid, proj_app, klant_visser, 'UX flow digitale menukaart.pdf', 'application/pdf', 3200000, 'Ontwerpen', 'definitief', ARRAY['ux', 'goedgekeurd']),
(uid, proj_signage, klant_bos, 'Lichtplan gevelreclame.pdf', 'application/pdf', 1800000, 'Technisch', 'definitief', ARRAY['lichtplan', 'technisch']),
(uid, proj_signage, klant_bos, 'Vergunning aanvraag Eindhoven.pdf', 'application/pdf', 920000, 'Juridisch', 'definitief', ARRAY['vergunning', 'gemeente']),
(uid, proj_branding, klant_smit, 'Logo concepten Smit v1.pdf', 'application/pdf', 4100000, 'Ontwerpen', 'concept', ARRAY['logo', 'concept']),
(uid, proj_marketing, klant_visser, 'Contentstrategie Q1 2025.docx', 'application/docx', 580000, 'Strategie', 'definitief', ARRAY['strategie', 'social media']);

-- ============================================================
-- EMAILS (8 stuks)
-- ============================================================

INSERT INTO emails (user_id, gmail_id, van, aan, onderwerp, inhoud, datum, gelezen, starred, labels, bijlagen, map) VALUES
(uid, 'msg_001', 'jan@vdberg-architecten.nl', 'info@workmate.nl', 'Re: Ontwerp gevelletters goedgekeurd', 'Beste team, Het ontwerp voor de gevelletters is goedgekeurd door de directie. We gaan graag verder met de productie. Kunnen jullie de levertijd bevestigen? Met vriendelijke groet, Jan van der Berg', '2025-01-08 09:15:00+01', true, true, ARRAY['klanten', 'belangrijk'], 1, 'inbox'),
(uid, 'msg_002', 'p.bakker@bakkerbouw.nl', 'info@workmate.nl', 'Feedback wireframes website', 'Hallo Linda, De wireframes zien er goed uit. Een paar opmerkingen: 1) De portfolio pagina mag wat prominenter. 2) Graag een "actuele projecten" sectie op de homepage. 3) Contactformulier met projecttype keuze. Groeten, Pieter', '2025-01-10 14:30:00+01', true, false, ARRAY['klanten'], 0, 'inbox'),
(uid, 'msg_003', 'thomas@mulderadvocaten.nl', 'info@workmate.nl', 'Offerte wayfinding systeem', 'Geachte heer/mevrouw, Naar aanleiding van ons gesprek vorige week ontvang ik graag een offerte voor het wayfinding systeem. Zoals besproken gaat het om 4 verdiepingen met in totaal 18 kamers. Met vriendelijke groet, Thomas Mulder', '2025-01-12 10:45:00+01', true, false, ARRAY['klanten', 'offertes'], 0, 'inbox'),
(uid, 'msg_004', 'info@workmate.nl', 'erik@bostechniek.nl', 'Update productie gevelreclame', 'Beste Erik, Hierbij een update over de productie van je gevelreclame. De LED-letters zijn in productie en de verwachte levertijd is 20 januari. De montage plannen we in week 5. Ik stuur je volgende week het definitieve montageschema. Met vriendelijke groet', '2025-01-09 16:00:00+01', true, false, ARRAY['klanten'], 0, 'verzonden'),
(uid, 'msg_005', 'anne@visserhoreca.nl', 'info@workmate.nl', 'Pilot menukaart app - feedback', 'Hoi, Super enthousiast over de demo van gisteren! Het team heeft een paar wensen: offline modus (soms valt wifi uit), grotere fotos, en een dagmenu sectie. Kunnen jullie dit nog meenemen voor de pilot? Groetjes, Anne', '2025-01-14 11:20:00+01', false, true, ARRAY['klanten', 'belangrijk'], 0, 'inbox'),
(uid, 'msg_006', 'leverancier@signpro.nl', 'info@workmate.nl', 'Offerte LED-modules Bos Techniek', 'Beste klant, Hierbij onze offerte voor de LED-modules zoals besproken. De Samsung LM301B modules hebben een levensduur van 50.000 uur en zijn geschikt voor buitengebruik (IP65). Offerte in bijlage. Met vriendelijke groet, SignPro B.V.', '2025-01-07 08:30:00+01', true, false, ARRAY['leveranciers'], 1, 'inbox'),
(uid, 'msg_007', 'gemeente@eindhoven.nl', 'info@workmate.nl', 'Beschikking omgevingsvergunning - Strijp-S', 'Geachte aanvrager, Hierbij ontvangt u de beschikking op uw aanvraag omgevingsvergunning voor het plaatsen van gevelreclame aan het pand Torenallee 42, Eindhoven. Uw vergunning is verleend. Zie bijlage voor de volledige beschikking.', '2025-01-06 13:00:00+01', true, true, ARRAY['juridisch', 'belangrijk'], 1, 'inbox'),
(uid, 'msg_008', 'sophie@hendriksretail.nl', 'info@workmate.nl', 'Nieuw project winkelcentrum 2025?', 'Hallo! Ik hoop dat het goed gaat. Wij zijn bezig met plannen voor een nieuw winkelcentrum in Groningen (opening Q3 2025). Zouden jullie geinteresseerd zijn in de signing voor het hele centrum? Laten we binnenkort even bellen. Groet, Sophie', '2025-01-13 15:45:00+01', false, false, ARRAY['klanten', 'prospects'], 0, 'inbox');

-- ============================================================
-- EVENTS (12 stuks)
-- ============================================================

INSERT INTO events (user_id, project_id, titel, beschrijving, start_datum, eind_datum, type, locatie, deelnemers, kleur, herhaling) VALUES
(uid, proj_kantoor, 'Bouwvergadering Keizersgracht', 'Maandelijkse bouwvergadering met architect en aannemer over voortgang signing.', '2025-01-20 10:00:00+01', '2025-01-20 11:30:00+01', 'meeting', 'Keizersgracht 142, Amsterdam', ARRAY['Jan van der Berg', 'Mark', 'Kevin'], '#2563EB', 'maandelijks'),
(uid, proj_website, 'Sprint review website Bakker', 'Demo van de huidige stand van de website aan de klant.', '2025-01-22 14:00:00+01', '2025-01-22 15:00:00+01', 'meeting', 'Online (Google Meet)', ARRAY['Pieter Bakker', 'Linda', 'Tim'], '#059669', NULL),
(uid, proj_verbouwing, 'Eindoplevering Restaurant De Eethoek', 'Finale oplevering en inspectie met Lisa de Jong.', '2025-01-15 09:00:00+01', '2025-01-15 12:00:00+01', 'deadline', 'Witte de Withstraat 56, Rotterdam', ARRAY['Lisa de Jong', 'Sandra', 'Piet'], '#DC2626', NULL),
(uid, proj_app, 'Pilot start digitale menukaart', 'Start van de 2-weekse pilotfase op locatie Leidseplein.', '2025-02-03 08:00:00+01', '2025-02-03 12:00:00+01', 'deadline', 'Leidseplein 28, Amsterdam', ARRAY['Anne Visser', 'Kevin', 'Tim'], '#DC2626', NULL),
(uid, proj_signage, 'Montage gevelreclame Bos Techniek', 'Montagedag gevelreclame. Hoogwerker besteld. 2 monteurs nodig.', '2025-01-27 07:00:00+01', '2025-01-27 17:00:00+01', 'deadline', 'Strijp-S Torenallee 42, Eindhoven', ARRAY['Erik Bos', 'Mark', 'Kevin', 'Piet'], '#DC2626', NULL),
(uid, NULL, 'Teamoverleg maandag', 'Wekelijks teamoverleg: planning, voortgang en blokkades bespreken.', '2025-01-20 09:00:00+01', '2025-01-20 09:45:00+01', 'meeting', 'Kantoor', ARRAY['Mark', 'Sandra', 'Kevin', 'Linda', 'Tim', 'Piet'], '#7C3AED', 'wekelijks'),
(uid, proj_branding, 'Kickoff meeting Smit Makelaardij', 'Kennismaking en briefing voor huisstijl vernieuwing.', '2025-01-17 13:00:00+01', '2025-01-17 14:30:00+01', 'meeting', 'Lange Voorhout 12, Den Haag', ARRAY['Robert Smit', 'Linda'], '#2563EB', NULL),
(uid, proj_marketing, 'Fotoshoot Restaurant Centrum', 'Foodfotografie sessie bij restaurant locatie Centrum.', '2025-01-24 10:00:00+01', '2025-01-24 16:00:00+01', 'meeting', 'Damstraat 15, Amsterdam', ARRAY['Anne Visser', 'Sandra'], '#F59E0B', NULL),
(uid, NULL, 'BTW aangifte Q4 2024', 'Deadline BTW aangifte vierde kwartaal 2024.', '2025-01-31 23:59:00+01', '2025-01-31 23:59:00+01', 'herinnering', NULL, ARRAY[]::TEXT[], '#EF4444', NULL),
(uid, NULL, 'Beurs Sign & Print Expo', 'Vakbeurs voor sign- en printprofessionals in Jaarbeurs Utrecht.', '2025-02-12 09:00:00+01', '2025-02-13 17:00:00+01', 'persoonlijk', 'Jaarbeurs Utrecht', ARRAY['Mark', 'Sandra'], '#F59E0B', NULL),
(uid, proj_wayfinding, 'Inmeting kantoor Mulder Advocaten', 'Eerste inmeting voor wayfinding project. Alle verdiepingen opmeten.', '2025-03-05 10:00:00+01', '2025-03-05 15:00:00+01', 'meeting', 'Herengracht 450, Amsterdam', ARRAY['Thomas Mulder', 'Sandra'], '#2563EB', NULL),
(uid, NULL, 'Kwartaaloverleg boekhouder', 'Kwartaalbespreking met boekhouder over Q4 2024 cijfers.', '2025-01-23 11:00:00+01', '2025-01-23 12:00:00+01', 'meeting', 'Online (Teams)', ARRAY[]::TEXT[], '#6B7280', 'kwartaal');

-- ============================================================
-- GROOTBOEKREKENINGEN
-- ============================================================

INSERT INTO grootboek (user_id, code, naam, categorie, saldo) VALUES
(uid, '0100', 'Inventaris en inrichting', 'activa', 28500.00),
(uid, '0120', 'Machines en gereedschap', 'activa', 45000.00),
(uid, '0150', 'Bedrijfsauto', 'activa', 32000.00),
(uid, '0200', 'Debiteuren', 'activa', 42350.00),
(uid, '0300', 'Voorraad materialen', 'activa', 8750.00),
(uid, '1000', 'Kas', 'activa', 1250.00),
(uid, '1100', 'ING zakelijke rekening', 'activa', 67890.50),
(uid, '1110', 'ING spaarrekening', 'activa', 25000.00),
(uid, '2000', 'Crediteuren', 'passiva', 18900.00),
(uid, '2100', 'Af te dragen BTW', 'passiva', 12450.00),
(uid, '2200', 'Te betalen loonbelasting', 'passiva', 8200.00),
(uid, '2300', 'Lening Rabobank', 'passiva', 45000.00),
(uid, '8000', 'Omzet signing en reclame', 'omzet', 189500.00),
(uid, '8010', 'Omzet webdesign', 'omzet', 48000.00),
(uid, '8020', 'Omzet branding en huisstijl', 'omzet', 32000.00),
(uid, '8030', 'Omzet marketing en social media', 'omzet', 15600.00),
(uid, '4000', 'Inkoopkosten materialen', 'kosten', 67800.00),
(uid, '4100', 'Kosten uitbesteed werk', 'kosten', 34500.00),
(uid, '4200', 'Personeelskosten', 'kosten', 156000.00),
(uid, '4300', 'Huisvestingskosten', 'kosten', 24000.00),
(uid, '4400', 'Autokosten', 'kosten', 8900.00),
(uid, '4500', 'Kantoorkosten', 'kosten', 3200.00),
(uid, '4600', 'Marketingkosten', 'kosten', 6800.00),
(uid, '4700', 'Afschrijvingen', 'kosten', 18500.00),
(uid, '4800', 'Verzekeringen', 'kosten', 4800.00);

-- ============================================================
-- BTW CODES
-- ============================================================

INSERT INTO btw_codes (user_id, code, omschrijving, percentage, actief) VALUES
(uid, 'BTW-21', 'Standaard BTW tarief', 21.00, true),
(uid, 'BTW-9', 'Verlaagd BTW tarief', 9.00, true),
(uid, 'BTW-0', 'Nultarief (export/EU)', 0.00, true),
(uid, 'BTW-VRIJ', 'BTW vrijgesteld', 0.00, true),
(uid, 'BTW-VER', 'BTW verlegd', 0.00, true);

-- ============================================================
-- KORTINGEN
-- ============================================================

INSERT INTO kortingen (user_id, naam, type, waarde, voorwaarden, actief) VALUES
(uid, 'Vroegboekkorting', 'percentage', 5.00, 'Bij opdracht binnen 14 dagen na offertedatum', true),
(uid, 'Volumekorting groot project', 'percentage', 10.00, 'Bij projecten boven EUR 25.000 exclusief BTW', true),
(uid, 'Vaste klant korting', 'percentage', 7.50, 'Voor klanten met meer dan 3 afgeronde projecten', true),
(uid, 'Seizoenskorting winter', 'percentage', 15.00, 'Geldig van december t/m februari voor signing projecten', true),
(uid, 'Pakketkorting signing + web', 'vast_bedrag', 500.00, 'Bij gecombineerde opdracht signing en webdesign', true),
(uid, 'Introductiekorting', 'percentage', 10.00, 'Eenmalig voor nieuwe klanten bij eerste project', true);

-- ============================================================
-- AI CHAT GESCHIEDENIS (voorbeeldgesprek)
-- ============================================================

INSERT INTO ai_chats (user_id, rol, bericht, created_at) VALUES
(uid, 'user', 'Wat is de status van het project voor Bos Techniek?', '2025-01-14 09:00:00+01'),
(uid, 'assistant', 'Het project "Gevelreclame Bos Techniek" staat op 75% voortgang met status "actief" en prioriteit "kritiek". Van het budget van EUR 28.000 is EUR 19.600 besteed. De LED-letters zijn in productie en de montage staat gepland voor eind januari. De omgevingsvergunning is inmiddels verleend door de gemeente Eindhoven.', '2025-01-14 09:00:05+01'),
(uid, 'user', 'Hoeveel openstaande taken heb ik deze week?', '2025-01-14 09:05:00+01'),
(uid, 'assistant', 'Je hebt momenteel 12 taken met status "todo" en 8 taken met status "bezig". De taken met de hoogste prioriteit zijn: montage gevelletters Keizersgracht (deadline 15 feb), testfase menukaart app locatie 1 (deadline 1 feb), en montage gevelreclame Bos Techniek (deadline 31 jan). Ik raad aan om deze week te focussen op de montage bij Bos Techniek aangezien die deadline het dichtstbij is.', '2025-01-14 09:05:05+01');

END $$;
