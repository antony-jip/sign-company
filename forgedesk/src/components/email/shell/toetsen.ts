import type { MailMap } from '@/lib/mail/types'

/**
 * Eén bron voor de sneltoetsen van de mailmodule (CONTRACT.md sectie 6). De
 * kaart achter `?` leest deze lijst, de toetsenhandler ook: wat hier staat
 * werkt, en wat werkt staat hier.
 */
export type ToetsActie =
  | 'volgende' | 'vorige' | 'openen' | 'archiveren' | 'verwijderen'
  | 'antwoord' | 'allen' | 'doorsturen' | 'nieuw' | 'snooze' | 'pin' | 'label'
  | 'ongelezen' | 'zoeken' | 'kaart' | 'sluiten' | 'verzenden'
  | 'reader-n' | 'reader-p' | 'reader-q' | 'reader-i'

export interface Toets {
  toets: string
  label: string
  actie: ToetsActie | { map: MailMap }
  /** Alleen in de kaart tonen als de reader open staat. */
  reader?: boolean
}

export const TOETSEN: Toets[] = [
  { toets: 'j', label: 'Volgende mail', actie: 'volgende' },
  { toets: 'k', label: 'Vorige mail', actie: 'vorige' },
  { toets: 'o / Enter', label: 'Openen', actie: 'openen' },
  { toets: 'e', label: 'Archiveren', actie: 'archiveren' },
  { toets: '#', label: 'Verwijderen', actie: 'verwijderen' },
  { toets: 'r', label: 'Beantwoorden', actie: 'antwoord' },
  { toets: 'a', label: 'Allen beantwoorden', actie: 'allen' },
  { toets: 'f', label: 'Doorsturen', actie: 'doorsturen' },
  { toets: 'c', label: 'Nieuw bericht', actie: 'nieuw' },
  { toets: 'z', label: 'Snooze', actie: 'snooze' },
  { toets: 'p', label: 'Vastpinnen', actie: 'pin' },
  { toets: 'l', label: 'Label', actie: 'label' },
  { toets: 'u', label: 'Markeer ongelezen', actie: 'ongelezen' },
  { toets: '/', label: 'Zoeken', actie: 'zoeken' },
  { toets: 'g i', label: 'Naar Inbox', actie: { map: 'inbox' } },
  { toets: 'g s', label: 'Naar Verzonden', actie: { map: 'verzonden' } },
  { toets: 'n', label: 'Volgend bericht in gesprek', actie: 'reader-n', reader: true },
  { toets: 'p', label: 'Vorig bericht in gesprek', actie: 'reader-p', reader: true },
  { toets: 'q', label: 'Citaat tonen', actie: 'reader-q', reader: true },
  { toets: 'i', label: 'Afbeeldingen laden', actie: 'reader-i', reader: true },
  { toets: 'Cmd Enter', label: 'Verzenden', actie: 'verzenden' },
  { toets: 'Esc', label: 'Sluiten', actie: 'sluiten' },
  { toets: '?', label: 'Deze kaart', actie: 'kaart' },
]

const SEQUENTIE_MS = 1200

export interface ToetsGebeurtenis {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  target?: unknown
}

export interface ToetsDoelInfo {
  tagName?: string
  isContentEditable?: boolean
  closest?: (selector: string) => unknown
}

/** In een invoerveld, editor of open dialoog laten we de toetsen met rust. */
export function isInvoerDoel(target: unknown): boolean {
  const el = target as ToetsDoelInfo | null | undefined
  if (!el) return false
  const tag = (el.tagName || '').toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  if (typeof el.closest === 'function') {
    if (el.closest('[contenteditable="true"]') || el.closest('[role="dialog"]') || el.closest('[data-toetsen="uit"]')) return true
  }
  return false
}

export function heeftOpenDialoog(doc: { querySelector?: (s: string) => unknown } | undefined): boolean {
  if (!doc?.querySelector) return false
  return !!doc.querySelector('[role="dialog"][data-state="open"]')
}

export interface ToetsUitkomst {
  actie: ToetsActie | { map: MailMap } | null
  /** De toets is verwerkt (ook een `g` die op zijn vervolg wacht); voorkom het browser-gedrag. */
  verwerkt: boolean
}

/**
 * Toetsen naar acties, met de `g`-sequenties als tussenstand. Zuiver, zodat de
 * tests hem zonder DOM kunnen draaien: de hook eromheen levert het event en
 * bewaart de sequentie-stand.
 */
export class ToetsVerwerker {
  private wachtOpG: number | null = null

  verwerk(e: ToetsGebeurtenis, opties: { readerOpen: boolean; nu?: number }): ToetsUitkomst {
    const nu = opties.nu ?? Date.now()
    if (e.altKey) return { actie: null, verwerkt: false }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') return { actie: 'verzenden', verwerkt: true }
    if (e.metaKey || e.ctrlKey) return { actie: null, verwerkt: false }

    const inSequentie = this.wachtOpG !== null && nu - this.wachtOpG < SEQUENTIE_MS
    this.wachtOpG = null
    if (inSequentie) {
      if (e.key === 'i') return { actie: { map: 'inbox' }, verwerkt: true }
      if (e.key === 's') return { actie: { map: 'verzonden' }, verwerkt: true }
      return { actie: null, verwerkt: false }
    }

    switch (e.key) {
      case 'g': this.wachtOpG = nu; return { actie: null, verwerkt: true }
      case 'j': return { actie: 'volgende', verwerkt: true }
      case 'k': return { actie: 'vorige', verwerkt: true }
      case 'o': case 'Enter': return { actie: 'openen', verwerkt: true }
      case 'e': return { actie: 'archiveren', verwerkt: true }
      case '#': return { actie: 'verwijderen', verwerkt: true }
      case 'r': return { actie: 'antwoord', verwerkt: true }
      case 'a': return { actie: 'allen', verwerkt: true }
      case 'f': return { actie: 'doorsturen', verwerkt: true }
      case 'c': return { actie: 'nieuw', verwerkt: true }
      case 'z': return { actie: 'snooze', verwerkt: true }
      case 'l': return { actie: 'label', verwerkt: true }
      case 'u': return { actie: 'ongelezen', verwerkt: true }
      case '/': return { actie: 'zoeken', verwerkt: true }
      case '?': return { actie: 'kaart', verwerkt: true }
      case 'Escape': return { actie: 'sluiten', verwerkt: true }
      // p is pin in de lijst en vorig bericht in de reader; de reader-toetsen
      // gelden alleen als er een gesprek open staat.
      case 'p': return { actie: opties.readerOpen ? 'reader-p' : 'pin', verwerkt: true }
      case 'n': return opties.readerOpen ? { actie: 'reader-n', verwerkt: true } : { actie: null, verwerkt: false }
      case 'q': return opties.readerOpen ? { actie: 'reader-q', verwerkt: true } : { actie: null, verwerkt: false }
      case 'i': return opties.readerOpen ? { actie: 'reader-i', verwerkt: true } : { actie: null, verwerkt: false }
      default: return { actie: null, verwerkt: false }
    }
  }
}

/**
 * De reader exporteert zijn acties (n/p/q/i); de vorm ligt bij de reader. We
 * accepteren een map op letter, een lijst met {toets, actie} of een object
 * met benoemde functies, zodat de shell niet breekt op een detail daar.
 */
export function roepReaderActie(acties: unknown, letter: 'n' | 'p' | 'q' | 'i'): boolean {
  if (!acties) return false
  const namen: Record<typeof letter, string[]> = {
    n: ['n', 'volgende', 'volgendBericht', 'next'],
    p: ['p', 'vorige', 'vorigBericht', 'prev', 'previous'],
    q: ['q', 'citaat', 'toggleCitaat', 'quote'],
    i: ['i', 'afbeeldingen', 'laadAfbeeldingen', 'images'],
  }
  if (Array.isArray(acties)) {
    for (const rij of acties as Array<Record<string, unknown>>) {
      const toets = String(rij.toets ?? rij.key ?? '')
      if (toets !== letter) continue
      const fn = rij.actie ?? rij.fn ?? rij.handler
      if (typeof fn === 'function') { (fn as () => void)(); return true }
    }
    return false
  }
  if (typeof acties === 'object') {
    const obj = acties as Record<string, unknown>
    for (const naam of namen[letter]) {
      const fn = obj[naam]
      if (typeof fn === 'function') { (fn as () => void)(); return true }
    }
  }
  return false
}
