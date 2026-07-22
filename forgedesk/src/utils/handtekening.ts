/**
 * Bouwt de <img> voor de handtekening-afbeelding en hangt er een link omheen
 * als de gebruiker die heeft ingesteld. Eén plek, zodat elke mail (offerte,
 * project, los bericht, antwoord) dezelfde klikbare banner krijgt.
 */

const attr = (waarde: string) =>
  waarde.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Alleen http(s) toestaan: een javascript:-URL uit een instellingenveld mag
 * nooit in uitgaande mail belanden.
 */
export function veiligeLink(link?: string): string {
  const schoon = (link || '').trim()
  if (!schoon) return ''
  try {
    const url = new URL(schoon)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export function handtekeningAfbeeldingHtml({
  url,
  link,
  hoogte = 64,
  maxBreedte,
  extraStyle = '',
}: {
  url?: string
  link?: string
  hoogte?: number
  maxBreedte?: number
  extraStyle?: string
}): string {
  const bron = (url || '').trim()
  if (!bron) return ''
  const breedte = maxBreedte ?? Math.round(hoogte * 3.5)
  const img = `<img src="${attr(bron)}" alt="" style="max-height:${hoogte}px;max-width:${breedte}px;object-fit:contain;border:0;${extraStyle}" />`
  const href = veiligeLink(link)
  return href
    ? `<a href="${attr(href)}" target="_blank" rel="noopener" style="text-decoration:none;border:0;">${img}</a>`
    : img
}
