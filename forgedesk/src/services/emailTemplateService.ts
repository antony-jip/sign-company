// Email template service for Doen.
// All templates are in Dutch and return { subject, html, text } objects

import { supabase, isSupabaseConfigured } from './supabaseHelpers'
import { handtekeningAfbeeldingHtml, handtekeningNaarHtml } from '@/utils/handtekening'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface EmailTemplateData {
  bedrijfsnaam?: string
  handtekening?: string
  handtekeningAfbeelding?: string
  handtekeningAfbeeldingLink?: string
  handtekeningAfbeeldingGrootte?: number
  logoUrl?: string
  primaireKleur?: string
}

interface OfferteEmailData extends EmailTemplateData {
  klantNaam: string
  offerteNummer: string
  offerteTitel: string
  /** Hoofdbedrag in de mail: exclusief btw. */
  totaalBedragExcl: string
  /** Optioneel, klein onder het hoofdbedrag. Weglaten als er geen btw is. */
  totaalBedragIncl?: string
  geldigTot: string
  bekijkUrl?: string
  customBody?: string
}

interface FactuurEmailData extends EmailTemplateData {
  klantNaam: string
  factuurNummer: string
  factuurTitel: string
  totaalBedrag: string
  vervaldatum: string
  betaalUrl?: string
  persoonlijkBericht?: string
}

interface FactuurHerinneringData extends FactuurEmailData {
  dagenVervallen: number
  // De ingestelde stap-tekst, al gerenderd (variabelen vervangen) en plat.
  // Staat die er, dan draagt de mail die tekst in plaats van het vaste
  // vriendelijke blok, zodat een aanmaning ook als aanmaning leest.
  eigenTekst?: string
  // Kop passend bij de stap: Herinnering of Aanmaning.
  heading?: string
}

interface TekeningGoedkeuringData extends EmailTemplateData {
  klantNaam: string
  projectNaam: string
  beschrijving?: string
  goedkeurUrl: string
}

interface EmailResult {
  subject: string
  html: string
  text: string
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_KLEUR = '#1A535C'
const DEFAULT_BEDRIJFSNAAM = 'Ons Bedrijf'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape special HTML characters to prevent injection.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Render a CTA button as an inline-styled table (Outlook-compatible).
 */
function renderButton(label: string, url: string, kleur: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
      <tr>
        <td style="border-radius: 6px; background-color: ${kleur};">
          <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`
}

/**
 * Strip HTML tags for a plain-text fallback and collapse whitespace.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// Base template
// ---------------------------------------------------------------------------

/**
 * Returns the branded wrapper HTML (header + footer).
 * The caller inserts body content between them via the returned `wrap` function.
 */
export function getBaseTemplate(data: EmailTemplateData): {
  wrap: (bodyHtml: string, afmeldUrl?: string) => string
} {
  const kleur = data.primaireKleur || DEFAULT_KLEUR
  const bedrijf = data.bedrijfsnaam || DEFAULT_BEDRIJFSNAAM

  const wrap = (bodyHtml: string, afmeldUrl?: string): string => {
    // Logo wint van de bedrijfsnaam in de header. Dat is ook wat het
    // instellingenscherm belooft bij het uploaden van een logo.
    const hasLogo = !!(data.logoUrl && data.logoUrl.trim())
    const headerHtml = hasLogo
      ? `<img src="${escapeHtml(data.logoUrl!)}" alt="${escapeHtml(bedrijf)}" style="max-height: 44px; max-width: 220px; display: inline-block;" />`
      : `<span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 22px; font-weight: bold; color: #ffffff;">${escapeHtml(bedrijf)}</span>`

    const sigImg = handtekeningAfbeeldingHtml({
      url: data.handtekeningAfbeelding,
      link: data.handtekeningAfbeeldingLink,
      breedte: data.handtekeningAfbeeldingGrootte,
      extraStyle: 'margin-top:8px;display:block;',
    })
    const sigImgHtml = sigImg ? `<br />${sigImg}` : ''
    // De handtekening kan opmaak bevatten. handtekeningNaarHtml schoont die en
    // zet oude platte tekst om, dus hier mag het als HTML de mail in.
    const handtekeningHtml = data.handtekening
      ? `
          <tr>
            <td style="padding: 24px 32px 0 32px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #555555;">
              ${handtekeningNaarHtml(data.handtekening)}${sigImgHtml}
            </td>
          </tr>`
      : ''

    const afmeldHtml = afmeldUrl
      ? `
          <tr>
            <td style="padding: 16px 32px 0 32px; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: #999999;">
              <a href="${escapeHtml(afmeldUrl)}" style="color: #999999; text-decoration: underline;">Afmelden voor e-mails</a>
            </td>
          </tr>`
      : `
          <tr>
            <td style="padding: 16px 32px 0 32px; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: #999999;">
              <!-- afmeld-link placeholder -->
            </td>
          </tr>`

    return `<!DOCTYPE html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(bedrijf)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!-- Main container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${kleur}; padding: 24px 32px; text-align: center;">
              ${headerHtml}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #333333;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Signature -->
          ${handtekeningHtml}
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #eeeeee; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: #999999;">
              Verzonden namens ${escapeHtml(bedrijf)}
            </td>
          </tr>
          ${afmeldHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  return { wrap }
}

// ---------------------------------------------------------------------------
// 1. Offerte verzenden
// ---------------------------------------------------------------------------

export function offerteVerzendTemplate(data: OfferteEmailData): EmailResult {
  const kleur = data.primaireKleur || DEFAULT_KLEUR
  const subject = `Offerte ${data.offerteNummer} - ${data.offerteTitel}`

  const buttonHtml = data.bekijkUrl
    ? renderButton('Bekijk, accepteer of reageer op deze offerte \u2192', data.bekijkUrl, kleur)
    : ''

  const acceptLinkHtml = data.bekijkUrl
    ? `<p style="margin: 16px 0 0 0; text-align: center;">
        <a href="${escapeHtml(data.bekijkUrl)}" target="_blank" style="font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; color: ${kleur}; text-decoration: underline;">
          \u2713 Offerte accepteren of wijzigingen aanvragen
        </a>
      </p>`
    : ''

  // Bedragen: exclusief btw is het hoofdbedrag, inclusief btw klein eronder.
  const toonIncl = !!data.totaalBedragIncl && data.totaalBedragIncl !== data.totaalBedragExcl
  const bedragHtml = `<strong>Totaalbedrag:</strong> ${escapeHtml(data.totaalBedragExcl)} excl. btw<br />`
    + (toonIncl
      ? `<span style="color: #999999;">${escapeHtml(data.totaalBedragIncl!)} incl. btw</span><br />`
      : '')

  // Split body van handtekening: alles na "Met vriendelijke groet," of de hele handtekening is apart
  function buildCustomBody(raw: string): string {
    // De body bevat plain text met \n. De handtekening zit via de template er al in.
    // Splits op regels, render als HTML paragraphs. Bewaar lege regels als spacing.
    return raw
      .split('\n')
      .map(l => l.trim() === '' ? '<br/>' : `<p style="margin: 0 0 8px 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; color: #333333;">${escapeHtml(l)}</p>`)
      .join('\n    ')
  }

  // De handtekening afbeelding apart renderen (niet escapen — is HTML/img)
  const signatureHtml = data.handtekeningAfbeelding
    ? `<div style="margin-top: 16px;">${handtekeningAfbeeldingHtml({
        url: data.handtekeningAfbeelding,
        link: data.handtekeningAfbeeldingLink,
        breedte: data.handtekeningAfbeeldingGrootte,
      })}</div>`
    : data.handtekening
      ? `<div style="margin-top: 16px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #555555; white-space: pre-line;">${escapeHtml(data.handtekening)}</div>`
      : ''

  const bodyHtml = data.customBody
    ? `
    ${buildCustomBody(data.customBody)}
    ${signatureHtml}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 24px 0 16px 0; border: 1px solid #eeeeee; border-radius: 6px;">
      <tr>
        <td style="padding: 16px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #555555;">
          ${bedragHtml}
          <strong>Geldig tot:</strong> ${escapeHtml(data.geldigTot)}
        </td>
      </tr>
    </table>
    ${buttonHtml}
    ${acceptLinkHtml}`
    : `
    <p style="margin: 0 0 16px 0;">Beste ${escapeHtml(data.klantNaam)},</p>
    <p style="margin: 0 0 16px 0;">
      Hierbij ontvangt u onze offerte <strong>${escapeHtml(data.offerteNummer)}</strong> voor
      <strong>${escapeHtml(data.offerteTitel)}</strong>.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 16px 0; border: 1px solid #eeeeee; border-radius: 6px;">
      <tr>
        <td style="padding: 16px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #555555;">
          ${bedragHtml}
          <strong>Geldig tot:</strong> ${escapeHtml(data.geldigTot)}
        </td>
      </tr>
    </table>
    ${buttonHtml}
    ${acceptLinkHtml}
    <p style="margin: 16px 0 0 0;">
      Heeft u vragen over deze offerte? Neem gerust contact met ons op. Wij helpen u graag verder.
    </p>
    <p style="margin: 16px 0 0 0;">Met vriendelijke groet,</p>`

  const { wrap } = getBaseTemplate(data)
  const html = wrap(bodyHtml)

  const text = [
    `Beste ${data.klantNaam},`,
    '',
    `Hierbij ontvangt u onze offerte ${data.offerteNummer} voor ${data.offerteTitel}.`,
    '',
    `Totaalbedrag: ${data.totaalBedragExcl} excl. btw`,
    ...(toonIncl ? [`${data.totaalBedragIncl} incl. btw`] : []),
    `Geldig tot: ${data.geldigTot}`,
    '',
    data.bekijkUrl ? `Bekijk, accepteer of reageer op deze offerte: ${data.bekijkUrl}` : '',
    '',
    'Heeft u vragen over deze offerte? Neem gerust contact met ons op. Wij helpen u graag verder.',
    '',
    'Met vriendelijke groet,',
    data.handtekening || '',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .trim()

  return { subject, html, text }
}

// ---------------------------------------------------------------------------
// 2. Offerte goedgekeurd
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 3. Offerte follow-up
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 4. Factuur verzenden
// ---------------------------------------------------------------------------

export function factuurVerzendTemplate(data: FactuurEmailData): EmailResult {
  const kleur = data.primaireKleur || DEFAULT_KLEUR
  const subject = `Factuur ${data.factuurNummer} - ${data.factuurTitel}`

  const buttonHtml = data.betaalUrl
    ? renderButton('Factuur betalen', data.betaalUrl, kleur)
    : ''

  const heeftPersoonlijkBericht = !!data.persoonlijkBericht?.trim()

  // Eigen bericht vervangt de standaardregel: is er een persoonlijk bericht,
  // dan vormt dat de openingstekst en valt "Hierbij ontvangt u factuur …" weg.
  const persoonlijkHtml = heeftPersoonlijkBericht
    ? `<p style="margin: 0 0 16px 0; white-space: pre-line;">${escapeHtml(data.persoonlijkBericht!.trim())}</p>`
    : ''

  const standaardRegelHtml = heeftPersoonlijkBericht
    ? ''
    : `<p style="margin: 0 0 16px 0;">
      Hierbij ontvangt u factuur <strong>${escapeHtml(data.factuurNummer)}</strong> voor
      <strong>${escapeHtml(data.factuurTitel)}</strong>.
    </p>`

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Beste ${escapeHtml(data.klantNaam)},</p>
    ${persoonlijkHtml}
    ${standaardRegelHtml}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 16px 0; border: 1px solid #eeeeee; border-radius: 6px;">
      <tr>
        <td style="padding: 16px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #555555;">
          <strong>Totaalbedrag:</strong> ${escapeHtml(data.totaalBedrag)}<br />
          <strong>Vervaldatum:</strong> ${escapeHtml(data.vervaldatum)}
        </td>
      </tr>
    </table>
    ${buttonHtml}
    <p style="margin: 16px 0 0 0;">
      Wij verzoeken u vriendelijk het bedrag voor de vervaldatum over te maken.
      Heeft u vragen over deze factuur? Neem gerust contact met ons op.
    </p>
    <p style="margin: 16px 0 0 0;">Met vriendelijke groet,</p>`

  const { wrap } = getBaseTemplate(data)
  const html = wrap(bodyHtml)

  const text = [
    `Beste ${data.klantNaam},`,
    '',
    ...(heeftPersoonlijkBericht
      ? [data.persoonlijkBericht!.trim(), '']
      : [`Hierbij ontvangt u factuur ${data.factuurNummer} voor ${data.factuurTitel}.`]),
    '',
    `Totaalbedrag: ${data.totaalBedrag}`,
    `Vervaldatum: ${data.vervaldatum}`,
    '',
    data.betaalUrl ? `Betaal de factuur: ${data.betaalUrl}` : '',
    '',
    'Wij verzoeken u vriendelijk het bedrag voor de vervaldatum over te maken. Heeft u vragen over deze factuur? Neem gerust contact met ons op.',
    '',
    'Met vriendelijke groet,',
    data.handtekening || '',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .trim()

  return { subject, html, text }
}

// ---------------------------------------------------------------------------
// 5. Factuur herinnering
// ---------------------------------------------------------------------------

export function factuurHerinneringTemplate(data: FactuurHerinneringData): EmailResult {
  const kleur = data.primaireKleur || DEFAULT_KLEUR
  const kop = data.heading?.trim() || 'Herinnering'
  const subject = `${kop}: Factuur ${data.factuurNummer}`

  const buttonHtml = data.betaalUrl
    ? renderButton('Factuur betalen', data.betaalUrl, kleur)
    : ''

  const eigenTekst = data.eigenTekst?.trim() || ''
  const kopHtml = data.heading?.trim()
    ? `<p style="margin: 0 0 16px 0; font-size: 18px; font-weight: bold; color: #333333;">${escapeHtml(kop)}</p>`
    : ''

  // Met een ingestelde tekst draagt die tekst de mail; het vaste vriendelijke
  // blok zou een aanmaning anders als eerste herinnering laten lezen.
  const tekstHtml = eigenTekst
    ? `<div style="margin: 0 0 16px 0;">${escapeHtml(eigenTekst).replace(/\n/g, '<br />')}</div>`
    : `
    <p style="margin: 0 0 16px 0;">Beste ${escapeHtml(data.klantNaam)},</p>
    <p style="margin: 0 0 16px 0;">
      Graag willen wij u er vriendelijk aan herinneren dat factuur
      <strong>${escapeHtml(data.factuurNummer)}</strong> voor
      <strong>${escapeHtml(data.factuurTitel)}</strong> inmiddels
      <strong>${data.dagenVervallen} ${data.dagenVervallen === 1 ? 'dag' : 'dagen'}</strong>
      over de vervaldatum is.
    </p>`

  const afsluitingHtml = eigenTekst
    ? ''
    : `
    <p style="margin: 16px 0 0 0;">
      Indien u de betaling reeds heeft voldaan, kunt u deze herinnering als niet verzonden beschouwen.
      Mocht u vragen hebben, neem dan gerust contact met ons op.
    </p>
    <p style="margin: 16px 0 0 0;">Met vriendelijke groet,</p>`

  const infoBlokHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 16px 0; border: 1px solid #eeeeee; border-radius: 6px;">
      <tr>
        <td style="padding: 16px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #555555;">
          <strong>Openstaand bedrag:</strong> ${escapeHtml(data.totaalBedrag)}<br />
          <strong>Vervaldatum:</strong> ${escapeHtml(data.vervaldatum)}<br />
          <strong>Dagen vervallen:</strong> ${data.dagenVervallen}
        </td>
      </tr>
    </table>
    ${buttonHtml}`

  // Bewuste volgorde: de ingestelde tekst is één ondeelbaar blok dat op een
  // groet eindigt, dus het bedragblok en de betaalknop staan eronder — het
  // gangbare patroon in facturatie-mails (brief eerst, betaalinformatie als
  // afsluitend blok). Boven de aanhef zetten leest als een bijlage vóór de
  // brief. Zonder eigen tekst blijft de oude volgorde inclusief afsluiting.
  const bodyHtml = eigenTekst
    ? `
    ${kopHtml}
    ${tekstHtml}
    ${infoBlokHtml}`
    : `
    ${kopHtml}
    ${tekstHtml}
    ${infoBlokHtml}
    ${afsluitingHtml}`

  const { wrap } = getBaseTemplate(data)
  const html = wrap(bodyHtml)

  const text = [
    ...(eigenTekst
      ? [eigenTekst]
      : [
          `Beste ${data.klantNaam},`,
          '',
          `Graag willen wij u er vriendelijk aan herinneren dat factuur ${data.factuurNummer} voor ${data.factuurTitel} inmiddels ${data.dagenVervallen} ${data.dagenVervallen === 1 ? 'dag' : 'dagen'} over de vervaldatum is.`,
        ]),
    '',
    `Openstaand bedrag: ${data.totaalBedrag}`,
    `Vervaldatum: ${data.vervaldatum}`,
    `Dagen vervallen: ${data.dagenVervallen}`,
    '',
    data.betaalUrl ? `Betaal de factuur: ${data.betaalUrl}` : '',
    ...(eigenTekst
      ? []
      : [
          '',
          'Indien u de betaling reeds heeft voldaan, kunt u deze herinnering als niet verzonden beschouwen. Mocht u vragen hebben, neem dan gerust contact met ons op.',
          '',
          'Met vriendelijke groet,',
          data.handtekening || '',
        ]),
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .trim()

  return { subject, html, text }
}

// ---------------------------------------------------------------------------
// 6. Tekening goedkeuring
// ---------------------------------------------------------------------------

export function tekeningGoedkeuringTemplate(data: TekeningGoedkeuringData): EmailResult {
  const kleur = data.primaireKleur || DEFAULT_KLEUR
  const subject = `Tekening ter goedkeuring - ${data.projectNaam}`

  const beschrijvingHtml = data.beschrijving
    ? `<p style="margin: 0 0 16px 0; color: #555555; font-style: italic;">${escapeHtml(data.beschrijving).replace(/\n/g, '<br>')}</p>`
    : ''

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Beste ${escapeHtml(data.klantNaam)},</p>
    <p style="margin: 0 0 16px 0;">
      Er staat een nieuwe tekening klaar ter goedkeuring voor project
      <strong>${escapeHtml(data.projectNaam)}</strong>.
    </p>
    ${beschrijvingHtml}
    <p style="margin: 0 0 16px 0;">
      Wij vragen u vriendelijk om de tekening te bekijken en goed te keuren via onderstaande knop.
      Mocht u opmerkingen of wijzigingen hebben, dan kunt u deze direct aangeven.
    </p>
    ${renderButton('Tekening bekijken en goedkeuren', data.goedkeurUrl, kleur)}
    <p style="margin: 16px 0 0 0;">Met vriendelijke groet,</p>`

  const { wrap } = getBaseTemplate(data)
  const html = wrap(bodyHtml)

  const text = [
    `Beste ${data.klantNaam},`,
    '',
    `Er staat een nieuwe tekening klaar ter goedkeuring voor project ${data.projectNaam}.`,
    '',
    data.beschrijving || '',
    data.beschrijving ? '' : undefined,
    'Wij vragen u vriendelijk om de tekening te bekijken en goed te keuren via onderstaande link. Mocht u opmerkingen of wijzigingen hebben, dan kunt u deze direct aangeven.',
    '',
    `Tekening bekijken en goedkeuren: ${data.goedkeurUrl}`,
    '',
    'Met vriendelijke groet,',
    data.handtekening || '',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .trim()

  return { subject, html, text }
}

// ---------------------------------------------------------------------------
// Systeem-templates uit email_templates (DB-driven, fase 3 communicatie-tab)
// ---------------------------------------------------------------------------

export interface DefaultTemplate {
  naam: string
  onderwerp: string
  body: string
}

/**
 * Canonieke default-content voor systeem-templates. Identiek aan de seed
 * in `supabase/migrations/103_email_templates_activeren.sql`; dient als
 * fallback wanneer DB onbereikbaar is en als bron voor de "Herstel
 * standaard"-knop in de template-editor. Bij wijziging hier OOK 103
 * bijwerken zodat nieuwe orgs niet met verouderde content seeden.
 */
export const DEFAULT_TEMPLATES: Record<string, DefaultTemplate> = {
  offerte_opvolging_dag1: {
    naam: 'Offerte-opvolging dag 1',
    onderwerp: 'Herinnering: offerte {{offerte_nummer}}',
    body: `Hoi {{contactpersoon}},

Een paar dagen geleden stuurden we je offerte {{offerte_nummer}}. Heb je de offerte kunnen bekijken? We horen graag of je nog vragen hebt.

Bekijk de offerte hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  offerte_opvolging_dag7: {
    naam: 'Offerte-opvolging dag 7',
    onderwerp: 'Vraag over offerte {{offerte_nummer}}',
    body: `Hoi {{contactpersoon}},

We hebben nog geen reactie ontvangen op offerte {{offerte_nummer}}. Past het tarief, of zijn er onderdelen die we kunnen aanpassen? Laat het ons gerust weten.

Bekijk de offerte hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  factuur_herinnering_1: {
    naam: 'Factuur-herinnering 1',
    onderwerp: 'Vriendelijke herinnering factuur {{factuur_nummer}}',
    body: `Hoi {{contactpersoon}},

Factuur {{factuur_nummer}} van {{factuur_bedrag}} stond vervallen op {{verval_datum}}. Wil je het bedrag overmaken? Heb je de factuur al voldaan, dan kun je dit bericht negeren.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  factuur_herinnering_2: {
    naam: 'Factuur-herinnering 2',
    onderwerp: 'Tweede herinnering factuur {{factuur_nummer}}',
    body: `Hoi {{contactpersoon}},

Factuur {{factuur_nummer}} van {{factuur_bedrag}} is nog niet voldaan. We willen je vriendelijk verzoeken het bedrag binnen 7 dagen over te maken.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  factuur_herinnering_3: {
    naam: 'Factuur-herinnering 3',
    onderwerp: 'Laatste herinnering factuur {{factuur_nummer}}',
    body: `Hoi {{contactpersoon}},

Dit is de laatste herinnering voor factuur {{factuur_nummer}} van {{factuur_bedrag}}. We ontvangen graag binnen 7 dagen je betaling. Mocht er iets in de weg staan, neem dan contact met ons op.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  portaal_uitnodiging: {
    naam: 'Portaal-uitnodiging',
    onderwerp: 'Welkom in het klantportaal van {{bedrijfsnaam}}',
    body: `Hoi {{contactpersoon}},

Hierbij je persoonlijke toegang tot het klantportaal van {{bedrijfsnaam}}. Je vindt hier alle documenten, offertes en facturen voor project {{project_naam}}.

Open het portaal: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  portaal_herinnering: {
    naam: 'Portaal-herinnering',
    onderwerp: 'Herinnering: actie nodig in je portaal',
    body: `Hoi {{contactpersoon}},

Er staat nog een openstaande actie voor je klaar in het portaal van {{bedrijfsnaam}}. Wil je even kijken wanneer het je uitkomt?

Open het portaal: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}`,
  },
  onboarding_dag3: {
    naam: 'Onboarding dag 3',
    onderwerp: 'Aan de slag met doen.',
    body: `Hey {{voornaam}},

Drie dagen geleden ben je begonnen met doen. Hoe bevalt het? We helpen je graag verder als je ergens vastloopt.

Open je dashboard: {{app_url}}

Vragen? Stel ze via doen.team/contact.`,
  },
  onboarding_dag7: {
    naam: 'Onboarding dag 7',
    onderwerp: 'Hoe gaat het met doen.?',
    body: `Hey {{voornaam}},

Een week onderweg met doen. Veel gebruikers vinden de combinatie offertes plus portaal de grootste tijdwinst. Heb je dat al uitgeprobeerd?

Open je dashboard: {{app_url}}

Vragen? Stel ze via doen.team/contact.`,
  },
  trial_reminder_5: {
    naam: 'Trial-reminder 5d',
    onderwerp: 'Nog 5 dagen in je proefperiode',
    body: `Hey {{voornaam}},

Je hebt nog 5 dagen in je proefperiode van doen. Activeer je abonnement wanneer je klaar bent om door te gaan. Je houdt al je data.

Bekijk abonnement: {{abonnement_url}}`,
  },
  trial_reminder_2: {
    naam: 'Trial-reminder 2d',
    onderwerp: 'Je proefperiode loopt bijna af',
    body: `Hey {{voornaam}},

Je proefperiode van doen. loopt over 2 dagen af. Activeer nu je abonnement om zonder onderbreking door te werken.

Activeer abonnement: {{abonnement_url}}`,
  },
  trial_reminder_0: {
    naam: 'Trial-reminder 0d',
    onderwerp: 'Je proefperiode is vandaag afgelopen',
    body: `Hey {{voornaam}},

Je proefperiode van doen. is vandaag afgelopen. Je data blijft bewaard. Activeer je abonnement om weer verder te kunnen werken.

Activeer abonnement: {{abonnement_url}}`,
  },
}

export function listDefaults(): typeof DEFAULT_TEMPLATES {
  return DEFAULT_TEMPLATES
}

/**
 * Lees de systeem-template uit DB; fallback op DEFAULT_TEMPLATES bij
 * offline of ontbrekende rij. Werpt alleen op onbekende trigger-naam.
 */
export async function getTemplate(
  orgId: string,
  triggerTaskNaam: string,
): Promise<{ onderwerp: string; body: string }> {
  const fallback = DEFAULT_TEMPLATES[triggerTaskNaam]
  if (!fallback) {
    throw new Error(`Onbekende trigger_task_naam: ${triggerTaskNaam}`)
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { onderwerp: fallback.onderwerp, body: fallback.body }
  }

  const { data, error } = await supabase
    .from('email_templates')
    .select('onderwerp, body')
    .eq('organisatie_id', orgId)
    .eq('trigger_task_naam', triggerTaskNaam)
    .eq('is_systeem', true)
    .maybeSingle()

  if (error || !data) {
    return { onderwerp: fallback.onderwerp, body: fallback.body }
  }
  return { onderwerp: data.onderwerp, body: data.body }
}

/**
 * Zet de systeem-template terug naar DEFAULT_TEMPLATES. UPSERT op de
 * partial UNIQUE `(organisatie_id, trigger_task_naam) WHERE is_systeem`
 * zodat zowel een ontbrekende rij (nieuwe org) als een door de user
 * aangepaste rij gladgestreken worden.
 */
/**
 * Sla user-aangepaste systeem-template op. UPSERT op de partial UNIQUE
 * zodat een ontbrekende rij (nieuwe org) ook aangemaakt wordt zonder
 * dat de caller eerst hoeft te SELECT-checken.
 */
export async function saveSystemTemplate(
  orgId: string,
  triggerTaskNaam: string,
  content: { onderwerp: string; body: string },
): Promise<void> {
  if (!supabase) throw new Error('Niet geconfigureerd')
  const def = DEFAULT_TEMPLATES[triggerTaskNaam]
  if (!def) throw new Error(`Onbekende trigger_task_naam: ${triggerTaskNaam}`)
  await upsertSystemRow(orgId, triggerTaskNaam, def.naam, content)
}

export async function resetTemplateToDefault(
  orgId: string,
  triggerTaskNaam: string,
): Promise<void> {
  if (!supabase) throw new Error('Niet geconfigureerd')
  const def = DEFAULT_TEMPLATES[triggerTaskNaam]
  if (!def) throw new Error(`Onbekende trigger_task_naam: ${triggerTaskNaam}`)
  await upsertSystemRow(orgId, triggerTaskNaam, def.naam, { onderwerp: def.onderwerp, body: def.body })
}

/**
 * Handmatige SELECT-then-UPDATE-of-INSERT op de systeem-rij. PostgREST's
 * upsert kan de partial UNIQUE (WHERE is_systeem=true) niet als arbiter
 * gebruiken omdat de WHERE-clause niet meegestuurd wordt in ON CONFLICT,
 * dus we omzeilen dat met twee gerichte calls. Race-condition-risico is
 * verwaarloosbaar omdat alleen één user tegelijk een template bewerkt.
 */
async function upsertSystemRow(
  orgId: string,
  triggerTaskNaam: string,
  naam: string,
  content: { onderwerp: string; body: string },
): Promise<void> {
  if (!supabase) throw new Error('Niet geconfigureerd')

  const { data: existing, error: selectError } = await supabase
    .from('email_templates')
    .select('id')
    .eq('organisatie_id', orgId)
    .eq('trigger_task_naam', triggerTaskNaam)
    .eq('is_systeem', true)
    .maybeSingle()
  if (selectError) {
    console.error('[upsertSystemRow] select error:', selectError)
    throw new Error(selectError.message || 'Kon bestaande template niet opzoeken')
  }

  if (existing) {
    const { error } = await supabase
      .from('email_templates')
      .update({
        naam,
        onderwerp: content.onderwerp,
        body: content.body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) {
      console.error('[upsertSystemRow] update error:', error)
      throw new Error(error.message || 'Kon template niet bijwerken')
    }
  } else {
    const { error } = await supabase
      .from('email_templates')
      .insert({
        organisatie_id: orgId,
        trigger_task_naam: triggerTaskNaam,
        is_systeem: true,
        naam,
        onderwerp: content.onderwerp,
        body: content.body,
      })
    if (error) {
      console.error('[upsertSystemRow] insert error:', error)
      throw new Error(error.message || 'Kon template niet aanmaken')
    }
  }
}
