/**
 * Zoekchips boven de lijst. Elke chip vertaalt naar een operator die
 * `parseZoekQuery` (src/utils/emailZoek.ts) al kent; klant en project hebben
 * geen operator en lopen via de koppelingen. Zuiver, zodat de vertaling te
 * testen is.
 */
export type ChipSoort = 'van' | 'aan' | 'bijlage' | 'datum' | 'klant' | 'project'

export type DatumBereik = 'vandaag' | 'week' | 'maand' | 'eigen'

export interface ZoekChip {
  soort: ChipSoort
  /** De waarde die de operator krijgt, of het id van klant/project. */
  waarde: string
  /** Wat de chip toont (klantnaam, "Deze week"). */
  label: string
  /** Bij datum eigen: tweede grens. */
  tot?: string
}

export const CHIP_LABEL: Record<ChipSoort, string> = {
  van: 'Van',
  aan: 'Aan',
  bijlage: 'Bijlage',
  datum: 'Datum',
  klant: 'Klant',
  project: 'Project',
}

export const DATUM_OPTIES: { id: DatumBereik; label: string }[] = [
  { id: 'vandaag', label: 'Vandaag' },
  { id: 'week', label: 'Deze week' },
  { id: 'maand', label: 'Deze maand' },
  { id: 'eigen', label: 'Eigen datum' },
]

function isoDag(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dag = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dag}`
}

export function datumChip(bereik: DatumBereik, nu = new Date(), eigen?: { van: string; tot?: string }): ZoekChip {
  const vandaag = new Date(nu); vandaag.setHours(0, 0, 0, 0)
  if (bereik === 'vandaag') return { soort: 'datum', waarde: isoDag(vandaag), label: 'Vandaag' }
  if (bereik === 'week') {
    const start = new Date(vandaag)
    const dag = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dag)
    return { soort: 'datum', waarde: isoDag(start), label: 'Deze week' }
  }
  if (bereik === 'maand') {
    const start = new Date(vandaag.getFullYear(), vandaag.getMonth(), 1)
    return { soort: 'datum', waarde: isoDag(start), label: 'Deze maand' }
  }
  const van = eigen?.van || isoDag(vandaag)
  const tot = eigen?.tot
  return { soort: 'datum', waarde: van, tot, label: tot ? `${van} tot ${tot}` : `vanaf ${van}` }
}

function quote(w: string): string {
  return /\s/.test(w) ? `"${w.replace(/"/g, '')}"` : w
}

/**
 * Chips plus vrije tekst naar één zoekstring in de bestaande operatortaal.
 * Klant en project zitten hier niet in: die lopen via `koppelingService`.
 */
export function chipsNaarQuery(tekst: string, chips: ZoekChip[]): string {
  const delen: string[] = []
  for (const chip of chips) {
    switch (chip.soort) {
      case 'van': delen.push(`from:${quote(chip.waarde)}`); break
      case 'aan': delen.push(`to:${quote(chip.waarde)}`); break
      case 'bijlage': delen.push('has:attachment'); break
      case 'datum': {
        delen.push(`after:${chip.waarde}`)
        if (chip.tot) delen.push(`before:${chip.tot}`)
        break
      }
      default: break
    }
  }
  const schoon = tekst.trim()
  if (schoon) delen.push(schoon)
  return delen.join(' ')
}

export function koppelChips(chips: ZoekChip[]): ZoekChip[] {
  return chips.filter((c) => c.soort === 'klant' || c.soort === 'project')
}

export function heeftZoekopdracht(tekst: string, chips: ZoekChip[]): boolean {
  return tekst.trim().length > 0 || chips.length > 0
}

/** Zelfde chip nog eens kiezen vervangt de vorige; van/aan mogen naast elkaar. */
export function voegChipToe(chips: ZoekChip[], chip: ZoekChip): ZoekChip[] {
  const enkelvoudig: ChipSoort[] = ['bijlage', 'datum', 'klant', 'project']
  const rest = enkelvoudig.includes(chip.soort) ? chips.filter((c) => c.soort !== chip.soort) : chips.filter((c) => !(c.soort === chip.soort && c.waarde === chip.waarde))
  return [...rest, chip]
}

export interface ZoekMailVelden {
  van: string
  aan: string
  datum: string
  bijlagen: number
  has_attachments?: boolean | null
  onderwerp: string
  body_text?: string | null
}

/**
 * Resultaten uit de koppelingen komen zonder serverfilter binnen; de andere
 * chips en de vrije tekst zeven ze hier alsnog.
 */
export function voldoetAanChips(mail: ZoekMailVelden, tekst: string, chips: ZoekChip[]): boolean {
  for (const chip of chips) {
    const w = chip.waarde.toLowerCase()
    if (chip.soort === 'van' && !mail.van.toLowerCase().includes(w)) return false
    if (chip.soort === 'aan' && !mail.aan.toLowerCase().includes(w)) return false
    if (chip.soort === 'bijlage' && !(mail.bijlagen > 0 || mail.has_attachments)) return false
    if (chip.soort === 'datum') {
      const dag = mail.datum.slice(0, 10)
      if (dag < chip.waarde) return false
      if (chip.tot && dag > chip.tot) return false
    }
  }
  const termen = tekst.toLowerCase().split(/\s+/).filter(Boolean)
  if (termen.length === 0) return true
  const hooi = `${mail.onderwerp} ${mail.van} ${mail.aan} ${mail.body_text || ''}`.toLowerCase()
  return termen.every((t) => hooi.includes(t))
}
