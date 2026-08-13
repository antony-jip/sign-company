import type { FontSize } from './emailTypes'
import type { Klant } from '@/types'

export const GENERIEKE_MAILDOMEINEN = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl',
  'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'upcmail.nl',
  'casema.nl', 'quicknet.nl', 'tele2.nl', 'solcon.nl',
]

/**
 * Zoekt de klant achter een afzenderadres: eerst op het exacte adres, daarna
 * op domein.
 *
 * Beide stappen kijken óók naar de contactpersonen. Een derde van de klanten
 * heeft een leeg `email`-veld — bij grotere klanten staan alle adressen alleen
 * bij de contactpersonen. Matchen op `klant.email` alleen laat die klanten dus
 * ongezien, waarna de mail als nieuwe klant wordt aangeboden en er een
 * duplicaat ontstaat.
 *
 * Generieke providerdomeinen doen niet mee aan de domeinstap: anders koppelt
 * elke gmail-afzender aan de eerste klant met een gmail-adres.
 */
export function zoekKlantVoorAfzender(klanten: Klant[], afzenderEmail: string): Klant | null {
  const adres = (afzenderEmail || '').trim().toLowerCase()
  if (!adres.includes('@')) return null

  const exact = klanten.find((k) =>
    k.email?.toLowerCase() === adres ||
    k.contactpersonen?.some((c) => c.email?.toLowerCase() === adres)
  )
  if (exact) return exact

  const domein = adres.split('@')[1]
  if (!domein || GENERIEKE_MAILDOMEINEN.includes(domein)) return null

  return klanten.find((k) =>
    k.email?.toLowerCase().endsWith('@' + domein) ||
    k.contactpersonen?.some((c) => c.email?.toLowerCase().endsWith('@' + domein))
  ) || null
}

export function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)/)
  const naam = match ? match[1].trim() : from
  // Mailservers quoten displaynamen met een komma of haakje erin. Zonder deze
  // strip staat er een aanhalingsteken in de avatar-initiaal.
  return naam.replace(/^["'](.*)["']$/s, '$1').trim()
}

export function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

const BEDRIJFSVORM = /^(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|c\.?v\.?|gmbh|ltd|inc|bvba|holding)$/i

/**
 * Splitst een afzendernaam in voornaam en achternaam voor een contactpersoon.
 * Bij twijfel (één woord, bedrijfsnaam, e-mailadres als naam) blijft de hele
 * string in achternaam staan; liever één ongesplitst naamveld dan een gok.
 */
export function splitAfzenderNaam(naam: string): { voornaam: string; achternaam: string } {
  const schoon = (naam || '').replace(/["'`]/g, '').replace(/\s+/g, ' ').trim()
  if (!schoon) return { voornaam: '', achternaam: '' }
  if (schoon.includes('@')) return { voornaam: '', achternaam: schoon }

  const komma = schoon.match(/^([^,]+),\s*(.+)$/)
  if (komma) return { voornaam: komma[2].trim(), achternaam: komma[1].trim() }

  const delen = schoon.split(' ')
  if (delen.length < 2) return { voornaam: '', achternaam: schoon }
  if (delen.some((d) => BEDRIJFSVORM.test(d))) return { voornaam: '', achternaam: schoon }

  return { voornaam: delen[0], achternaam: delen.slice(1).join(' ') }
}

// ─── Platte tekst leesbaar tonen ───

const HTML_SPOOR = /<(br|p|div|table|tr|td|span|a|ul|ol|li|h[1-6]|img|body|html|blockquote)\b/i

/** Tekstmails hebben geen HTML-deel; zonder deze check zijn het losse tags. */
export function lijktOpHtml(inhoud: string): boolean {
  return HTML_SPOOR.test(inhoud || '')
}

/**
 * Zet een platte-tekstmail om naar HTML met behoud van de regelindeling.
 * Formulier-notificaties en veel zakelijke mail komen als text/plain binnen;
 * die kwamen als één doorlopende lap tekst in beeld omdat de reader de body
 * als HTML rendert en newlines daar niets betekenen.
 */
export function platteTekstNaarHtml(tekst: string): string {
  if (!tekst) return ''
  const esc = tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const metLinks = esc.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"])/gi,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  )
  // pre-wrap: behoudt enters en uitlijning van "Label:   waarde"-kolommen,
  // maar breekt lange regels wel netjes af op smalle schermen.
  return `<div style="white-space:pre-wrap">${metLinks}</div>`
}

/**
 * Body terug naar leesbare regels, of hij nu HTML of platte tekst is. Anders
 * dan stripHtml blijven de regelovergangen staan — die zijn nodig om
 * "Label: waarde"-velden uit een formuliermail te kunnen lezen.
 */
export function bodyAlsTekst(inhoud: string): string {
  if (!inhoud) return ''
  if (!lijktOpHtml(inhoud)) return inhoud
  return inhoud
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Aanvraag: wie is hier eigenlijk de klant? ───

const DOORGEEFLUIK_LOCALPARTS = [
  'no-reply', 'noreply', 'no_reply', 'donotreply', 'do-not-reply',
  'aanvraag', 'aanvragen', 'formulier', 'form', 'forms', 'webform',
  'website', 'site', 'wordpress', 'mailer', 'notificatie', 'notification',
]

/**
 * Een doorgeefluik is een adres dat namens iemand anders mailt: het eigen
 * contactformulier, een no-reply-notifier. De afzender is dan niet de klant,
 * de body wel. Alles wat hier niet doorheen komt behandelen we als een echte
 * afzender — dat is verreweg het vaakste geval.
 */
export function isDoorgeefluikAfzender(afzenderEmail: string, eigenEmail: string): boolean {
  const adres = (afzenderEmail || '').trim().toLowerCase()
  if (!adres.includes('@')) return false

  const [localpart, domein] = adres.split('@')
  const eigenDomein = (eigenEmail || '').trim().toLowerCase().split('@')[1]
  if (eigenDomein && domein === eigenDomein) return true

  return DOORGEEFLUIK_LOCALPARTS.some((l) => localpart === l || localpart.startsWith(l + '-') || localpart.startsWith(l + '.'))
}

export interface BodyContact {
  naam: string
  email: string
  telefoon: string
  bedrijf: string
}

const VELD_LABELS: Record<keyof BodyContact, string[]> = {
  naam: ['naam', 'contactpersoon', 'name', 'voor- en achternaam'],
  email: ['e-mail', 'email', 'e-mailadres', 'emailadres', 'mail'],
  telefoon: ['telefoon', 'telefoonnummer', 'tel', 'mobiel', 'phone'],
  bedrijf: ['bedrijf', 'bedrijfsnaam', 'organisatie', 'company'],
}

const EMAIL_IN_TEKST = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i

/**
 * Leest de contactgegevens uit een formulier-notificatie. Zo goed als elk
 * formulier (ons eigen, Contact Form 7, Gravity Forms, Formspree) mailt zijn
 * velden als "Label: waarde" op een eigen regel; daar gaan we op af. Vindt hij
 * geen labels, dan pakt hij het eerste losse e-mailadres uit de tekst.
 */
export function haalContactUitBody(bodyTekst: string): BodyContact {
  const contact: BodyContact = { naam: '', email: '', telefoon: '', bedrijf: '' }
  if (!bodyTekst) return contact

  for (const regel of bodyTekst.split(/\r?\n/)) {
    const match = regel.match(/^\s*\**\s*([\wÀ-ÿ'’\- .]{2,30}?)\s*\**\s*[:：]\s*(.+?)\s*$/)
    if (!match) continue
    const label = match[1].toLowerCase().trim()
    const waarde = match[2].trim()
    if (!waarde) continue
    for (const [veld, labels] of Object.entries(VELD_LABELS) as [keyof BodyContact, string[]][]) {
      if (!contact[veld] && labels.includes(label)) contact[veld] = waarde.slice(0, 120)
    }
  }

  if (contact.email && !EMAIL_IN_TEKST.test(contact.email)) contact.email = ''
  if (!contact.email) {
    const los = bodyTekst.match(EMAIL_IN_TEKST)
    if (los) contact.email = los[0]
  }
  return contact
}

export interface AanvraagContact {
  email: string
  naam: string
  telefoon: string
  bedrijf: string
  uitBody: boolean
}

/**
 * Bepaalt wie de aanvraag gedaan heeft. De afzender is de bron, tenzij die
 * aantoonbaar een doorgeefluik is: dan pas kijken we in de body. Zonder die
 * volgorde zou een klant die zijn leverancier citeert opeens als die
 * leverancier geboekt worden.
 */
export function bepaalAanvraagContact(
  afzenderEmail: string,
  afzenderNaam: string,
  bodyTekst: string,
  eigenEmail: string
): AanvraagContact {
  const afzender = { email: afzenderEmail, naam: afzenderNaam, telefoon: '', bedrijf: '', uitBody: false }
  if (!isDoorgeefluikAfzender(afzenderEmail, eigenEmail)) return afzender

  const uitBody = haalContactUitBody(bodyTekst)
  // Zonder bruikbaar adres in de body valt hij terug op de afzender: liever de
  // bekende — zij het minder precieze — afzender dan een klant zonder e-mail.
  if (!uitBody.email || uitBody.email.toLowerCase() === afzenderEmail.trim().toLowerCase()) return afzender

  return {
    email: uitBody.email,
    naam: uitBody.naam || afzenderNaam,
    telefoon: uitBody.telefoon,
    bedrijf: uitBody.bedrijf,
    uitBody: true,
  }
}

// ─── Handtekening: adres en telefoon onderaan de mail ───

export interface HandtekeningGegevens {
  telefoon: string
  adres: string
  postcode: string
  stad: string
}

const CITAAT_START = [
  /^-{2,}\s*(oorspronkelijk bericht|original message|forwarded message)\s*-{2,}/i,
  /^\s*begin doorgestuurd bericht/i,
  /^\s*(op|on)\b.{4,90}\b(schreef|wrote)\b.{0,60}:?\s*$/i,
  /^\s*(van|from)\s*:\s*.*@/i,
  /^\s*>/,
  /^_{5,}\s*$/,
]

const HANDTEKENING_REGELS = 12
const HANDTEKENING_REGEL_MAX = 60
const POSTCODE_RE = /\b([1-9][0-9]{3})\s?([A-Za-z]{2})\b/
const STRAAT_RE = /^[A-Za-zÀ-ÿ.'’-]+(?:\s+[A-Za-zÀ-ÿ.'’-]+)*\s+\d{1,5}\s*[A-Za-z]?(?:\s*[-/]\s*\d{1,4}\s*[A-Za-z]?)?$/
const STAD_RE = /^[A-Za-zÀ-ÿ' -]{2,40}$/
const TELEFOON_RE = /(?:\+\s?31|0)[\s\-.()]*\d(?:[\s\-.()]*\d){7,10}/
const GEEN_TELEFOON_REGEL = /\b(kvk|k\.v\.k|btw|vat|iban|bic|rsin|factuur|ordernummer|postbus)\b/i
const GEEN_STAD = /^(nederland|the netherlands|holland|nl|belgië|belgie|belgium)$/i

/**
 * Knipt het citaat eraf en houdt het blok onderaan over: alles na een
 * `--`-scheiding, anders de laatste regels. Prozaregels vallen op lengte af,
 * zodat alleen handtekening-achtige regels overblijven.
 */
function handtekeningBlok(bodyTekst: string): string[] {
  const alle = bodyTekst.split(/\r?\n/)
  let eind = alle.length
  for (let i = 0; i < alle.length; i++) {
    if (CITAAT_START.some((re) => re.test(alle[i]))) { eind = i; break }
  }

  const regels = alle.slice(0, eind).map((r) => r.replace(/[ \t]+/g, ' ').trim())
  while (regels.length && !regels[regels.length - 1]) regels.pop()

  const scheiding = regels.map((r) => /^--+$/.test(r)).lastIndexOf(true)
  const blok = scheiding >= 0 ? regels.slice(scheiding + 1) : regels.slice(-HANDTEKENING_REGELS)
  return blok.filter((r) => r && r.length <= HANDTEKENING_REGEL_MAX)
}

function isNederlandsNummer(ruw: string): boolean {
  const cijfers = ruw.replace(/\D/g, '')
  if (cijfers.startsWith('31')) return cijfers.length >= 11 && cijfers.length <= 12
  return cijfers.startsWith('0') && cijfers.length === 10
}

/**
 * Leest adres en telefoon uit de handtekening onderaan een mail — bewust
 * alleen daar. In de lopende tekst staan net zo goed nummers en adressen van
 * de klus of van een derde; die zijn geen klantgegevens.
 */
export function haalHandtekeningUitBody(bodyTekst: string): HandtekeningGegevens {
  const leeg: HandtekeningGegevens = { telefoon: '', adres: '', postcode: '', stad: '' }
  if (!bodyTekst) return leeg

  const blok = handtekeningBlok(bodyTekst)
  const gevonden = { ...leeg }

  for (const regel of blok) {
    if (gevonden.telefoon || GEEN_TELEFOON_REGEL.test(regel)) continue
    const match = regel.match(TELEFOON_RE)
    if (match && isNederlandsNummer(match[0])) gevonden.telefoon = match[0].trim().replace(/[\s.\-]+$/, '')
  }

  const postcodeIndex = blok.findIndex((r) => POSTCODE_RE.test(r))
  if (postcodeIndex === -1) return gevonden

  const regel = blok[postcodeIndex]
  const match = regel.match(POSTCODE_RE)!
  gevonden.postcode = `${match[1]} ${match[2].toUpperCase()}`

  const voor = regel.slice(0, match.index).replace(/[,;]\s*$/, '').trim()
  const na = regel.slice((match.index || 0) + match[0].length).replace(/^[,;]\s*/, '').trim()

  if (STAD_RE.test(na) && !GEEN_STAD.test(na)) gevonden.stad = na
  else {
    const volgende = blok[postcodeIndex + 1] || ''
    if (STAD_RE.test(volgende) && !GEEN_STAD.test(volgende)) gevonden.stad = volgende
  }

  if (STRAAT_RE.test(voor)) gevonden.adres = voor
  else {
    for (let i = postcodeIndex - 1; i >= 0 && i >= postcodeIndex - 3; i--) {
      if (STRAAT_RE.test(blok[i])) { gevonden.adres = blok[i]; break }
    }
  }

  return gevonden
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

// Aggressievere variant voor email previews — ruimt ook CSS, style/script
// blokken, html entities en URLs op zodat de preview leesbare proza is.
export function cleanEmailPreview(raw: string): string {
  if (!raw) return ''
  let s = raw
  // Style/script blokken volledig weg
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
  // HTML comments
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')
  // HTML tags
  s = s.replace(/<[^>]*>/g, ' ')
  // CSS regel-blokken die soms nog losgeschreven in de body staan
  s = s.replace(/\{[^{}]*\}/g, ' ')
  // CSS-achtige selectors / declaraties die overblijven (bv. ".foo:hover")
  s = s.replace(/[.#][a-z][\w-]*\s*:\s*[^;]+;?/gi, ' ')
  // Markdown-resten uit geconverteerde HTML: afbeeldingen weg, links terug naar
  // hun linktekst. Zonder dit levert een nieuwsbrief previews als "[Logo]([link])".
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  // Kale URLs dragen niets bij aan een preview-regel
  s = s.replace(/https?:\/\/\S+/gi, ' ')
  s = s.replace(/\(\s*\)/g, ' ')
  // Losse haken die overblijven zodra een markdown-link half is opgeruimd
  s = s.replace(/[[\]]/g, ' ')
  // HTML entities
  s = s.replace(/&nbsp;/gi, ' ')
  s = s.replace(/&amp;/gi, '&')
  s = s.replace(/&lt;/gi, '<')
  s = s.replace(/&gt;/gi, '>')
  s = s.replace(/&quot;/gi, '"')
  s = s.replace(/&#39;|&apos;/gi, "'")
  // Numerieke entities (bv &#8217;)
  s = s.replace(/&#\d+;/g, ' ')
  s = s.replace(/&[a-z]+;/gi, ' ')
  // Witregels en tabs naar spaties, dan multiple spaces collapsen
  s = s.replace(/[\r\n\t]+/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

const avatarColorCache = new Map<string, string>()
const AVATAR_COLORS = [
  'bg-primary', 'bg-emerald-500', 'bg-[#4A442D]', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-accent', 'bg-pink-500',
  'bg-teal-500', 'bg-orange-500',
]

export function getAvatarColor(name: string): string {
  const cached = avatarColorCache.get(name)
  if (cached) return cached
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  avatarColorCache.set(name, color)
  return color
}

const AVATAR_RING_COLORS = [
  'ring-primary/30', 'ring-emerald-300/40', 'ring-amber-300/40', 'ring-amber-400/30',
  'ring-rose-300/40', 'ring-cyan-300/40', 'ring-accent/30', 'ring-pink-300/40',
  'ring-teal-300/40', 'ring-orange-300/40',
]

export function getAvatarRingColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return AVATAR_RING_COLORS[hash % AVATAR_RING_COLORS.length]
}

// DOEN Design System avatar palette — 8 onderscheidende muted tinten,
// teal vervangen door petrol-tint voor brand-alignment, rood + lavendel
// weggelaten (te schreeuwerig / te dicht bij paars).
const DOEN_AVATAR_PALETTE_LIGHT = [
  { bg: '#D6E5E7', text: '#1A535C' },  // petrol
  { bg: '#DCF0E4', text: '#2B6E44' },  // groen
  { bg: '#DBE6F5', text: '#2E5491' },  // blauw
  { bg: '#F5EDD8', text: '#7D6A2E' },  // goud
  { bg: '#F2E4EC', text: '#8A3D6E' },  // mauve
  { bg: '#E2DFF5', text: '#5A4E91' },  // paars
  { bg: '#FDEADF', text: '#B05C2E' },  // oranje
  { bg: '#E8EDDF', text: '#5A6B44' },  // olijf
]

// Dark variant — bgs gedimd naar lage-alpha tinten van het accent zelf
// zodat ze niet als gloeiende pastel-blobs verschijnen op donker.
const DOEN_AVATAR_PALETTE_DARK = [
  { bg: 'rgba(26, 83, 92, 0.28)',  text: '#7FB5C0' },  // petrol
  { bg: 'rgba(43, 110, 68, 0.28)', text: '#66BC85' },  // groen
  { bg: 'rgba(46, 84, 145, 0.28)', text: '#7FA8E6' },  // blauw
  { bg: 'rgba(125, 106, 46, 0.25)',text: '#D4B566' },  // goud
  { bg: 'rgba(138, 61, 110, 0.28)',text: '#D48EB5' },  // mauve
  { bg: 'rgba(90, 78, 145, 0.30)', text: '#B098D0' },  // paars
  { bg: 'rgba(176, 92, 46, 0.28)', text: '#FF9A66' },  // oranje
  { bg: 'rgba(90, 107, 68, 0.28)', text: '#A8C088' },  // olijf
]

export function getAvatarStyle(name: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  // Theme-aware: check .dark class op <html>. Pure function — geen cache —
  // zodat re-renders bij theme-switch direct correcte kleuren oppikken.
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const palette = isDark ? DOEN_AVATAR_PALETTE_DARK : DOEN_AVATAR_PALETTE_LIGHT
  return palette[hash % palette.length]
}

export function formatRelativeSync(timestamp: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (diffSec < 30) return 'Bijgewerkt zojuist'
  if (diffSec < 60) return 'Bijgewerkt 1 min geleden'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Bijgewerkt ${diffMin} min geleden`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Bijgewerkt ${diffHr} u geleden`
  return `Bijgewerkt ${Math.floor(diffHr / 24)} d geleden`
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const now = new Date()

  const startOfDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  const today = startOfDay(now)
  const target = startOfDay(date)
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  // Toekomst (gepland)
  if (diffDays < 0) {
    if (diffDays === -1) return 'Morgen'
    if (diffDays > -7) return date.toLocaleDateString('nl-NL', { weekday: 'short' })
    if (date.getFullYear() === now.getFullYear()) return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  // Vandaag → tijd HH:MM
  if (diffDays === 0) return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  // Gisteren
  if (diffDays === 1) return 'Gist.'
  // Deze week → korte weekdag (Ma, Di, Wo, ...)
  if (diffDays < 7) {
    return date.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')
  }
  // Dit jaar → "12 jan"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }
  // Ouder → "12 jan '24"
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' })
}

export const fontSizeClasses: Record<FontSize, { name: string; subject: string; preview: string; date: string }> = {
  small: { name: 'text-base', subject: 'text-base', preview: 'text-sm', date: 'text-xs' },
  medium: { name: 'text-lg', subject: 'text-lg', preview: 'text-base', date: 'text-sm' },
  large: { name: 'text-xl', subject: 'text-lg', preview: 'text-lg', date: 'text-base' },
}

export const labelColors: Record<string, string> = {
  offerte: 'bg-blue-400',
  klant: 'bg-emerald-400',
  project: 'bg-primary',
  leverancier: 'bg-amber-400',
}

export const IMAP_FOLDER_MAP: Record<string, string> = {
  inbox: 'INBOX',
  verzonden: 'verzonden',
  concepten: 'concepten',
  prullenbak: 'prullenbak',
  gepland: 'gepland',
  gesnoozed: 'INBOX',
}

export const SNOOZE_OPTIONS = [
  { label: 'Over 1 uur', hours: 1 },
  { label: 'Over 3 uur', hours: 3 },
  { label: 'Morgenochtend', hours: -1 },
  { label: 'Volgende week', hours: -2 },
] as const

export const KEYBOARD_SHORTCUTS = [
  { key: 'j', action: 'Volgende email' },
  { key: 'k', action: 'Vorige email' },
  { key: 'o / Enter', action: 'Email openen' },
  { key: 'r', action: 'Beantwoorden' },
  { key: 'f', action: 'Doorsturen' },
  { key: 'e', action: 'Archiveren' },
  { key: '#', action: 'Verwijderen' },
  { key: 'p', action: 'Vastpinnen' },
  { key: 'z', action: 'Snooze menu' },
  { key: 'c', action: 'Nieuwe email' },
  { key: 'Esc', action: 'Terug naar lijst' },
  { key: '?', action: 'Sneltoetsen tonen' },
] as const

/** Parse search query with operators like from:, to:, has:, label:, before:, after: */
export function parseSearchQuery(query: string): {
  text: string
  operators: Record<string, string>
} {
  const operators: Record<string, string> = {}
  const operatorRegex = /\b(from|to|has|label|before|after|subject):(\S+)/gi
  let match: RegExpExecArray | null
  let text = query

  while ((match = operatorRegex.exec(query)) !== null) {
    operators[match[1].toLowerCase()] = match[2]
    text = text.replace(match[0], '')
  }

  return { text: text.trim(), operators }
}

export const SEARCH_OPERATORS = [
  { key: 'from:', description: 'Afzender', example: 'from:jan@bedrijf.nl' },
  { key: 'to:', description: 'Ontvanger', example: 'to:klant@email.nl' },
  { key: 'has:', description: 'Heeft', example: 'has:bijlage' },
  { key: 'label:', description: 'Label', example: 'label:offerte' },
  { key: 'before:', description: 'Voor datum', example: 'before:2026-01-01' },
  { key: 'after:', description: 'Na datum', example: 'after:2026-01-01' },
  { key: 'subject:', description: 'Onderwerp', example: 'subject:factuur' },
]

/** Calculate snooze date based on hours option */
export function calculateSnoozeDate(hours: number): Date {
  const now = new Date()
  if (hours === -1) {
    // Tomorrow morning 9:00
    const date = new Date(now)
    date.setDate(date.getDate() + 1)
    date.setHours(9, 0, 0, 0)
    return date
  }
  if (hours === -2) {
    // Next Monday 9:00
    const date = new Date(now)
    const dayOfWeek = date.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    date.setDate(date.getDate() + daysUntilMonday)
    date.setHours(9, 0, 0, 0)
    return date
  }
  return new Date(now.getTime() + hours * 60 * 60 * 1000)
}
