// Alle beats van de film in absolute ms. Eén tijdlijn, één camera.
// Regel: een klik landt op klikX + 80 (cursor: vertrek klikX - 700, reis 700).
// Gevolgen komen ná de klik, nooit ervoor.
const klik = (ms: number) => ms + 80

// Opening: losse tools zweven, smelten samen tot doen., het dashboard opent.
export const B0 = {
  toolsOp: 300, zweefTot: 3200, ontstekingOp: 3000, trekVan: 3300, inslagOp: 5400,
  lettersOp: 5700, puntOp: 7200, pulseOp: 8000, belofteOp: 8300, belofteSelectOp: 9000, belofteUit: 10900,
  dashboardOp: 10600, dashboardMailOp: 12000, klikEmail: 12900,
} as const

export const B = {
  // Mail: open, Daan-kaart, belofte, project aanmaken, bijlage naar project
  mailCamOp: 13300, mailKlikLijst: 14600, mailReaderOp: klik(14600) + 120, mailKlantOp: klik(14600) + 450, mailBelofteOp: 15200,
  mailKlikProject: 17400, mailProjectOp: klik(17400) + 320, mailKlikBijlage: 18600, mailBijlageOp: klik(18600) + 280, mailBelofteUit: 19200,
  // Openvouwen cockpit
  cockpitCamOp: 19500, cockpitOp: 20300, cockpitLandOp: 20700, projectBelofteOp: 21200, voortgangZoomOp: 21700, projectBelofteUit: 23900,
  // Offerte: regels, calculatie open en overnemen, verstuur via portaal
  klikOfferteMaken: 24100, editorCamOp: klik(24100) + 200, editorOp: 25100, regelsOp: 25400, offerteBelofteOp: 25500,
  klikCalculatie: 27400, calculatieOp: klik(27400) + 200, klikCalculatieSluiten: 29300, calculatieDichtOp: klik(29300),
  // Collega-check: acties-menu, Laten checken, Check vragen, melding bij Sanne, akkoord
  klikMenu: 29800, menuOp: klik(29800) + 120, klikLatenChecken: 30500, checkOp: klik(30500) + 150,
  klikCheckVragen: 31600, checkVraagOp: klik(31600) + 150, meldingSanneOp: 32200, checkAkkoordOp: 33300, meldingAkkoordOp: 33400,
  klikVerstuur: 33800, keuzeOp: klik(33800) + 180, klikPortaal: 34800, flapOp: klik(34800) + 220, offerteBelofteUit: 35500,
  terugCockpit1: 35800, cockpitLand1: 36900, inReviewOp: 37000, portaalCamOp: 38000,
  // Portaal
  portaalBelofteOp: 38500, klikBekijken: 39200, publiekOp: klik(39200) + 250, naamOp: klik(39200) + 700,
  tekenOp: 40800, vinkOp: 42300, klikBevestig: 42700, geaccepteerdOp: klik(42700) + 340, portaalBelofteUit: 43700,
  stipOp: 43600, terugCockpit2: 43900, cockpitLand2: 45000, toastAkkoordOp: 45100, akkoordKlantOp: 45500,
  proefEind: 47100,
} as const

// Tweede helft: montage, klokken en werkbon, mail uit het project, factuur,
// pull-back, end card.
export const B2 = {
  klikMontage: 47700, planningCamOp: klik(47700) + 250, sleepOp: 49600, landOp: 50500, montageBelofteOp: 48900, montageBelofteUit: 51600,
  terugCockpit3: 51500, cockpitLand3: 52600, ingeplandOp: 52700, 
  // Werkbon vanuit het project: Acties, Werkbon maken, dialoog, aangemaakt
  klikWerkbon: 53300, werkbonDialoogOp: klik(53300) + 150, klikWerkbonMaken: 54800, werkbonKlaarOp: klik(54800) + 200,
  telefoonCamOp: 56000, klikNaFoto: 57600, fotoOp: klik(57600) + 450,
  werkbonBelofteOp: 56600, werkbonBelofteUit: 60100, terugCockpit4: 59800, cockpitLand4: 60900, fotoPortaalOp: 61000,
  klikMailContact: 61500, composerOp: klik(61500) + 150, typOp: 62500, klikUitProject: 64500, kiezerOp: klik(64500) + 150, klikKiesTekening: 65500, kiesOp: klik(65500), bijlageOp: klik(65500) + 450,
  opvolgenOp: 66400, klikVerzenden: 66800, verzondenOp: klik(66800) + 200, mailBelofteOp: 62300, mailBelofteUit: 67600, composerDichtOp: 67800,
  klikFinancieel: 68200, financieelOp: klik(68200) + 200, klikFactuurMaken: 69100, factuurOp: klik(69100) + 350,
  klikFactuurVerstuur: 70400, factuurVerstuurdOp: klik(70400) + 220, toastBetaaldOp: 71800, betaaldOp: 72200, teFacturerenOp: 72400,
  factuurBelofteOp: 69600, factuurBelofteUit: 73500,
  // Pull-back naar alle schermen, de gevel brandt, slotregel, end card
  pullbackOp: 73700, constellatieOp: 75100, gevelBrandtOp: 76300, logoOp: 78000, allesBelofteOp: 78600, allesBelofteUit: 81600,
  eindkaartOp: 81400, lettersOp: 81700, puntOp: 82600, pulseOp: 83400, regelOp: 83800, urlOp: 84600,
  eind: 88000,
} as const
