import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  const SENS = /password|app_password|encrypted_app_password|betaal_token|payment_token|access_token|refresh_token|mollie_api_key|authorization|cookie|secret|api_key|to|cc|bcc|email/i
  const scrub = (v: unknown, d = 0): unknown => {
    if (d > 6 || v == null) return v
    if (Array.isArray(v)) return v.map(x => scrub(x, d + 1))
    if (typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = SENS.test(k) ? '[Filtered]' : scrub(val, d + 1)
      return o
    }
    return v
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) for (const k of Object.keys(event.request.headers)) if (/authorization|cookie/i.test(k)) (event.request.headers as Record<string, string>)[k] = '[Filtered]'
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.user) { delete event.user.ip_address; delete event.user.email }
      return event
    },
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const GELDIGE_ROLLEN = ['admin', 'medewerker', 'monteur'] as const

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

function getClientIp(req: VercelRequest): string | null {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim() || null
  if (Array.isArray(fwd)) return fwd[0] || null
  return null
}

async function logAuditEvent(
  supabase: SupabaseClient,
  event: {
    organisatie_id?: string | null
    actor_user_id?: string | null
    actor_email?: string | null
    action: string
    resource_type?: string
    resource_id?: string
    metadata?: Record<string, unknown>
    ip?: string | null
  },
): Promise<void> {
  try {
    const ipHash = event.ip
      ? crypto.createHash('sha256').update(event.ip).digest('hex').slice(0, 32)
      : null
    await supabase.from('audit_log').insert({
      organisatie_id: event.organisatie_id ?? null,
      actor_user_id: event.actor_user_id ?? null,
      actor_email: event.actor_email ?? null,
      action: event.action,
      resource_type: event.resource_type ?? null,
      resource_id: event.resource_id ?? null,
      metadata: event.metadata ?? {},
      ip_hash: ipHash,
    })
  } catch (err) {
    console.warn('[audit] log failed:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const { email, rol, organisatie_id, uitgenodigd_door } = req.body as {
      email: string
      rol: string
      organisatie_id: string
      uitgenodigd_door: string
    }

    // Validatie
    if (!email || !rol || !organisatie_id || !uitgenodigd_door) {
      return res.status(400).json({ error: 'Alle velden zijn verplicht' })
    }

    if (!GELDIGE_ROLLEN.includes(rol as typeof GELDIGE_ROLLEN[number])) {
      return res.status(400).json({ error: 'Ongeldige rol' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ongeldig e-mailadres' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    // Verify user belongs to org and is admin
    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, rol, email')
      .eq('id', userId)
      .single()

    if (!requesterProfile || requesterProfile.organisatie_id !== organisatie_id) {
      return res.status(403).json({ error: 'Geen toegang tot deze organisatie' })
    }

    if (requesterProfile.rol !== 'admin') {
      return res.status(403).json({ error: 'Alleen admins kunnen teamleden uitnodigen' })
    }

    // Check of email al in de organisatie zit (bestaand profiel)
    const { data: bestaandProfiel } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .eq('organisatie_id', organisatie_id)
      .maybeSingle()

    if (bestaandProfiel) {
      return res.status(409).json({ error: 'Dit e-mailadres is al lid van de organisatie' })
    }

    // Check of er al een openstaande uitnodiging is
    const { data: bestaandeUitnodiging } = await supabaseAdmin
      .from('uitnodigingen')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .eq('organisatie_id', organisatie_id)
      .eq('status', 'verstuurd')
      .maybeSingle()

    if (bestaandeUitnodiging) {
      return res.status(409).json({ error: 'Er staat al een uitnodiging open voor dit e-mailadres' })
    }

    // Check max 10 leden per organisatie (profielen + openstaande uitnodigingen)
    const { count: profielCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organisatie_id', organisatie_id)

    const { count: uitnodigingCount } = await supabaseAdmin
      .from('uitnodigingen')
      .select('id', { count: 'exact', head: true })
      .eq('organisatie_id', organisatie_id)
      .eq('status', 'verstuurd')

    const totaalLeden = (profielCount || 0) + (uitnodigingCount || 0)
    if (totaalLeden >= 10) {
      return res.status(403).json({ error: 'Maximum aantal teamleden (10) bereikt voor deze organisatie' })
    }

    // Stuur uitnodiging via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        organisatie_id,
        rol,
        uitgenodigd_door
      },
      redirectTo: `${process.env.VITE_APP_URL || 'https://app.doen.team'}/team-welkom`
    })

    if (inviteError) {
      console.error('invite-team-member invite error:', inviteError)
      return res.status(500).json({ error: 'Kon uitnodiging niet versturen: ' + inviteError.message })
    }

    // Zorg dat het profiel correct is ingevuld (trigger is onbetrouwbaar)
    if (inviteData.user?.id) {
      const newUserId = inviteData.user.id
      // Wacht even tot trigger het profiel aanmaakt
      await new Promise(r => setTimeout(r, 500))

      // Update of maak profiel aan met juiste organisatie_id
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, organisatie_id')
        .eq('id', newUserId)
        .maybeSingle()

      if (existingProfile && !existingProfile.organisatie_id) {
        await supabaseAdmin.from('profiles').update({
          organisatie_id,
          email: email.toLowerCase(),
          rol,
          uitgenodigd_door,
          uitgenodigd_op: new Date().toISOString(),
          status: 'actief',
        }).eq('id', newUserId)
      } else if (!existingProfile) {
        await supabaseAdmin.from('profiles').insert({
          id: newUserId,
          email: email.toLowerCase(),
          organisatie_id,
          rol,
          voornaam: '',
          achternaam: '',
          uitgenodigd_door,
          uitgenodigd_op: new Date().toISOString(),
          status: 'actief',
        })
      }

      // Maak medewerker record aan
      await supabaseAdmin.from('medewerkers').insert({
        naam: email.split('@')[0],
        email: email.toLowerCase(),
        user_id: newUserId,
        organisatie_id,
        status: 'actief',
        rol,
      }).select().maybeSingle()
    }

    // Sla uitnodiging op in de database
    const { data: uitnodiging, error: uitnodigingError } = await supabaseAdmin
      .from('uitnodigingen')
      .insert({
        organisatie_id,
        email: email.toLowerCase(),
        rol,
        uitgenodigd_door,
        status: 'verstuurd'
      })
      .select()
      .single()

    if (uitnodigingError) {
      console.error('invite-team-member db error:', uitnodigingError)
      return res.status(500).json({ error: 'Uitnodiging verstuurd maar kon niet opgeslagen worden' })
    }

    await logAuditEvent(supabaseAdmin, {
      organisatie_id,
      actor_user_id: userId,
      actor_email: requesterProfile.email ?? null,
      action: 'team.member_invited',
      resource_type: 'team_member',
      resource_id: inviteData.user?.id || uitnodiging.id,
      metadata: { invited_email: email.toLowerCase(), rol },
      ip: getClientIp(req),
    })

    return res.status(201).json({ uitnodiging, user: inviteData.user })
  } catch (error) {
    if ((error as Error).message === 'Niet geautoriseerd' || (error as Error).message === 'Ongeldige sessie') {
      return res.status(401).json({ error: (error as Error).message })
    }
    console.error('invite-team-member error:', error)
    Sentry.captureException(error)
    return res.status(500).json({ error: 'Er ging iets mis bij het versturen van de uitnodiging' })
  }
}
