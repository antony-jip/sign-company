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
  cockpitCamOp: 19500, cockpitOp: 20300, cockpitLandOp: 20700, rondleidingOp: 21100, rondleidingStap: 640, 
  // Taak vanuit het project: + Taak, titel typen, Sanne kiezen, Taak toevoegen, melding bij Sanne
  klikTaak: 26980, taakDialoogOp: klik(26980) + 150, taakTypOp: klik(26980) + 500, klikTaakSanne: 29180, taakKiesOp: klik(29180), klikTaakToevoegen: 29980, taakKlaarOp: klik(29980) + 200, meldingTaakOp: 30680,
  projectBelofteOp: 31000, voortgangZoomOp: 31500, projectBelofteUit: 33700,
  // Offerte: regels, calculatie open en overnemen, verstuur via portaal
  klikOfferteMaken: 33900, editorCamOp: klik(33900) + 200, editorOp: 34900, regelsOp: 35200, offerteBelofteOp: 35300,
  klikCalculatie: 37200, calculatieOp: klik(37200) + 200, klikCalculatieSluiten: 39100, calculatieDichtOp: klik(39100),
  // Collega-check: acties-menu, Laten checken, Check vragen, melding bij Sanne, akkoord
  klikMenu: 39600, menuOp: klik(39600) + 120, klikLatenChecken: 40300, checkOp: klik(40300) + 150,
  klikCheckVragen: 41400, checkVraagOp: klik(41400) + 150, meldingSanneOp: 42000, checkAkkoordOp: 43100, meldingAkkoordOp: 43200,
  klikVerstuur: 43600, keuzeOp: klik(43600) + 180, klikPortaal: 44600, flapOp: klik(44600) + 220, offerteBelofteUit: 45300,
  terugCockpit1: 45600, cockpitLand1: 46700, inReviewOp: 46800, portaalCamOp: 47800,
  // Portaal
  portaalBelofteOp: 48300, klikBekijken: 49000, publiekOp: klik(49000) + 250, naamOp: klik(49000) + 700,
  tekenOp: 50600, vinkOp: 52100, klikBevestig: 52500, geaccepteerdOp: klik(52500) + 340, portaalBelofteUit: 53500,
  stipOp: 53400, terugCockpit2: 53700, cockpitLand2: 54800, toastAkkoordOp: 54900, akkoordKlantOp: 55300,
  proefEind: 56900,
} as const

// Tweede helft: montage, klokken en werkbon, mail uit het project, factuur,
// pull-back, end card.
export const B2 = {
  klikMontage: 57500, planningCamOp: klik(57500) + 250, sleepOp: 59400, landOp: 60300, montageBelofteOp: 58700, montageBelofteUit: 61400,
  terugCockpit3: 61300, cockpitLand3: 62400, ingeplandOp: 62500, 
  // Werkbon vanuit het project: Acties, Werkbon maken, dialoog, aangemaakt
  klikWerkbon: 63100, werkbonDialoogOp: klik(63100) + 150, klikWerkbonMaken: 64600, werkbonKlaarOp: klik(64600) + 200,
  telefoonCamOp: 65800, klikNaFoto: 67400, fotoOp: klik(67400) + 450,
  werkbonBelofteOp: 66400, werkbonBelofteUit: 69900, terugCockpit4: 69600, cockpitLand4: 70700, fotoPortaalOp: 70800,
  klikMailContact: 71300, composerOp: klik(71300) + 150, typOp: 72300, klikUitProject: 74300, kiezerOp: klik(74300) + 150, klikKiesTekening: 75300, kiesOp: klik(75300), bijlageOp: klik(75300) + 450,
  opvolgenOp: 76200, klikVerzenden: 76600, verzondenOp: klik(76600) + 200, mailBelofteOp: 72100, mailBelofteUit: 77400, composerDichtOp: 77600,
  klikFinancieel: 78000, financieelOp: klik(78000) + 200, klikFactuurMaken: 78900, factuurOp: klik(78900) + 350,
  klikFactuurVerstuur: 80200, factuurVerstuurdOp: klik(80200) + 220, toastBetaaldOp: 81600, betaaldOp: 82000, teFacturerenOp: 82200,
  factuurBelofteOp: 79400, factuurBelofteUit: 83300,
  // Pull-back naar alle schermen, de gevel brandt, slotregel, end card
  pullbackOp: 83500, constellatieOp: 84900, gevelBrandtOp: 86100, logoOp: 87800, allesBelofteOp: 88400, allesBelofteUit: 91400,
  eindkaartOp: 91200, lettersOp: 91500, puntOp: 92400, pulseOp: 93200, regelOp: 93600, urlOp: 94400,
  eind: 97800,
} as const
