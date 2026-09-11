// Beats van de v4-film in absolute ms. Eén tijdlijn, één camera die alleen
// tussen hoofdstukken beweegt (dolly 1,2 s). Kliks landen op klikX; de
// cursorstap vertrekt op klikX - 780 (zie Cursor.tsx).

// Opening (0-10 s): tool-kaartjes zweven, de punt trekt ze naar zich toe,
// inslag, logo, belofte, prelude op de duik.
export const O = {
  kaartjesOp: 0, puntOp: 2000, trekVan: 2300, inslagOp: 4600,
  logoOp: 4700, logoVol: 5600, puntValt: 5600, puntLandt: 6300,
  belofteOp: 6600, belofteUit: 8900, pushOp: 9400, eind: 10000,
} as const

// H1 mail (jij): duik, mailbox, project aanmaken, dolly naar het project,
// belofte, rondleiding, taak toewijzen aan Sanne, statuswoord.
export const H1 = {
  duikOp: 10000, duikTot: 12000, kaartOp: 10300, kaartUit: 12100,
  mailOp: 12000, klikProject: 14200, projectOp: 14500,
  dollyOp: 15200, dollyTot: 16400, cockpitOp: 16300,
  belofteOp: 16800, belofteUit: 19000,
  rondOp: 19000, rondStap: 1400,
  klikTaak: 23900, taakDialoogOp: 24050, taakTypOp: 24400, klikTaakSanne: 26400, taakKiesOp: 26480, klikTaakToevoegen: 27300, taakKlaarOp: 27580,
  meldingTaakOp: 27900, meldingTaakUit: 29700,
  statusVlucht: 29600, statusOp: 29700, statusLand: 30300,
  klikOfferteMaken: 31600,
  eind: 31800,
} as const

// H2 offerte (jij): editor, regels, push op de marge, belofte, collega-melding, verstuur via portaal.
export const H2 = {
  dollyOp: 31800, dollyTot: 33000, kaartOp: 31900, kaartUit: 33700,
  regelsOp: 33400,
  // Push 1,4x op de marge (rechts), rijen lichten op, hold; dan door naar het urenblok.
  pushOp: 35500, pushTot: 35900, rijOp: 35900, rijStap: 800,
  urenPushOp: 39800, urenPushTot: 40200, urenLabelOp: 40300, urenLabelUit: 42000, pullOp: 42000, pullTot: 42400,
  belofteOp: 42800, belofteUit: 45000,
  meldingOp: 45200, meldingUit: 47000, checkAkkoordOp: 45200,
  klikVerstuur: 47600, keuzeOp: 47780, klikPortaal: 48600, flapOp: 48900,
  statusVlucht: 49600, statusOp: 49700, statusLand: 50300,
  eind: 51800,
} as const

// H3 portaal (je klant, desktop): offerte komt binnen in het klantportaal, Bekijken,
// naam, handtekening met push, Bevestigen, terug naar het project, melding, statuswoord, belofte.
export const H3 = {
  dollyOp: 51800, dollyTot: 53000, kaartOp: 51900, kaartUit: 54100,
  kaartZichtOp: 53200, klikBekijken: 54900, publiekOp: 55000,
  naamOp: 55600, pushOp: 56600, pushTot: 57000, tekenOp: 57000, vinkOp: 58900, pullOp: 59100, pullTot: 59500,
  klikBevestig: 60100, klaarOp: 60440,
  terugOp: 61500, terugTot: 62700,
  meldingOp: 62800, meldingUit: 64800,
  statusVlucht: 64400, statusOp: 64500, statusLand: 65100,
  belofteOp: 65500, belofteUit: 67700,
  eind: 68000,
} as const

// H4 planning (jij): eerst een werkbon vanuit het project (Acties, Werkbon maken),
// dan dolly naar de planning, montagekaart slepen, dialoog met de werkbon gekoppeld, statuswoord, belofte.
export const H4 = {
  klikWerkbon: 68700, werkbonDialoogOp: 68850, klikWerkbonMaken: 70300, werkbonKlaarOp: 70580,
  dollyOp: 71900, dollyTot: 73100, kaartOp: 72000, kaartUit: 73800,
  sleepOp: 74600, landOp: 76000,
  dialoogOp: 76250, klikKoppel: 77500, koppelOp: 77580, klikInplannen: 78700, klaarOp: 78900,
  statusVlucht: 79800, statusOp: 79900, statusLand: 80500,
  belofteOp: 80900, belofteUit: 83100,
  eind: 83400,
} as const

// H5 werkbon (je monteur): 3D-telefoon, na-foto, handtekening, statuswoord, belofte.
export const H5 = {
  dollyOp: 83400, dollyTot: 84600, kaartOp: 83500, kaartUit: 85300,
  klikNaFoto: 86700, fotoOp: 87150, tekenOp: 88400,
  statusVlucht: 90900, statusOp: 91000, statusLand: 91600,
  belofteOp: 92000, belofteUit: 94200,
  eind: 94500,
} as const

// H6 betaald (jij): financieel-tab, factuur maken, versturen, melding betaald met push, statuswoord, belofte.
export const H6 = {
  dollyOp: 94500, dollyTot: 95700, kaartOp: 94600, kaartUit: 96400,
  klikFinancieel: 96300, financieelOp: 96500, klikFactuurMaken: 97500, factuurOp: 97900,
  klikVerstuur: 99100, verstuurdOp: 99400,
  // Koppelingen: de factuur gaat vanzelf naar de boekhouding (Exact, Moneybird, e-Boekhouden) en Mollie int.
  koppelingOp: 100100, koppelingUit: 102700,
  meldingOp: 102800, meldingUit: 104800, pushOp: 102800, pushTot: 103200, betaaldOp: 103000, pullOp: 104600, pullTot: 105000,
  statusVlucht: 105200, statusOp: 105300, statusLand: 105900,
  belofteOp: 106300, belofteUit: 108500,
  eind: 109000,
} as const

// Slot: zachte overgang, Daan (jouw slimme collega, powered by Claude) in drie
// 50/50-frames met links de zin en rechts de echte UI, dan het grid rond het
// logo en de eindkaart. Geen gevel meer.
export const S = {
  overgangOp: 109000, overgangTot: 110200,
  introOp: 110000, introNaamOp: 110900, introUit: 113600,
  frameOp: 113800, frameDuur: 4600, frameUit: 127600,
  gridOp: 128000, puntValt: 128200, belofteOp: 128700, belofteUit: 131400, gridUit: 131500,
  eindkaartOp: 131600, regelOp: 132100, urlOp: 132700,
  eind: 135800,
} as const
