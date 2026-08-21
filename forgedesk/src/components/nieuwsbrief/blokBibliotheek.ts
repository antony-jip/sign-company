import { type Blok, nieuwId } from './nieuwsbriefBlokken'

// Eigen blokken van de gebruiker (bv. een vaste footer of actieblok), lokaal
// bewaard per browser. Geen tabel nodig: het is persoonlijk gereedschap.
const SLEUTEL = 'doen_nieuwsbrief_eigen_blokken'
const MAX = 40

export interface EigenBlok { id: string; naam: string; blok: Blok; bewaardOp: string }

function lees(): EigenBlok[] {
  try {
    const raw = localStorage.getItem(SLEUTEL)
    const lijst = raw ? JSON.parse(raw) : []
    return Array.isArray(lijst) ? lijst : []
  } catch { return [] }
}

function schrijf(lijst: EigenBlok[]) {
  localStorage.setItem(SLEUTEL, JSON.stringify(lijst.slice(0, MAX)))
  window.dispatchEvent(new Event('doen-eigen-blokken'))
}

export function getEigenBlokken(): EigenBlok[] { return lees() }

export function bewaarBlok(naam: string, blok: Blok): EigenBlok {
  const item: EigenBlok = { id: nieuwId(), naam, blok: JSON.parse(JSON.stringify(blok)), bewaardOp: new Date().toISOString() }
  schrijf([item, ...lees().filter(b => b.naam !== naam)])
  return item
}

export function verwijderEigenBlok(id: string) { schrijf(lees().filter(b => b.id !== id)) }

export function instantieer(item: EigenBlok): Blok { return { ...JSON.parse(JSON.stringify(item.blok)), id: nieuwId() } as Blok }
