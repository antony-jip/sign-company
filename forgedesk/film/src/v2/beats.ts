// Alle beats van de film in absolute ms. Eén tijdlijn, één camera.
// Regel: een klik landt op klikX + 80 (cursor: vertrek klikX - 700, reis 700).
// Gevolgen komen ná de klik, nooit ervoor.
const klik = (ms: number) => ms + 80

// Opening: losse tools zweven, smelten samen tot doen., het dashboard opent.
export const B0 = {
  toolsOp: 300, zweefTot: 3200, ontstekingOp: 3000, trekVan: 3300, inslagOp: 5400,
  lettersOp: 5700, puntOp: 7200, pulseOp: 8000, belofteOp: 8300, belofteSelectOp: 9000, belofteUit: 11200,
  dashboardOp: 10600, dashboardMailOp: 12000, klikEmail: 12900,
} as const

export const B = {
  // Mail: open, Daan-kaart, belofte, project aanmaken, bijlage naar project
  mailCamOp: 13300, mailKlikLijst: 14200, mailReaderOp: klik(14200) + 120, mailKlantOp: klik(14200) + 450, mailBelofteOp: 15000,
  mailKlikProject: 17400, mailProjectOp: klik(17400) + 320, mailKlikBijlage: 18600, mailBijlageOp: klik(18600) + 280, mailBelofteUit: 19200,
  // Openvouwen cockpit
  cockpitCamOp: 19500, cockpitOp: 20300, cockpitLandOp: 20700, projectBelofteOp: 21200, voortgangZoomOp: 21700, projectBelofteUit: 23900,
  // Offerte: regels, calculatie open en overnemen, verstuur via portaal
  klikOfferteMaken: 24100, editorCamOp: klik(24100) + 200, editorOp: 25100, regelsOp: 25400, offerteBelofteOp: 25500,
  klikCalculatie: 27400, calculatieOp: klik(27400) + 200, klikCalculatieSluiten: 29300, calculatieDichtOp: klik(29300),
  klikVerstuur: 30000, keuzeOp: klik(30000) + 180, klikPortaal: 31000, flapOp: klik(31000) + 220, offerteBelofteUit: 31700,
  terugCockpit1: 32000, cockpitLand1: 33100, inReviewOp: 33200, portaalCamOp: 34400,
  // Portaal
  portaalBelofteOp: 35100, klikBekijken: 35800, publiekOp: klik(35800) + 250, naamOp: klik(35800) + 700,
  tekenOp: 37400, vinkOp: 38900, klikBevestig: 39300, geaccepteerdOp: klik(39300) + 340, portaalBelofteUit: 40300,
  stipOp: 40200, terugCockpit2: 40500, cockpitLand2: 41600, toastAkkoordOp: 41700, akkoordKlantOp: 42100,
  proefEind: 43700,
} as const

// Tweede helft: montage, klokken en werkbon, mail uit het project, factuur,
// pull-back, end card.
export const B2 = {
  klikMontage: 43700, planningCamOp: klik(43700) + 250, sleepOp: 45300, landOp: 46200, montageBelofteOp: 44900, montageBelofteUit: 47600,
  terugCockpit3: 47500, cockpitLand3: 48600, ingeplandOp: 48700,
  klikInklokken: 49300, ingekloktOp: klik(49300), telefoonCamOp: 50200, klikNaFoto: 51800, fotoOp: klik(51800) + 450,
  werkbonBelofteOp: 50800, werkbonBelofteUit: 54300, terugCockpit4: 54000, cockpitLand4: 55100, fotoPortaalOp: 55200,
  klikMailContact: 55700, composerOp: klik(55700) + 150, typOp: 56700, klikUitProject: 58700, bijlageOp: klik(58700) + 300,
  opvolgenOp: 59600, klikVerzenden: 60000, verzondenOp: klik(60000) + 200, mailBelofteOp: 56500, mailBelofteUit: 60800, composerDichtOp: 61000,
  klikFinancieel: 61400, financieelOp: klik(61400) + 200, klikFactuurMaken: 62300, factuurOp: klik(62300) + 350,
  klikFactuurVerstuur: 63600, factuurVerstuurdOp: klik(63600) + 220, toastBetaaldOp: 65000, betaaldOp: 65400, teFacturerenOp: 65600,
  factuurBelofteOp: 62800, factuurBelofteUit: 66700,
  // Pull-back naar alle schermen, de gevel brandt, slotregel, end card
  pullbackOp: 66900, constellatieOp: 68300, allesBelofteOp: 69100, gevelBrandtOp: 69900, allesBelofteUit: 72300,
  eindkaartOp: 72100, lettersOp: 72400, puntOp: 73700, pulseOp: 74500, regelOp: 74900, urlOp: 75700,
  eind: 79000,
} as const
