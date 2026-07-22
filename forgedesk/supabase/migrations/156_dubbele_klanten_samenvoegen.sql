-- Dubbele klanten samenvoegen (Sign Company)
-- Gegenereerd 22 juli 2026 op basis van de Exact-export van 3 juni 2026.
--
-- 12 groepen; 12 klantrecords verdwijnen.
-- Per groep blijft het record met de meeste gekoppelde gegevens bestaan. Alle
-- facturen, offertes, projecten, werkbonnen, historie en contactpersonen van de
-- andere records verhuizen mee; lege velden van de behouden klant worden
-- aangevuld vanuit de records die opgaan.
--
-- Debiteurennummers worden hier NIET aangepast. Draai daarna pas de
-- nummercorrectie, die na dit opschonen opnieuw gegenereerd moet worden.
--
-- Bewust NIET samengevoegd (controleer zelf):
--   Kinderfysiotherapie West-Friesland (504051) / Kinder Fysiotherapie Westfriesland (50816)
--   Star Travel (50370) / StarTravel (50258)
--   Kinderfysiotherapie: Exact heeft twee relaties, Enkhuizen (50816) en Blokker (503755).
--   Star Travel: komt niet in de Exact-export voor; twee vestigingen met eigen e-mailadres.

BEGIN;

CREATE TABLE IF NOT EXISTS klanten_merge_backup_20260722 AS
  SELECT * FROM klanten WHERE organisatie_id = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229';

-- Backuptabel met complete klantgegevens: RLS aan, bewust zonder policy. Daarmee
-- is de tabel via de API voor niemand leesbaar. service_role en de SQL Editor
-- omzeilen RLS, dus terugzetten blijft mogelijk.
ALTER TABLE klanten_merge_backup_20260722 ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------
-- Thijzen  <-  Thijzen
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  adres = 'Simon Koopmanstraat 204',
  postcode = '1693 BL',
  stad = 'WERVERSHOOF',
  contactpersoon = 'Matthijs Thijzen',
  notities = '50 % gefactureerd 13 juli',
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4')), '[]'::jsonb),
  updated_at = now()
WHERE id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5', klant_naam = 'Thijzen' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE facturen SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5', klant_naam = 'Thijzen' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE taken SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE notificaties SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE montage_afspraken SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5', klant_naam = 'Thijzen' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE documenten SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE app_notificaties SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE klant_historie SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE tekening_goedkeuringen SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE projecten SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5', klant_naam = 'Thijzen' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE vestigingen SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE deals SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE lead_inzendingen SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE leveringsbonnen SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE contactpersonen SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE werkbonnen SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE offertes SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5', klant_naam = 'Thijzen' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');
UPDATE signing_visualisaties SET klant_id = 'a9dc3182-5f72-4d64-94d4-3a8cb742d8e5' WHERE klant_id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');

DELETE FROM klanten WHERE id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4');

-- ------------------------------------------------------------------
-- Wel Wonen  <-  Welwonen
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  contactpersoon = 'Stella',
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e')), '[]'::jsonb),
  updated_at = now()
WHERE id = '49db1db8-442e-47af-a369-c71611ec64b5';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5', klant_naam = 'Wel Wonen' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE facturen SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5', klant_naam = 'Wel Wonen' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE taken SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE notificaties SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE montage_afspraken SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5', klant_naam = 'Wel Wonen' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE documenten SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE app_notificaties SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE klant_historie SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE tekening_goedkeuringen SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE projecten SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5', klant_naam = 'Wel Wonen' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE vestigingen SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE deals SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE lead_inzendingen SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE leveringsbonnen SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE contactpersonen SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE werkbonnen SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE offertes SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5', klant_naam = 'Wel Wonen' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');
UPDATE signing_visualisaties SET klant_id = '49db1db8-442e-47af-a369-c71611ec64b5' WHERE klant_id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');

DELETE FROM klanten WHERE id IN ('df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e');

-- ------------------------------------------------------------------
-- Hofland Deltaflex Rubbertechniek B.V.  <-  Hofland Deltaflex Rubbertechniek B.V.
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  email = 'wrietdijk@risrubber.com',
  telefoon = '0320226115',
  contactpersoon = 'Wouter Rietdijk',
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624')), '[]'::jsonb),
  updated_at = now()
WHERE id = '2d5d17b6-0d88-4d2c-a760-20c682be8077';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077', klant_naam = 'Hofland Deltaflex Rubbertechniek B.V.' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE facturen SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077', klant_naam = 'Hofland Deltaflex Rubbertechniek B.V.' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE taken SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE notificaties SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE montage_afspraken SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077', klant_naam = 'Hofland Deltaflex Rubbertechniek B.V.' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE documenten SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE app_notificaties SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE klant_historie SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE tekening_goedkeuringen SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE projecten SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077', klant_naam = 'Hofland Deltaflex Rubbertechniek B.V.' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE vestigingen SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE deals SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE lead_inzendingen SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE leveringsbonnen SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE contactpersonen SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE werkbonnen SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE offertes SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077', klant_naam = 'Hofland Deltaflex Rubbertechniek B.V.' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');
UPDATE signing_visualisaties SET klant_id = '2d5d17b6-0d88-4d2c-a760-20c682be8077' WHERE klant_id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');

DELETE FROM klanten WHERE id IN ('8167ec16-6531-4e7c-8fbc-d44c0b156624');

-- ------------------------------------------------------------------
-- Renolit Nederland B.V.  <-  Renolit Nederland B.V.
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342')), '[]'::jsonb),
  updated_at = now()
WHERE id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b', klant_naam = 'Renolit Nederland B.V.' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE facturen SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b', klant_naam = 'Renolit Nederland B.V.' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE taken SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE notificaties SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE montage_afspraken SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b', klant_naam = 'Renolit Nederland B.V.' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE documenten SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE app_notificaties SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE klant_historie SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE tekening_goedkeuringen SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE projecten SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b', klant_naam = 'Renolit Nederland B.V.' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE vestigingen SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE deals SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE lead_inzendingen SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE leveringsbonnen SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE contactpersonen SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE werkbonnen SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE offertes SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b', klant_naam = 'Renolit Nederland B.V.' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');
UPDATE signing_visualisaties SET klant_id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b' WHERE klant_id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');

DELETE FROM klanten WHERE id IN ('8b19d1db-0b55-42d0-a770-6cd5c8f7a342');

-- ------------------------------------------------------------------
-- Wrinkle Works  <-  WrinkleWorks
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7')), '[]'::jsonb),
  updated_at = now()
WHERE id = '36931125-b027-427a-a3ab-f5479475cf91';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91', klant_naam = 'Wrinkle Works' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE facturen SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91', klant_naam = 'Wrinkle Works' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE taken SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE notificaties SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE montage_afspraken SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91', klant_naam = 'Wrinkle Works' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE documenten SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE app_notificaties SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE klant_historie SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE tekening_goedkeuringen SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE projecten SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91', klant_naam = 'Wrinkle Works' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE vestigingen SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE deals SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE lead_inzendingen SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE leveringsbonnen SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE contactpersonen SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE werkbonnen SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE offertes SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91', klant_naam = 'Wrinkle Works' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');
UPDATE signing_visualisaties SET klant_id = '36931125-b027-427a-a3ab-f5479475cf91' WHERE klant_id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');

DELETE FROM klanten WHERE id IN ('b94a1461-79cd-4fa9-9a07-dfdccd54fcd7');

-- ------------------------------------------------------------------
-- D.P.Z. Onderhoudsbedrijf  <-  DPZ Onderhoudsbedrijf
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  stad = 'ENKHUIZEN',
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850')), '[]'::jsonb),
  updated_at = now()
WHERE id = '11fda96f-c1bb-4680-9698-116c9dc7770a';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a', klant_naam = 'D.P.Z. Onderhoudsbedrijf' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE facturen SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a', klant_naam = 'D.P.Z. Onderhoudsbedrijf' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE taken SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE notificaties SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE montage_afspraken SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a', klant_naam = 'D.P.Z. Onderhoudsbedrijf' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE documenten SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE app_notificaties SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE klant_historie SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE tekening_goedkeuringen SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE projecten SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a', klant_naam = 'D.P.Z. Onderhoudsbedrijf' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE vestigingen SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE deals SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE lead_inzendingen SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE leveringsbonnen SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE contactpersonen SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE werkbonnen SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE offertes SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a', klant_naam = 'D.P.Z. Onderhoudsbedrijf' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');
UPDATE signing_visualisaties SET klant_id = '11fda96f-c1bb-4680-9698-116c9dc7770a' WHERE klant_id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');

DELETE FROM klanten WHERE id IN ('abd4ac90-3e19-4071-a8bf-0c5686fc3850');

-- ------------------------------------------------------------------
-- De Wit Schouten B.V.  <-  De Wit-Schouten
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  telefoon = '0228-511416',
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a')), '[]'::jsonb),
  updated_at = now()
WHERE id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b', klant_naam = 'De Wit Schouten B.V.' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE facturen SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b', klant_naam = 'De Wit Schouten B.V.' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE taken SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE notificaties SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE montage_afspraken SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b', klant_naam = 'De Wit Schouten B.V.' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE documenten SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE app_notificaties SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE klant_historie SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE tekening_goedkeuringen SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE projecten SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b', klant_naam = 'De Wit Schouten B.V.' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE vestigingen SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE deals SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE lead_inzendingen SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE leveringsbonnen SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE contactpersonen SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE werkbonnen SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE offertes SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b', klant_naam = 'De Wit Schouten B.V.' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');
UPDATE signing_visualisaties SET klant_id = 'af8a16eb-81a5-4be4-8134-693979ff5f4b' WHERE klant_id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');

DELETE FROM klanten WHERE id IN ('b2ef6387-7c96-47fe-8881-3fb39c1e1f6a');

-- ------------------------------------------------------------------
-- Sign Company  <-  Signcompany
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('671eface-f33d-4227-a1ec-3dc477d77e06')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('671eface-f33d-4227-a1ec-3dc477d77e06')), '[]'::jsonb),
  updated_at = now()
WHERE id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751', klant_naam = 'Sign Company' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE facturen SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751', klant_naam = 'Sign Company' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE taken SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE notificaties SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE montage_afspraken SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751', klant_naam = 'Sign Company' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE documenten SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE app_notificaties SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE klant_historie SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE tekening_goedkeuringen SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE projecten SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751', klant_naam = 'Sign Company' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE vestigingen SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE deals SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE lead_inzendingen SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE leveringsbonnen SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE contactpersonen SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE werkbonnen SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE offertes SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751', klant_naam = 'Sign Company' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');
UPDATE signing_visualisaties SET klant_id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751' WHERE klant_id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');

DELETE FROM klanten WHERE id IN ('671eface-f33d-4227-a1ec-3dc477d77e06');

-- ------------------------------------------------------------------
-- Bouwbedrijf B.Desaunois bv  <-  Bouwbedrijf  B. Desaunois bv
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014')), '[]'::jsonb),
  updated_at = now()
WHERE id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0', klant_naam = 'Bouwbedrijf B.Desaunois bv' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE facturen SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0', klant_naam = 'Bouwbedrijf B.Desaunois bv' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE taken SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE notificaties SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE montage_afspraken SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0', klant_naam = 'Bouwbedrijf B.Desaunois bv' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE documenten SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE app_notificaties SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE klant_historie SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE tekening_goedkeuringen SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE projecten SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0', klant_naam = 'Bouwbedrijf B.Desaunois bv' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE vestigingen SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE deals SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE lead_inzendingen SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE leveringsbonnen SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE contactpersonen SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE werkbonnen SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE offertes SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0', klant_naam = 'Bouwbedrijf B.Desaunois bv' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');
UPDATE signing_visualisaties SET klant_id = '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0' WHERE klant_id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');

DELETE FROM klanten WHERE id IN ('5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014');

-- ------------------------------------------------------------------
-- HiFi Snij-Unie  <-  Hi-Fi Snijunie
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328')), '[]'::jsonb),
  updated_at = now()
WHERE id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf', klant_naam = 'HiFi Snij-Unie' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE facturen SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf', klant_naam = 'HiFi Snij-Unie' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE taken SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE notificaties SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE montage_afspraken SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf', klant_naam = 'HiFi Snij-Unie' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE documenten SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE app_notificaties SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE klant_historie SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE tekening_goedkeuringen SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE projecten SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf', klant_naam = 'HiFi Snij-Unie' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE vestigingen SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE deals SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE lead_inzendingen SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE leveringsbonnen SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE contactpersonen SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE werkbonnen SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE offertes SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf', klant_naam = 'HiFi Snij-Unie' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');
UPDATE signing_visualisaties SET klant_id = 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf' WHERE klant_id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');

DELETE FROM klanten WHERE id IN ('b011664b-fe00-4d03-9e28-24fa5e0f4328');

-- ------------------------------------------------------------------
-- Pro6 Vastgoed  <-  Pro6vastgoed
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  email = 'benjamin@pro6vastgoed.nl',
  website = 'www.pro6vastgoed.nl',
  contactpersoon = 'Benjamin Faber',
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7')), '[]'::jsonb),
  updated_at = now()
WHERE id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d', klant_naam = 'Pro6 Vastgoed' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE facturen SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d', klant_naam = 'Pro6 Vastgoed' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE taken SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE notificaties SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE montage_afspraken SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d', klant_naam = 'Pro6 Vastgoed' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE documenten SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE app_notificaties SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE klant_historie SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE tekening_goedkeuringen SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE projecten SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d', klant_naam = 'Pro6 Vastgoed' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE vestigingen SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE deals SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE lead_inzendingen SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE leveringsbonnen SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE contactpersonen SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE werkbonnen SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE offertes SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d', klant_naam = 'Pro6 Vastgoed' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');
UPDATE signing_visualisaties SET klant_id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d' WHERE klant_id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');

DELETE FROM klanten WHERE id IN ('c23d2fa6-9100-4c07-85d3-0408f63a2cb7');

-- ------------------------------------------------------------------
-- Fort Resort Beemster B.V.  <-  Fortresortbeemster
-- ------------------------------------------------------------------
-- lege velden aanvullen vanuit de records die opgaan
UPDATE klanten SET
  email = 'Anna@fortresortbeemster.nl',
  website = 'www.fortresortbeemster.nl',
  contactpersoon = 'Anna Plat',
  contactpersonen = coalesce(contactpersonen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.contactpersonen, '[]'::jsonb)) e
     WHERE v.id IN ('845eaa43-0194-4734-b8b4-427db79ece32')), '[]'::jsonb),
  vestigingen = coalesce(vestigingen, '[]'::jsonb) || coalesce(
    (SELECT jsonb_agg(e) FROM klanten v, jsonb_array_elements(coalesce(v.vestigingen, '[]'::jsonb)) e
     WHERE v.id IN ('845eaa43-0194-4734-b8b4-427db79ece32')), '[]'::jsonb),
  updated_at = now()
WHERE id = '5a1cb594-4718-4980-a027-5c607a6abd06';

-- gekoppelde gegevens omhangen
UPDATE klant_activiteiten SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06', klant_naam = 'Fort Resort Beemster B.V.' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE facturen SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06', klant_naam = 'Fort Resort Beemster B.V.' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE taken SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE notificaties SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE montage_afspraken SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06', klant_naam = 'Fort Resort Beemster B.V.' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE documenten SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE app_notificaties SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE klant_historie SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE tekening_goedkeuringen SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE projecten SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06', klant_naam = 'Fort Resort Beemster B.V.' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE vestigingen SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE deals SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE lead_inzendingen SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE leveringsbonnen SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE contactpersonen SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE werkbonnen SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE offertes SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06', klant_naam = 'Fort Resort Beemster B.V.' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');
UPDATE signing_visualisaties SET klant_id = '5a1cb594-4718-4980-a027-5c607a6abd06' WHERE klant_id IN ('845eaa43-0194-4734-b8b4-427db79ece32');

DELETE FROM klanten WHERE id IN ('845eaa43-0194-4734-b8b4-427db79ece32');

-- Controle: 'verwijderd' moet 0 zijn, 'behouden' 12
SELECT
  (SELECT count(*) FROM klanten WHERE id IN ('4c55ad98-e55f-4839-a842-4d3a9e95ade4', 'df73c5d1-e1f8-48a5-9c57-1b4a04f40c7e', '8167ec16-6531-4e7c-8fbc-d44c0b156624', '8b19d1db-0b55-42d0-a770-6cd5c8f7a342', 'b94a1461-79cd-4fa9-9a07-dfdccd54fcd7', 'abd4ac90-3e19-4071-a8bf-0c5686fc3850', 'b2ef6387-7c96-47fe-8881-3fb39c1e1f6a', '671eface-f33d-4227-a1ec-3dc477d77e06', '5a7dbfd6-bcd4-4003-8e7d-cea6f4df3014', 'b011664b-fe00-4d03-9e28-24fa5e0f4328', 'c23d2fa6-9100-4c07-85d3-0408f63a2cb7', '845eaa43-0194-4734-b8b4-427db79ece32')) AS verwijderd,
  (SELECT count(*) FROM klanten WHERE id IN ('a9dc3182-5f72-4d64-94d4-3a8cb742d8e5', '49db1db8-442e-47af-a369-c71611ec64b5', '2d5d17b6-0d88-4d2c-a760-20c682be8077', '0c332009-1c1d-4887-b7eb-1ecd0a77001b', '36931125-b027-427a-a3ab-f5479475cf91', '11fda96f-c1bb-4680-9698-116c9dc7770a', 'af8a16eb-81a5-4be4-8134-693979ff5f4b', '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751', '54aa4463-b582-4ef7-85bc-fb1bfdb5c2e0', 'ebf5de61-8eb2-415f-9aa4-a20e8eca31cf', 'b9b0da13-289e-4776-b270-8c4b0c22cb0d', '5a1cb594-4718-4980-a027-5c607a6abd06')) AS behouden;

COMMIT;

-- Terugdraaien:
--   DELETE FROM klanten WHERE organisatie_id = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229';
--   INSERT INTO klanten SELECT * FROM klanten_merge_backup_20260722;
--   (de omgehangen klant_id's in de andere tabellen moeten dan handmatig terug)
