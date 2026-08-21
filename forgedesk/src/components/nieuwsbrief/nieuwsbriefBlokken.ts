// Blokken-model van de nieuwsbrief-bouwer plus de renderer naar e-mail-veilige
// HTML (tabellen, inline styles). De server wikkelt het resultaat in de mailshell
// met afmeldlink (api/nieuwsbrief-verzend.ts), dus hier geen <html>/<body>.

export type Uitlijning = 'links' | 'midden' | 'rechts'

export interface NieuwsbriefStijl {
  accent: string
  tekst: string
  secundair: string
  kaart: string
  achtergrond: string
  font: string
}

export const STANDAARD_STIJL: NieuwsbriefStijl = {
  accent: '#F15025',
  tekst: '#1A1A1A',
  secundair: '#57574F',
  kaart: '#FFFFFF',
  achtergrond: '#F5F4F1',
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
}

// Webfonts laden in Apple Mail, iOS Mail en een deel van de Android-clients;
// Gmail en Outlook vallen terug op de stack erachter. Daarom staat er altijd
// een systeemfont achter de webfont.
export const FONT_OPTIES: { label: string; value: string; web?: string }[] = [
  { label: 'Systeem (modern, altijd veilig)', value: STANDAARD_STIJL.font },
  { label: 'Hanken Grotesk (Sign Company)', value: "'Hanken Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", web: 'Hanken+Grotesk:wght@400;600;700;800' },
  { label: 'Bricolage Grotesque (karakter)', value: "'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", web: 'Bricolage+Grotesque:wght@400;600;700;800' },
  { label: 'Inter (strak)', value: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", web: 'Inter:wght@400;600;700;800' },
  { label: 'Source Serif (redactioneel)', value: "'Source Serif 4',Georgia,'Times New Roman',serif", web: 'Source+Serif+4:wght@400;600;700' },
  { label: 'Georgia (klassiek)', value: "Georgia,'Times New Roman',serif" },
  { label: 'Arial (neutraal)', value: 'Arial,Helvetica,sans-serif' },
  { label: 'Verdana (breed)', value: 'Verdana,Geneva,sans-serif' },
  { label: 'Trebuchet (vriendelijk)', value: "'Trebuchet MS',Helvetica,sans-serif" },
]

export function webfontImport(font: string): string {
  const optie = FONT_OPTIES.find(f => f.web && font.includes(f.web.split(':')[0].replace(/\+/g, ' ')))
  return optie?.web ? `@import url('https://fonts.googleapis.com/css2?family=${optie.web}&display=swap');` : ''
}

// Opmaak die elk blok kan hebben (cascade: document-stijl → blok). Leeg
// betekent: volg de documentstijl.
export interface BlokOpmaak {
  achtergrond?: string
  ruimteBoven?: number
  ruimteOnder?: number
  verbergMobiel?: boolean
}

interface BlokBasis { id: string; opmaak?: BlokOpmaak }

export interface KopBlok extends BlokBasis { type: 'kop'; tekst: string; niveau: 1 | 2 | 3; uitlijning: Uitlijning; kleur?: string }
export interface TekstBlok extends BlokBasis { type: 'tekst'; html: string; uitlijning: Uitlijning; grootte: 'normaal' | 'klein' | 'groot'; kleur?: string; regelafstand?: number }
export interface AfbeeldingBlok extends BlokBasis { type: 'afbeelding'; url: string; alt: string; link: string; breedte: 'vol' | 'smal'; breedtePct?: number; radius?: number; uitlijning?: Uitlijning; bijschrift: string }
export interface KnopBlok extends BlokBasis { type: 'knop'; tekst: string; url: string; uitlijning: Uitlijning; stijl: 'vol' | 'omlijnd'; breedte: 'auto' | 'vol'; kleur?: string; radius?: number; grootte?: 'klein' | 'normaal' | 'groot' }
export interface AfbeeldingTekstBlok extends BlokBasis {
  type: 'afbeelding_tekst'; url: string; alt: string; kop: string; html: string; positie: 'links' | 'rechts'; knopTekst: string; knopUrl: string
}
export interface Kolom { kop: string; html: string; url: string; knopTekst: string; knopUrl: string }
export interface KolommenBlok extends BlokBasis { type: 'kolommen'; kolommen: [Kolom, Kolom]; verhouding?: '1:1' | '1:2' | '2:1' }
export interface QuoteBlok extends BlokBasis { type: 'quote'; tekst: string; bron: string }
export interface HighlightBlok extends BlokBasis { type: 'highlight'; kop: string; html: string; variant: 'accent' | 'zacht' | 'donker'; knopTekst: string; knopUrl: string }
export interface LijnBlok extends BlokBasis { type: 'lijn'; dikte?: number; kleur?: string; breedtePct?: number }
export interface RuimteBlok extends BlokBasis { type: 'ruimte'; hoogte: number }
export interface HeaderBlok extends BlokBasis { type: 'header'; naam: string; logoUrl: string; tagline: string; uitlijning: Uitlijning }
export interface FooterBlok extends BlokBasis {
  type: 'footer'; bedrijfsnaam: string; adres: string; telefoon: string; website: string; linkedin: string; instagram: string; facebook: string
}
export interface HtmlBlok extends BlokBasis { type: 'html'; html: string }

export type Blok =
  | KopBlok | TekstBlok | AfbeeldingBlok | KnopBlok | AfbeeldingTekstBlok | KolommenBlok
  | QuoteBlok | HighlightBlok | LijnBlok | RuimteBlok | HeaderBlok | FooterBlok | HtmlBlok

export type BlokType = Blok['type']

export interface NieuwsbriefDocument {
  versie: 1
  stijl: NieuwsbriefStijl
  blokken: Blok[]
}

export const BLOK_LABEL: Record<BlokType, string> = {
  header: 'Kopregel met logo',
  kop: 'Kop',
  tekst: 'Tekst',
  afbeelding: 'Afbeelding',
  knop: 'Knop',
  afbeelding_tekst: 'Afbeelding + tekst',
  kolommen: 'Twee kolommen',
  quote: 'Citaat',
  highlight: 'Uitgelicht vlak',
  lijn: 'Scheidingslijn',
  ruimte: 'Witruimte',
  footer: 'Afsluiting',
  html: 'Eigen HTML',
}

export const BLOK_OMSCHRIJVING: Record<BlokType, string> = {
  header: 'Bedrijfsnaam of logo bovenaan',
  kop: 'Titel of tussenkop',
  tekst: 'Alinea met opmaak en links',
  afbeelding: 'Foto over de volle breedte',
  knop: 'Opvallende call-to-action',
  afbeelding_tekst: 'Foto naast een stukje tekst',
  kolommen: 'Twee onderwerpen naast elkaar',
  quote: 'Reactie van een klant',
  highlight: 'Gekleurd vlak voor een actie',
  lijn: 'Dunne lijn tussen delen',
  ruimte: 'Extra lucht tussen blokken',
  footer: 'Groet, adres en social-links',
  html: 'Plak je eigen HTML',
}

export const BLOK_VOLGORDE: BlokType[] = [
  'header', 'kop', 'tekst', 'afbeelding', 'knop', 'afbeelding_tekst', 'kolommen', 'quote', 'highlight', 'lijn', 'ruimte', 'footer', 'html',
]

export function nieuwId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)
}

export function maakBlok(type: BlokType): Blok {
  const id = nieuwId()
  switch (type) {
    case 'header': return { id, type, naam: 'Sign Company', logoUrl: '', tagline: '', uitlijning: 'links' }
    case 'kop': return { id, type, tekst: 'Een pakkende kop', niveau: 1, uitlijning: 'links' }
    case 'tekst': return { id, type, html: '<p>Schrijf hier je tekst. Selecteer woorden om ze <strong>vet</strong> te maken of een link toe te voegen.</p>', uitlijning: 'links', grootte: 'normaal' }
    case 'afbeelding': return { id, type, url: '', alt: '', link: '', breedte: 'vol', bijschrift: '' }
    case 'knop': return { id, type, tekst: 'Bekijk meer', url: 'https://signcompany.nl', uitlijning: 'links', stijl: 'vol', breedte: 'auto' }
    case 'afbeelding_tekst': return { id, type, url: '', alt: '', kop: 'Project in beeld', html: '<p>Vertel kort wat er te zien is en waarom het de moeite waard is.</p>', positie: 'links', knopTekst: '', knopUrl: '' }
    case 'kolommen': return {
      id, type,
      kolommen: [
        { kop: 'Eerste onderwerp', html: '<p>Korte toelichting bij het eerste onderwerp.</p>', url: '', knopTekst: '', knopUrl: '' },
        { kop: 'Tweede onderwerp', html: '<p>Korte toelichting bij het tweede onderwerp.</p>', url: '', knopTekst: '', knopUrl: '' },
      ],
    }
    case 'quote': return { id, type, tekst: 'Strak werk, snel geleverd en precies zoals afgesproken.', bron: 'Een tevreden klant' }
    case 'highlight': return { id, type, kop: 'Deze maand', html: '<p>Zet hier een actie, aanbieding of belangrijke mededeling.</p>', variant: 'zacht', knopTekst: '', knopUrl: '' }
    case 'lijn': return { id, type }
    case 'ruimte': return { id, type, hoogte: 24 }
    case 'footer': return { id, type, bedrijfsnaam: 'Sign Company', adres: '', telefoon: '', website: 'https://signcompany.nl', linkedin: '', instagram: '', facebook: '' }
    case 'html': return { id, type, html: '<p style="margin:0;">Je eigen HTML komt hier.</p>' }
  }
}

export function leegDocument(): NieuwsbriefDocument {
  return { versie: 1, stijl: { ...STANDAARD_STIJL }, blokken: [] }
}

export function kloonBlok(blok: Blok): Blok {
  return { ...JSON.parse(JSON.stringify(blok)), id: nieuwId() } as Blok
}

// Een document uit de database kan ouder of incompleet zijn; vul aan zodat de
// bouwer nooit op een ontbrekend veld struikelt.
export function normaliseerDocument(input: unknown): NieuwsbriefDocument {
  const doc = leegDocument()
  if (!input || typeof input !== 'object') return doc
  const raw = input as Partial<NieuwsbriefDocument>
  if (raw.stijl && typeof raw.stijl === 'object') doc.stijl = { ...STANDAARD_STIJL, ...raw.stijl }
  if (Array.isArray(raw.blokken)) {
    doc.blokken = raw.blokken
      .filter((b): b is Blok => !!b && typeof b === 'object' && typeof (b as Blok).type === 'string' && (b as Blok).type in BLOK_LABEL)
      .map(b => ({ ...maakBlok(b.type), ...b, id: b.id || nieuwId() }) as Blok)
  }
  return doc
}

// ── Rendering ──────────────────────────────────────────────────────────────

export function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function veiligeUrl(url: string): string {
  const u = (url || '').trim()
  if (!u) return '#'
  if (/^(https?:|mailto:|tel:)/i.test(u)) return escapeHtml(u)
  if (/^\{\{\{/.test(u)) return u
  return escapeHtml(`https://${u}`)
}

const UITLIJN: Record<Uitlijning, string> = { links: 'left', midden: 'center', rechts: 'right' }

// Alinea-HTML uit de tekst-editor krijgt inline-styling per element; mailclients
// erven niets van een omliggende <td>, dus elke <p>/<li>/<a> wordt expliciet.
function styleRichText(html: string, s: NieuwsbriefStijl, grootte: number, kleur: string, uitlijning: Uitlijning = 'links', regelafstand = 1.65): string {
  const lh = Math.round(grootte * regelafstand)
  const basis = `margin:0 0 12px;font-family:${s.font};font-size:${grootte}px;line-height:${lh}px;color:${kleur};text-align:${UITLIJN[uitlijning]};`
  let out = (html || '').trim()
  if (!out) return ''
  if (!/^\s*<(p|ul|ol|h[1-6]|div|table|blockquote)/i.test(out)) out = `<p>${out}</p>`
  out = out
    .replace(/<p(?![^>]*style=)([^>]*)>/gi, `<p$1 style="${basis}">`)
    .replace(/<div(?![^>]*style=)([^>]*)>/gi, `<div$1 style="${basis}">`)
    .replace(/<ul(?![^>]*style=)([^>]*)>/gi, `<ul$1 style="margin:0 0 12px;padding-left:22px;font-family:${s.font};font-size:${grootte}px;line-height:${lh}px;color:${kleur};">`)
    .replace(/<ol(?![^>]*style=)([^>]*)>/gi, `<ol$1 style="margin:0 0 12px;padding-left:22px;font-family:${s.font};font-size:${grootte}px;line-height:${lh}px;color:${kleur};">`)
    .replace(/<li(?![^>]*style=)([^>]*)>/gi, `<li$1 style="margin:0 0 4px;">`)
    .replace(/<a (?![^>]*style=)([^>]*)>/gi, `<a $1 style="color:${s.accent};text-decoration:underline;font-weight:600;">`)
    .replace(/<strong(?![^>]*style=)([^>]*)>/gi, `<strong$1 style="color:${s.tekst};font-weight:700;">`)
    .replace(/<b(?![^>]*style=)([^>]*)>/gi, `<b$1 style="color:${s.tekst};font-weight:700;">`)
  // De laatste alinea krijgt geen ondermarge; het blok regelt zijn eigen afstand.
  out = out.replace(/(<p[^>]*style=")margin:0 0 12px;([^"]*">)(?![\s\S]*<p)/i, '$1margin:0;$2')
  return out
}

function knopHtml(tekst: string, url: string, s: NieuwsbriefStijl, opties: { stijl?: 'vol' | 'omlijnd'; breedte?: 'auto' | 'vol'; uitlijning?: Uitlijning; klein?: boolean; kleur?: string; radius?: number; grootte?: 'klein' | 'normaal' | 'groot' } = {}): string {
  if (!tekst?.trim()) return ''
  const { stijl = 'vol', breedte = 'auto', uitlijning = 'links', klein = false, kleur, radius = 8 } = opties
  const grootte = opties.grootte ?? (klein ? 'klein' : 'normaal')
  const vol = stijl === 'vol'
  const accent = kleur || s.accent
  const pad = { klein: '10px 20px', normaal: '14px 30px', groot: '17px 36px' }[grootte]
  const fs = { klein: 14, normaal: 15, groot: 17 }[grootte]
  const td = vol
    ? `border-radius:${radius}px;background:${accent};`
    : `border-radius:${radius}px;border:2px solid ${accent};`
  // mso-padding-alt: Outlook negeert padding op <a>, maar leest dit wel.
  const a = vol
    ? `display:inline-block;padding:${pad};mso-padding-alt:0;font-family:${s.font};font-size:${fs}px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:${radius}px;`
    : `display:inline-block;padding:${pad};mso-padding-alt:0;font-family:${s.font};font-size:${fs}px;font-weight:700;color:${accent};text-decoration:none;border-radius:${radius}px;`
  const tableWidth = breedte === 'vol' ? ' width="100%"' : ''
  const aWidth = breedte === 'vol' ? 'width:100%;box-sizing:border-box;text-align:center;' : ''
  return `<table${tableWidth} cellpadding="0" cellspacing="0" role="presentation" align="${UITLIJN[uitlijning]}" style="margin:0;">
  <tr><td align="center" style="${td}"><a href="${veiligeUrl(url)}" target="_blank" style="${a}${aWidth}">${escapeHtml(tekst)}</a></td></tr>
</table>`
}

function afbeeldingHtml(url: string, alt: string, link: string, breedteAttr: string, radius = 8): string {
  if (!url) {
    return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="background:#ECEBE7;border:1px dashed #C9C7C0;border-radius:${radius}px;padding:48px 16px;font-family:Arial,sans-serif;font-size:13px;color:#8A8A84;">Nog geen afbeelding gekozen</td></tr></table>`
  }
  const img = `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="${breedteAttr}" style="display:block;width:100%;max-width:${breedteAttr}px;height:auto;border:0;border-radius:${radius}px;outline:none;text-decoration:none;">`
  return link ? `<a href="${veiligeUrl(link)}" target="_blank" style="display:block;text-decoration:none;">${img}</a>` : img
}

function socialLinks(b: FooterBlok, s: NieuwsbriefStijl): string {
  const items = [
    ['LinkedIn', b.linkedin], ['Instagram', b.instagram], ['Facebook', b.facebook],
  ].filter(([, url]) => url?.trim())
  if (items.length === 0) return ''
  return `<p style="margin:10px 0 0;font-family:${s.font};font-size:13px;line-height:1.6;color:${s.secundair};">` +
    items.map(([label, url]) => `<a href="${veiligeUrl(url)}" target="_blank" style="color:${s.accent};text-decoration:none;font-weight:600;">${label}</a>`).join('<span style="color:#C9C7C0;"> &nbsp;·&nbsp; </span>') +
    '</p>'
}

const CONTENT_BREEDTE = 536

export function renderBlok(blok: Blok, s: NieuwsbriefStijl): string {
  switch (blok.type) {
    case 'header': {
      const logo = blok.logoUrl
        ? `<img src="${escapeHtml(blok.logoUrl)}" alt="${escapeHtml(blok.naam)}" height="40" style="display:${blok.uitlijning === 'midden' ? 'inline-block' : 'block'};height:40px;max-width:220px;width:auto;border:0;">`
        : `<span style="font-family:${s.font};font-size:22px;font-weight:800;letter-spacing:-0.02em;color:${s.tekst};">${escapeHtml(blok.naam)}</span><span style="font-family:${s.font};font-size:22px;font-weight:800;color:${s.accent};">.</span>`
      const tagline = blok.tagline ? `<div style="margin-top:6px;font-family:${s.font};font-size:13px;color:${s.secundair};">${escapeHtml(blok.tagline)}</div>` : ''
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="${UITLIJN[blok.uitlijning]}" style="padding:0 0 20px;border-bottom:1px solid #EBEBEB;">${logo}${tagline}</td></tr></table>`
    }
    case 'kop': {
      const maat = { 1: 28, 2: 22, 3: 17 }[blok.niveau]
      const tag = `h${blok.niveau}`
      return `<${tag} style="margin:0;font-family:${s.font};font-size:${maat}px;line-height:1.25;mso-line-height-rule:exactly;font-weight:800;letter-spacing:-0.02em;color:${blok.kleur || s.tekst};text-align:${UITLIJN[blok.uitlijning]};">${escapeHtml(blok.tekst)}</${tag}>`
    }
    case 'tekst': {
      const maat = { klein: 13, normaal: 15, groot: 17 }[blok.grootte]
      return styleRichText(blok.html, s, maat, blok.kleur || s.secundair, blok.uitlijning, blok.regelafstand)
    }
    case 'afbeelding': {
      const pct = Math.max(20, Math.min(100, blok.breedtePct ?? (blok.breedte === 'vol' ? 100 : 75)))
      const w = Math.round(CONTENT_BREEDTE * pct / 100)
      const bijschrift = blok.bijschrift ? `<p style="margin:8px 0 0;font-family:${s.font};font-size:12px;line-height:1.5;color:#9B9B95;text-align:center;">${escapeHtml(blok.bijschrift)}</p>` : ''
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="${UITLIJN[blok.uitlijning ?? 'midden']}">${afbeeldingHtml(blok.url, blok.alt, blok.link, String(w), blok.radius ?? 8)}${bijschrift}</td></tr></table>`
    }
    case 'knop':
      return knopHtml(blok.tekst, blok.url, s, { stijl: blok.stijl, breedte: blok.breedte, uitlijning: blok.uitlijning, kleur: blok.kleur, radius: blok.radius, grootte: blok.grootte })
    case 'afbeelding_tekst': {
      const img = `<td class="stack" width="48%" valign="top" style="width:48%;padding:0;">${afbeeldingHtml(blok.url, blok.alt, blok.knopUrl, '257')}</td>`
      const gap = `<td class="stack-gap" width="4%" style="width:4%;font-size:0;line-height:0;">&nbsp;</td>`
      const tekst = `<td class="stack" width="48%" valign="top" style="width:48%;padding:0;">
        ${blok.kop ? `<h3 style="margin:0 0 8px;font-family:${s.font};font-size:18px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;color:${s.tekst};">${escapeHtml(blok.kop)}</h3>` : ''}
        ${styleRichText(blok.html, s, 14, s.secundair)}
        ${blok.knopTekst ? `<div style="margin-top:14px;">${knopHtml(blok.knopTekst, blok.knopUrl, s, { klein: true })}</div>` : ''}
      </td>`
      const cellen = blok.positie === 'links' ? img + gap + tekst : tekst + gap + img
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>${cellen}</tr></table>`
    }
    case 'kolommen': {
      const [b1, b2] = { '1:1': [48, 48], '1:2': [31, 65], '2:1': [65, 31] }[blok.verhouding ?? '1:1']
      const kol = (k: Kolom, pct: number) => `<td class="stack" width="${pct}%" valign="top" style="width:${pct}%;padding:0;">
        ${k.url ? `<div style="margin-bottom:12px;">${afbeeldingHtml(k.url, k.kop, k.knopUrl, String(Math.round(CONTENT_BREEDTE * pct / 100)))}</div>` : ''}
        ${k.kop ? `<h3 style="margin:0 0 8px;font-family:${s.font};font-size:17px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;color:${s.tekst};">${escapeHtml(k.kop)}</h3>` : ''}
        ${styleRichText(k.html, s, 14, s.secundair)}
        ${k.knopTekst ? `<div style="margin-top:12px;">${knopHtml(k.knopTekst, k.knopUrl, s, { klein: true, stijl: 'omlijnd' })}</div>` : ''}
      </td>`
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>${kol(blok.kolommen[0], b1)}<td class="stack-gap" width="4%" style="width:4%;font-size:0;line-height:0;">&nbsp;</td>${kol(blok.kolommen[1], b2)}</tr></table>`
    }
    case 'quote':
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td style="padding:4px 0 4px 20px;border-left:4px solid ${s.accent};">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.5;font-style:italic;color:${s.tekst};">“${escapeHtml(blok.tekst)}”</p>
          ${blok.bron ? `<p style="margin:8px 0 0;font-family:${s.font};font-size:13px;font-weight:600;color:${s.secundair};">${escapeHtml(blok.bron)}</p>` : ''}
        </td></tr></table>`
    case 'highlight': {
      const v = {
        accent: { bg: s.accent, kop: '#FFFFFF', tekst: 'rgba(255,255,255,0.92)', knop: 'omlijnd' as const },
        zacht: { bg: '#F5F4F1', kop: s.tekst, tekst: s.secundair, knop: 'vol' as const },
        donker: { bg: '#1A535C', kop: '#FFFFFF', tekst: 'rgba(255,255,255,0.85)', knop: 'vol' as const },
      }[blok.variant]
      const knopStijl: NieuwsbriefStijl = blok.variant === 'accent' ? { ...s, accent: '#FFFFFF' } : s
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td style="background:${v.bg};border-radius:12px;padding:26px 28px;">
          ${blok.kop ? `<h3 style="margin:0 0 8px;font-family:${s.font};font-size:20px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;color:${v.kop};">${escapeHtml(blok.kop)}</h3>` : ''}
          ${styleRichText(blok.html, { ...s, tekst: v.kop, accent: blok.variant === 'zacht' ? s.accent : v.kop }, 15, v.tekst)}
          ${blok.knopTekst ? `<div style="margin-top:16px;">${knopHtml(blok.knopTekst, blok.knopUrl, knopStijl, { stijl: v.knop })}</div>` : ''}
        </td></tr></table>`
    }
    case 'lijn':
      return `<table width="${blok.breedtePct ?? 100}%" align="center" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="border-top:${blok.dikte ?? 1}px solid ${blok.kleur || '#EBEBEB'};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
    case 'ruimte':
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="height:${Math.max(4, blok.hoogte)}px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`
    case 'footer': {
      const regels = [blok.adres, blok.telefoon].filter(r => r?.trim()).map(escapeHtml)
      const site = blok.website ? `<a href="${veiligeUrl(blok.website)}" target="_blank" style="color:${s.accent};text-decoration:none;font-weight:600;">${escapeHtml(blok.website.replace(/^https?:\/\//, ''))}</a>` : ''
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="padding-top:22px;border-top:1px solid #EBEBEB;">
        <p style="margin:0;font-family:${s.font};font-size:14px;line-height:1.6;color:${s.secundair};">Met vriendelijke groet,<br><strong style="color:${s.tekst};">${escapeHtml(blok.bedrijfsnaam)}</strong></p>
        ${regels.length || site ? `<p style="margin:10px 0 0;font-family:${s.font};font-size:13px;line-height:1.6;color:#9B9B95;">${[...regels, site].filter(Boolean).join('<span style="color:#C9C7C0;"> &nbsp;·&nbsp; </span>')}</p>` : ''}
        ${socialLinks(blok, s)}
      </td></tr></table>`
    }
    case 'html':
      return blok.html || ''
  }
}

export const BLOK_AFSTAND: Partial<Record<BlokType, number>> = {
  header: 28, kop: 14, tekst: 20, afbeelding: 24, knop: 28, afbeelding_tekst: 28, kolommen: 28,
  quote: 26, highlight: 28, lijn: 24, ruimte: 0, footer: 0, html: 20,
}

// Responsieve regel voor naast-elkaar-kolommen: op smalle schermen onder elkaar.
// Gmail/Apple Mail/Outlook.com respecteren een <style>-blok in de head; de
// server-shell plaatst deze string daar. Inline fallback blijft altijd staan.
export const RESPONSIVE_CSS = `@media only screen and (max-width:600px){ .stack{display:block!important;width:100%!important;padding-bottom:16px!important;} .stack-gap{display:none!important;} .mobiel-verbergen{display:none!important;max-height:0!important;overflow:hidden!important;} }`

// Buitenkant van een blok: eigen achtergrond, extra ruimte en mobiel
// verbergen. Een tabel in plaats van een div, omdat Outlook padding op divs
// negeert.
export function renderBlokWrapper(b: Blok, s: NieuwsbriefStijl, laatste: boolean): string {
  const o = b.opmaak ?? {}
  const afstand = laatste ? 0 : (BLOK_AFSTAND[b.type] ?? 20)
  const bg = o.achtergrond ? `background:${o.achtergrond};` : ''
  const pad = o.achtergrond ? 16 : 0
  const boven = (o.ruimteBoven ?? 0) + pad
  const onder = (o.ruimteOnder ?? 0) + pad
  const klasse = o.verbergMobiel ? ' class="mobiel-verbergen"' : ''
  return `<!-- blok:${b.type} -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"${klasse} style="margin:0 0 ${afstand}px;"><tr><td style="${bg}padding:${boven}px ${pad}px ${onder}px;${o.achtergrond ? 'border-radius:10px;' : ''}">${renderBlok(b, s)}</td></tr></table>`
}

export function renderDocument(doc: NieuwsbriefDocument): string {
  return doc.blokken.map((b, i) => renderBlokWrapper(b, doc.stijl, i === doc.blokken.length - 1)).join('\n')
}

export function documentIsLeeg(doc: NieuwsbriefDocument): boolean {
  return doc.blokken.length === 0
}
