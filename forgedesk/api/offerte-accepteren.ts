import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTransport } from 'nodemailer'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for offerte-accepteren, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '3600 s'), prefix: 'rl:offerte-accepteren', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] offerte-accepteren id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] offerte-accepteren id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return 'unknown'
}

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || ''
const APP_URL = process.env.APP_URL || 'https://app.doen.team'

function decrypt(encrypted: string): string {
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const [ivHex, encHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// ---- Inline email template (Vercel bundelt geen lokale imports in api/) ----
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildPortalEmailHtml(params: {
  heading: string; itemTitel?: string; beschrijving?: string; ctaLabel?: string
  ctaUrl?: string; bedrijfsnaam?: string; quote?: string; logoUrl?: string; primaireKleur?: string
  extraHtml?: string
}): string {
  const { heading, itemTitel, beschrijving, ctaLabel = 'Bekijk online →', ctaUrl, bedrijfsnaam, quote, logoUrl, primaireKleur, extraHtml } = params
  const sage = primaireKleur || '#1A535C'
  const sageLight = primaireKleur ? `${primaireKleur}18` : '#E8EEEF'
  const bgOuter = '#F4F3F0', bgCard = '#FFFFFF', textDark = '#1A1A1A', textMuted = '#5A5A55', textLight = '#8A8A85', borderLight = '#E8E8E3'
  const itemBlock = itemTitel ? `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${borderLight}; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${textDark};">${escapeHtml(itemTitel)}</td></tr>${beschrijving ? `<tr><td style="padding: 0 20px 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.6;">${escapeHtml(beschrijving)}</td></tr>` : ''}</table></td></tr>` : ''
  const quoteBlock = quote ? `<tr><td style="padding: 0 0 20px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${sageLight}; border-radius: 8px; border-left: 4px solid ${sage};"><tr><td style="padding: 16px 20px; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textDark}; font-style: italic; line-height: 1.6;">&ldquo;${escapeHtml(quote)}&rdquo;</td></tr></table></td></tr>` : ''
  const extra = extraHtml ? `<tr><td style="padding: 0 0 16px 0;">${extraHtml}</td></tr>` : ''
  const groetBlock = bedrijfsnaam ? `<tr><td style="padding: 16px 0 0 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.8;">Met vriendelijke groet,<br/><strong style="color: ${textDark};">${escapeHtml(bedrijfsnaam)}</strong></td></tr>` : ''
  const ctaBlock = ctaUrl ? `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${sage}; color: #FFFFFF; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">${escapeHtml(ctaLabel)}</a></td></tr>` : ''
  const footerText = bedrijfsnaam ? `Verzonden namens ${escapeHtml(bedrijfsnaam)}` : ''
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || '')}" style="max-height: 48px; max-width: 200px; object-fit: contain;" />`
    : bedrijfsnaam
    ? `<span style="font-family: 'DM Sans', Arial, sans-serif; font-size: 22px; color: ${textDark}; letter-spacing: -0.5px;"><strong>${escapeHtml(bedrijfsnaam)}</strong></span>`
    : ''
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: ${bgOuter}; -webkit-font-smoothing: antialiased;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgOuter}; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 0 0 24px 0; text-align: center;">${logoHtml}</td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${bgCard}; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 40px 40px 36px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0 0 24px 0; font-family: 'DM Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: ${textDark}; line-height: 1.3;">${escapeHtml(heading)}</td></tr>${itemBlock}${extra}${quoteBlock}${groetBlock}${ctaBlock}</table></td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 24px 0 0 0; text-align: center; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: ${textLight}; line-height: 1.6;">${footerText}</td></tr></table></td></tr></table></body></html>`
}
// ---- Einde inline email template ----

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

// ── Totaalberekening bij acceptatie met keuzes ──
// Inline (api/ mag geen src/-imports bundelen). Zelfde formule als
// utils/offerteTotalen.ts::berekenOfferteTotalen, zodat de teruggeschreven
// offerte-totalen aansluiten op wat de detailpagina en de factuur verwachten.
function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

interface PrijsRegel { aantal: number; eenheidsprijs: number; btw_percentage: number; korting_percentage: number }

function variantWaarden(item: Record<string, unknown>, variantId?: string): PrijsRegel {
  const vs = Array.isArray(item.prijs_varianten) ? item.prijs_varianten as Array<Record<string, unknown>> : []
  const v = variantId ? vs.find((x) => x.id === variantId) : undefined
  const src = (v || item) as Record<string, unknown>
  return {
    aantal: Number(src.aantal) || 0,
    eenheidsprijs: Number(src.eenheidsprijs) || 0,
    btw_percentage: Number(src.btw_percentage) || 0,
    korting_percentage: Number(src.korting_percentage) || 0,
  }
}

function regelNetto(r: PrijsRegel): number {
  const bruto = r.aantal * r.eenheidsprijs
  return r2(bruto - bruto * (r.korting_percentage / 100))
}

// Reproduceert exact het bedrag dat de klant op de publieke pagina zag en
// accepteerde (OffertePubliekPagina hasSelections-tak): per-regel BTW over de
// items, en de afrondingskorting plat ná de BTW (geen BTW erover). De
// urencorrectie zit hier bewust NIET in — die toont de publieke pagina niet bij
// offertes met keuzes, dus de klant heeft er geen akkoord op gegeven.
function berekenGeaccepteerdeTotalen(regels: PrijsRegel[], afrondingskorting: number): { subtotaal: number; btw_bedrag: number; totaal: number } {
  const rawSub = r2(regels.reduce((s, r) => s + regelNetto(r), 0))
  const btw_bedrag = r2(regels.reduce((s, r) => s + r2(regelNetto(r) * (r.btw_percentage / 100)), 0))
  // Korting in het subtotaal vouwen (zonder BTW) zodat subtotaal + btw = totaal
  // intern klopt en gelijk is aan het door de klant geziene totaal.
  const subtotaal = r2(rawSub + afrondingskorting)
  return { subtotaal, btw_bedrag, totaal: r2(subtotaal + btw_bedrag) }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!(await enforceRateLimit(getClientIp(req), res))) return

  try {
    const { token, naam, gekozen_items, gekozen_varianten } = req.body as {
      token: string
      naam: string
      gekozen_items?: string[]
      gekozen_varianten?: Record<string, string>
    }

    if (!token) return res.status(400).json({ error: 'Token is verplicht' })
    if (!naam || naam.trim().length < 2) {
      return res.status(400).json({ error: 'Naam is verplicht (minimaal 2 tekens)' })
    }

    const { data: offerte, error } = await supabaseAdmin
      .from('offertes')
      .select('*')
      .eq('publiek_token', token)
      .single()

    if (error || !offerte) {
      return res.status(404).json({ error: 'Offerte niet gevonden' })
    }

    if (offerte.publiek_token_verloopt_op && new Date(offerte.publiek_token_verloopt_op) < new Date()) {
      return res.status(410).json({ error: 'Deze publieke link is verlopen' })
    }

    // Validaties
    if (offerte.status === 'goedgekeurd') {
      return res.status(400).json({ error: 'Deze offerte is al geaccepteerd' })
    }
    if (offerte.status === 'afgewezen' || offerte.status === 'gefactureerd') {
      return res.status(400).json({ error: 'Deze offerte kan niet meer worden geaccepteerd' })
    }
    if (offerte.geldig_tot && offerte.geldig_tot < new Date().toISOString().split('T')[0]) {
      return res.status(400).json({ error: 'Deze offerte is verlopen' })
    }

    const nu = new Date().toISOString()

    // Update offerte status + opslaan van klant-keuzes
    const updateData: Record<string, unknown> = {
      status: 'goedgekeurd',
      geaccepteerd_door: naam.trim(),
      geaccepteerd_op: nu,
      akkoord_op: nu,
      updated_at: nu,
    }
    if (gekozen_items) updateData.gekozen_items = gekozen_items
    if (gekozen_varianten) updateData.gekozen_varianten = gekozen_varianten

    // Bij keuzes (optionele items en/of prijsvarianten): materialiseer de door
    // de klant gekozen configuratie op de items en herbereken de offerte-
    // totalen, zodat detailpagina én factuur het geaccepteerde bedrag tonen in
    // plaats van de standaardconfiguratie. Zonder keuzes: niets aanraken.
    if (gekozen_items || gekozen_varianten) {
      const { data: rawItems } = await supabaseAdmin
        .from('offerte_items')
        .select('*')
        .eq('offerte_id', offerte.id)
      const items = (rawItems || []) as Array<Record<string, unknown>>
      const gekozenSet = new Set(gekozen_items || [])
      const varianten = gekozen_varianten || {}
      const isPrijs = (it: Record<string, unknown>) => ((it.soort as string) || 'prijs') === 'prijs'

      // Materialiseer de keuze op de items. Nooit een verplicht item verwijderen:
      // alleen gekozen optionele items vast zetten en gekozen varianten activeren.
      for (const it of items) {
        const patch: Record<string, unknown> = {}
        const vs = Array.isArray(it.prijs_varianten) ? it.prijs_varianten as Array<Record<string, unknown>> : []
        const vid = varianten[it.id as string]
        if (vid && vs.some((x) => x.id === vid) && vid !== it.actieve_variant_id) patch.actieve_variant_id = vid
        if (it.is_optioneel && gekozenSet.has(it.id as string)) patch.is_optioneel = false
        const effVid = (patch.actieve_variant_id as string) || (it.actieve_variant_id as string | undefined)
        const nt = regelNetto(variantWaarden(it, effVid))
        if (nt !== Number(it.totaal)) patch.totaal = nt
        if (Object.keys(patch).length > 0) {
          await supabaseAdmin.from('offerte_items').update(patch).eq('id', it.id)
        }
      }

      // Herbereken over de geaccepteerde config: verplichte items + gekozen
      // optionele items, met de gekozen (of standaard) variant.
      const finalRegels = items
        .filter((it) => isPrijs(it) && !(it.is_optioneel && !gekozenSet.has(it.id as string)))
        .map((it) => variantWaarden(it, (varianten[it.id as string] as string | undefined) || (it.actieve_variant_id as string | undefined)))
      const afrondingskorting = Number(offerte.afrondingskorting_excl_btw) || 0
      const totalen = berekenGeaccepteerdeTotalen(finalRegels, afrondingskorting)
      updateData.subtotaal = totalen.subtotaal
      updateData.btw_bedrag = totalen.btw_bedrag
      updateData.totaal = totalen.totaal
      updateData.aangepast_totaal = totalen.totaal
      // In-memory bijwerken zodat de acceptatie-mail/activiteit hieronder het
      // geaccepteerde bedrag tonen i.p.v. het standaardbedrag.
      offerte.subtotaal = totalen.subtotaal
      offerte.btw_bedrag = totalen.btw_bedrag
      offerte.totaal = totalen.totaal
    }

    await supabaseAdmin.from('offertes').update(updateData).eq('id', offerte.id)

    // Update gekoppeld portaal item + maak reactie aan
    const { data: portaalItems } = await supabaseAdmin
      .from('portaal_items')
      .select('id, portaal_id')
      .eq('offerte_id', offerte.id)
    if (portaalItems && portaalItems.length > 0) {
      for (const pi of portaalItems) {
        await supabaseAdmin
          .from('portaal_items')
          .update({ status: 'goedgekeurd', updated_at: nu })
          .eq('id', pi.id)
        await supabaseAdmin
          .from('portaal_reacties')
          .insert({
            portaal_item_id: pi.id,
            type: 'goedkeuring',
            klant_naam: naam.trim(),
            bericht: null,
          })
      }
    }

    // Maak notificaties aan — offerte + portaal
    const projectId = portaalItems?.[0]
      ? (await supabaseAdmin.from('portaal_items').select('project_id').eq('id', portaalItems[0].id).single()).data?.project_id
      : null

    // Project automatisch op 'akkoord-klant' zetten bij klant-akkoord (alleen vooruit).
    const projIdVoorStatus = offerte.project_id || projectId
    if (projIdVoorStatus) {
      const { data: proj } = await supabaseAdmin.from('projecten').select('status').eq('id', projIdVoorStatus).maybeSingle()
      if (proj && ['gepland', 'in-review', 'te-plannen'].includes(proj.status)) {
        await supabaseAdmin.from('projecten').update({ status: 'akkoord-klant' }).eq('id', projIdVoorStatus)
      }
    }

    await supabaseAdmin.from('notificaties').insert([
      {
        id: crypto.randomUUID(),
        user_id: offerte.user_id,
        type: 'offerte_geaccepteerd',
        titel: 'Offerte geaccepteerd',
        bericht: `${naam.trim()} heeft offerte ${offerte.nummer} geaccepteerd`,
        link: `/offertes/${offerte.id}/detail`,
        gelezen: false,
        created_at: nu,
      },
      ...(projectId ? [{
        id: crypto.randomUUID(),
        user_id: offerte.user_id,
        type: 'portaal_goedkeuring' as const,
        titel: `${naam.trim()} heeft goedgekeurd`,
        bericht: `${offerte.titel || offerte.nummer}`,
        link: `/projecten/${projectId}`,
        project_id: projectId,
        actie_genomen: false,
        gelezen: false,
        created_at: nu,
      }] : []),
    ])

    // Email via Resend — voor response zodat Vercel de function niet killt
    try {
      const { data: emailSettings } = await supabaseAdmin.from('user_email_settings')
        .select('gmail_address')
        .eq('user_id', offerte.user_id).single()

      if (emailSettings?.gmail_address) {
        const klantNaam = naam?.trim() || offerte.klant_naam || 'Klant'
        const onderwerp = `${klantNaam} heeft je offerte geaccepteerd`
        const notifHeading = `${klantNaam} heeft je offerte geaccepteerd`
        const notifItemTitel = `${offerte.nummer} — ${offerte.titel || ''}`
        const notifCtaUrl = `${APP_URL}/offertes/${offerte.id}/detail`

        const { Resend } = await import('resend')
        const resendClient = new Resend(process.env.RESEND_API_KEY)

        let bedrijf = ''
        if (offerte.klant_id) {
          const { data: klant } = await supabaseAdmin.from('klanten').select('bedrijfsnaam').eq('id', offerte.klant_id).maybeSingle()
          bedrijf = klant?.bedrijfsnaam || ''
        }
        const beschrijving = bedrijf
          ? `${escapeHtml(bedrijf)} — geaccepteerd door ${escapeHtml(klantNaam)}`
          : `Geaccepteerd door ${escapeHtml(klantNaam)}`
        const itemBlock = `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #EBEBEB; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: #1A1A1A;">${escapeHtml(notifItemTitel)}</td></tr><tr><td style="padding: 0 20px 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #6B6B66;">${beschrijving}</td></tr></table></td></tr>`
        const ctaBlock = `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(notifCtaUrl)}" target="_blank" style="display: inline-block; background-color: #1A535C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">Bekijk in doen. &rarr;</a></td></tr>`
        const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #F5F4F1;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;"><tr><td style="padding: 0 0 24px 0; text-align: center;"><span style="font-size: 24px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5px;">doen</span><span style="font-size: 24px; font-weight: 800; color: #F15025;">.</span></td></tr><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 36px 36px 32px 36px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">${escapeHtml(notifHeading)}</td></tr>${itemBlock}${ctaBlock}</table></td></tr></table></td></tr><tr><td style="padding: 20px 0 0 0; text-align: center;"><div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 16px;"></div><span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #9B9B95;"><span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> slim gedaan.</span></td></tr></table></td></tr></table></body></html>`

        await resendClient.emails.send({
          from: 'doen. <noreply@doen.team>',
          to: emailSettings.gmail_address,
          subject: onderwerp,
          html,
        })
        console.log('[offerte-accepteren] resend email sent to:', emailSettings.gmail_address)
      }
    } catch (emailErr) {
      console.error('[offerte-accepteren] email notificatie mislukt:', emailErr)
    }

    // Bevestigingsmail naar de klant — branded namens het bedrijf
    try {
      let klantEmail: string | null = null
      if (offerte.klant_id) {
        const { data: klant } = await supabaseAdmin
          .from('klanten')
          .select('email')
          .eq('id', offerte.klant_id)
          .maybeSingle()
        klantEmail = klant?.email || null
      }

      if (klantEmail) {
        let bedrijfUserId = offerte.user_id
        if (offerte.organisatie_id) {
          const { data: org } = await supabaseAdmin
            .from('organisaties')
            .select('eigenaar_id')
            .eq('id', offerte.organisatie_id)
            .maybeSingle()
          if (org?.eigenaar_id) bedrijfUserId = org.eigenaar_id
        }
        const { data: bedrijfsProfiel } = await supabaseAdmin
          .from('profiles')
          .select('bedrijfsnaam, logo_url, bedrijfs_email')
          .eq('id', bedrijfUserId)
          .maybeSingle()
        const bedrijfsnaam = bedrijfsProfiel?.bedrijfsnaam || ''

        const html = buildPortalEmailHtml({
          heading: 'Bedankt voor uw akkoord',
          itemTitel: `${offerte.nummer}${offerte.titel ? ` — ${offerte.titel}` : ''}`,
          beschrijving: `Geaccepteerd door ${naam.trim()} op ${formatDate(new Date())}${offerte.totaal ? ` · ${formatCurrency(offerte.totaal)}` : ''}`,
          quote: 'We nemen zo snel mogelijk contact met u op over de vervolgstappen.',
          bedrijfsnaam: bedrijfsnaam || undefined,
          logoUrl: bedrijfsProfiel?.logo_url || undefined,
        })

        const { Resend } = await import('resend')
        const resendClient = new Resend(process.env.RESEND_API_KEY)
        await resendClient.emails.send({
          from: `"${(bedrijfsnaam || 'doen.').replace(/"/g, '')}" <noreply@doen.team>`,
          to: klantEmail,
          replyTo: bedrijfsProfiel?.bedrijfs_email || undefined,
          subject: `Bevestiging: offerte ${offerte.nummer} geaccepteerd`,
          html,
        })
        console.log('[offerte-accepteren] klant-bevestiging verzonden naar:', klantEmail)
      }
    } catch (klantMailErr) {
      console.error('[offerte-accepteren] klant-bevestiging mislukt:', klantMailErr)
    }

    return res.status(200).json({
      success: true,
      bericht: 'Offerte succesvol geaccepteerd',
    })
  } catch (error: unknown) {
    console.error('offerte-accepteren error:', error)
    const msg = error instanceof Error ? error.message : 'Er ging iets mis'
    return res.status(500).json({ error: msg })
  }
}
