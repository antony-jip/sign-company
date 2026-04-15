/**
 * Professional HTML email template for Doen. portal notifications.
 * Uses inline CSS only (no <style> blocks, no external CSS) for maximum email client compatibility.
 */

interface PortalEmailParams {
  /** Heading text, e.g. "Er is een update voor project X" */
  heading: string
  /** Klantnaam voor de aanhef, e.g. "Antony Bootsma". Als gevuld wordt "Beste [naam]," getoond */
  klantNaam?: string
  /** Item title */
  itemTitel?: string
  /** Item description / body text */
  beschrijving?: string
  /** CTA button label */
  ctaLabel?: string
  /** CTA button URL */
  ctaUrl?: string
  /** Company name (shown in footer) */
  bedrijfsnaam?: string
  /** Optional extra line below description (e.g. customer reaction quote) */
  quote?: string
  /** URL van bedrijfslogo (wordt bovenaan email getoond) */
  logoUrl?: string
  /** Primaire merkkleur, bijv. '#1A535C'. Fallback: petrol */
  primaireKleur?: string
}

export function buildPortalEmailHtml(params: PortalEmailParams): string {
  const {
    heading,
    klantNaam,
    itemTitel,
    beschrijving,
    ctaLabel = 'Bekijk in portaal',
    ctaUrl,
    bedrijfsnaam,
    quote,
    logoUrl,
    primaireKleur,
  } = params

  // Strip eventuele "Beste X," of URL's die per ongeluk in de heading terecht
  // kwamen (door user-configured templates). De heading moet kort en clean zijn.
  let cleanHeading = heading
    .replace(/^Beste\s+[^,]+,\s*/i, '')        // strip "Beste X, " prefix
    .replace(/https?:\/\/\S+/g, '')             // strip URL's
    .replace(/Met vriendelijke groet,?\s*/gi, '') // strip groet
    .replace(bedrijfsnaam || '___NOMATCH___', '') // strip bedrijfsnaam
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleanHeading) cleanHeading = 'Er is een update voor u.'

  const accent = primaireKleur || '#1A535C'
  const accentLight = primaireKleur ? `${primaireKleur}12` : '#E8F4F4'
  const bgOuter = '#F5F4F1'
  const bgCard = '#FFFFFF'
  const textDark = '#1A1A1A'
  const textBody = '#3A3A36'
  const textMuted = '#6B6B66'
  const textLight = '#9B9B95'
  const borderLight = '#EBEBEB'

  // ── Aanhef ──
  const greetingBlock = klantNaam
    ? `<tr><td style="padding: 0 0 8px 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; color: ${textBody}; line-height: 1.6;">
        Beste ${escapeHtml(klantNaam)},
      </td></tr>`
    : ''

  // ── Item kaart ──
  const itemBlock = itemTitel
    ? `<tr><td style="padding: 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${accentLight}; border-radius: 8px; border-left: 3px solid ${accent};">
          <tr><td style="padding: 16px 20px;">
            <span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${textDark};">
              ${escapeHtml(itemTitel)}
            </span>
            ${beschrijving ? `<br/><span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; color: ${textMuted}; line-height: 1.6;">
              ${escapeHtml(beschrijving)}
            </span>` : ''}
          </td></tr>
        </table>
      </td></tr>`
    : ''

  // ── Quote blok ──
  const quoteBlock = quote
    ? `<tr><td style="padding: 0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${accentLight}; border-radius: 8px; border-left: 3px solid ${accent};">
          <tr><td style="padding: 14px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textDark}; font-style: italic; line-height: 1.6;">
            &ldquo;${escapeHtml(quote)}&rdquo;
          </td></tr>
        </table>
      </td></tr>`
    : ''

  // ── CTA knop ──
  const ctaBlock = ctaUrl
    ? `<tr><td style="padding: 24px 0 8px 0;" align="center">
        <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${accent}; color: #FFFFFF; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; line-height: 1;">
          ${escapeHtml(ctaLabel)}
        </a>
      </td></tr>`
    : ''

  // ── Groet ──
  const groetBlock = bedrijfsnaam
    ? `<tr><td style="padding: 24px 0 0 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.8;">
        Met vriendelijke groet,<br/><strong style="color: ${textDark};">${escapeHtml(bedrijfsnaam)}</strong>
      </td></tr>`
    : ''

  const footerText = bedrijfsnaam
    ? `Verzonden via doen. namens ${escapeHtml(bedrijfsnaam)}`
    : 'Verzonden via doen.'

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: ${bgOuter}; -webkit-font-smoothing: antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgOuter}; padding: 40px 0;">
  <tr><td align="center">
    <!-- Logo -->
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%;">
      <tr><td style="padding: 0 0 28px 0; text-align: center;">
        ${logoUrl
          ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || '')}" style="max-height: 44px; max-width: 180px; object-fit: contain;" />`
          : (bedrijfsnaam
            ? `<span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: ${textDark}; letter-spacing: -0.5px;">${escapeHtml(bedrijfsnaam)}</span>`
            : `<span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #2b535c; letter-spacing: -0.5px;">doen<span style="color: #df5c36;">.</span></span><br/><span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; font-weight: 400; color: #8aacb1;">slim gedaan.</span>`
          )
        }
      </td></tr>
    </table>
    <!-- Card -->
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: ${bgCard}; border-radius: 10px; border: 1px solid ${borderLight};">
      <tr><td style="padding: 36px 36px 32px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${greetingBlock}
          <tr><td style="padding: 0 0 4px 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; color: ${textBody}; line-height: 1.6;">
            ${escapeHtml(cleanHeading)}
          </td></tr>
          ${itemBlock}
          ${quoteBlock}
          ${ctaBlock}
          ${groetBlock}
        </table>
      </td></tr>
    </table>
    <!-- Footer -->
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%;">
      <tr><td style="padding: 20px 0 0 0; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; color: ${textLight}; line-height: 1.6;">
        ${footerText}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

/**
 * Replace {variabele} placeholders in email templates.
 * Supported: {projectnaam}, {itemtitel}, {klantNaam}, {bedrijfsnaam}, {portaalUrl}
 */
export function replaceEmailVariables(template: string, vars: Record<string, string>): string {
  // Support both {{var}} and {var} placeholder formats
  return template
    .replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match)
    .replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
