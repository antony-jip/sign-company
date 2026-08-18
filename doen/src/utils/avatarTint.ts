// Zachte, stabiele avatar-tint per naam — rustige identiteit uit het DOEN-palet.
// Gedeeld door alle lijstweergaven (klanten, projecten, offertes, facturen, ...)
// zodat dezelfde klant/leverancier overal dezelfde kleur krijgt.

export interface AvatarTint {
  bg: string
  fg: string
}

const AVATAR_TINTS: AvatarTint[] = [
  { bg: 'rgba(26,83,92,0.10)',  fg: '#1A535C' },
  { bg: 'rgba(58,107,140,0.12)', fg: '#3A6B8C' },
  { bg: 'rgba(45,107,72,0.12)',  fg: '#2D6B48' },
  { bg: 'rgba(154,90,72,0.12)',  fg: '#9A5A48' },
  { bg: 'rgba(106,90,138,0.13)', fg: '#6A5A8A' },
  { bg: 'rgba(196,72,48,0.11)',  fg: '#C44830' },
  { bg: 'rgba(138,122,74,0.14)', fg: '#8A7A4A' },
]

export function avatarTint(naam: string): AvatarTint {
  const s = naam || ''
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]
}
