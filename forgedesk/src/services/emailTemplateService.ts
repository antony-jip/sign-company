// Email template service for Doen.
// All templates are in Dutch and return { subject, html, text } objects

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface EmailTemplateData {
  bedrijfsnaam?: string
  handtekening?: string
  handtekeningAfbeelding?: string
  handtekeningAfbeeldingGrootte?: number
  logoUrl?: string
  primaireKleur?: string
}

interface OfferteEmailData extends EmailTemplateData {
  klantNaam: string
  offerteNummer: string
  offerteTitel: string
  totaalBedrag: string
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
}

interface FactuurHerinneringData extends FactuurEmailData {
  dagenVervallen: number
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

const DEFAULT_KLEUR = '#2941aa'
const DEFAULT_BEDRIJFSNAAM = 'Ons Bedrijf'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape special HTML characters to prevent injection.
 */
function escapeHtml(value: string): string {
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
          <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
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
    const hasLogo = !!(data.logoUrl && data.logoUrl.trim())
  const logoHtml = hasLogo
      ? `<img src="${escapeHtml(data.logoUrl!)}" alt="${escapeHtml(bedrijf)}" style="max-height: 48px; margin-bottom: 8px; display: block;" />`
      : ''

    const sigImgHeight = data.handtekeningAfbeeldingGrootte ?? 64
    const sigImgHtml = data.handtekeningAfbeelding
      ? `<br /><img src="${escapeHtml(data.handtekeningAfbeelding)}" alt="" style="max-height:${sigImgHeight}px;max-width:240px;object-fit:contain;margin-top:8px;display:block;" />`
      : ''
    const handtekeningHtml = data.handtekening
      ? `
          <tr>
            <td style="padding: 24px 32px 0 32px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #555555; white-space: pre-line;">
              ${escapeHtml(data.handtekening)}${sigImgHtml}
            </td>
          </tr>`
      : ''

    const afmeldHtml = afmeldUrl
      ? `
          <tr>
            <td style="padding: 16px 32px 0 32px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #999999;">
              <a href="${escapeHtml(afmeldUrl)}" style="color: #999999; text-decoration: underline;">Afmelden voor e-mails</a>
            </td>
          </tr>`
      : `
          <tr>
            <td style="padding: 16px 32px 0 32px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #999999;">
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
              <span style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: bold; color: #ffffff;">
                ${escapeHtml(bedrijf)}
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color: #333333;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Signature -->
          ${handtekeningHtml}
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #eeeeee; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #999999;">
              &copy; ${new Date().getFullYear()} ${escapeHtml(bedrijf)}. Alle rechten voorbehouden.
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
        <a href="${escapeHtml(data.bekijkUrl)}" target="_blank" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${kleur}; text-decoration: underline;">
          \u2713 Offerte accepteren of wijzigingen aanvragen
        </a>
      </p>`
    : ''

  // Split body van handtekening: alles na "Met vriendelijke groet," of de hele handtekening is apart
  function buildCustomBody(raw: string): string {
    // De body bevat plain text met \n. De handtekening zit via de template er al in.
    // Splits op regels, render als HTML paragraphs. Bewaar lege regels als spacing.
    return raw
      .split('\n')
      .map(l => l.trim() === '' ? '<br/>' : `<p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #333333;">${escapeHtml(l)}</p>`)
      .join('\n    ')
  }

  // De handtekening afbeelding apart renderen (niet escapen — is HTML/img)
  const signatureHtml = data.handtekeningAfbeelding
    ? `<div style="margin-top: 16px;"><img src="${data.handtekeningAfbeelding}" alt="Handtekening" style="max-width: ${data.handtekeningAfbeeldingGrootte || 200}px; height: auto;" /></div>`
    : data.handtekening
      ? `<div style="margin-top: 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #555555; white-space: pre-line;">${escapeHtml(data.handtekening)}</div>`
      : ''

  const bodyHtml = data.customBody
    ? `
    ${buildCustomBody(data.customBody)}
    ${signatureHtml}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 24px 0 16px 0; border: 1px solid #eeeeee; border-radius: 6px;">
      <tr>
        <td style="padding: 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #555555;">
          <strong>Totaalbedrag:</strong> ${escapeHtml(data.totaalBedrag)}<br />
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
        <td style="padding: 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #555555;">
          <strong>Totaalbedrag:</strong> ${escapeHtml(data.totaalBedrag)}<br />
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
    `Totaalbedrag: ${data.totaalBedrag}`,
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

export function offerteGoedgekeurdTemplate(data: OfferteEmailData): EmailResult {
  const subject = `Bevestiging offerte ${data.offerteNummer}`

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Beste ${escapeHtml(data.klantNaam)},</p>
    <p style="margin: 0 0 16px 0;">
      Hartelijk dank voor het goedkeuren van offerte <strong>${escapeHtml(data.offerteNummer)}</strong>
      voor <strong>${escapeHtml(data.offerteTitel)}</strong>.
    </p>
    <p style="margin: 0 0 16px 0;">
      Wij hebben uw goedkeuring in goede orde ontvangen. Ons team neemt spoedig contact met u op
      om de volgende stappen te bespreken en het verdere verloop van het project af te stemmen.
    </p>
    <p style="margin: 16px 0 0 0;">
      Mocht u in de tussentijd nog vragen hebben, aarzel dan niet om contact met ons op te nemen.
    </p>
    <p style="margin: 16px 0 0 0;">Met vriendelijke groet,</p>`

  const { wrap } = getBaseTemplate(data)
  const html = wrap(bodyHtml)

  const text = [
    `Beste ${data.klantNaam},`,
    '',
    `Hartelijk dank voor het goedkeuren van offerte ${data.offerteNummer} voor ${data.offerteTitel}.`,
    '',
    'Wij hebben uw goedkeuring in goede orde ontvangen. Ons team neemt spoedig contact met u op om de volgende stappen te bespreken en het verdere verloop van het project af te stemmen.',
    '',
    'Mocht u in de tussentijd nog vragen hebben, aarzel dan niet om contact met ons op te nemen.',
    '',
    'Met vriendelijke groet,',
    data.handtekening || '',
  ]
    .join('\n')
    .trim()

  return { subject, html, text }
}

// ---------------------------------------------------------------------------
// 3. Offerte follow-up
// ---------------------------------------------------------------------------

export function offerteFollowUpTemplate(data: OfferteEmailData): EmailResult {
  const kleur = data.primaireKleur || DEFAULT_KLEUR
  const subject = `Opvolging offerte ${data.offerteNummer}`

  const buttonHtml = data.bekijkUrl
    ? renderButton('Offerte bekijken', data.bekijkUrl, kleur)
    : ''

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Beste ${escapeHtml(data.klantNaam)},</p>
    <p style="margin: 0 0 16px 0;">
      Graag willen wij even bij u terugkomen op offerte <strong>${escapeHtml(data.offerteNummer)}</strong>
      voor <strong>${escapeHtml(data.offerteTitel)}</strong>.
    </p>
    <p style="margin: 0 0 16px 0;">
      Wij willen u er vriendelijk op wijzen dat deze offerte geldig is tot
      <strong>${escapeHtml(data.geldigTot)}</strong>. Mocht u nog vragen of opmerkingen hebben,
      dan horen wij dat uiteraard graag.
    </p>
    ${buttonHtml}
    <p style="margin: 16px 0 0 0;">
      Wij kijken ernaar uit om van u te horen.
    </p>
    <p style="margin: 16px 0 0 0;">Met vriendelijke groet,</p>`

  const { wrap } = getBaseTemplate(data)
  const html = wrap(bodyHtml)

  const text = [
    `Beste ${data.klantNaam},`,
    '',
    `Graag willen wij even bij u terugkomen op offerte ${data.offerteNummer} voor ${data.offerteTitel}.`,
    '',
    `Wij willen u er vriendelijk op wijzen dat deze offerte geldig is tot ${data.geldigTot}. Mocht u nog vragen of opmerkingen hebben, dan horen wij dat uiteraard graag.`,
    '',
    data.bekijkUrl ? `Bekijk de offerte: ${data.bekijkUrl}` : '',
    '',
    'Wij kijken ernaar uit om van u te horen.',
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
// 4. Factuur verzenden
// ---------------------------------------------------------------------------

export function factuurVerzendTemplate(data: FactuurEmailData): EmailResult {
  const kleur = data.primaireKleur || DEFAULT_KLEUR
  const subject = `Factuur ${data.factuurNummer} - ${data.factuurTitel}`

  const buttonHtml = data.betaalUrl
    ? renderButton('Factuur betalen', data.betaalUrl, kleur)
    : ''

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Beste ${escapeHtml(data.klantNaam)},</p>
    <p style="margin: 0 0 16px 0;">
      Hierbij ontvangt u factuur <strong>${escapeHtml(data.factuurNummer)}</strong> voor
      <strong>${escapeHtml(data.factuurTitel)}</strong>.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 16px 0; border: 1px solid #eeeeee; border-radius: 6px;">
      <tr>
        <td style="padding: 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #555555;">
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
    `Hierbij ontvangt u factuur ${data.factuurNummer} voor ${data.factuurTitel}.`,
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
  const subject = `Herinnering: Factuur ${data.factuurNummer}`

  const buttonHtml = data.betaalUrl
    ? renderButton('Factuur betalen', data.betaalUrl, kleur)
    : ''

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Beste ${escapeHtml(data.klantNaam)},</p>
    <p style="margin: 0 0 16px 0;">
      Graag willen wij u er vriendelijk aan herinneren dat factuur
      <strong>${escapeHtml(data.factuurNummer)}</strong> voor
      <strong>${escapeHtml(data.factuurTitel)}</strong> inmiddels
      <strong>${data.dagenVervallen} ${data.dagenVervallen === 1 ? 'dag' : 'dagen'}</strong>
      over de vervaldatum is.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 16px 0; border: 1px solid #eeeeee; border-radius: 6px;">
      <tr>
        <td style="padding: 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #555555;">
          <strong>Totaalbedrag:</strong> ${escapeHtml(data.totaalBedrag)}<br />
          <strong>Vervaldatum:</strong> ${escapeHtml(data.vervaldatum)}<br />
          <strong>Dagen vervallen:</strong> ${data.dagenVervallen}
        </td>
      </tr>
    </table>
    ${buttonHtml}
    <p style="margin: 16px 0 0 0;">
      Indien u de betaling reeds heeft voldaan, kunt u deze herinnering als niet verzonden beschouwen.
      Mocht u vragen hebben, neem dan gerust contact met ons op.
    </p>
    <p style="margin: 16px 0 0 0;">Met vriendelijke groet,</p>`

  const { wrap } = getBaseTemplate(data)
  const html = wrap(bodyHtml)

  const text = [
    `Beste ${data.klantNaam},`,
    '',
    `Graag willen wij u er vriendelijk aan herinneren dat factuur ${data.factuurNummer} voor ${data.factuurTitel} inmiddels ${data.dagenVervallen} ${data.dagenVervallen === 1 ? 'dag' : 'dagen'} over de vervaldatum is.`,
    '',
    `Totaalbedrag: ${data.totaalBedrag}`,
    `Vervaldatum: ${data.vervaldatum}`,
    `Dagen vervallen: ${data.dagenVervallen}`,
    '',
    data.betaalUrl ? `Betaal de factuur: ${data.betaalUrl}` : '',
    '',
    'Indien u de betaling reeds heeft voldaan, kunt u deze herinnering als niet verzonden beschouwen. Mocht u vragen hebben, neem dan gerust contact met ons op.',
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
// 6. Tekening goedkeuring
// ---------------------------------------------------------------------------

export function tekeningGoedkeuringTemplate(data: TekeningGoedkeuringData): EmailResult {
  const kleur = data.primaireKleur || DEFAULT_KLEUR
  const subject = `Tekening ter goedkeuring - ${data.projectNaam}`

  const beschrijvingHtml = data.beschrijving
    ? `<p style="margin: 0 0 16px 0; color: #555555; font-style: italic;">${escapeHtml(data.beschrijving)}</p>`
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

