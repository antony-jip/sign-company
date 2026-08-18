-- Migration: Add 'te-plannen' status to projecten table
-- Projects with this status appear in montage planning for monteurs to pick up

ALTER TABLE projecten DROP CONSTRAINT IF EXISTS projecten_status_check;
ALTER TABLE projecten ADD CONSTRAINT projecten_status_check
  CHECK (status IN ('te-plannen', 'gepland', 'actief', 'in-review', 'afgerond', 'on-hold', 'te-factureren', 'gefactureerd'));
