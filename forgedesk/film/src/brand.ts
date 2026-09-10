// Eén kleurbron: de Tailwind-config van de app. remotion.config.ts schrijft
// theme.extend.colors bij elke bundel naar kleuren.gen.json. Geen hex in scenes.
import kleurenJson from './kleuren.gen.json'

type Kleur = string | { DEFAULT: string; light?: string; border?: string; text?: string }
const kleuren = kleurenJson as Record<string, Kleur>

const hex = (naam: string, toon: 'DEFAULT' | 'light' | 'border' | 'text' = 'DEFAULT'): string => {
  const k = kleuren[naam]
  if (typeof k === 'string') return k
  const v = k?.[toon]
  if (!v) throw new Error(`brand: kleur ${naam}.${toon} ontbreekt in tailwind.config.js`)
  return v
}

export const merk = {
  flame: hex('flame'),
  flameLight: hex('flame', 'light'),
  petrol: hex('petrol'),
  petrolLight: hex('petrol', 'light'),
  petrolBorder: hex('petrol', 'border'),
  ink: hex('ink'),
  pagina: hex('bg-page'),
  warm: hex('warm'),
  zand: hex('sand'),
  tekstSec: hex('text-sec'),
  gedempt: hex('muted-hex'),
  wit: '#FFFFFF',
} as const

// Deep-petrol grond voor de tekstbeats: dezelfde toon als het dark-theme van de
// app (index.css --background 190 35% 5%).
// Hex, want de scenes plakken er een alpha-suffix achter (#08161966).
export const grond = {
  diep: '#081619',
  laag: '#101E21',
} as const

export type ModuleNaam =
  | 'projecten' | 'offertes' | 'facturen' | 'klanten' | 'planning' | 'werkbonnen' | 'taken' | 'email'

export const moduleKleur = (m: ModuleNaam) => ({
  kleur: hex(`mod-${m}`),
  light: hex(`mod-${m}`, 'light'),
  border: hex(`mod-${m}`, 'border'),
  text: hex(`mod-${m}`, 'text'),
})
