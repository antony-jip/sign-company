import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as Sentry from '@sentry/node'

// Ontkoppelt Exact Online voor de hele organisatie: gooit de tokens van de
// eigenaar weg en maakt `exact_owner_user_id` leeg zodat er weer opnieuw
// verbonden kan worden. Zonder dit pad blijft een koppeling voor altijd bij de
// eerste OAuth-gebruiker hangen en is er geen weg terug zonder DB-rechten.
//
// De configuratie (administratie, dagboek, grootboek, btw-codes, document-type)
// blijft expliciet staan: dat is handmatig ingevoerde instelling, geen
// onderdeel van de sessie. Alleen de verbinding gaat eraf.

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
    tracesSampleRate: 0,
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

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── Inline org-aware app_settings helpers ───
// Vercel serverless functions kunnen geen modules delen tussen API routes.
async function getOrgIdForUser(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return ((data as { organisatie_id?: string } | null)?.organisatie_id) ?? null
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

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, email, rol')
      .eq('id', userId)
      .maybeSingle()

    const orgId = (profile as { organisatie_id?: string } | null)?.organisatie_id
    if (!orgId) return res.status(403).json({ error: 'Geen organisatie gevonden' })

    // Rij van de eigen organisatie ophalen, met dezelfde user_id-fallback als
    // loadAppSettingsOrgFirst elders. Migratie 094 laat legacy-rijen zonder
    // organisatie_id expliciet bestaan; zonder fallback is zo'n koppeling wél
    // te zien maar niet te ontkoppelen.
    let { data: rij } = await supabaseAdmin
      .from('app_settings')
      .select('id, exact_owner_user_id, exact_online_connected')
      .eq('organisatie_id', orgId)
      .maybeSingle()

    if (!rij) {
      ;({ data: rij } = await supabaseAdmin
        .from('app_settings')
        .select('id, exact_owner_user_id, exact_online_connected')
        .eq('user_id', userId)
        .maybeSingle())
    }

    if (!rij) return res.status(404).json({ error: 'Geen Exact-koppeling gevonden voor deze organisatie' })

    const eigenaarId = (rij as { exact_owner_user_id?: string | null }).exact_owner_user_id ?? null
    const isEigenaar = !eigenaarId || eigenaarId === userId
    const isAdmin = ((profile as { rol?: string | null } | null)?.rol) === 'admin'

    // De eigenaar mag altijd. Een admin ook, zodat de koppeling niet
    // vastzit als de eigenaar niet meer beschikbaar is. Zelfde regel als
    // `magOntkoppelen` in exact-token-status.ts.
    if (!isEigenaar && !isAdmin) {
      return res.status(403).json({
        error: 'Alleen de eigenaar van de koppeling of een beheerder kan Exact Online ontkoppelen.',
      })
    }

    // Wie er opgeruimd moet worden, vóór de vlaggen bepalen: de update zet
    // `exact_owner_user_id` op null, dus daarna is niet meer te zien wiens
    // tokenrij er nog ligt en zou een retry na een gefaalde delete de rij van
    // een andere eigenaar laten staan.
    //
    // Ook die van de caller als dat iemand anders is: een oude rij van een
    // vorige eigenaar zou anders blijven staan en later alsnog als tokenhouder
    // opduiken. Alleen de rij van de eigenaar aanraken als die nog bij deze
    // organisatie hoort. `exact_tokens` heeft geen organisatie_id, dus zonder
    // deze check zou een verhuisde eigenaar zijn actieve tokens van zijn nieuwe
    // organisatie kwijtraken doordat de oude organisatie ontkoppelt.
    const eigenaarOrg = eigenaarId ? await getOrgIdForUser(supabaseAdmin, eigenaarId) : null
    const eigenaarHoortErbij = !!eigenaarId && eigenaarOrg === orgId
    const teVerwijderen = [...new Set([eigenaarHoortErbij ? eigenaarId : null, userId].filter(Boolean))] as string[]

    // Eerst de vlaggen omlaag, daarna pas de tokens weg. Andersom bestaat er
    // een venster tussen delete en update waarin een parallelle refresh de
    // verdwenen tokenrij ziet, aan `exact_owner_user_id`/`exact_online_connected`
    // afleest dat de koppeling nog leeft, en de rij via de her-insert opnieuw
    // aanmaakt — de ontkoppeling was dan ongedaan gemaakt. Met deze volgorde
    // ziet zo'n refresh een lege eigenaar en laat hij zijn keten vallen.
    const { error: updateError } = await supabaseAdmin
      .from('app_settings')
      .update({ exact_online_connected: false, exact_owner_user_id: null })
      .eq('id', (rij as { id: string }).id)

    if (updateError) {
      console.error('[exact-disconnect] app_settings bijwerken mislukt:', updateError.message)
      Sentry.captureException(new Error('Exact disconnect: settings update failed'), {
        level: 'error',
        tags: { exact_endpoint: 'exact-disconnect' },
        extra: { org_id: orgId, fout: updateError.message },
      })
      return res.status(500).json({ error: 'Ontkoppelen mislukt. Probeer het opnieuw.' })
    }

    // Sync-state opruimen: een achtergebleven rij zou de herinneringsmotor
    // permanent laten pauzeren ("Exact-stand verouderd") voor een org die
    // helemaal geen Exact meer heeft. De spiegel (exact_betaaltermijnen)
    // blijft bewust staan als audit-historie. Best-effort: vóór migratie 211
    // bestaat de tabel niet.
    const { error: stateDeleteError } = await supabaseAdmin
      .from('exact_sync_state')
      .delete()
      .eq('organisatie_id', orgId)
    if (stateDeleteError && stateDeleteError.code !== 'PGRST205') {
      console.warn('[exact-disconnect] exact_sync_state opruimen mislukt:', stateDeleteError.message)
    }

    // Tokens van de tokenhouder weg.
    const { error: deleteError } = await supabaseAdmin
      .from('exact_tokens')
      .delete()
      .in('user_id', teVerwijderen)

    if (deleteError) {
      // De vlaggen staan al uit, dus de koppeling is functioneel weg en niets
      // reanimeert hem nog. Er blijft alleen een dode tokenrij liggen; een
      // retry ruimt die alsnog op.
      console.error('[exact-disconnect] tokens verwijderen mislukt:', deleteError.message)
      Sentry.captureException(new Error('Exact disconnect: token delete failed'), {
        level: 'error',
        tags: { exact_endpoint: 'exact-disconnect' },
        extra: { org_id: orgId, fout: deleteError.message },
      })
      return res.status(500).json({ error: 'Ontkoppelen half gelukt. Herlaad de pagina en probeer het opnieuw.' })
    }

    await logAuditEvent(supabaseAdmin, {
      organisatie_id: orgId,
      actor_user_id: userId,
      actor_email: ((profile as { email?: string | null } | null)?.email) ?? null,
      action: 'integration.exact_disconnected',
      resource_type: 'integration',
      resource_id: 'exact_online',
      metadata: { vorige_eigenaar: eigenaarId, door_admin_overname: !isEigenaar },
      ip: getClientIp(req),
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    const status = message === 'Niet geautoriseerd' || message === 'Ongeldige sessie' ? 401 : 500
    console.error('[exact-disconnect] fout:', message)
    return res.status(status).json({ error: status === 401 ? message : 'Ontkoppelen mislukt' })
  }
}
