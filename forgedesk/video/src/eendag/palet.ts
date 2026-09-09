// Palet voor "een dag". Los van src/brand.ts omdat het brief andere waarden
// voorschrijft dan het logo, en die keuze nog openstaat.
//
// BESLIST (Antony, sept 2026): flame volgt het logo, niet het brief.
//   brief    flame #F15025
//   logo-SVG flame #D24620  <- deze
// Shot 11C zet het echte logo naast de gegradede flame; met de brief-waarde
// stonden daar twee verschillende oranjes in het laatste frame van de film.
//
// Petrol blijft bewust #1A535C (brief en app) en niet #2b535c uit het logo:
// die twee schelen alleen 17 in rood (26,83,92 tegen 43,83,92) en dat leest
// niet, terwijl #1A535C 493 keer in de repo staat tegen 18 keer voor de ander.
export const FLAME = "#D24620";
export const FLAME_RGB = "210,70,32";
export const PETROL = "#1A535C";

/** Flame met dekking. Nergens rgba hardcoderen, anders klopt bovenstaande niet meer. */
export const flameA = (dekking: number) => `rgba(${FLAME_RGB},${dekking})`;

export const OFFWHITE = "#F8F7F5";
export const INK = "#1A1A18";
export const GRIJS = "#8A8F90";
export const KAART = "#FFFFFE";
export const PAGINA = "#F4F3F0";
