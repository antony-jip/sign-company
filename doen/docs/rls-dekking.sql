-- ══════════════════════════════════════════════════════════════════════════
-- BLAST-RADIUS van migratie 195. Alleen lezen, wijzigt niets.
--
-- 195 dropte 49 legacy user_id-policies over 23 tabellen, met een guard die
-- alleen keek OF er nog een policy met organisatie_id stond — niet of die je
-- ook werkelijk je eigen rijen laat zien. Op `emails` bleek de overgebleven
-- policy een smalle uitzondering (alleen projectmail, via EXISTS), en daardoor
-- viel bijna 14.000 rijen weg.
--
-- Deze query zoekt elke andere tabel waar hetzelfde kan zijn gebeurd. Het
-- criterium voor ALGEMENE toegang: een SELECT- of ALL-policy die de rij bindt
-- aan auth.uid() of aan de organisatie van de gebruiker, ZONDER een extra
-- koppeling te eisen. Een policy met EXISTS erin is per definitie een
-- uitzondering en telt hier niet mee — dat is precies wat de guard in 195 wel
-- meetelde.
--
-- Lees de kolom `oordeel`. Alles behalve OK verdient een blik.
--
-- DRAAI DIT NA ELKE MIGRATIE DIE POLICIES DROPT. Dat is niet optioneel: een
-- migratie die policies via dynamische SQL dropt (zoals 195 doet) is door geen
-- enkele test in deze repo te controleren, want welke policies verdwijnen hangt
-- af van wat er op dat moment in de database staat.
--
-- Let op drie valkuilen die mijn eerste versie van deze query fout had, en die
-- tot tien valse treffers leidden:
--   1. De operanden staan in de database vaak omgekeerd: `auth.uid() = user_id`.
--   2. De kolomnaam varieert: `user_id`, `gebruiker_id`, en bij `organisaties`
--      heet hij simpelweg `id`.
--   3. `auth.role() = 'service_role'` en `TO service_role` zijn bewuste keuzes,
--      geen ontbrekende policy.
-- Alle drie zijn hieronder verwerkt.
-- ══════════════════════════════════════════════════════════════════════════
WITH tabellen AS (
  SELECT c.relname::text AS tabel
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
),
beoordeeld AS (
  SELECT
    t.tabel,
    count(p.policyname)                                              AS policies_totaal,
    count(p.policyname) FILTER (WHERE p.cmd IN ('SELECT', 'ALL'))     AS lees_policies,
    -- Algemene toegang: bindt aan de gebruiker of zijn organisatie, zonder
    -- een tweede tabel als voorwaarde.
    coalesce(bool_or(
      p.cmd IN ('SELECT', 'ALL')
      AND p.qual IS NOT NULL
      AND p.qual NOT LIKE '%EXISTS%'
      AND (
        p.qual LIKE '%auth.uid()%'
        OR p.qual LIKE '%auth_organisatie_id()%'
        OR p.qual LIKE '%auth.role()%'
        OR p.qual LIKE '%profiles.organisatie_id%'
      )
    ), false)                                                        AS heeft_algemene_toegang,
    coalesce(bool_or(p.roles::text[] && ARRAY['service_role']), false) AS heeft_service_role_policy,
    string_agg(DISTINCT p.policyname, ' | ') FILTER (WHERE p.cmd IN ('SELECT', 'ALL')) AS lees_policy_namen
  FROM tabellen t
  LEFT JOIN pg_policies p
         ON p.schemaname = 'public' AND p.tablename = t.tabel
  GROUP BY t.tabel
)
SELECT
  tabel,
  CASE
    WHEN heeft_algemene_toegang                       THEN 'OK'
    WHEN policies_totaal = 0                          THEN 'LEEG: RLS aan, nul policies, niemand ziet iets'
    WHEN heeft_service_role_policy AND lees_policies = 0
                                                      THEN 'BEWUST DICHT: alleen service_role (verwacht bij o.a. feature_flags, doen_migraties, mailsync_taken, rate_limits)'
    WHEN lees_policies = 0                            THEN 'GEEN LEESPOLICY'
    ELSE 'ALLEEN UITZONDERING: er is wel een leespolicy, maar die eist een koppeling (net als emails deed)'
  END                                                 AS oordeel,
  policies_totaal,
  lees_policies,
  lees_policy_namen
FROM beoordeeld
WHERE NOT heeft_algemene_toegang
ORDER BY
  CASE
    WHEN policies_totaal = 0 THEN 1
    WHEN lees_policies > 0   THEN 2
    ELSE 3
  END,
  tabel;
