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
  pushOp: 35500, pushTot: 35900, rijOp: 35900, rijStap: 800, pullOp: 39800, pullTot: 40200,
  belofteOp: 40600, belofteUit: 42800,
  meldingOp: 43000, meldingUit: 44800, checkAkkoordOp: 43000,
  klikVerstuur: 45400, keuzeOp: 45580, klikPortaal: 46400, flapOp: 46700,
  statusVlucht: 47400, statusOp: 47500, statusLand: 48100,
  eind: 49600,
} as const

// H3 portaal (je klant): 3D-telefoon, naam, handtekening met push, bevestigen, terug, melding, statuswoord, belofte.
export const H3 = {
  dollyOp: 49600, dollyTot: 50800, kaartOp: 49700, kaartUit: 51900,
  naamOp: 52300, pushOp: 53400, pushTot: 53800, tekenOp: 53800, vinkOp: 55700, pullOp: 55900, pullTot: 56300,
  klikBevestig: 56900, klaarOp: 57240,
  terugOp: 58300, terugTot: 59500,
  meldingOp: 59600, meldingUit: 61600,
  statusVlucht: 61200, statusOp: 61300, statusLand: 61900,
  belofteOp: 62300, belofteUit: 64500,
  eind: 64800,
} as const

// H4 planning (jij): werkweek, montagekaart slepen, statuswoord, belofte.
export const H4 = {
  dollyOp: 64800, dollyTot: 66000, kaartOp: 64900, kaartUit: 66700,
  sleepOp: 67500, landOp: 68900,
  statusVlucht: 70000, statusOp: 70100, statusLand: 70700,
  belofteOp: 71100, belofteUit: 73300,
  eind: 73600,
} as const

// H5 werkbon (je monteur): 3D-telefoon, na-foto, handtekening, statuswoord, belofte.
export const H5 = {
  dollyOp: 73600, dollyTot: 74800, kaartOp: 73700, kaartUit: 75500,
  klikNaFoto: 76900, fotoOp: 77350, tekenOp: 78600,
  statusVlucht: 81100, statusOp: 81200, statusLand: 81800,
  belofteOp: 82200, belofteUit: 84400,
  eind: 84700,
} as const

// H6 betaald (jij): financieel-tab, factuur maken, versturen, melding betaald met push, statuswoord, belofte.
export const H6 = {
  dollyOp: 84700, dollyTot: 85900, kaartOp: 84800, kaartUit: 86600,
  klikFinancieel: 86500, financieelOp: 86700, klikFactuurMaken: 87700, factuurOp: 88100,
  klikVerstuur: 89300, verstuurdOp: 89600,
  meldingOp: 90800, meldingUit: 92800, pushOp: 90800, pushTot: 91200, betaaldOp: 91000, pullOp: 92600, pullTot: 93000,
  statusVlucht: 93200, statusOp: 93300, statusLand: 93900,
  belofteOp: 94300, belofteUit: 96500,
  eind: 97000,
} as const

// Slot: camera terug uit de ruimte, gevel, punt zet het bord aan, modulegrid, eindkaart.
export const S = {
  pullbackOp: 97000, pullbackTot: 98500,
  gevelOp: 98000, ruimteUit: 98800, ruimteWeg: 99600,
  puntVlucht: 99500, bordAan: 100200,
  gridOp: 102600, belofteOp: 103400, belofteUit: 105900, gridUit: 105900,
  eindkaartOp: 106000, lettersOp: 106200, puntValt: 107000, regelOp: 107600, urlOp: 108200,
  eind: 111000,
} as const
