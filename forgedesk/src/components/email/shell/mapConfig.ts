import { Inbox, Send, FileEdit, Trash2, Archive, CheckCheck, Hourglass, Moon, CalendarClock, Target, type LucideIcon } from 'lucide-react'
import type { EmailLijstItem, MailMap } from '@/lib/mail/types'
import { vergelijkNieuwsteEerst } from '@/lib/mail/mailStore'

export interface MapDefinitie {
  id: MailMap
  label: string
  icoon: LucideIcon
}

/** Volgorde van de mappenrail, zoals het contract hem noemt. */
export const MAP_VOLGORDE: MapDefinitie[] = [
  { id: 'inbox', label: 'Inbox', icoon: Inbox },
  { id: 'opvolgen', label: 'Opvolgen', icoon: Hourglass },
  { id: 'beantwoord', label: 'Beantwoord', icoon: CheckCheck },
  { id: 'gesnoozed', label: 'Gesnoozed', icoon: Moon },
  { id: 'concepten', label: 'Concepten', icoon: FileEdit },
  { id: 'ingepland', label: 'Ingepland', icoon: CalendarClock },
  { id: 'verzonden', label: 'Verzonden', icoon: Send },
  { id: 'archief', label: 'Archief', icoon: Archive },
  { id: 'prullenbak', label: 'Prullenbak', icoon: Trash2 },
  { id: 'leads', label: 'Leads', icoon: Target },
]

export function mapLabel(map: MailMap): string {
  return MAP_VOLGORDE.find((m) => m.id === map)?.label ?? map
}

export type LijstFilter = 'alle' | 'ongelezen' | 'vastgepind' | 'bijlagen' | 'vanmij' | 'nietToegewezen'

export const FILTERS: { id: LijstFilter; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'ongelezen', label: 'Ongelezen' },
  { id: 'vastgepind', label: 'Vastgepind' },
  { id: 'bijlagen', label: 'Bijlagen' },
]

/** Extra filters van een gedeeld postvak; staan achter de gewone filters. */
export const TEAM_FILTERS: { id: LijstFilter; label: string }[] = [
  { id: 'vanmij', label: 'Van mij' },
  { id: 'nietToegewezen', label: 'Niet toegewezen' },
]

export function voldoetAanFilter(item: EmailLijstItem, filter: LijstFilter, eigenSleutels?: readonly string[]): boolean {
  switch (filter) {
    case 'ongelezen': return !item.gelezen
    case 'vastgepind': return !!item.pinned
    case 'bijlagen': return item.bijlagen > 0 || !!item.has_attachments
    case 'vanmij': return !!item.toegewezen_aan && !!eigenSleutels?.includes(item.toegewezen_aan)
    case 'nietToegewezen': return !item.toegewezen_aan
    default: return true
  }
}

export type SplitTab = 'aanvragen' | 'klanten' | 'leveranciers' | 'overig'

export const SPLIT_TABS: { id: SplitTab; label: string }[] = [
  { id: 'aanvragen', label: 'Aanvragen' },
  { id: 'klanten', label: 'Klanten' },
  { id: 'leveranciers', label: 'Leveranciers' },
  { id: 'overig', label: 'Overig' },
]

/**
 * Pinned bovenaan, daarbinnen op datum. De store levert datumvolgorde; dit is
 * een weergavekeuze van de shell.
 */
export function sorteerVoorLijst(items: EmailLijstItem[]): EmailLijstItem[] {
  const vast: EmailLijstItem[] = []
  const rest: EmailLijstItem[] = []
  for (const item of items) (item.pinned ? vast : rest).push(item)
  if (vast.length === 0) return items
  vast.sort(vergelijkNieuwsteEerst)
  return [...vast, ...rest]
}

export function datumGroep(dateStr: string, nu = new Date()): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Eerder'
  const start = (x: Date) => { const y = new Date(x); y.setHours(0, 0, 0, 0); return y }
  const vandaag = start(nu)
  const doel = start(d)
  const dagen = Math.round((vandaag.getTime() - doel.getTime()) / 86_400_000)
  if (dagen <= 0) return 'Vandaag'
  if (dagen === 1) return 'Gisteren'
  if (dagen <= 6) return 'Deze week'
  if (dagen <= 13) return 'Vorige week'
  if (doel.getMonth() === vandaag.getMonth() && doel.getFullYear() === vandaag.getFullYear()) return 'Eerder deze maand'
  if (doel.getFullYear() === vandaag.getFullYear()) return 'Eerder dit jaar'
  return 'Vorig jaar of ouder'
}

export type LijstRij =
  | { type: 'kop-vast' }
  | { type: 'kop-groep'; groep: string }
  | { type: 'mail'; item: EmailLijstItem; index: number }

/** Platte rijen voor de virtualizer: kopjes tussen de mail, pinned onder één kop. */
export function bouwRijen(items: EmailLijstItem[], nu = new Date()): LijstRij[] {
  if (items.length === 0) return []
  const rijen: LijstRij[] = []
  let laatsteGroep: string | null = null
  let inVast = !!items[0].pinned
  if (inVast) rijen.push({ type: 'kop-vast' })
  items.forEach((item, index) => {
    if (inVast && !item.pinned) { inVast = false; laatsteGroep = null }
    if (!inVast) {
      const groep = datumGroep(item.datum, nu)
      if (groep !== laatsteGroep) { rijen.push({ type: 'kop-groep', groep }); laatsteGroep = groep }
    }
    rijen.push({ type: 'mail', item, index })
  })
  return rijen
}

export interface LegeStaatTekst {
  titel: string
  regels: { tekst: string; sprong?: MailMap }[]
  uitleg?: string
}

/** Per map een eigen lege staat; de inbox vertelt wat er nog wél ligt, met sprongen. */
export function legeStaatVoor(map: MailMap, tellers: Partial<Record<MailMap, number>>, filter: LijstFilter, zoekt: boolean): LegeStaatTekst {
  if (zoekt) return { titel: 'Geen resultaten', regels: [], uitleg: 'Probeer een ander woord of haal een chip weg.' }
  if (filter !== 'alle') return { titel: 'Niets met dit filter', regels: [], uitleg: 'Zet het filter op Alle om alles te zien.' }
  switch (map) {
    case 'inbox': {
      const regels: LegeStaatTekst['regels'] = []
      if ((tellers.opvolgen ?? 0) > 0) regels.push({ tekst: `${tellers.opvolgen} wachten op reactie`, sprong: 'opvolgen' })
      if ((tellers.gesnoozed ?? 0) > 0) regels.push({ tekst: `${tellers.gesnoozed} gesnoozed`, sprong: 'gesnoozed' })
      if ((tellers.concepten ?? 0) > 0) regels.push({ tekst: `${tellers.concepten} concepten`, sprong: 'concepten' })
      return { titel: 'Alles gedaan', regels, uitleg: regels.length ? undefined : 'Nieuwe mail verschijnt hier vanzelf.' }
    }
    case 'concepten': return { titel: 'Geen concepten', regels: [], uitleg: 'Wat je begint te schrijven wacht hier tot je het verstuurt.' }
    case 'gesnoozed': return { titel: 'Niets gesnoozed', regels: [], uitleg: 'Snooze een mail (z) en hij komt op het gekozen moment terug in je inbox.' }
    case 'opvolgen': return { titel: 'Niets om op te volgen', regels: [], uitleg: 'Zet Opvolgen aan bij het verzenden en je ziet hier wie nog niet heeft gereageerd.' }
    case 'beantwoord': return { titel: 'Nog geen reacties', regels: [], uitleg: 'Zodra iemand antwoordt op een opgevolgde mail staat hij hier.' }
    case 'ingepland': return { titel: 'Niets ingepland', regels: [], uitleg: 'Plan een bericht in vanuit Nieuw bericht of een antwoord.' }
    case 'verzonden': return { titel: 'Nog niets verzonden', regels: [], uitleg: 'Wat je vanuit doen. verstuurt staat hier.' }
    case 'archief': return { titel: 'Archief is leeg', regels: [], uitleg: 'Archiveer met e; het blijft vindbaar via zoeken.' }
    case 'prullenbak': return { titel: 'Prullenbak is leeg', regels: [], uitleg: '' }
    default: return { titel: 'Niets hier', regels: [] }
  }
}
