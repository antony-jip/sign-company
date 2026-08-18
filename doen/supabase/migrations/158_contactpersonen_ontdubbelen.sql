-- Contactpersonen opschonen na het samenvoegen van dubbele klanten (migratie 156).
-- De jsonb-lijsten werden samengevoegd zonder te ontdubbelen, waardoor dezelfde
-- contactpersoon twee keer kon voorkomen en twee personen 'primair' konden zijn.
-- Ontdubbeld op e-mailadres + naam; per klant blijft er precies een primair contact.
--
-- 5 klanten geraakt.

BEGIN;

UPDATE klanten SET contactpersonen = '[{"id":"f92a76aa-af7c-4938-98f3-f5f17b2a0617","naam":"Stella","email":"sb@welwonen.nu","functie":"","telefoon":"","is_primair":true}]'::jsonb, updated_at = now()
  WHERE id = '49db1db8-442e-47af-a369-c71611ec64b5';  -- Wel Wonen

UPDATE klanten SET contactpersonen = '[{"id":"1f90d207-fa20-4bcd-944e-5d08877c81d0","naam":"Luis Paolo","email":"luispaolo.adao@renolit.com","functie":"","telefoon":"","is_primair":true},{"id":"55c545d4-623d-41ec-9f4a-40dc0e1f3b8c","naam":"Bas Brederveld","email":"bas.brederveld@renolit.com","functie":"","telefoon":"0228 355 413","is_primair":false},{"id":"cp-1781271593176-gt4kw","naam":"Brian Ferry","email":"ferry,brian@renolit.com","functie":"","telefoon":"","is_primair":false},{"id":"cp-1777361108612-typob","naam":"Gijs","email":"","functie":"","telefoon":"","is_primair":false}]'::jsonb, updated_at = now()
  WHERE id = '0c332009-1c1d-4887-b7eb-1ecd0a77001b';  -- Renolit Nederland B.V.

UPDATE klanten SET contactpersonen = '[{"id":"4de6e458-94e1-4fdd-8fcf-810c82503132","naam":"Yvonne Albers","email":"yvonne@signcompany.nl","functie":"","telefoon":"","is_primair":true}]'::jsonb, updated_at = now()
  WHERE id = '970ab68c-7c8c-4fe6-b16a-cfb3a86b2751';  -- Sign Company

UPDATE klanten SET contactpersonen = '[{"id":"41ff9705-809e-41ba-9c9d-cd5bbf95ec99","naam":"Benjamin Faber","email":"benjamin@pro6vastgoed.nl","functie":"","telefoon":"","is_primair":true},{"id":"1f47cc00-0bb3-4b1b-a24e-17f0e6af4888","naam":"marnix Hoffer","email":"","functie":"","telefoon":"06 55 77 25 20","is_primair":false}]'::jsonb, updated_at = now()
  WHERE id = 'b9b0da13-289e-4776-b270-8c4b0c22cb0d';  -- Pro6 Vastgoed

UPDATE klanten SET contactpersonen = '[{"id":"3668ad57-ab10-4ffc-b8a1-7dd284a8eadd","naam":"Anna Plat","email":"anna@fortresortbeemster.nl","functie":"","telefoon":"","is_primair":true}]'::jsonb, updated_at = now()
  WHERE id = '5a1cb594-4718-4980-a027-5c607a6abd06';  -- Fort Resort Beemster B.V.

COMMIT;
