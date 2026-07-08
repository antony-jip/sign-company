import type { VercelRequest, VercelResponse } from '@vercel/node'
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
  console.warn('[ratelimit] UPSTASH env vars missing for portaal-link-aanvragen, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(3, '3600 s'), prefix: 'rl:portaal-link-aanvragen', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] portaal-link-aanvragen id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] portaal-link-aanvragen id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return 'unknown'
}

const APP_URL = process.env.APP_URL || 'https://app.doen.team'

// ---- Inline email template (Vercel bundelt geen lokale imports in api/) ----
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildNieuweLinkEmailHtml(params: {
  bedrijfsnaam?: string; logoUrl?: string; projectNaam?: string; portaalUrl: string
}): string {
  const { bedrijfsnaam, logoUrl, projectNaam, portaalUrl } = params
  const textDark = '#1A1A1A', textMuted = '#5A5A55', textLight = '#8A8A85'
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || '')}" style="max-height: 48px; max-width: 200px; object-fit: contain;" />`
    : bedrijfsnaam
    ? `<span style="font-family: Arial, sans-serif; font-size: 22px; color: ${textDark}; letter-spacing: -0.5px;"><strong>${escapeHtml(bedrijfsnaam)}</strong></span>`
    : ''
  const ctaBlock = `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(portaalUrl)}" target="_blank" style="display: inline-block; background-color: #1A535C; color: #FFFFFF; font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">Open het portaal &rarr;</a></td></tr>`
  const groetBlock = bedrijfsnaam ? `<tr><td style="padding: 20px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.8;">Met vriendelijke groet,<br/><strong style="color: ${textDark};">${escapeHtml(bedrijfsnaam)}</strong></td></tr>` : ''
  const footerText = bedrijfsnaam ? `Verzonden namens ${escapeHtml(bedrijfsnaam)}` : ''
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #F4F3F0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F3F0; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 0 0 24px 0; text-align: center;">${logoHtml}</td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 40px 40px 36px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 20px; font-weight: 700; color: ${textDark}; line-height: 1.3;">Uw nieuwe portaallink</td></tr><tr><td style="padding: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 14px; color: ${textMuted}; line-height: 1.6;">U vroeg een nieuwe link aan${projectNaam ? ` voor het project <strong style="color: ${textDark};">${escapeHtml(projectNaam)}</strong>` : ''}. Via onderstaande knop heeft u weer toegang.</td></tr>${ctaBlock}${groetBlock}</table></td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 24px 0 0 0; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: ${textLight}; line-height: 1.6;">${footerText}</td></tr></table></td></tr></table></body></html>`
}
// ---- Einde inline email template ----

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!(await enforceRateLimit(getClientIp(req), res))) return

  try {
    const { token, email } = req.body as { token: string; email: string }

    if (!token || !email) {
      return res.status(400).json({ error: 'Token en email zijn verplicht' })
    }

    // Basis email validatie
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ongeldig email adres' })
    }

    // Zoek portaal op basis van token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, project_id, user_id, actief, verloopt_op')
      .eq('token', token)
      .single()

    if (!portaal) {
      // Geef altijd succes terug om geen info te lekken
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Haal klant email op via project
    const { data: project } = await supabaseAdmin
      .from('projecten')
      .select('klant_id')
      .eq('id', portaal.project_id)
      .single()

    if (!project?.klant_id) {
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Controleer of email overeenkomt met klant
    const { data: klant } = await supabaseAdmin
      .from('klanten')
      .select('email')
      .eq('id', project.klant_id)
      .single()

    if (!klant || klant.email?.toLowerCase() !== email.toLowerCase()) {
      // Geef altijd succes terug om geen info te lekken
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Bewust gesloten portaal (actief=false) blijft dicht — dat heropenen is
    // een beslissing van het bedrijf, dus alleen een notificatie aanmaken.
    if (portaal.actief === false) {
      await supabaseAdmin
        .from('app_notificaties')
        .insert({
          user_id: portaal.user_id,
          type: 'herinnering',
          titel: 'Nieuwe portaallink aangevraagd',
          bericht: `Een klant (${email}) vroeg een nieuwe link aan, maar het portaal is gesloten. Heropen het portaal om weer toegang te geven.`,
          link: `/projecten/${portaal.project_id}?tab=portaal`,
          project_id: portaal.project_id,
        })
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Email matcht en portaal is alleen verlopen — verleng tot minimaal 30
    // dagen vanaf nu (nooit inkorten) en mail de link direct naar het
    // geverifieerde klant-adres.
    const minVerloopt = Date.now() + 30 * 24 * 60 * 60 * 1000
    const huidigVerloopt = new Date(portaal.verloopt_op).getTime() || 0
    await supabaseAdmin
      .from('project_portalen')
      .update({
        verloopt_op: new Date(Math.max(minVerloopt, huidigVerloopt)).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', portaal.id)

    try {
      const { data: projectInfo } = await supabaseAdmin
        .from('projecten')
        .select('naam')
        .eq('id', portaal.project_id)
        .maybeSingle()

      let bedrijfUserId = portaal.user_id
      const { data: profielRij } = await supabaseAdmin
        .from('profiles')
        .select('organisatie_id')
        .eq('id', portaal.user_id)
        .maybeSingle()
      if (profielRij?.organisatie_id) {
        const { data: org } = await supabaseAdmin
          .from('organisaties')
          .select('eigenaar_id')
          .eq('id', profielRij.organisatie_id)
          .maybeSingle()
        if (org?.eigenaar_id) bedrijfUserId = org.eigenaar_id
      }
      const { data: bedrijfsProfiel } = await supabaseAdmin
        .from('profiles')
        .select('bedrijfsnaam, logo_url, bedrijfs_email')
        .eq('id', bedrijfUserId)
        .maybeSingle()
      const bedrijfsnaam = bedrijfsProfiel?.bedrijfsnaam || ''

      const html = buildNieuweLinkEmailHtml({
        bedrijfsnaam: bedrijfsnaam || undefined,
        logoUrl: bedrijfsProfiel?.logo_url || undefined,
        projectNaam: projectInfo?.naam || undefined,
        portaalUrl: `${APP_URL}/portaal/${token}`,
      })

      const { Resend } = await import('resend')
      const resendClient = new Resend(process.env.RESEND_API_KEY)
      await resendClient.emails.send({
        from: `"${(bedrijfsnaam || 'doen.').replace(/"/g, '')}" <noreply@doen.team>`,
        to: email,
        replyTo: bedrijfsProfiel?.bedrijfs_email || undefined,
        subject: projectInfo?.naam ? `Uw nieuwe portaallink voor ${projectInfo.naam}` : 'Uw nieuwe portaallink',
        html,
      })
    } catch (mailErr) {
      console.error('portaal-link-aanvragen: mail versturen mislukt:', mailErr)
    }

    // Notificatie voor de eigenaar dat de link automatisch is verlengd
    await supabaseAdmin
      .from('app_notificaties')
      .insert({
        user_id: portaal.user_id,
        type: 'herinnering',
        titel: 'Portaallink automatisch verlengd',
        bericht: `De klant (${email}) vroeg een nieuwe portaallink aan. Het portaal is 30 dagen verlengd en de link is per e-mail verstuurd.`,
        link: `/projecten/${portaal.project_id}?tab=portaal`,
        project_id: portaal.project_id,
      })

    // Activiteitenlog
    await supabaseAdmin
      .from('portaal_activiteiten')
      .insert({
        portaal_id: portaal.id,
        actie: 'portaal_verlengd',
        metadata: { via: 'klant_aanvraag', email },
      })
      .then(() => {}, () => {})

    return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
  } catch (error) {
    console.error('portaal-link-aanvragen error:', error)
    return res.status(500).json({ error: 'Er ging iets mis. Probeer het later opnieuw.' })
  }
}
