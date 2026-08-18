import type { Medewerker } from '@/types'

export const DOEN_AVATAR_PALETTE = [
  { bg: '#E8F2EC', text: '#3A7D52' },
  { bg: '#E8EEF9', text: '#3A5A9A' },
  { bg: '#F5F2E8', text: '#8A7A4A' },
  { bg: '#F0EFEC', text: '#6B6B66' },
  { bg: '#EDE8F4', text: '#6A5A8A' },
  { bg: '#E8F1F4', text: '#3A7A8A' },
  { bg: '#F4EAE8', text: '#9A5A4A' },
  { bg: '#EEF4E8', text: '#5A7A3A' },
  { bg: '#F4E8EF', text: '#8A4A6A' },
  { bg: '#E9EDF2', text: '#4A5A6E' },
] as const

export interface AvatarStyle {
  backgroundColor: string
  color: string
}

// Kleur uit een hash van het id, niet uit de lijstpositie: een alfabetische
// index verschuift ieders kleur zodra er een collega bij komt, en met 25
// medewerkers is kleur alleen een bruikbaar signaal als hij stabiel is.
function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') return Math.abs(seed)
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function getAvatarStyle(seed: number | string): AvatarStyle {
  const p = DOEN_AVATAR_PALETTE[hashSeed(seed) % DOEN_AVATAR_PALETTE.length]
  return { backgroundColor: p.bg, color: p.text }
}

export function getAvatarStyleForMedewerker(
  medewerker: Pick<Medewerker, 'id'>,
  _allMedewerkers?: Pick<Medewerker, 'id'>[]
): AvatarStyle {
  return getAvatarStyle(medewerker.id)
}
