export interface EmailZoekFilters {
  tekst: string
  /** Losse termen uit `tekst`; een term met spaties was een citaat. */
  termen: string[]
  van?: string
  aan?: string
  onderwerp?: string
  map?: string
  gelezen?: boolean
  voor?: string
  na?: string
  bijlage?: boolean
}

function normaliseerZoekDatum(w: string): string | undefined {
  if (/^\d{4}$/.test(w)) return `${w}-01-01`
  if (/^\d{4}-\d{2}$/.test(w)) return `${w}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(w)) return w
  return undefined
}

const MAP_ALIASSEN: Record<string, string> = {
  inbox: 'inbox',
  postvak: 'inbox',
  verzonden: 'verzonden',
  sent: 'verzonden',
  archief: 'archief',
  archive: 'archief',
  concepten: 'concepten',
  drafts: 'concepten',
  prullenbak: 'prullenbak',
  trash: 'prullenbak',
}

/**
 * Splitst op spaties maar houdt "tussen aanhalingstekens" bij elkaar, zodat
 * `onderwerp:"proef offerte"` en een los citaat allebei één term blijven.
 */
function tokeniseer(q: string): string[] {
  const tokens: string[] = []
  // De operator-variant staat vooraan: anders knipt `\S+` `onderwerp:"proef
  // offerte"` alsnog op de spatie doormidden.
  const regex = /(\w+:)?"([^"]*)"|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(q)) !== null) {
    tokens.push(m[2] !== undefined ? `${m[1] ?? ''}"${m[2]}"` : m[3])
  }
  return tokens
}

function stripQuotes(w: string): string {
  return w.replace(/^"(.*)"$/s, '$1').trim()
}

/**
 * Zoekoperators in de zoekbalk: `van:jan` (afzender), `aan:piet` (ontvanger),
 * `onderwerp:offerte`, `map:verzonden`, `is:ongelezen`, `na:2024` /
 * `voor:2025-06` (datumbereik) en `bijlage:ja`. Engels werkt ook
 * (from/to/subject/in/is/after/before/has). De rest van de tekst gaat door
 * full-text search; een deel tussen aanhalingstekens blijft één term.
 */
export function parseZoekQuery(q: string): EmailZoekFilters {
  const filters: EmailZoekFilters = { tekst: '', termen: [] }
  const rest: string[] = []
  for (const token of tokeniseer(q.trim())) {
    const m = token.match(/^(van|from|aan|to|onderwerp|subject|map|in|is|voor|before|na|after|bijlage|has):(.+)$/i)
    if (!m) { rest.push(token); continue }
    const sleutel = m[1].toLowerCase()
    const waarde = stripQuotes(m[2])
    if (!waarde) continue
    if (sleutel === 'van' || sleutel === 'from') filters.van = waarde
    else if (sleutel === 'aan' || sleutel === 'to') filters.aan = waarde
    else if (sleutel === 'onderwerp' || sleutel === 'subject') filters.onderwerp = waarde
    else if (sleutel === 'map' || sleutel === 'in') filters.map = MAP_ALIASSEN[waarde.toLowerCase()]
    else if (sleutel === 'is') {
      if (/^(ongelezen|unread|nieuw)$/i.test(waarde)) filters.gelezen = false
      else if (/^(gelezen|read)$/i.test(waarde)) filters.gelezen = true
    }
    else if (sleutel === 'voor' || sleutel === 'before') filters.voor = normaliseerZoekDatum(waarde)
    else if (sleutel === 'na' || sleutel === 'after') filters.na = normaliseerZoekDatum(waarde)
    else if (sleutel === 'bijlage' || sleutel === 'has') filters.bijlage = !/^(nee|no|false)$/i.test(waarde)
  }
  filters.termen = rest.map(stripQuotes).filter(Boolean)
  filters.tekst = rest.map(stripQuotes).join(' ').trim()
  return filters
}

/**
 * Bouwt een tsquery. Losse woorden matchen op prefix (`offert` vindt
 * `offerte`), een citaat blijft een woordvolgorde (`<->`). Tekens met
 * betekenis in tsquery worden gestript; die horen niet uit een zoekbalk te
 * komen.
 */
export function bouwTsQuery(termen: string[]): string {
  const schoon = (w: string) => w.replace(/[&|!():*'"\\]/g, '').trim()
  const delen: string[] = []
  for (const term of termen) {
    const woorden = schoon(term).split(/\s+/).filter(Boolean)
    if (woorden.length === 0) continue
    delen.push(woorden.length === 1 ? `${woorden[0]}:*` : woorden.join(' <-> '))
  }
  return delen.join(' & ')
}
