// Beats van de v4-film in absolute ms. Stap 1: alleen de opening (0-10 s).
export const O = {
  // Buiten het bord, nacht, bord uit. Zes tool-kaartjes zweven, hold 2 s.
  kaartjesOp: 0,
  // De punt verschijnt in het midden van het bord.
  puntOp: 2000,
  // Kaartjes worden naar de punt getrokken (gestaggerd per kaartje).
  trekVan: 2300,
  // Inslag: alle kaartjes zijn binnen, flits, ring.
  inslagOp: 4600,
  // Logo licht op in het bord (met neon-flikker), vol op 5600.
  logoOp: 4700, logoVol: 5600,
  // De punt valt op zijn plek in het logo.
  puntValt: 5600, puntLandt: 6300,
  // Belofte: fade 300 ms, hold 2 s, weg.
  belofteOp: 6600, belofteUit: 8900,
  // Prelude op de duik: de camera begint heel licht te pushen.
  pushOp: 9400,
  eind: 10000,
} as const

// Duik en H1 mail (jij). Camera beweegt alleen tussen hoofdstukken (dolly 1,2 s).
export const H1 = {
  // Duik: de opening-camera pusht door het logo, het mailscherm komt uit de diepte.
  duikOp: 10000, duikTot: 12000,
  kaartOp: 10300, kaartUit: 12100,
  // Mailbox staat, hold 1,5 s.
  mailOp: 12000,
  // Punt naar "Project aanmaken"; klik landt op 14200 (cursorstap = klik - 780).
  klikProject: 14200, projectOp: 14500,
  // Hold 1,0 s, dan dolly naar het project-paneel.
  dollyOp: 15200, dollyTot: 16400, cockpitOp: 16300,
  // Belofte 0,4 s na de landing, 2,2 s.
  belofteOp: 16800, belofteUit: 19000,
  // Rondleiding: drie labels van 1,4 s.
  rondOp: 19000, rondStap: 1400,
  // Punt vliegt naar het statuswoord (aankomst 700 ms later), hold, einde H1.
  statusVlucht: 23200, statusOp: 23300, statusLand: 23900,
  eind: 25800,
} as const
