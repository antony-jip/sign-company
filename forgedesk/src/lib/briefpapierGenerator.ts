/**
 * Briefpapier & Vervolgpapier auto-generatie
 * Genereert SVG briefpapier op basis van bedrijfsgegevens en huisstijl,
 * converteert naar PNG voor gebruik als PDF-achtergrond.
 */

export interface BriefpapierConfig {
  bedrijfsnaam: string
  adres: string
  telefoon: string
  email: string
  website: string
  kvkNummer: string
  btwNummer: string
  iban: string
  logoDataUrl?: string
  primaireKleur: string
  secundaireKleur: string
  accentKleur: string
  type: 'briefpapier' | 'vervolgpapier'
}

// Escape XML special characters for safe SVG embedding
function escXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Lighten a hex color by mixing with white
function lightenHex(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

export function generateBriefpapierSVG(config: BriefpapierConfig): string {
  const {
    bedrijfsnaam, adres, telefoon, email, website,
    kvkNummer, btwNummer, iban,
    logoDataUrl, primaireKleur, accentKleur,
    type,
  } = config

  const isVervolg = type === 'vervolgpapier'
  const accentLight = lightenHex(accentKleur, 0.85)

  // Footer text parts
  const footerParts: string[] = []
  if (kvkNummer) footerParts.push(`KvK: ${kvkNummer}`)
  if (btwNummer) footerParts.push(`BTW: ${btwNummer}`)
  if (iban) footerParts.push(`IBAN: ${iban}`)
  if (website) footerParts.push(website)
  const footerText = footerParts.join('  |  ')

  if (isVervolg) {
    return generateVervolgpapierSVG({
      bedrijfsnaam, logoDataUrl, primaireKleur, accentKleur, accentLight, footerText,
    })
  }

  return generateEerstePaginaSVG({
    bedrijfsnaam, adres, telefoon, email, website,
    logoDataUrl, primaireKleur, accentKleur, accentLight, footerText,
  })
}

function generateEerstePaginaSVG(params: {
  bedrijfsnaam: string; adres: string; telefoon: string; email: string; website: string
  logoDataUrl?: string; primaireKleur: string; accentKleur: string; accentLight: string; footerText: string
}): string {
  const { bedrijfsnaam, adres, telefoon, email,
    logoDataUrl, primaireKleur, accentKleur, accentLight, footerText } = params

  // Contact info lines (right-aligned)
  const contactLines: string[] = []
  if (adres) contactLines.push(adres)
  if (telefoon) contactLines.push(telefoon)
  if (email) contactLines.push(email)

  const logoBlock = logoDataUrl
    ? `<image x="15" y="10" width="35" height="20" href="${escXml(logoDataUrl)}" preserveAspectRatio="xMidYMid meet" />`
    : ''

  const nameX = logoDataUrl ? 53 : 15

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210mm" height="297mm">
  <rect width="210" height="297" fill="#ffffff"/>

  <!-- Zijbalk accent lijn -->
  <rect x="0" y="0" width="3" height="297" fill="${escXml(accentKleur)}"/>

  <!-- Header achtergrond -->
  <rect x="3" y="0" width="207" height="38" fill="${escXml(accentLight)}"/>

  <!-- Logo -->
  ${logoBlock}

  <!-- Bedrijfsnaam -->
  <text x="${nameX}" y="24" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" fill="${escXml(primaireKleur)}">${escXml(bedrijfsnaam)}</text>

  <!-- Contact gegevens rechts -->
  ${contactLines.map((line, i) =>
    `<text x="198" y="${15 + i * 5}" font-family="Arial, Helvetica, sans-serif" font-size="3.2" fill="#666666" text-anchor="end">${escXml(line)}</text>`
  ).join('\n  ')}

  <!-- Header lijn -->
  <line x1="10" y1="38" x2="200" y2="38" stroke="${escXml(primaireKleur)}" stroke-width="0.4"/>

  <!-- Footer lijn -->
  <line x1="10" y1="283" x2="200" y2="283" stroke="#cccccc" stroke-width="0.3"/>

  <!-- Footer tekst -->
  <text x="105" y="289" font-family="Arial, Helvetica, sans-serif" font-size="2.8" fill="#999999" text-anchor="middle">${escXml(footerText)}</text>

  <!-- Paginanummer -->
  <text x="105" y="293" font-family="Arial, Helvetica, sans-serif" font-size="2.5" fill="#bbbbbb" text-anchor="middle">Pagina 1</text>
</svg>`
}

function generateVervolgpapierSVG(params: {
  bedrijfsnaam: string; logoDataUrl?: string; primaireKleur: string
  accentKleur: string; accentLight: string; footerText: string
}): string {
  const { bedrijfsnaam, logoDataUrl, primaireKleur, accentKleur, footerText } = params

  const logoBlock = logoDataUrl
    ? `<image x="10" y="5" width="18" height="10" href="${escXml(logoDataUrl)}" preserveAspectRatio="xMidYMid meet" />`
    : ''

  const nameX = logoDataUrl ? 30 : 10

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210mm" height="297mm">
  <rect width="210" height="297" fill="#ffffff"/>

  <!-- Zijbalk accent lijn (continuiteit met pagina 1) -->
  <rect x="0" y="0" width="3" height="297" fill="${escXml(accentKleur)}"/>

  <!-- Compacte header -->
  ${logoBlock}
  <text x="${nameX}" y="12" font-family="Arial, Helvetica, sans-serif" font-size="6" font-weight="bold" fill="${escXml(primaireKleur)}">${escXml(bedrijfsnaam)}</text>

  <!-- Dunne header lijn -->
  <line x1="10" y1="18" x2="200" y2="18" stroke="${escXml(primaireKleur)}" stroke-width="0.3" opacity="0.5"/>

  <!-- Footer lijn -->
  <line x1="10" y1="283" x2="200" y2="283" stroke="#cccccc" stroke-width="0.3"/>

  <!-- Footer tekst -->
  <text x="105" y="289" font-family="Arial, Helvetica, sans-serif" font-size="2.8" fill="#999999" text-anchor="middle">${escXml(footerText)}</text>
</svg>`
}

/**
 * Convert SVG string to PNG Blob via canvas (A4 @ 300 DPI = 2480x3508px)
 */
export function svgToPng(svgString: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const width = 2480
    const height = 3508

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas 2D context niet beschikbaar'))
      return
    }

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob mislukt'))
        },
        'image/png'
      )
    }
    img.onerror = () => reject(new Error('SVG afbeelding kon niet worden geladen'))

    const encoded = btoa(unescape(encodeURIComponent(svgString)))
    img.src = `data:image/svg+xml;base64,${encoded}`
  })
}
