-- ============================================================
-- Standaard data voor nieuwe gebruikers
-- Dit wordt idealiter aangeroepen via een Supabase function
-- na registratie, of handmatig per user.
-- Vervang 'YOUR_USER_UUID' met de daadwerkelijke user UUID.
-- ============================================================

DO $$
DECLARE
  uid UUID := 'YOUR_USER_UUID'; -- Vervang met je eigen UUID

BEGIN

-- === BTW Codes ===
INSERT INTO btw_codes (user_id, code, omschrijving, percentage, actief) VALUES
  (uid, 'BTW21', 'Standaard tarief', 21, true),
  (uid, 'BTW9', 'Laag tarief', 9, true),
  (uid, 'BTW0', 'Vrijgesteld / Nultarief', 0, true),
  (uid, 'BTW_VERLEGD', 'BTW verlegd', 0, true),
  (uid, 'BTW_EXPORT', 'Export (0%)', 0, true)
ON CONFLICT DO NOTHING;

-- === Grootboekrekeningen ===
INSERT INTO grootboek (user_id, code, naam, categorie, saldo) VALUES
  -- Activa
  (uid, '0100', 'Inventaris', 'activa', 0),
  (uid, '0110', 'Machines & gereedschap', 'activa', 0),
  (uid, '0120', 'Voertuigen', 'activa', 0),
  (uid, '0130', 'Computerapparatuur', 'activa', 0),
  (uid, '1000', 'Kas', 'activa', 0),
  (uid, '1100', 'Bank (rekening courant)', 'activa', 0),
  (uid, '1200', 'Debiteuren', 'activa', 0),
  (uid, '1300', 'Voorraad materialen', 'activa', 0),
  -- Passiva
  (uid, '2000', 'Eigen vermogen', 'passiva', 0),
  (uid, '2100', 'Crediteuren', 'passiva', 0),
  (uid, '2200', 'Af te dragen BTW', 'passiva', 0),
  (uid, '2300', 'Te vorderen BTW', 'passiva', 0),
  (uid, '2400', 'Loonheffingen', 'passiva', 0),
  -- Omzet
  (uid, '8000', 'Omzet signing', 'omzet', 0),
  (uid, '8010', 'Omzet DTP / ontwerp', 'omzet', 0),
  (uid, '8020', 'Omzet montage', 'omzet', 0),
  (uid, '8030', 'Omzet websites', 'omzet', 0),
  (uid, '8090', 'Overige omzet', 'omzet', 0),
  -- Kosten
  (uid, '4000', 'Inkoopkosten materialen', 'kosten', 0),
  (uid, '4100', 'Kosten onderaannemers', 'kosten', 0),
  (uid, '4200', 'Personeelskosten', 'kosten', 0),
  (uid, '4300', 'Huisvestingskosten', 'kosten', 0),
  (uid, '4400', 'Vervoerskosten', 'kosten', 0),
  (uid, '4500', 'Kantoorkosten', 'kosten', 0),
  (uid, '4600', 'Softwarekosten', 'kosten', 0),
  (uid, '4700', 'Verzekeringskosten', 'kosten', 0),
  (uid, '4800', 'Afschrijvingen', 'kosten', 0),
  (uid, '4900', 'Overige bedrijfskosten', 'kosten', 0)
ON CONFLICT DO NOTHING;

-- === Herinnering Templates ===
INSERT INTO herinnering_templates (user_id, type, onderwerp, inhoud, dagen_na_vervaldatum, actief) VALUES
  (uid, 'herinnering_1',
   'Herinnering: factuur {factuur_nummer} is verlopen',
   E'Beste {klant_naam},\n\nGraag herinneren wij u aan factuur {factuur_nummer} ter waarde van {factuur_bedrag}, die op {vervaldatum} betaald had moeten worden. De factuur staat nu {dagen_verlopen} dagen open.\n\nWij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
   7, true),
  (uid, 'herinnering_2',
   'Tweede herinnering: factuur {factuur_nummer}',
   E'Beste {klant_naam},\n\nOndanks onze eerdere herinnering hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De vervaldatum was {vervaldatum}, inmiddels {dagen_verlopen} dagen geleden.\n\nWij verzoeken u dringend het bedrag binnen 7 dagen te voldoen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
   14, true),
  (uid, 'herinnering_3',
   'Laatste herinnering: factuur {factuur_nummer}',
   E'Beste {klant_naam},\n\nDit is onze laatste herinnering voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De factuur is inmiddels {dagen_verlopen} dagen verlopen.\n\nIndien wij binnen 7 dagen geen betaling ontvangen, zijn wij genoodzaakt verdere stappen te ondernemen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
   21, true),
  (uid, 'aanmaning',
   'Aanmaning: factuur {factuur_nummer}',
   E'Beste {klant_naam},\n\nOndanks herhaalde herinneringen hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De factuur is {dagen_verlopen} dagen verlopen.\n\nDit is een formele aanmaning. Wij verzoeken u het openstaande bedrag per omgaande te voldoen. Bij uitblijven van betaling behouden wij ons het recht voor om wettelijke rente en incassokosten in rekening te brengen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
   30, true)
ON CONFLICT DO NOTHING;

END $$;
