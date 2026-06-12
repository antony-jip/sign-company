/**
 * Kijkgedrag-tracking voor aanbevelingen — volledig client-side (localStorage),
 * privacyvriendelijk: er verlaat niets de browser behalve de (anonieme)
 * categorie/tag-voorkeuren waarmee /api/aanbevolen wordt bevraagd.
 */

export interface BekekenItem {
  id: string
  slug: string
  titel: string
  image: string
  categoryId: string | null
  tags: string[]
  ts: number
}

const KEY = 'kunstdoekje_bekeken_v1'
const MAX = 40

function lees(): BekekenItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as BekekenItem[]
  } catch {
    return []
  }
}

export function registreerBekeken(item: Omit<BekekenItem, 'ts'>) {
  if (typeof window === 'undefined') return
  const lijst = lees().filter((b) => b.id !== item.id)
  lijst.unshift({ ...item, ts: Date.now() })
  try {
    localStorage.setItem(KEY, JSON.stringify(lijst.slice(0, MAX)))
  } catch {
    /* opslag vol of geblokkeerd — geen ramp */
  }
}

export function recentBekeken(limit = 8): BekekenItem[] {
  return lees().slice(0, limit)
}

/** Voorkeursprofiel: meest bekeken categorieën en tags, recentste eerst gewogen. */
export function voorkeursprofiel(): { cats: string[]; tags: string[]; bekekenIds: string[] } {
  const lijst = lees()
  const catScore = new Map<string, number>()
  const tagScore = new Map<string, number>()
  lijst.forEach((b, i) => {
    const gewicht = 1 / (1 + i / 8) // recenter = zwaarder
    if (b.categoryId) catScore.set(b.categoryId, (catScore.get(b.categoryId) ?? 0) + gewicht)
    for (const t of b.tags ?? []) tagScore.set(t, (tagScore.get(t) ?? 0) + gewicht)
  })
  const top = (m: Map<string, number>, n: number) =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)
  return { cats: top(catScore, 3), tags: top(tagScore, 6), bekekenIds: lijst.map((b) => b.id) }
}
