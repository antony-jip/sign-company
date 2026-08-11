// Handtekeningen zijn jarenlang platte tekst geweest en worden nu ook als HTML
// opgeslagen. Beide vormen moeten blijven werken: bestaande gebruikers hebben
// tekst met regeleinden, nieuwe krijgen opmaak. Dit bestand is de enige plek
// die beslist hoe een opgeslagen handtekening naar HTML gaat.

const TOEGESTANE_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'A', 'BR', 'P', 'DIV', 'SPAN',
  'UL', 'OL', 'LI', 'IMG', 'FONT', 'H3', 'H4', 'SMALL',
])

const TOEGESTANE_ATTRIBUTEN: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
  IMG: new Set(['src', 'alt', 'width', 'height', 'style']),
  FONT: new Set(['color', 'size', 'face']),
}

const ALGEMENE_ATTRIBUTEN = new Set(['style'])

// Alleen eigenschappen die een handtekening nodig heeft. Alles wat kan
// positioneren of overlappen blijft eruit.
const TOEGESTANE_STIJLEN = new Set([
  'color', 'background-color', 'font-size', 'font-weight', 'font-style',
  'font-family', 'text-decoration', 'text-align', 'max-width', 'max-height',
  'width', 'height', 'margin', 'margin-top', 'margin-bottom', 'line-height',
])

export function bevatOpmaak(waarde: string): boolean {
  return /<[a-z][\s\S]*>/i.test(waarde)
}

function escapeHtml(waarde: string): string {
  return waarde
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function schoonStijl(stijl: string): string {
  return stijl
    .split(';')
    .map((deel) => deel.trim())
    .filter(Boolean)
    .filter((deel) => {
      const naam = deel.split(':')[0]?.trim().toLowerCase()
      if (!naam || !TOEGESTANE_STIJLEN.has(naam)) return false
      // url() en expression() horen niet in een handtekening thuis.
      return !/url\s*\(|expression\s*\(/i.test(deel)
    })
    .join('; ')
}

function veiligeHref(href: string): string | null {
  const schoon = href.trim()
  if (/^(https?:|mailto:|tel:)/i.test(schoon)) return schoon
  return null
}

function veiligeSrc(src: string): string | null {
  const schoon = src.trim()
  if (/^https?:/i.test(schoon)) return schoon
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(schoon)) return schoon
  return null
}

/**
 * Strip alles wat niet in een handtekening hoort. Bewust een allowlist: bij een
 * blocklist glipt er vroeg of laat iets doorheen.
 */
export function schoonHandtekeningHtml(html: string): string {
  if (typeof DOMParser === 'undefined') {
    // Geen DOM beschikbaar (server of test): dan liever platte tekst tonen dan
    // ongecontroleerde HTML doorlaten.
    return escapeHtml(html)
  }

  const doc = new DOMParser().parseFromString(`<div id="wortel">${html}</div>`, 'text/html')
  const wortel = doc.getElementById('wortel')
  if (!wortel) return ''

  const loop = (node: Element) => {
    for (const kind of Array.from(node.children)) {
      if (!TOEGESTANE_TAGS.has(kind.tagName)) {
        // Inhoud behouden, het omhulsel weghalen.
        const tekst = doc.createTextNode(kind.textContent || '')
        kind.replaceWith(tekst)
        continue
      }

      for (const attr of Array.from(kind.attributes)) {
        const naam = attr.name.toLowerCase()
        const toegestaan =
          TOEGESTANE_ATTRIBUTEN[kind.tagName]?.has(naam) || ALGEMENE_ATTRIBUTEN.has(naam)
        if (!toegestaan) {
          kind.removeAttribute(attr.name)
          continue
        }
        if (naam === 'style') {
          const schoon = schoonStijl(attr.value)
          if (schoon) kind.setAttribute('style', schoon)
          else kind.removeAttribute('style')
        }
        if (naam === 'href') {
          const veilig = veiligeHref(attr.value)
          if (veilig) {
            kind.setAttribute('href', veilig)
            kind.setAttribute('target', '_blank')
            kind.setAttribute('rel', 'noopener noreferrer')
          } else {
            kind.removeAttribute('href')
          }
        }
        if (naam === 'src') {
          const veilig = veiligeSrc(attr.value)
          if (veilig) kind.setAttribute('src', veilig)
          else kind.remove()
        }
      }

      loop(kind)
    }
  }

  loop(wortel)
  return wortel.innerHTML
}

/**
 * Een opgeslagen handtekening naar HTML dat in een mail mag. Platte tekst
 * behoudt zijn regeleinden, HTML wordt geschoond.
 */
export function handtekeningNaarHtml(waarde: string | null | undefined): string {
  const tekst = (waarde || '').trim()
  if (!tekst) return ''
  if (bevatOpmaak(tekst)) return schoonHandtekeningHtml(tekst)
  return escapeHtml(tekst).replace(/\n/g, '<br />')
}

/**
 * Alleen http(s) toestaan achter de handtekening-afbeelding: een
 * javascript:-URL uit een instellingenveld mag nooit in uitgaande mail belanden.
 */
export function veiligeAfbeeldingLink(link?: string | null): string {
  const schoon = (link || '').trim()
  if (!schoon) return ''
  try {
    const url = new URL(schoon)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

// De instelling is een breedte, geen hoogte: een handtekening-banner is breed
// (1200x331 is typisch) en dan bepaalt de breedte wat de ontvanger ziet. Een
// hoogte-instelling deed bij zo'n verhouding niets voorspelbaars.
// De ondergrens staat bewust op 400: profielen hebben nog oude hoogte-waarden
// (64, 200, 208) opgeslagen die nu als breedte gelezen worden. Klemmen op 400
// maakt die handtekeningen meteen leesbaar zonder database-migratie.
export const HANDTEKENING_BREEDTE_STANDAARD = 480
export const HANDTEKENING_BREEDTE_MIN = 400
export const HANDTEKENING_BREEDTE_MAX = 700

export function handtekeningBreedte(waarde?: number | null): number {
  const getal = Number(waarde)
  if (!Number.isFinite(getal) || getal <= 0) return HANDTEKENING_BREEDTE_STANDAARD
  return Math.min(HANDTEKENING_BREEDTE_MAX, Math.max(HANDTEKENING_BREEDTE_MIN, Math.round(getal)))
}

/**
 * De <img> voor de handtekening-afbeelding, met een link eromheen als de
 * gebruiker die heeft ingesteld. Eén plek, zodat elke mail (offerte, project,
 * los bericht, antwoord) dezelfde klikbare banner krijgt.
 */
export function handtekeningAfbeeldingHtml({
  url,
  link,
  breedte,
  extraStyle = '',
}: {
  url?: string | null
  link?: string | null
  breedte?: number | null
  extraStyle?: string
}): string {
  const bron = veiligeSrc((url || '').trim())
  if (!bron) return ''
  const maat = handtekeningBreedte(breedte)
  // max-height even groot als de breedte: vangt een staande foto op zonder de
  // banner te raken, die is altijd breder dan hoog.
  const img = `<img src="${escapeHtml(bron)}" alt="" style="max-width:${maat}px;max-height:${maat}px;height:auto;object-fit:contain;border:0;${extraStyle}" />`
  const href = veiligeAfbeeldingLink(link)
  return href
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;border:0;">${img}</a>`
    : img
}
