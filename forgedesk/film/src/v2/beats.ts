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
  klikVerstuur: 30400, keuzeOp: klik(30400) + 180, klikPortaal: 31400, flapOp: klik(31400) + 220, offerteBelofteUit: 32100,
  terugCockpit1: 32400, cockpitLand1: 33500, inReviewOp: 33600, portaalCamOp: 34600,
  // Portaal
  portaalBelofteOp: 35100, klikBekijken: 35800, publiekOp: klik(35800) + 250, naamOp: klik(35800) + 700,
  tekenOp: 37400, vinkOp: 38900, klikBevestig: 39300, geaccepteerdOp: klik(39300) + 340, portaalBelofteUit: 40300,
  stipOp: 40200, terugCockpit2: 40500, cockpitLand2: 41600, toastAkkoordOp: 41700, akkoordKlantOp: 42100,
  proefEind: 43700,
} as const

// Tweede helft: montage, klokken en werkbon, mail uit het project, factuur,
// pull-back, end card.
export const B2 = {
  klikMontage: 44300, planningCamOp: klik(44300) + 250, sleepOp: 46200, landOp: 47100, montageBelofteOp: 45500, montageBelofteUit: 48200,
  terugCockpit3: 48100, cockpitLand3: 49200, ingeplandOp: 49300,
  klikInklokken: 49900, ingekloktOp: klik(49900), telefoonCamOp: 50800, klikNaFoto: 52400, fotoOp: klik(52400) + 450,
  werkbonBelofteOp: 51400, werkbonBelofteUit: 54900, terugCockpit4: 54600, cockpitLand4: 55700, fotoPortaalOp: 55800,
  klikMailContact: 56300, composerOp: klik(56300) + 150, typOp: 57300, klikUitProject: 59300, bijlageOp: klik(59300) + 300,
  opvolgenOp: 60200, klikVerzenden: 60600, verzondenOp: klik(60600) + 200, mailBelofteOp: 57100, mailBelofteUit: 61400, composerDichtOp: 61600,
  klikFinancieel: 62000, financieelOp: klik(62000) + 200, klikFactuurMaken: 62900, factuurOp: klik(62900) + 350,
  klikFactuurVerstuur: 64200, factuurVerstuurdOp: klik(64200) + 220, toastBetaaldOp: 65600, betaaldOp: 66000, teFacturerenOp: 66200,
  factuurBelofteOp: 63400, factuurBelofteUit: 67300,
  // Pull-back naar alle schermen, de gevel brandt, slotregel, end card
  pullbackOp: 67500, constellatieOp: 68900, allesBelofteOp: 69700, gevelBrandtOp: 70500, allesBelofteUit: 72900,
  eindkaartOp: 72700, lettersOp: 73000, puntOp: 74300, pulseOp: 75100, regelOp: 75500, urlOp: 76300,
  eind: 79600,
} as const
