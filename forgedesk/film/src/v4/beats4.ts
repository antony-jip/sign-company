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
