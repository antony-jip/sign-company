/**
 * portaalNotificatieService.ts
 *
 * Centralised email/notification logic for the portaal system.
 * This is a CLIENT-SIDE service (runs in browser), uses gmailService.sendEmail()
 * which calls the /api/send-email Vercel endpoint under the hood.
 *
 * The API routes (api/portaal-reactie.ts etc.) keep their own inline logic
 * because they run on Vercel and cannot import from src/.
 *
 * Prepared for future Trigger.dev integration — each exported async function
 * maps to a future Trigger.dev task.
 */

import { sendEmail } from '@/services/gmailService'
import { buildPortalEmailHtml, replaceEmailVariables } from '@/utils/emailTemplate'

// Re-export replaceEmailVariables as replaceTemplateVariables for convenience
export { replaceEmailVariables }

/**
 * Replace {{var_name}} and {var_name} patterns in a template string.
 * Delegates to the existing replaceEmailVariables from emailTemplate.ts,
 * but kept as a named export for clarity in notification contexts.
 */
export function replaceTemplateVariables(
  template: string,
  vars: Record<string, string>
): string {
  return replaceEmailVariables(template, vars)
}

// ============ TYPES ============

interface SendResult {
  success: boolean
  error?: string
}

// ============ EMAIL FUNCTIES (straks Trigger.dev tasks) ============

/**
 * Send notification email to client about a new portaal item.
 * Used by ProjectPortaalTab when sharing items with clients.
 */
export async function sendPortaalItemNotificatie(params: {
  klantEmail: string
  klantNaam: string
  bedrijfsNaam: string
  projectNaam: string
  portaalLink: string
  itemType: 'offerte' | 'tekening' | 'factuur' | 'bestand' | 'bericht'
  itemTitel?: string
  logoUrl?: string
  primaireKleur?: string
  /** Custom email templates from portaal_instellingen */
  templateOverrides?: {
    onderwerp?: string
    inhoud?: string
  }
}): Promise<SendResult> {
  try {
    const {
      klantEmail,
      klantNaam,
      bedrijfsNaam,
      projectNaam,
      portaalLink,
      itemType,
      itemTitel,
      logoUrl,
      primaireKleur,
      templateOverrides,
    } = params

    const titel = itemTitel || itemType

    // Build template variables for replacement
    const vars: Record<string, string> = {
      // {{var}} format
      klant_naam: klantNaam,
      project_naam: projectNaam,
      portaal_link: portaalLink,
      bedrijfsnaam: bedrijfsNaam,
      item_type: titel,
      // {var} legacy format
      projectnaam: projectNaam,
      itemtitel: titel,
      klantNaam,
      portaalUrl: portaalLink,
    }

    const onderwerp = templateOverrides?.onderwerp
      ? replaceTemplateVariables(templateOverrides.onderwerp, vars)
      : `${bedrijfsNaam || 'Nieuw item'} — ${titel}`

    const heading = templateOverrides?.inhoud
      ? replaceTemplateVariables(templateOverrides.inhoud, vars)
      : `Er is een nieuw item gedeeld voor project ${projectNaam}.`

    const plainBody = [
      `Beste ${klantNaam},`,
      '',
      heading,
      '',
      `Item: ${titel}`,
      '',
      `Bekijk het hier: ${portaalLink}`,
      '',
      `Met vriendelijke groet,`,
      bedrijfsNaam || 'Het team',
    ].join('\n')

    const htmlBody = buildPortalEmailHtml({
      heading,
      klantNaam,
      itemTitel: titel,
      beschrijving: `Project: ${projectNaam}`,
      ctaLabel: 'Bekijk in portaal',
      ctaUrl: portaalLink,
      bedrijfsnaam: bedrijfsNaam,
      logoUrl,
      primaireKleur,
    })

    await sendEmail(klantEmail, onderwerp, plainBody, { html: htmlBody })

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('[portaalNotificatie] sendPortaalItemNotificatie mislukt:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Send reminder email to client about unanswered portaal items.
 * Used by the herinnering system (usePortaalHerinnering hook).
 */
export async function sendPortaalHerinneringEmail(params: {
  klantEmail: string
  klantNaam: string
  bedrijfsNaam: string
  projectNaam: string
  portaalLink: string
  dagenOpen: number
  onbeantwoordeItems: number
  itemTitel: string
  logoUrl?: string
  primaireKleur?: string
  templateOverrides?: {
    onderwerp?: string
    inhoud?: string
  }
}): Promise<SendResult> {
  try {
    const {
      klantEmail,
      klantNaam,
      bedrijfsNaam,
      projectNaam,
      portaalLink,
      itemTitel,
      logoUrl,
      primaireKleur,
      templateOverrides,
    } = params

    // Template variables for replacement
    const vars: Record<string, string> = {
      klant_naam: klantNaam,
      klantnaam: klantNaam,
      bedrijfsnaam: bedrijfsNaam,
      project_naam: projectNaam,
      projectnaam: projectNaam,
      portaal_link: portaalLink,
      item_type: itemTitel,
    }

    const onderwerp = templateOverrides?.onderwerp
      ? replaceTemplateVariables(templateOverrides.onderwerp, vars)
      : `Herinnering: ${itemTitel} wacht op uw reactie`

    const heading = templateOverrides?.inhoud
      ? replaceTemplateVariables(templateOverrides.inhoud, vars)
      : `U heeft nog niet gereageerd op ${itemTitel} voor project ${projectNaam}.`

    const plainBody = [
      `Beste ${klantNaam},`,
      '',
      heading,
      '',
      `Bekijk het hier: ${portaalLink}`,
      '',
      `Met vriendelijke groet,`,
      bedrijfsNaam || 'Het team',
    ].join('\n')

    const htmlBody = buildPortalEmailHtml({
      heading: templateOverrides?.inhoud ? heading : `Herinnering: ${itemTitel}`,
      klantNaam,
      itemTitel,
      beschrijving: templateOverrides?.inhoud ? undefined : heading,
      ctaLabel: 'Bekijk in portaal',
      ctaUrl: portaalLink,
      bedrijfsnaam: bedrijfsNaam,
      logoUrl,
      primaireKleur,
    })

    await sendEmail(klantEmail, onderwerp, plainBody, { html: htmlBody })

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('[portaalNotificatie] sendPortaalHerinneringEmail mislukt:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Send notification to the business user when a client reacts on a portaal item.
 * CLIENT-SIDE version — called from components/hooks, NOT from API routes.
 * The API route (api/portaal-reactie.ts) has its own inline version of this.
 */
export async function sendPortaalReactieNotificatie(params: {
  userId: string
  klantNaam: string
  projectNaam: string
  projectId: string
  reactieType: 'goedkeuring' | 'revisie' | 'bericht'
  itemTitel: string
  bericht?: string
  portaalLink: string
  logoUrl?: string
  primaireKleur?: string
  bedrijfsNaam?: string
}): Promise<SendResult> {
  try {
    const {
      klantNaam,
      projectNaam,
      projectId,
      reactieType,
      itemTitel,
      bericht,
      portaalLink,
      logoUrl,
      primaireKleur,
      bedrijfsNaam,
    } = params

    const actieLabel =
      reactieType === 'goedkeuring' ? 'goedgekeurd' :
      reactieType === 'revisie' ? 'revisie gevraagd' :
      'een bericht gestuurd'

    const onderwerp =
      reactieType === 'goedkeuring' ? `Goedgekeurd: ${itemTitel} — ${klantNaam}` :
      reactieType === 'revisie' ? `Revisie gevraagd: ${itemTitel} — ${klantNaam}` :
      `Nieuw bericht: ${itemTitel} — ${klantNaam}`

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin

    const plainBody = [
      `${klantNaam} heeft ${actieLabel}:`,
      bericht?.trim() ? `\n"${bericht.trim()}"` : '',
      `\nItem: ${itemTitel}`,
      `Project: ${projectNaam}`,
      `\nBekijk: ${appUrl}/projecten/${projectId}`,
    ].filter(Boolean).join('\n')

    const htmlBody = buildPortalEmailHtml({
      heading: `${klantNaam} heeft ${actieLabel}`,
      itemTitel,
      beschrijving: `Project: ${projectNaam}`,
      quote: bericht?.trim() || undefined,
      ctaLabel: 'Bekijk in portaal',
      ctaUrl: portaalLink || `${appUrl}/projecten/${projectId}`,
      bedrijfsnaam: bedrijfsNaam,
      logoUrl,
      primaireKleur,
    })

    // sendEmail goes through the /api/send-email endpoint which uses
    // the current user's SMTP credentials from user_email_settings
    await sendEmail(
      '', // Empty 'to' — the API route resolves the user's own email
      onderwerp,
      plainBody,
      { html: htmlBody }
    )

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('[portaalNotificatie] sendPortaalReactieNotificatie mislukt:', msg)
    return { success: false, error: msg }
  }
}

// ============ LOGGING FUNCTIES (straks Trigger.dev logging) ============

/**
 * Log portaal activity. Currently console-only, will be replaced with
 * Trigger.dev event logging in the future.
 */
export async function logPortaalActiviteit(params: {
  portaalId: string
  actie:
    | 'bekeken'
    | 'item_goedgekeurd'
    | 'item_revisie'
    | 'bericht_verstuurd'
    | 'bestand_geupload'
    | 'herinnering_verstuurd'
    | 'email_geopend'
  metadata?: Record<string, unknown>
}): Promise<void> {
  console.log(`[portaal-activiteit] ${params.actie}`, {
    portaalId: params.portaalId,
    ...params.metadata,
  })
}

// ============ HERINNERING SCHEDULING (straks Trigger.dev scheduled task) ============
