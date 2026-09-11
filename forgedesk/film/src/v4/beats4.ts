// Beats van de v4-film in absolute ms. Eén tijdlijn, één camera die alleen
// tussen hoofdstukken beweegt (dolly 1,2 s). Kliks landen op klikX; de
// cursorstap vertrekt op klikX - 780 (zie Cursor.tsx).

// Opening (0-10 s): tool-kaartjes zweven, de punt trekt ze naar zich toe,
// inslag, logo, belofte, prelude op de duik.
export const O = {
  kaartjesOp: 0, puntOp: 2000, trekVan: 2300, inslagOp: 4600,
  logoOp: 4700, logoVol: 5600, puntValt: 5600, puntLandt: 6300,
  belofteOp: 6600, belofteUit: 9300, pushOp: 9400, eind: 10000,
} as const

// H1 mail (jij): duik, mailbox, project aanmaken, dolly naar het project,
// belofte, rondleiding, taak toewijzen aan Sanne, statuswoord.
export const H1 = {
  duikOp: 10000, duikTot: 12000, kaartOp: 11300, kaartUit: 12700,
  mailOp: 12000, klikProject: 14200, projectOp: 14500,
  dollyOp: 15200, dollyTot: 16400, cockpitOp: 15500,
  belofteOp: 16800, belofteUit: 19000,
  rondOp: 19000, rondStap: 1200,
  klikTaak: 23300, taakDialoogOp: 23450, taakTypOp: 23800, klikTaakSanne: 25800, taakKiesOp: 25880, klikTaakToevoegen: 26700, taakKlaarOp: 26980,
  meldingTaakOp: 27300, meldingTaakUit: 28900,
  statusVlucht: 29000, statusOp: 29100, statusLand: 29700,
  klikOfferteMaken: 31600,
  eind: 31800,
} as const

// H2 offerte (jij): editor, regels, push op de marge, belofte, collega-melding, verstuur via portaal.
export const H2 = {
  dollyOp: 31800, dollyTot: 33000, kaartOp: 31900, kaartUit: 33700,
  regelsOp: 33400,
  // Push 1,4x op de marge (rechts), korte hold, dan door naar het urenblok.
  pushOp: 35500, pushTot: 35900, rijOp: 35900, rijStap: 600,
  urenPushOp: 37600, urenPushTot: 38000, urenLabelOp: 38100, urenLabelUit: 39600, pullOp: 39600, pullTot: 40000,
  belofteOp: 40400, belofteUit: 42600,
  meldingOp: 42800, meldingUit: 44600, checkAkkoordOp: 42800,
  klikVerstuur: 45200, keuzeOp: 45380, klikPortaal: 46200, flapOp: 46500,
  statusVlucht: 47200, statusOp: 47300, statusLand: 47900,
  eind: 49400,
} as const

// H3 portaal (je klant, desktop): offerte komt binnen in het klantportaal, Bekijken,
// naam, handtekening met push, Bevestigen, terug naar het project, melding, statuswoord, belofte.
export const H3 = {
  dollyOp: 49400, dollyTot: 50600, kaartOp: 49500, kaartUit: 51700,
  kaartZichtOp: 50800, klikBekijken: 52500, publiekOp: 52600,
  naamOp: 54100, pushOp: 53600, pushTot: 54000, tekenOp: 55300, vinkOp: 57200, pullOp: 57400, pullTot: 57800,
  klikBevestig: 58400, klaarOp: 58740,
  terugOp: 59800, terugTot: 61000,
  meldingOp: 59500, meldingUit: 62600,
  statusVlucht: 62700, statusOp: 62800, statusLand: 63400,
  belofteOp: 63800, belofteUit: 66000,
  eind: 66300,
} as const

// H4 planning (jij): eerst een werkbon vanuit het project (Acties, Werkbon maken),
// dan dolly naar de planning, montagekaart slepen, dialoog met de werkbon gekoppeld, statuswoord, belofte.
export const H4 = {
  klikWerkbon: 67000, werkbonDialoogOp: 67150, klikWerkbonMaken: 68600, werkbonKlaarOp: 68880,
  dollyOp: 70200, dollyTot: 71400, kaartOp: 70300, kaartUit: 72100,
  sleepOp: 72900, landOp: 74300,
  dialoogOp: 74550, klikKoppel: 75800, koppelOp: 75880, klikInplannen: 77000, klaarOp: 77200,
  statusVlucht: 78100, statusOp: 78200, statusLand: 78800,
  belofteOp: 79200, belofteUit: 81400,
  eind: 81700,
} as const

// H5 werkbon (je monteur): 3D-telefoon, na-foto, handtekening, statuswoord, belofte.
export const H5 = {
  dollyOp: 81700, dollyTot: 82900, kaartOp: 81800, kaartUit: 83600,
  klikNaFoto: 85000, fotoOp: 85450, tekenOp: 86700,
  statusVlucht: 89200, statusOp: 89300, statusLand: 89900,
  belofteOp: 90300, belofteUit: 92500,
  eind: 92800,
} as const

// H6 betaald (jij): financieel-tab, factuur maken, versturen, melding betaald met push, statuswoord, belofte.
export const H6 = {
  dollyOp: 92800, dollyTot: 94000, kaartOp: 92900, kaartUit: 93800,
  klikFinancieel: 94600, financieelOp: 94800, klikFactuurMaken: 95800, factuurOp: 96200,
  klikVerstuur: 97400, verstuurdOp: 97700,
  // Koppelingen: de factuur gaat vanzelf naar de boekhouding (Exact, Moneybird, e-Boekhouden) en Mollie int.
  koppelingOp: 98400, koppelingUit: 101000,
  meldingOp: 101100, meldingUit: 103100, pushOp: 101100, pushTot: 101500, betaaldOp: 101300, pullOp: 102900, pullTot: 103300,
  statusVlucht: 103500, statusOp: 103600, statusLand: 104200,
  belofteOp: 104600, belofteUit: 106800,
  eind: 107300,
} as const

// Slot: zachte overgang, Daan (jouw slimme collega, powered by Claude) in drie
// 50/50-frames met links de zin en rechts de echte UI, dan het grid rond het
// logo en de eindkaart. Geen gevel meer.
export const S = {
  overgangOp: 107300, overgangTot: 108500,
  introOp: 108300, introNaamOp: 109200, introUit: 111500,
  // Drie frames van 6 s: widget (Daan zet dit klaar), mail (aanvraagkaart), dashboard (vannacht geleerd).
  frameOp: 112100, frameDuur: 6000, frameUit: 136100,
  gridOp: 136500, puntValt: 136700, belofteOp: 137200, belofteUit: 139900, gridUit: 140000,
  eindkaartOp: 140100, regelOp: 140600, urlOp: 141200,
  eind: 144300,
} as const
