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
