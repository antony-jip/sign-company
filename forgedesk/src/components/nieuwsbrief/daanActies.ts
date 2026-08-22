import type { DaanActie } from '@/services/nieuwsbriefService'
import { normaliseerDocument, nieuwId, type Blok, type NieuwsbriefDocument } from './nieuwsbriefBlokken'

export interface DaanStand { doc: NieuwsbriefDocument; onderwerp: string; preheader: string }
export interface DaanStap { stand: DaanStand; omschrijving: string }

const NAAM: Record<string, string> = {
  header: 'header', kop: 'kop', tekst: 'tekst', afbeelding: 'afbeelding', knop: 'knop', afbeelding_tekst: 'beeld met tekst',
  kolommen: 'kolommen', quote: 'quote', highlight: 'uitgelicht vlak', lijn: 'lijn', ruimte: 'ruimte', footer: 'footer', html: 'HTML-blok',
}

function blokUit(input: unknown, id?: string): Blok | null {
  if (!input || typeof input !== 'object') return null
  const doc = normaliseerDocument({ versie: 1, blokken: [{ ...(input as object), id: id || nieuwId() }] })
  return doc.blokken[0] ?? null
}

function label(werkwoord: string, blok?: Blok | null): string {
  const naam = blok ? NAAM[blok.type] ?? blok.type : 'blok'
  return `${naam[0].toUpperCase()}${naam.slice(1)} ${werkwoord}`
}

/**
 * Past één Daan-actie toe op de huidige stand. Geeft null terug als de actie
 * niets doet (onbekend id, leeg blok), zodat de chat die stap niet meldt.
 */
export function pasDaanActieToe(stand: DaanStand, a: DaanActie): DaanStap | null {
  const blokken = [...stand.doc.blokken]
  const index = (id?: string | null) => (id ? blokken.findIndex(b => b.id === id) : -1)
  switch (a.actie) {
    case 'vervang': {
      const i = index(a.id)
      if (i < 0 || !a.blok || typeof a.blok !== 'object') return null
      const nieuw = blokUit({ ...(a.blok as object), type: (a.blok as { type?: string }).type || blokken[i].type }, blokken[i].id)
      if (!nieuw) return null
      blokken[i] = nieuw
      return { stand: { ...stand, doc: { ...stand.doc, blokken } }, omschrijving: label('aangepast', nieuw) }
    }
    case 'voeg_toe': {
      const nieuw = blokUit(a.blok)
      if (!nieuw) return null
      blokken.splice(index(a.na) + 1, 0, nieuw)
      return { stand: { ...stand, doc: { ...stand.doc, blokken } }, omschrijving: label('toegevoegd', nieuw) }
    }
    case 'verwijder': {
      const i = index(a.id)
      if (i < 0) return null
      const [weg] = blokken.splice(i, 1)
      return { stand: { ...stand, doc: { ...stand.doc, blokken } }, omschrijving: label('verwijderd', weg) }
    }
    case 'verplaats': {
      const i = index(a.id)
      if (i < 0) return null
      const [blok] = blokken.splice(i, 1)
      blokken.splice(index(a.na) + 1, 0, blok)
      return { stand: { ...stand, doc: { ...stand.doc, blokken } }, omschrijving: label('verplaatst', blok) }
    }
    case 'onderwerp': {
      const onderwerp = typeof a.onderwerp === 'string' ? a.onderwerp.trim().slice(0, 120) : stand.onderwerp
      const preheader = typeof a.preheader === 'string' ? a.preheader.trim().slice(0, 200) : stand.preheader
      if (onderwerp === stand.onderwerp && preheader === stand.preheader) return null
      return { stand: { ...stand, onderwerp, preheader }, omschrijving: 'Onderwerp aangepast' }
    }
    case 'alles': {
      const nieuw = normaliseerDocument({ versie: 1, stijl: stand.doc.stijl, blokken: Array.isArray(a.blokken) ? a.blokken : [] })
      if (nieuw.blokken.length === 0) return null
      return { stand: { ...stand, doc: { ...stand.doc, blokken: nieuw.blokken } }, omschrijving: 'Nieuwsbrief opnieuw opgebouwd' }
    }
    default:
      return null
  }
}
