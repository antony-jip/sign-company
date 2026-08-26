import supabase from '@/services/supabaseClient'
import { type Blok, nieuwId } from './nieuwsbriefBlokken'

// Eigen blokken van de gebruiker (bv. een vaste footer of actieblok). Stonden
// in localStorage; dat betekende weg bij een andere browser of computer, en
// weg als de browserdata werd geleegd. Nu in nieuwsbrief_eigen_blokken
// (migratie 228), met een cache in het geheugen zodat de lezers synchroon
// kunnen blijven en de bouwer niet op elke render hoeft te wachten.
//
// De oude localStorage-sleutel wordt bij het eerste laden eenmalig
// overgenomen, zodat wat er al stond niet verdwijnt.
const OUDE_SLEUTEL = 'doen_nieuwsbrief_eigen_blokken'
const MAX = 40

export interface EigenBlok { id: string; naam: string; blok: Blok; bewaardOp: string }

let cache: EigenBlok[] = []
let geladen = false
let bezig: Promise<EigenBlok[]> | null = null

function meld() {
  window.dispatchEvent(new Event('doen-eigen-blokken'))
}

function db() {
  if (!supabase) throw new Error('Supabase is niet beschikbaar')
  return supabase
}

function uitRij(rij: { id: string; naam: string; blok: unknown; created_at: string }): EigenBlok {
  return { id: rij.id, naam: rij.naam, blok: rij.blok as Blok, bewaardOp: rij.created_at }
}

function leesOud(): { naam: string; blok: Blok }[] {
  try {
    const raw = localStorage.getItem(OUDE_SLEUTEL)
    const lijst = raw ? JSON.parse(raw) : []
    return Array.isArray(lijst) ? lijst.filter(b => b?.naam && b?.blok).map(b => ({ naam: String(b.naam), blok: b.blok as Blok })) : []
  } catch { return [] }
}

export async function laadEigenBlokken(): Promise<EigenBlok[]> {
  if (geladen) return cache
  if (bezig) return bezig
  bezig = (async () => {
    const { data: { user } } = await db().auth.getUser()
    if (!user) return []

    const oude = leesOud()
    if (oude.length > 0) {
      const { error } = await db().from('nieuwsbrief_eigen_blokken').upsert(
        oude.slice(0, MAX).map(b => ({ user_id: user.id, naam: b.naam, blok: b.blok })),
        { onConflict: 'user_id,naam', ignoreDuplicates: true },
      )
      // Alleen opruimen als het overzetten lukte, anders is het weg.
      if (!error) localStorage.removeItem(OUDE_SLEUTEL)
      else console.error('[nieuwsbrief] eigen blokken overzetten mislukt:', error)
    }

    const { data, error } = await db()
      .from('nieuwsbrief_eigen_blokken')
      .select('id, naam, blok, created_at')
      .order('naam')
    if (error) throw error
    cache = ((data ?? []) as unknown as Parameters<typeof uitRij>[0][]).map(uitRij)
    geladen = true
    meld()
    return cache
  })().catch(err => {
    console.error('[nieuwsbrief] eigen blokken laden mislukt:', err)
    return cache
  }).finally(() => { bezig = null })
  return bezig
}

export function getEigenBlokken(): EigenBlok[] { return cache }

export async function bewaarBlok(naam: string, blok: Blok): Promise<EigenBlok> {
  const { data: { user } } = await db().auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  const { data, error } = await db()
    .from('nieuwsbrief_eigen_blokken')
    .upsert(
      { user_id: user.id, naam, blok: JSON.parse(JSON.stringify(blok)), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,naam' },
    )
    .select('id, naam, blok, created_at')
    .single()
  if (error) throw error
  const item = uitRij(data as unknown as Parameters<typeof uitRij>[0])
  cache = [item, ...cache.filter(b => b.naam !== naam)].slice(0, MAX)
  meld()
  return item
}

export async function verwijderEigenBlok(id: string): Promise<void> {
  const { error } = await db().from('nieuwsbrief_eigen_blokken').delete().eq('id', id)
  if (error) throw error
  cache = cache.filter(b => b.id !== id)
  meld()
}

export function instantieer(item: EigenBlok): Blok { return { ...JSON.parse(JSON.stringify(item.blok)), id: nieuwId() } as Blok }
