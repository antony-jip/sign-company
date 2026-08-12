import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as Sentry from '@sentry/node'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

// Terugval als organisaties.max_gebruikers nog niet gevuld is. Gelijk houden
// aan de DEFAULT van die kolom (migratie 172).
const STANDAARD_MAX_GEBRUIKERS = 10

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

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for invite-team-member, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '3600 s'), prefix: 'rl:invite-team-member', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] invite-team-member id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] invite-team-member id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    if (!(await enforceRateLimit(userId, res))) return

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
      // Alleen een GELDIGE uitnodiging blokkeert een nieuwe. Zonder deze regel
      // hield een verlopen uitnodiging het adres bezet terwijl de plekkentelling
      // hem juist niet meetelde: precies andersom dan bedoeld, en de admin kon
      // niemand meer uitnodigen zonder de oude eerst met de hand in te trekken.
      .gt('verloopt_op', new Date().toISOString())
      .maybeSingle()

    if (bestaandeUitnodiging) {
      return res.status(409).json({ error: 'Er staat al een uitnodiging open voor dit e-mailadres' })
    }

    // Plekken tellen tegen de staffel van deze organisatie (migratie 172).
    // Gedeactiveerde profielen tellen niet mee: die bezetten geen plek meer, en
    // een bedrijf dat door personeel roteert liep anders vast op oud-medewerkers.
    // Uitnodigingen tellen alleen zolang ze geldig zijn; een verlopen uitnodiging
    // wordt door handle_new_user niet meer gehonoreerd, dus die hoort ook niet
    // meer als bezette plek te gelden.
    const { data: organisatie } = await supabaseAdmin
      .from('organisaties')
      .select('max_gebruikers')
      .eq('id', organisatie_id)
      .maybeSingle()

    const maxGebruikers = Number(organisatie?.max_gebruikers ?? STANDAARD_MAX_GEBRUIKERS)

    const { count: profielCount, error: profielFout } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organisatie_id', organisatie_id)
      .or('status.is.null,status.neq.gedeactiveerd')

    const { count: uitnodigingCount, error: uitnodigingFout } = await supabaseAdmin
      .from('uitnodigingen')
      .select('id', { count: 'exact', head: true })
      .eq('organisatie_id', organisatie_id)
      .eq('status', 'verstuurd')
      .gt('verloopt_op', new Date().toISOString())

    // Fail-closed: een mislukte telling geeft count null, en dat zou als 0
    // doorgaan en meer leden toelaten dan de staffel. Liever geen uitnodiging
    // dan een plek te veel.
    if (profielFout || uitnodigingFout) {
      console.error('invite-team-member: plekken tellen mislukt', organisatie_id, profielFout, uitnodigingFout)
      return res.status(503).json({ error: 'Kon het aantal plekken niet vaststellen, probeer het zo opnieuw' })
    }

    const totaalLeden = (profielCount || 0) + (uitnodigingCount || 0)
    if (totaalLeden >= maxGebruikers) {
      return res.status(403).json({
        error: `Je abonnement heeft ${maxGebruikers} plekken en die zijn allemaal bezet. Zet een teamlid op inactief of neem contact op om je abonnement te verhogen.`,
        code: 'max_gebruikers_bereikt',
        max_gebruikers: maxGebruikers,
        in_gebruik: totaalLeden,
      })
    }

    // Sla uitnodiging EERST op zodat handle_new_user hem kan vinden
    // op email-match bij de volgende inviteUserByEmail-call.
    // verloopt_op expliciet zetten: de trigger matcht alleen op verloopt_op > NOW(),
    // dus een NULL zou betekenen dat de invite nooit matcht (user krijgt dan een
    // eigen org i.p.v. te joinen). Niet leunen op een impliciete DB-default.
    const verlooptOp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: uitnodiging, error: uitnodigingError } = await supabaseAdmin
      .from('uitnodigingen')
      .insert({
        organisatie_id,
        email: email.toLowerCase(),
        rol,
        uitgenodigd_door,
        status: 'verstuurd',
        verloopt_op: verlooptOp
      })
      .select()
      .single()

    if (uitnodigingError) {
      console.error('invite-team-member db error:', uitnodigingError)
      return res.status(500).json({ error: 'Kon uitnodiging niet opslaan' })
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

    // Defensief vangnet — trigger handle_new_user is primaire bron maar
    // kan racen met timing van auth.users row en uitnodigingen lookup.
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
