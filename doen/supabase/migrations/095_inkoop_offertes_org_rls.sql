-- 5 inkoop_offertes + 14 inkoop_regels van demo@forgedesk.nl (user 921cc844-...)
-- worden bewust onzichtbaar via RLS, geen productiedata verloren.

BEGIN;

ALTER TABLE inkoop_offertes ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);
ALTER TABLE inkoop_regels   ADD COLUMN IF NOT EXISTS organisatie_id UUID REFERENCES organisaties(id);

UPDATE inkoop_offertes io
SET organisatie_id = p.organisatie_id
FROM profiles p
WHERE p.id = io.user_id
  AND p.organisatie_id IS NOT NULL
  AND io.organisatie_id IS NULL;

UPDATE inkoop_regels ir
SET organisatie_id = p.organisatie_id
FROM profiles p
WHERE p.id = ir.user_id
  AND p.organisatie_id IS NOT NULL
  AND ir.organisatie_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inkoop_offertes_org ON inkoop_offertes(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_inkoop_regels_org   ON inkoop_regels(organisatie_id);

DROP POLICY IF EXISTS "Users can manage their own inkoop_offertes" ON inkoop_offertes;
CREATE POLICY "Org members manage inkoop_offertes" ON inkoop_offertes
  FOR ALL TO authenticated
  USING      (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own inkoop_regels" ON inkoop_regels;
CREATE POLICY "Org members manage inkoop_regels" ON inkoop_regels
  FOR ALL TO authenticated
  USING      (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organisatie_id IN (SELECT organisatie_id FROM profiles WHERE id = auth.uid()));

DO $$
DECLARE
  null_offertes INT;
  null_regels   INT;
BEGIN
  SELECT COUNT(*) INTO null_offertes FROM inkoop_offertes WHERE organisatie_id IS NULL;
  SELECT COUNT(*) INTO null_regels   FROM inkoop_regels   WHERE organisatie_id IS NULL;

  RAISE NOTICE 'inkoop_offertes met NULL organisatie_id: %', null_offertes;
  RAISE NOTICE 'inkoop_regels met NULL organisatie_id: %', null_regels;

  IF null_offertes > 5 THEN
    RAISE EXCEPTION 'Te veel inkoop_offertes zonder organisatie_id: % (max 5 verwacht)', null_offertes;
  END IF;

  IF null_regels > 14 THEN
    RAISE EXCEPTION 'Te veel inkoop_regels zonder organisatie_id: % (max 14 verwacht)', null_regels;
  END IF;
END $$;

COMMIT;
