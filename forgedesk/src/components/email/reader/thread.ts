import type { EmailLijstItem } from '@/lib/mail/types'
import { cleanEmailPreview, extractSenderEmail, extractSenderName } from '@/components/email/emailHelpers'

// Pure thread-logica voor de conversatieweergave, zonder DOM zodat het in
// node te testen is: welke berichten staan open, wat is de korte regel van
// een ingeklapt bericht, wie doet er mee.

export const PREVIEW_LENGTE = 80

/** Oud boven, nieuw onder. De store levert al zo, maar een losse lijst niet altijd. */
export function sorteerOudNaarNieuw<T extends { datum: string; id: string }>(berichten: T[]): T[] {
  return [...berichten].sort((a, b) => {
    const verschil = Date.parse(a.datum) - Date.parse(b.datum)
    if (verschil !== 0 && !Number.isNaN(verschil)) return verschil
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

/**
 * Het geselecteerde bericht en het laatste bericht staan open; de rest is
 * ingeklapt tot één regel. Een thread van één bericht staat altijd open.
 * Ontbreekt de selectie in de thread (nog niet geladen), dan alleen het laatste.
 */
export function bepaalOpenBerichten(berichten: { id: string }[], geselecteerdId: string | null): Set<string> {
  const open = new Set<string>()
  if (berichten.length === 0) return open
  open.add(berichten[berichten.length - 1].id)
  if (geselecteerdId && berichten.some((b) => b.id === geselecteerdId)) open.add(geselecteerdId)
  return open
}

/** Eén regel voor een ingeklapt bericht: de eerste 80 tekens zonder citaat en zonder tags. */
export function kortePreview(bericht: Pick<EmailLijstItem, 'body_text' | 'aanvraag_samenvatting'>, lengte = PREVIEW_LENGTE): string {
  const bron = bericht.body_text || ''
  const schoon = cleanEmailPreview(bron).replace(/\s+/g, ' ').trim()
  if (schoon.length <= lengte) return schoon
  return `${schoon.slice(0, lengte).trimEnd()}…`
}

export interface Deelnemer {
  naam: string
  email: string
}

/** Iedereen die in de thread mailt of gemaild wordt, één keer, in volgorde van verschijnen. */
export function deelnemersVan(berichten: Pick<EmailLijstItem, 'van' | 'aan' | 'to_addresses' | 'cc_addresses'>[], eigenAdres?: string | null): Deelnemer[] {
  const gezien = new Set<string>()
  const uit: Deelnemer[] = []
  const eigen = (eigenAdres || '').trim().toLowerCase()
  const neem = (naam: string | undefined, email: string) => {
    const sleutel = email.trim().toLowerCase()
    if (!sleutel || gezien.has(sleutel)) return
    gezien.add(sleutel)
    uit.push({ naam: sleutel === eigen ? 'ik' : (naam || '').trim() || email, email: email.trim() })
  }
  for (const b of berichten) {
    neem(extractSenderName(b.van), extractSenderEmail(b.van))
    const ontvangers = [...(b.to_addresses || []), ...(b.cc_addresses || [])]
    if (ontvangers.length === 0 && b.aan) {
      for (const stuk of b.aan.split(/[,;]/)) {
        const adres = stuk.trim()
        if (adres) neem(extractSenderName(adres), extractSenderEmail(adres))
      }
    }
    for (const o of ontvangers) if (o?.email) neem(o.name || undefined, o.email)
  }
  return uit
}

/** "Jan, Piet en ik" of "Jan, Piet, Klaas en 3 anderen". */
export function deelnemersLabel(deelnemers: Deelnemer[], max = 3): string {
  const namen = deelnemers.map((d) => d.naam.split(' ')[0] || d.naam)
  if (namen.length === 0) return ''
  if (namen.length === 1) return namen[0]
  if (namen.length <= max) return `${namen.slice(0, -1).join(', ')} en ${namen[namen.length - 1]}`
  return `${namen.slice(0, max).join(', ')} en ${namen.length - max} anderen`
}

/** Index van het vorige of volgende bericht in de thread, of null aan de rand. */
export function buurBericht(berichten: { id: string }[], huidigId: string | null, richting: 'vorige' | 'volgende'): string | null {
  const index = berichten.findIndex((b) => b.id === huidigId)
  if (index === -1) return berichten.length ? berichten[richting === 'volgende' ? 0 : berichten.length - 1].id : null
  const doel = richting === 'volgende' ? index + 1 : index - 1
  return doel >= 0 && doel < berichten.length ? berichten[doel].id : null
}
