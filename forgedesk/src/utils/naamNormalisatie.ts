/** Nederlandse tussenvoegsels die niet gecapitaliseerd worden behalve aan het begin van een naam. */
const TUSSENVOEGSELS = new Set([
  'de', 'den', 'der', 'des', 'het', 'in', "'t", 'op', 'ten', 'ter', 'te', 'van', 'von', 'voor',
])

/**
 * Normaliseert een Nederlandse naam:
 * - Trimt whitespace en comprimeert dubbele spaties.
 * - Capitaliseert eerste letter van elk woord (rest lowercase).
 * - Tussenvoegsels (van, de, der, ten, ...) blijven lowercase, behalve als ze het eerste woord zijn.
 *
 * Voorbeelden:
 *   "yvonne albers"      -> "Yvonne Albers"
 *   "  jan  de  vries  " -> "Jan de Vries"
 *   "anna van der berg"  -> "Anna van der Berg"
 *   "JAN"                -> "Jan"
 *   ""                   -> ""
 */
export function normaliseerNaam(input: string): string {
  if (!input) return ''
  const woorden = input.trim().split(/\s+/).filter(Boolean)
  if (woorden.length === 0) return ''
  return woorden
    .map((w, i) => {
      const lower = w.toLowerCase()
      if (i > 0 && TUSSENVOEGSELS.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}
