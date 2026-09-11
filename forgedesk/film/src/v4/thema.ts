import { merk } from '../brand'
import { ease } from '../tijd'
import { fonts } from '../fonts'

// Eén thema voor de v4-film (remotion-motion-graphics regel 9): kleuren uit de
// app-Tailwind-config, easings uit MOTION.md, tijden in ms.
export const thema = {
  kleur: {
    // Lichte Flame uit de v4-brief voor het lampje en het kernwoord; de app-UI
    // houdt merk.flame (#D24620).
    flame: '#F15025',
    flameApp: merk.flame,
    petrol: merk.petrol,
    petrolLicht: merk.petrolLight,
    creme: merk.pagina,
    wit: merk.wit,
    ink: merk.ink,
    tekstSec: merk.tekstSec,
    // Lichte studio (SaaS-look): crème grond, zachte kleurvlekken.
    studio: merk.pagina,
    studioLaag: '#F1EDE4',
    // Acrylaat van het bord: mat grijs-wit uit, helder wit aan.
    acrylUit: '#FAF9F6',
    acrylAan: '#FFFFFF',
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
  // Clean: grain 2 procent, vignet 10 procent.
  laag: { grain: 0.02, vignet: 0.10 },
} as const
