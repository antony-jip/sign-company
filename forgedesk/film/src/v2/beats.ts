// Alle beats van de film in absolute ms. Eén tijdlijn, één camera.
// Regel: een klik landt op klikX + 80 (cursor: vertrek klikX - 700, reis 700).
// Gevolgen komen ná de klik, nooit ervoor.
const klik = (ms: number) => ms + 80
export const B = {
  // Belofte
  belofteOp: 200, belofteSelectOp: 900, belofteUit: 3000,
  // Mail: open, Daan-kaart, belofte, project aanmaken, bijlage naar project
  mailCamOp: 2600, mailKlikLijst: 3600, mailReaderOp: klik(3600) + 120, mailKlantOp: klik(3600) + 450, mailBelofteOp: 4400,
  mailKlikProject: 7000, mailProjectOp: klik(7000) + 320, mailKlikBijlage: 8300, mailBijlageOp: klik(8300) + 280, mailBelofteUit: 8900,
  // Openvouwen cockpit
  cockpitCamOp: 9200, cockpitOp: 10000, cockpitLandOp: 10400, projectBelofteOp: 10900, voortgangZoomOp: 11400, projectBelofteUit: 13800,
  // Offerte
  klikOfferteMaken: 14200, editorCamOp: klik(14200) + 200, editorOp: 15200, regelsOp: 15600, offerteBelofteOp: 15600,
  klikVerstuur: 18600, keuzeOp: klik(18600) + 180, klikPortaal: 19700, flapOp: klik(19700) + 220, offerteBelofteUit: 20500,
  terugCockpit1: 20800, cockpitLand1: 21900, inReviewOp: 22000, portaalCamOp: 23300,
  // Portaal
  portaalBelofteOp: 24000, klikBekijken: 24700, publiekOp: klik(24700) + 250, naamOp: klik(24700) + 700,
  tekenOp: 26300, vinkOp: 27900, klikBevestig: 28300, geaccepteerdOp: klik(28300) + 340, portaalBelofteUit: 29300,
  stipOp: 29200, terugCockpit2: 29500, cockpitLand2: 30600, toastAkkoordOp: 30700, akkoordKlantOp: 31100,
  proefEind: 33000,
} as const

// Tweede helft: montage, klokken en werkbon, mail uit het project, factuur,
// pull-back, landing. Sluit aan op B.proefEind.
export const B2 = {
  // Montage inplannen via Planning
  klikMontage: 33200, planningCamOp: klik(33200) + 250, sleepOp: 35000, landOp: 35900, montageBelofteOp: 34600, montageBelofteUit: 37400,
  terugCockpit3: 37300, cockpitLand3: 38400, ingeplandOp: 38500,
  // Klokken en werkbon op de telefoon
  klikInklokken: 39200, ingekloktOp: klik(39200), telefoonCamOp: 40200, klikNaFoto: 41900, fotoOp: klik(41900) + 450,
  werkbonBelofteOp: 40800, werkbonBelofteUit: 44600, terugCockpit4: 44300, cockpitLand4: 45400, fotoPortaalOp: 45500,
  // Mail uit het project
  klikMailContact: 46200, composerOp: klik(46200) + 150, typOp: 47200, klikUitProject: 49600, bijlageOp: klik(49600) + 300,
  opvolgenOp: 50500, klikVerzenden: 51000, verzondenOp: klik(51000) + 200, mailBelofteOp: 47000, mailBelofteUit: 51800, composerDichtOp: 52100,
  // Financieel en betaald
  klikFinancieel: 52600, financieelOp: klik(52600) + 200, klikFactuurMaken: 53600, factuurOp: klik(53600) + 350,
  klikFactuurVerstuur: 55000, factuurVerstuurdOp: klik(55000) + 220, toastBetaaldOp: 56600, betaaldOp: 57000, teFacturerenOp: 57200,
  factuurBelofteOp: 54200, factuurBelofteUit: 58200,
  // Pull-back en landing
  pullbackOp: 58600, allesBelofteOp: 61400, allesBelofteUit: 64200, constellatieOp: 60800, magneetOp: 62400, inslagOp: 64200,
  lettersOp: 64500, puntOp: 66200, pulseOp: 67100, eindkaartOp: 64200, regelOp: 68000, urlOp: 69200,
  eind: 75000,
} as const
