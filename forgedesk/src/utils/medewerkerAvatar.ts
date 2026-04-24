import type { Medewerker } from '@/types'

export const DOEN_AVATAR_PALETTE = [
  { bg: '#E8F2EC', text: '#3A7D52' },
  { bg: '#E8EEF9', text: '#3A5A9A' },
  { bg: '#F5F2E8', text: '#8A7A4A' },
  { bg: '#F0EFEC', text: '#6B6B66' },
  { bg: '#EDE8F4', text: '#6A5A8A' },
] as const

export interface AvatarStyle {
  backgroundColor: string
  color: string
}

export function getAvatarStyle(index: number): AvatarStyle {
  const p = DOEN_AVATAR_PALETTE[index % DOEN_AVATAR_PALETTE.length]
  return { backgroundColor: p.bg, color: p.text }
}

export function getAvatarStyleForMedewerker(
  medewerker: Pick<Medewerker, 'id'>,
  allMedewerkers: Pick<Medewerker, 'id'>[]
): AvatarStyle {
  const idx = allMedewerkers.findIndex((m) => m.id === medewerker.id)
  return getAvatarStyle(idx >= 0 ? idx : 0)
}
