import type { ComposerBijlage, ComposerDocument, EmailBody, EmailLijstItem, KoppelingSoort, Ontvanger } from '@/lib/mail/types'
import type { Email } from '@/types'
import { extractSenderEmail, extractSenderName, formatShortDate, lijktOpHtml, platteTekstNaarHtml } from '@/components/email/emailHelpers'

// ============================================================
// Pure helpers rond het ComposerDocument: bouwen uit een bron-mail,
// ontvangers parsen, velden invullen en het citaat splitsen. Geen DOM,
// zodat dit in de node-omgeving van vitest draait.
// ============================================================

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isGeldigEmail(adres: string): boolean {
  return EMAIL_REGEX.test(adres.trim())
}

/**
 * "Naam <a@b.nl>, c@d.nl; "Doe, Jan" <j@d.nl>" naar losse ontvangers.
 * Komma's binnen aanhalingstekens of haakjes splitsen niet.
 */
export function parseOntvangers(invoer: string): Ontvanger[] {
  const delen: string[] = []
  let huidig = ''
  let inQuote = false
  let inHaak = false
  for (const teken of invoer) {
    if (teken === '"') inQuote = !inQuote
    else if (teken === '<' && !inQuote) inHaak = true
    else if (teken === '>' && !inQuote) inHaak = false
    if ((teken === ',' || teken === ';' || teken === '\n') && !inQuote && !inHaak) {
      delen.push(huidig)
      huidig = ''
      continue
    }
    huidig += teken
  }
  delen.push(huidig)

  const uit: Ontvanger[] = []
  for (const deel of delen) {
    const stuk = deel.trim()
    if (!stuk) continue
    const match = stuk.match(/^(.*?)\s*<([^>]+)>\s*$/)
    if (match) {
      const naam = match[1].trim().replace(/^["'](.*)["']$/s, '$1').trim()
      const email = match[2].trim()
      uit.push({ email, naam: naam || undefined, bron: 'vrij' })
    } else {
      uit.push({ email: stuk.replace(/^["'](.*)["']$/s, '$1').trim(), bron: 'vrij' })
    }
  }
  return uit
}

/** Ontvangers als adresregel voor send-email: `Naam <a@b.nl>, c@d.nl`. */
export function ontvangersNaarString(lijst: Ontvanger[]): string {
  return lijst
    .map((o) => {
      const email = o.email.trim()
      const naam = (o.naam || '').trim()
      if (!naam || naam === email) return email
      // Naam tussen aanhalingstekens zodra er een komma of haakje in zit.
      const veilig = /[,;<>"]/.test(naam) ? `"${naam.replace(/"/g, '')}"` : naam
      return `${veilig} <${email}>`
    })
    .join(', ')
}

export function ontvangerLabel(o: Ontvanger): string {
  return (o.naam || '').trim() || o.email
}

// ─── Velden ──────────────────────────────────────────────────────

export type VeldWaarden = Partial<Record<'contactpersoon' | 'bedrijfsnaam' | 'project_naam' | 'offerte_nummer', string>> & Record<string, string | undefined>

export const INVOEGVELDEN: { sleutel: keyof VeldWaarden & string; label: string }[] = [
  { sleutel: 'contactpersoon', label: 'Contactpersoon' },
  { sleutel: 'bedrijfsnaam', label: 'Bedrijfsnaam' },
  { sleutel: 'project_naam', label: 'Projectnaam' },
  { sleutel: 'offerte_nummer', label: 'Offertenummer' },
]

/**
 * Vervangt `{{veld}}` door de waarde. Onbekend of leeg wordt een lege
 * string: er gaat nooit letterlijk `{{...}}` naar een klant.
 */
export function vulVelden(tekst: string, waarden: VeldWaarden): string {
  if (!tekst) return tekst
  return tekst.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, sleutel: string) => waarden[sleutel] ?? '')
}

// ─── Citaat ──────────────────────────────────────────────────────

const CITAAT_OPEN = '<div data-doen-citaat="1">'
const CITAAT_SLUIT = '</div>'

/** Het citaat leeft achteraan in document.html in een herkenbare wrapper. */
export function metCitaat(eigen: string, citaat: string): string {
  if (!citaat) return eigen
  return `${eigen}${CITAAT_OPEN}${citaat}${CITAAT_SLUIT}`
}

export function splitsCitaat(html: string): { eigen: string; citaat: string } {
  const idx = html.indexOf(CITAAT_OPEN)
  if (idx === -1) return { eigen: html, citaat: '' }
  const rest = html.slice(idx + CITAAT_OPEN.length)
  const einde = rest.lastIndexOf(CITAAT_SLUIT)
  return { eigen: html.slice(0, idx), citaat: einde === -1 ? rest : rest.slice(0, einde) }
}

/**
 * Inline base64-beelden uit het citaat halen: de ontvanger heeft het
 * origineel al, en de JSON-payload moet onder de Vercel-limiet blijven.
 */
function zonderInlineBeelden(html: string): string {
  return html.replace(
    /<img([^>]*)src="data:image\/[^"]*"([^>]*)>/gi,
    '<img$1src=""$2 alt="[afbeelding]" style="display:none">',
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

type BronMail = EmailLijstItem | Email

function bronHtml(bron: BronMail, body: EmailBody | null): string {
  if (body?.html) return zonderInlineBeelden(`${body.html}${body.quotedHtml || ''}`)
  if (body?.tekst) return platteTekstNaarHtml(body.tekst)
  const inhoud = 'inhoud' in bron ? bron.inhoud : ''
  if (inhoud) return lijktOpHtml(inhoud) ? zonderInlineBeelden(inhoud) : platteTekstNaarHtml(inhoud)
  return bron.body_text ? platteTekstNaarHtml(bron.body_text) : ''
}

export function bouwAntwoordCitaat(bron: BronMail, body: EmailBody | null): string {
  const inhoud = bronHtml(bron, body)
  if (!inhoud) return ''
  return `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:0;color:#666;">` +
    `<p>Op ${escapeHtml(formatShortDate(bron.datum))} schreef ${escapeHtml(extractSenderName(bron.van))}:</p>${inhoud}</div>`
}

export function bouwDoorstuurCitaat(bron: BronMail, body: EmailBody | null): string {
  const inhoud = bronHtml(bron, body)
  const datum = new Date(bron.datum)
  const datumTekst = isNaN(datum.getTime()) ? bron.datum : datum.toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return `<br><br><div style="color:#666;">` +
    `<p>---------- Doorgestuurd bericht ----------<br>` +
    `Van: ${escapeHtml(bron.van)}<br>` +
    `Datum: ${escapeHtml(datumTekst)}<br>` +
    `Onderwerp: ${escapeHtml(bron.onderwerp || '')}<br>` +
    `Aan: ${escapeHtml(bron.aan || '')}</p>${inhoud}</div>`
}

// ─── Documenten ──────────────────────────────────────────────────

export function documentVoorNieuw(initieel?: Partial<ComposerDocument>): ComposerDocument {
  return {
    modus: 'nieuw',
    aan: [],
    cc: [],
    bcc: [],
    onderwerp: '',
    html: '',
    handtekening: true,
    bijlagen: [],
    opvolgen: false,
    koppelingen: [],
    ...initieel,
  }
}

function metPrefix(onderwerp: string, prefix: 'Re: ' | 'Fwd: '): string {
  const schoon = (onderwerp || '').trim()
  const test = prefix === 'Re: ' ? /^re\s*:/i : /^(fwd?|fw)\s*:/i
  return test.test(schoon) ? schoon : `${prefix}${schoon}`
}

function eigenAdresSet(eigenAdres?: string | null): Set<string> {
  const set = new Set<string>()
  if (eigenAdres) set.add(eigenAdres.trim().toLowerCase())
  return set
}

/**
 * Allen beantwoorden houdt iedereen uit Aan en Cc in het gesprek. De
 * afzender staat al in Aan en het eigen adres valt af, anders mail je
 * jezelf bij elk antwoord.
 */
export function ontvangersVoorAllen(bron: BronMail, eigenAdres?: string | null): Ontvanger[] {
  const gezien = eigenAdresSet(eigenAdres)
  gezien.add(extractSenderEmail(bron.van).trim().toLowerCase())
  const uit: Ontvanger[] = []
  const kandidaten = [...(bron.to_addresses || []), ...(bron.cc_addresses || [])]
  if (kandidaten.length === 0 && bron.aan) {
    for (const o of parseOntvangers(bron.aan)) kandidaten.push({ email: o.email, name: o.naam })
  }
  for (const o of kandidaten) {
    const adres = (o?.email || '').trim()
    if (!adres) continue
    const sleutel = adres.toLowerCase()
    if (gezien.has(sleutel)) continue
    gezien.add(sleutel)
    uit.push({ email: adres, naam: o.name || undefined, bron: 'vrij' })
  }
  return uit
}

export function documentVoorAntwoord(bron: BronMail, allen: boolean, body: EmailBody | null, eigenAdres?: string | null): ComposerDocument {
  const afzenderEmail = extractSenderEmail(bron.van).trim()
  const afzenderNaam = extractSenderName(bron.van)
  const messageId = bron.message_id || undefined
  return documentVoorNieuw({
    modus: allen ? 'allen' : 'antwoord',
    aan: afzenderEmail ? [{ email: afzenderEmail, naam: afzenderNaam !== afzenderEmail ? afzenderNaam : undefined, bron: 'vrij' }] : [],
    cc: allen ? ontvangersVoorAllen(bron, eigenAdres) : [],
    onderwerp: metPrefix(bron.onderwerp, 'Re: '),
    html: metCitaat('', bouwAntwoordCitaat(bron, body)),
    inReplyTo: messageId,
    references: messageId ? [messageId] : undefined,
    threadId: bron.thread_id || undefined,
    bronEmailId: bron.id,
  })
}

export function documentVoorDoorsturen(bron: BronMail, body: EmailBody | null): ComposerDocument {
  const bijlagen: ComposerBijlage[] = (bron.attachment_meta || [])
    .filter((a) => !a.isInlineCid)
    .map((a) => ({ naam: a.filename, grootte: a.size, type: a.contentType, bron: 'origineel', emailId: bron.id }))
  const messageId = bron.message_id || undefined
  return documentVoorNieuw({
    modus: 'doorsturen',
    onderwerp: metPrefix(bron.onderwerp, 'Fwd: '),
    html: metCitaat('', bouwDoorstuurCitaat(bron, body)),
    bijlagen,
    references: messageId ? [messageId] : undefined,
    threadId: bron.thread_id || undefined,
    bronEmailId: bron.id,
  })
}

/** Uit de Concepten-map: de rij in `emails` met `concept` JSONB, of het document zelf. */
export function documentUitConcept(concept: ComposerDocument | { id: string; concept: ComposerDocument | null }): ComposerDocument {
  if ('concept' in concept && !('modus' in concept)) {
    const rij = concept as { id: string; concept: ComposerDocument | null }
    return documentVoorNieuw({ ...(rij.concept || {}), id: rij.id })
  }
  return documentVoorNieuw(concept as ComposerDocument)
}

/** Alleen tags weghalen zodat "niets getypt" als leeg telt. */
export function alleenTekst(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Leeg = niets van betekenis: het citaat en de handtekening tellen niet mee. */
export function isLeegDocument(doc: ComposerDocument): boolean {
  if (doc.aan.length || doc.cc.length || doc.bcc.length) return false
  if (doc.onderwerp.trim()) return false
  if (doc.bijlagen.length) return false
  const { eigen } = splitsCitaat(doc.html)
  if (/<img\b|<table\b/i.test(eigen)) return false
  return alleenTekst(eigen) === ''
}

export function koppelingVan(doc: ComposerDocument, soort: KoppelingSoort): string | undefined {
  return doc.koppelingen.find((k) => k.soort === soort)?.doelId
}
