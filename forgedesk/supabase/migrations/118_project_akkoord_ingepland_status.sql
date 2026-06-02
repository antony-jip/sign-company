-- Migration: Add 'akkoord-klant' and 'ingepland' statuses to projecten table
-- New project flow: gepland -> in-review (offerte gestuurd) -> akkoord-klant
-- -> actief -> ingepland (montage ingepland) -> afgerond (klaar om te factureren)

ALTER TABLE projecten DROP CONSTRAINT IF EXISTS projecten_status_check;
ALTER TABLE projecten ADD CONSTRAINT projecten_status_check
  CHECK (status IN ('te-plannen', 'gepland', 'akkoord-klant', 'ingepland', 'actief', 'in-review', 'afgerond', 'on-hold', 'te-factureren', 'gefactureerd'));
