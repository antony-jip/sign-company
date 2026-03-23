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
      itemTitel: titel,
      beschrijving: `Project: ${projectNaam}`,
      ctaLabel: 'Bekijk in portaal \u2192',
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
      itemTitel,
      beschrijving: templateOverrides?.inhoud ? undefined : heading,
      ctaLabel: 'Bekijk in portaal \u2192',
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
      ctaLabel: 'Bekijk in portaal \u2192',
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

/**
 * Core reminder logic extracted from usePortaalHerinnering.
 * Checks all portaal items waiting > N days and sends reminder emails.
 * Max 1 reminder per item (tracked via notificaties table).
 * Only for offerte/tekening types.
 */
export async function checkEnVerstuurHerinneringen(params: {
  userId: string
  bedrijfsNaam: string
  logoUrl: string
}): Promise<{ verstuurd: number; errors: string[] }> {
  const { userId, bedrijfsNaam, logoUrl } = params

  const { createClient } = await import('@supabase/supabase-js')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return { verstuurd: 0, errors: ['Supabase niet geconfigureerd'] }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const result: { verstuurd: number; errors: string[] } = { verstuurd: 0, errors: [] }

  // Haal portaal instellingen op
  const { data: appSettings } = await supabase
    .from('app_settings')
    .select('portaal_instellingen')
    .eq('user_id', userId)
    .maybeSingle()

  const instellingen = (appSettings?.portaal_instellingen || {}) as {
    herinnering_na_dagen?: number
    bedrijfslogo_op_portaal?: boolean
    template_herinnering?: { onderwerp?: string; inhoud?: string }
  }

  const herinneringDagen = instellingen.herinnering_na_dagen ?? 3
  if (herinneringDagen === 0) return result // Herinneringen uitgeschakeld

  // Zoek items die > N dagen oud zijn, status 'verstuurd', type offerte/tekening
  const drempelDatum = new Date(Date.now() - herinneringDagen * 86400000).toISOString()

  const { data: items } = await supabase
    .from('portaal_items')
    .select('id, titel, type, portaal_id, project_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'verstuurd')
    .eq('zichtbaar_voor_klant', true)
    .in('type', ['offerte', 'tekening'])
    .lt('created_at', drempelDatum)

  if (!items || items.length === 0) return result

  // Check welke items al een herinnering hebben (max 1 per item OOIT)
  const itemIds = items.map(i => i.id)
  const { data: bestaandeHerinneringen } = await supabase
    .from('notificaties')
    .select('bericht')
    .eq('user_id', userId)
    .eq('type', 'portaal_herinnering')
    .in('bericht', itemIds.map(id => `herinnering:${id}`))

  const alVerstuurd = new Set(
    (bestaandeHerinneringen || []).map((n: { bericht: string }) => n.bericht.replace('herinnering:', ''))
  )

  const teVersturen = items.filter(i => !alVerstuurd.has(i.id))
  if (teVersturen.length === 0) return result

  // Group by portaal to get tokens
  const portaalIds = [...new Set(teVersturen.map(i => i.portaal_id))]
  const { data: portalen } = await supabase
    .from('project_portalen')
    .select('id, token, project_id')
    .in('id', portaalIds)
    .eq('actief', true)

  if (!portalen || portalen.length === 0) return result

  const portaalMap = new Map<string, { id: string; token: string; project_id: string }>(
    portalen.map((p: { id: string; token: string; project_id: string }) => [p.id, p] as const)
  )

  // Get project info for klant emails
  const projectIds = [...new Set(portalen.map((p: { project_id: string }) => p.project_id))]
  const { data: projecten } = await supabase
    .from('projecten')
    .select('id, naam, klant_id')
    .in('id', projectIds)

  const projectMap = new Map<string, { id: string; naam: string; klant_id: string }>(
    (projecten || []).map((p: { id: string; naam: string; klant_id: string }) => [p.id, p])
  )

  // Get klant emails
  const klantIds = [...new Set((projecten || []).map((p: { klant_id: string }) => p.klant_id).filter(Boolean))]
  const { data: klanten } = await supabase
    .from('klanten')
    .select('id, email, contactpersoon')
    .in('id', klantIds)

  const klantMap = new Map<string, { id: string; email: string; contactpersoon: string }>(
    (klanten || []).map((k: { id: string; email: string; contactpersoon: string }) => [k.id, k])
  )

  // Parallel versturen voor betere performance bij veel items
  await Promise.all(teVersturen.map(async (item) => {
    const portaal = portaalMap.get(item.portaal_id)
    if (!portaal) return

    const project = projectMap.get(item.project_id)
    const klant = project ? klantMap.get(project.klant_id) : undefined
    const klantEmail = klant?.email

    if (klantEmail) {
      const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
      const klantNaam = klant?.contactpersoon || 'klant'
      const projectNaam = project?.naam || 'project'
      const dagenOpen = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)

      const emailResult = await sendPortaalHerinneringEmail({
        klantEmail,
        klantNaam,
        bedrijfsNaam: bedrijfsNaam,
        projectNaam,
        portaalLink: portaalUrl,
        dagenOpen,
        onbeantwoordeItems: 1,
        itemTitel: item.titel,
        logoUrl: (instellingen.bedrijfslogo_op_portaal !== false && logoUrl) ? logoUrl : undefined,
        templateOverrides: instellingen.template_herinnering,
      })

      if (emailResult.success) {
        result.verstuurd++
      } else if (emailResult.error) {
        result.errors.push(`${item.titel}: ${emailResult.error}`)
      }

      // Log herinnering activiteit
      await logPortaalActiviteit({
        portaalId: item.portaal_id,
        actie: 'herinnering_verstuurd',
        metadata: { itemId: item.id, klantEmail, success: emailResult.success },
      })
    }

    // Log herinnering als notificatie (intern, voor medewerker)
    await supabase.from('notificaties').insert({
      user_id: userId,
      type: 'portaal_herinnering',
      titel: `Herinnering verstuurd: ${item.titel}`,
      bericht: `herinnering:${item.id}`,
      link: `/projecten/${item.project_id}?tab=portaal`,
      project_id: item.project_id,
      gelezen: false,
      actie_genomen: false,
    })
  }))

  return result
}
