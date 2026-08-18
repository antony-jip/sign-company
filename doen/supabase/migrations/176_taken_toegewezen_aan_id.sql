-- 176_taken_toegewezen_aan_id.sql
--
-- taken.toegewezen_aan is een vrije TEXT-kolom (001_create_all_tables.sql:191).
-- In productie staat er van alles in: van de 171 toegewezen taken bevatten er
-- 159 een NAAM en 12 een medewerker-UUID. De UI vergelijkt op naam
-- (TasksLayout zet value={m.naam}), dus die 12 vallen nu al buiten elk filter.
--
-- Twee problemen die daaruit volgen:
--   * Een naamswijziging of een naamgenoot breekt de koppeling stil.
--     updateMedewerker cascadeert niet naar taken, deleteMedewerker laat wezen
--     achter, en de invite-flow zet naam op het deel vóór de @ van het
--     e-mailadres, dus tot iemand zijn profiel invult heet hij 'j.devries'.
--   * Er is geen gebruiker om een melding naartoe te sturen. Daarom bestaat er
--     geen notificatietype voor toewijzing: werk komt bij iemand terecht zonder
--     dat hij het weet.
--
-- Deze migratie is ADDITIEF. De oude kolom blijft staan en wordt niet leeggemaakt,
-- zodat de UI kan blijven draaien tot hij is omgezet en er niets te verliezen is
-- als de backfill iets mist.
--
-- De backfill matcht in twee stappen:
--   1. staat er een bestaande medewerker-id in, neem die over
--   2. anders match op naam, hoofdletter- en spatie-ongevoelig, binnen dezelfde
--      organisatie. Bij twee medewerkers met dezelfde naam wint de oudste; dat is
--      willekeurig maar deterministisch, en zichtbaar in de controle hieronder.

BEGIN;

ALTER TABLE taken
  ADD COLUMN IF NOT EXISTS toegewezen_aan_id uuid REFERENCES medewerkers(id) ON DELETE SET NULL;

COMMENT ON COLUMN taken.toegewezen_aan_id IS
  'Vervangt de naam-string in toegewezen_aan. Die kolom blijft voorlopig staan '
  'voor de UI die er nog op leest.';

CREATE INDEX IF NOT EXISTS taken_organisatie_toegewezen_idx
  ON taken (organisatie_id, toegewezen_aan_id);

-- 1 · de rijen die al een medewerker-id bevatten
UPDATE taken t
   SET toegewezen_aan_id = m.id
  FROM medewerkers m
 WHERE t.toegewezen_aan_id IS NULL
   AND t.toegewezen_aan ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-'
   AND t.toegewezen_aan::uuid = m.id;

-- 2 · de rijen met een naam, binnen dezelfde organisatie
UPDATE taken t
   SET toegewezen_aan_id = kandidaat.id
  FROM (
    SELECT DISTINCT ON (organisatie_id, lower(btrim(naam)))
           id, organisatie_id, lower(btrim(naam)) AS sleutel
      FROM medewerkers
     WHERE naam IS NOT NULL AND btrim(naam) <> ''
     ORDER BY organisatie_id, lower(btrim(naam)), created_at, id
  ) AS kandidaat
 WHERE t.toegewezen_aan_id IS NULL
   AND t.toegewezen_aan IS NOT NULL
   AND btrim(t.toegewezen_aan) <> ''
   AND t.organisatie_id = kandidaat.organisatie_id
   AND lower(btrim(t.toegewezen_aan)) = kandidaat.sleutel;

COMMIT;

-- Controle: wat is er niet gekoppeld, en waarom?
--   SELECT toegewezen_aan, count(*)
--     FROM taken
--    WHERE btrim(coalesce(toegewezen_aan,'')) <> ''
--      AND toegewezen_aan_id IS NULL
--    GROUP BY toegewezen_aan
--    ORDER BY count(*) DESC;
--
-- Dubbele namen binnen één organisatie, waar de match dus een gok was:
--   SELECT organisatie_id, lower(btrim(naam)), count(*)
--     FROM medewerkers
--    GROUP BY 1, 2 HAVING count(*) > 1;
--
-- Terugdraaien:
--   DROP INDEX IF EXISTS taken_organisatie_toegewezen_idx;
--   ALTER TABLE taken DROP COLUMN IF EXISTS toegewezen_aan_id;
