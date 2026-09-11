import { merk } from '../brand'
import { ease } from '../tijd'
import { fonts } from '../fonts'

// Eén thema voor de v4-film (remotion-motion-graphics regel 9): kleuren uit de
// app-Tailwind-config, easings uit MOTION.md, tijden in ms.
export const thema = {
  kleur: {
    flame: merk.flame,
    petrol: merk.petrol,
    petrolLicht: merk.petrolLight,
    creme: merk.pagina,
    wit: merk.wit,
    ink: merk.ink,
    tekstSec: merk.tekstSec,
    // Nacht: dezelfde toon als het dark-theme van de app (190 35% 5%).
    nacht: '#081619',
    nachtLaag: '#0C2328',
    // Uitgeschakeld acrylaat van het bord.
    acrylUit: '#071417',
    // Warm licht van het bord als het aan staat.
    lichtWarm: '#FFF4E2',
  },
  ease,
  fonts,
  // Cameraregels uit de brief.
  camera: { fov: 40, dollyMs: 1200, pushMs: 400, pushFactor: 1.4 },
  // De punt.
  punt: { straal: 0.393, klikSchaal: 1.4, klikMs: 120, vluchtMs: 600 },
  // Diepte-laag: grain 4 procent, vignet 15 procent.
  laag: { grain: 0.04, vignet: 0.15 },
} as const
