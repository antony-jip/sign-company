-- 141_factuur_nummer_unique.sql
-- Nummer-race vangnet: uniek factuurnummer per organisatie.
-- Zonder deze index kan gelijktijdige aanmaak (twee teamleden) stille dubbele
-- factuur-/creditnotanummers opleveren = fiscaal/boekhoudkundig probleem.
-- Creditnota's leven in dezelfde tabel, dus deze index dekt beide reeksen.

-- STAP 1 (handmatig eerst draaien): controleer op bestaande duplicaten.
-- Als deze query rijen teruggeeft, MOETEN die eerst opgelost worden,
-- anders faalt STAP 2.
--
--   SELECT organisatie_id, nummer, COUNT(*)
--   FROM facturen
--   WHERE nummer IS NOT NULL AND nummer <> ''
--   GROUP BY organisatie_id, nummer
--   HAVING COUNT(*) > 1
--   ORDER BY COUNT(*) DESC;

-- STAP 2: partiële unique index. Concepten zonder nummer (NULL/'') vallen
-- buiten de index en botsen dus niet.
-- Opmerking: geen CONCURRENTLY omdat de Supabase SQL Editor elke query in een
-- transactie draait (CONCURRENTLY mag daar niet). De non-concurrent build houdt
-- kort een write-lock; voor deze tabelgrootte verwaarloosbaar.
CREATE UNIQUE INDEX IF NOT EXISTS facturen_org_nummer_unique
  ON facturen (organisatie_id, nummer)
  WHERE nummer IS NOT NULL AND nummer <> '';
