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
  naamOp: 53200, pushOp: 54200, pushTot: 54600, tekenOp: 54600, vinkOp: 56500, pullOp: 56700, pullTot: 57100,
  klikBevestig: 57700, klaarOp: 58040,
  terugOp: 59100, terugTot: 60300,
  meldingOp: 60400, meldingUit: 62400,
  statusVlucht: 62000, statusOp: 62100, statusLand: 62700,
  belofteOp: 63100, belofteUit: 65300,
  eind: 65600,
} as const

// H4 planning (jij): eerst een werkbon vanuit het project (Acties, Werkbon maken),
// dan dolly naar de planning, montagekaart slepen, dialoog met de werkbon gekoppeld, statuswoord, belofte.
export const H4 = {
  klikWerkbon: 66300, werkbonDialoogOp: 66450, klikWerkbonMaken: 67900, werkbonKlaarOp: 68180,
  dollyOp: 69500, dollyTot: 70700, kaartOp: 69600, kaartUit: 71400,
  sleepOp: 72200, landOp: 73600,
  dialoogOp: 73850, klikKoppel: 75100, koppelOp: 75180, klikInplannen: 76300, klaarOp: 76500,
  statusVlucht: 77400, statusOp: 77500, statusLand: 78100,
  belofteOp: 78500, belofteUit: 80700,
  eind: 81000,
} as const

// H5 werkbon (je monteur): 3D-telefoon, na-foto, handtekening, statuswoord, belofte.
export const H5 = {
  dollyOp: 81000, dollyTot: 82200, kaartOp: 81100, kaartUit: 82900,
  klikNaFoto: 84300, fotoOp: 84750, tekenOp: 86000,
  statusVlucht: 88500, statusOp: 88600, statusLand: 89200,
  belofteOp: 89600, belofteUit: 91800,
  eind: 92100,
} as const

// H6 betaald (jij): financieel-tab, factuur maken, versturen, melding betaald met push, statuswoord, belofte.
export const H6 = {
  dollyOp: 92100, dollyTot: 93300, kaartOp: 92200, kaartUit: 94000,
  klikFinancieel: 93900, financieelOp: 94100, klikFactuurMaken: 95100, factuurOp: 95500,
  klikVerstuur: 96700, verstuurdOp: 97000,
  // Koppelingen: de factuur gaat vanzelf naar de boekhouding (Exact, Moneybird, e-Boekhouden) en Mollie int.
  koppelingOp: 97700, koppelingUit: 100300,
  meldingOp: 100400, meldingUit: 102400, pushOp: 100400, pushTot: 100800, betaaldOp: 100600, pullOp: 102200, pullTot: 102600,
  statusVlucht: 102800, statusOp: 102900, statusLand: 103500,
  belofteOp: 103900, belofteUit: 106100,
  eind: 106600,
} as const

// Slot: zachte overgang, Daan (jouw slimme collega, powered by Claude) in drie
// 50/50-frames met links de zin en rechts de echte UI, dan het grid rond het
// logo en de eindkaart. Geen gevel meer.
export const S = {
  overgangOp: 106600, overgangTot: 107800,
  introOp: 107600, introNaamOp: 108500, introUit: 111200,
  frameOp: 111400, frameDuur: 4600, frameUit: 125200,
  gridOp: 125600, puntValt: 125800, belofteOp: 126300, belofteUit: 129000, gridUit: 129100,
  eindkaartOp: 129200, regelOp: 129700, urlOp: 130300,
  eind: 133400,
} as const
