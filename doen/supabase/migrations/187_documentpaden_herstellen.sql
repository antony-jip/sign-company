-- 187_documentpaden_herstellen.sql
--
-- GEDRAAID OP PRODUCTIE op 9 augustus 2026. Vastgelegd voor de naleesbaarheid;
-- de UPDATE's zijn idempotent (ze eisen de oude waarde in de WHERE).
--
-- Herstel van 10 documenten waarvan het opgeslagen pad niet klopt.
--
-- De database noemt bijvoorbeeld offerte_20260101.pdf terwijl het bestand
-- offerte_20260101 (1).pdf heet. Die documenten geven nu een lege plek in de
-- app. Dit is oude schade, niet veroorzaakt door de bucketverhuizing: de
-- bestanden ontbraken ook in de oude publieke bucket onder dit pad.
--
-- Alleen eenduidige gevallen: exact een bestand in dezelfde map waarvan de
-- naam alleen verschilt in een (n)-achtervoegsel. 19 andere kapotte
-- verwijzingen hebben geen kandidaat en blijven staan.

BEGIN;

-- offerte_20260101.pdf
UPDATE documenten SET storage_path = 'projects/88fa223b-4953-43f3-8830-26f64bbf7a60/offerte_20260101 (1).pdf', updated_at = now()
 WHERE id = '6c5b1e28-c832-4d44-8ee3-f2f967f31319' AND storage_path = 'projects/88fa223b-4953-43f3-8830-26f64bbf7a60/offerte_20260101.pdf';

-- offerte_20260082.pdf
UPDATE documenten SET storage_path = 'projects/67f51325-31ba-4f22-a383-188f8bd3b4d1/offerte_20260082 (1).pdf', updated_at = now()
 WHERE id = 'a81cfc6c-f3aa-455a-81bc-74fde9ed2f2d' AND storage_path = 'projects/67f51325-31ba-4f22-a383-188f8bd3b4d1/offerte_20260082.pdf';

-- offerte_20260076.pdf
UPDATE documenten SET storage_path = 'projects/bc748a5f-379f-40d2-b114-bcd55c69f578/offerte_20260076 (1).pdf', updated_at = now()
 WHERE id = '86bd97a4-6c94-4b7c-b871-ecffc3275834' AND storage_path = 'projects/bc748a5f-379f-40d2-b114-bcd55c69f578/offerte_20260076.pdf';

-- offerte_20260084.pdf
UPDATE documenten SET storage_path = 'projects/6a74ca23-a328-4098-b5fc-277098819cb9/offerte_20260084 (1).pdf', updated_at = now()
 WHERE id = '65b050ee-a8e4-4afc-b0af-412992e02855' AND storage_path = 'projects/6a74ca23-a328-4098-b5fc-277098819cb9/offerte_20260084.pdf';

-- offerte_20260083.pdf
UPDATE documenten SET storage_path = 'projects/60f24532-35ba-477e-b5b9-36be264241fc/offerte_20260083 (1).pdf', updated_at = now()
 WHERE id = '65cc9782-f161-4b9c-ae0c-2f9c0e62b72d' AND storage_path = 'projects/60f24532-35ba-477e-b5b9-36be264241fc/offerte_20260083.pdf';

-- offerte_20260094.pdf
UPDATE documenten SET storage_path = 'projects/059df84a-c5f7-4784-a989-f72996550d00/offerte_20260094 (1).pdf', updated_at = now()
 WHERE id = '41ef97ef-a343-4235-90d1-fd99442a1666' AND storage_path = 'projects/059df84a-c5f7-4784-a989-f72996550d00/offerte_20260094.pdf';

-- offerte_20260088.pdf
UPDATE documenten SET storage_path = 'projects/f90f2858-d9bf-412c-9de4-1583bbf11164/offerte_20260088 (1).pdf', updated_at = now()
 WHERE id = '1e12f198-f9da-4980-b9b3-7baaa78201dc' AND storage_path = 'projects/f90f2858-d9bf-412c-9de4-1583bbf11164/offerte_20260088.pdf';

-- offerte_20260091.pdf
UPDATE documenten SET storage_path = 'projects/0b66db26-1244-405b-bd7f-aec075de5393/offerte_20260091 (1).pdf', updated_at = now()
 WHERE id = 'd4eab4a4-ac87-4a9d-9b5d-4b329a53057a' AND storage_path = 'projects/0b66db26-1244-405b-bd7f-aec075de5393/offerte_20260091.pdf';

-- offerte_20260075.pdf
UPDATE documenten SET storage_path = 'projects/ca507327-6710-443f-ace4-0c98a5d3d574/offerte_20260075 (1).pdf', updated_at = now()
 WHERE id = '45527ede-64ce-4eaa-9064-9216959fdf07' AND storage_path = 'projects/ca507327-6710-443f-ace4-0c98a5d3d574/offerte_20260075.pdf';

-- offerte_20260081.pdf
UPDATE documenten SET storage_path = 'projects/c3c4460b-8ace-4663-8c39-d8bc21d7c5a5/offerte_20260081 (1).pdf', updated_at = now()
 WHERE id = 'f83cd5b7-b1af-403a-8c9b-bf08cbf9cb74' AND storage_path = 'projects/c3c4460b-8ace-4663-8c39-d8bc21d7c5a5/offerte_20260081.pdf';

COMMIT;

-- Controle: hoort 0 te geven.
--   SELECT count(*) FROM documenten WHERE storage_path LIKE '%%.pdf' AND storage_path NOT LIKE '%%(1)%%'
--    AND id IN ('6c5b1e28-c832-4d44-8ee3-f2f967f31319', 'a81cfc6c-f3aa-455a-81bc-74fde9ed2f2d', '86bd97a4-6c94-4b7c-b871-ecffc3275834', '65b050ee-a8e4-4afc-b0af-412992e02855', '65cc9782-f161-4b9c-ae0c-2f9c0e62b72d', '41ef97ef-a343-4235-90d1-fd99442a1666', '1e12f198-f9da-4980-b9b3-7baaa78201dc', 'd4eab4a4-ac87-4a9d-9b5d-4b329a53057a', '45527ede-64ce-4eaa-9064-9216959fdf07', 'f83cd5b7-b1af-403a-8c9b-bf08cbf9cb74');