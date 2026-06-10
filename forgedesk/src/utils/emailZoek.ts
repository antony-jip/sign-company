export interface EmailZoekFilters {
  tekst: string
  van?: string
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

/**
 * Zoekoperators in de zoekbalk: `van:jan` (afzender), `na:2024` /
 * `voor:2025-06` (datumbereik), `bijlage:ja`. Engels werkt ook
 * (from/after/before/has). De rest van de tekst gaat door full-text search.
 */
export function parseZoekQuery(q: string): EmailZoekFilters {
  const filters: EmailZoekFilters = { tekst: '' }
  const rest: string[] = []
  for (const token of q.trim().split(/\s+/)) {
    const m = token.match(/^(van|from|voor|before|na|after|bijlage|has):(.+)$/i)
    if (!m) { rest.push(token); continue }
    const sleutel = m[1].toLowerCase()
    const waarde = m[2]
    if (sleutel === 'van' || sleutel === 'from') filters.van = waarde
    else if (sleutel === 'voor' || sleutel === 'before') filters.voor = normaliseerZoekDatum(waarde)
    else if (sleutel === 'na' || sleutel === 'after') filters.na = normaliseerZoekDatum(waarde)
    else if (sleutel === 'bijlage' || sleutel === 'has') filters.bijlage = !/^(nee|no|false)$/i.test(waarde)
  }
  filters.tekst = rest.join(' ')
  return filters
}
