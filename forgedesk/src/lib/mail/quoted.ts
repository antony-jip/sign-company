/**
 * Splitst de html van een mail in het eigen deel en het geciteerde deel.
 * Pure stringfunctie: dezelfde regels draaien in api/read-email en
 * api/prefetch-email-bodies (daar gekopieerd, api importeert niet uit src).
 *
 * Herkend, in deze volgorde van zekerheid:
 * - Gmail: <div class="gmail_quote">
 * - Outlook web: id divRplyFwdMsg of appendonsend
 * - "-----Original Message-----" / "-----Oorspronkelijk bericht-----"
 * - "Van:"/"From:"-regel gevolgd binnen 200 tekens door "Verzonden:"/"Sent:" (Outlook)
 * - "Op ... schreef ...:" / "On ... wrote:" (Gmail, Thunderbird)
 * - "Op ... heeft ... geschreven:" (Apple Mail NL)
 * - <blockquote> als laatste vangnet
 */

const SPECIFIEKE_MARKERS: RegExp[] = [
  /<div[^>]*\bclass\s*=\s*["'][^"']*\bgmail_quote\b/i,
  /<div[^>]*\bid\s*=\s*["']divRplyFwdMsg["']/i,
  /<div[^>]*\bid\s*=\s*["']appendonsend["']/i,
  /<hr[^>]*\bid\s*=\s*["']stopSpelling["']/i,
  /-{2,}\s*(?:Original Message|Oorspronkelijk bericht|Ursprüngliche Nachricht|Message d'origine)\s*-{2,}/i,
  /(?:^|>|\n)\s*(?:<(?:b|strong|span)[^>]*>\s*)*(?:From|Van)\s*(?:<\/(?:b|strong|span)>\s*)*:[\s\S]{0,200}?(?:Sent|Verzonden|Date|Datum)\s*(?:<\/(?:b|strong|span)>\s*)*:/i,
  /\bOp\s[\s\S]{4,200}?\sschreef\s[\s\S]{0,300}?:/i,
  /\bOp\s[\s\S]{4,200}?\sheeft\s[\s\S]{0,300}?geschreven\s*:/i,
  /\bOn\s[\s\S]{4,200}?\swrote\s*:/i,
]

const BLOCKQUOTE = /<blockquote\b/i

const BLOK_TAGS = ['<div', '<p', '<blockquote', '<table', '<hr']
const IS_BLOK_TAG = /^<(?:div|p|blockquote|table|hr)[\s>/]/i
const OMSLUITENDE_OPENER = /<(?:div|blockquote|table|tbody|tr|td|th|section)\b[^>]*>\s*$/i
const MAX_TERUG = 400

function eersteTreffer(html: string, patronen: RegExp[]): number {
  let beste = -1
  for (const patroon of patronen) {
    const m = patroon.exec(html)
    if (!m) continue
    // De From/Van-regex kan met een '>' of newline beginnen; het citaat start erna.
    let index = m.index
    if (/^[>\n]/.test(m[0])) index += 1
    if (beste === -1 || index < beste) beste = index
  }
  return beste
}

/** Schuift het knippunt terug naar het begin van het omsluitende blok, zodat de eigen tekst netjes afsluit. */
function naarBlokStart(html: string, index: number): number {
  let pos = index
  if (!IS_BLOK_TAG.test(html.slice(index, index + 12))) {
    // Het dichtstbijzijnde blok vóór de marker, niet het vroegste: anders
    // knippen we de eigen tekst mee.
    let dichtstbij = -1
    for (const tag of BLOK_TAGS) {
      const q = html.lastIndexOf(tag, index)
      if (q === -1 || index - q > MAX_TERUG) continue
      if (!IS_BLOK_TAG.test(html.slice(q, q + 12))) continue
      if (q > dichtstbij) dichtstbij = q
    }
    if (dichtstbij !== -1) pos = dichtstbij
  }
  // Staat direct vóór dat blok nog een openende container (Outlook zet zijn
  // scheidingslijn op een div om de kopregel heen), dan hoort die erbij.
  for (;;) {
    const voor = html.slice(Math.max(0, pos - MAX_TERUG), pos)
    const m = OMSLUITENDE_OPENER.exec(voor)
    if (!m) break
    pos -= m[0].length
  }
  return pos
}

function heeftTekst(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
}

export function splitsCitaat(html: string): { eigen: string; geciteerd: string | null } {
  if (!html) return { eigen: html || '', geciteerd: null }
  let index = eersteTreffer(html, SPECIFIEKE_MARKERS)
  if (index === -1) {
    const bq = BLOCKQUOTE.exec(html)
    index = bq ? bq.index : -1
  }
  if (index === -1) return { eigen: html, geciteerd: null }
  const knip = naarBlokStart(html, index)
  const eigen = html.slice(0, knip)
  const geciteerd = html.slice(knip)
  // Een mail die alleen uit een citaat bestaat (doorgestuurd zonder tekst)
  // laten we heel, anders staat er een lege mail met een dichtgeklapt citaat.
  if (!heeftTekst(eigen)) return { eigen: html, geciteerd: null }
  return { eigen, geciteerd }
}
