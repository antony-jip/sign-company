/**
 * Meldt collega's dat ze met @ genoemd zijn in een notitie.
 *
 * Loopt via service_role omdat een notificatie voor een ander niet vanuit de
 * client kan (notificaties-RLS is user_id-only sinds migratie 217). Controleert
 * dat de genoemde collega's in dezelfde organisatie zitten als de afzender,
 * maakt per doel een notificatie type 'genoemd' en stuurt een push met
 * categorie 'team' (die push-verstuur toetst aan de meldingsvoorkeuren).
 *
 * Body: { userIds: string[], tekst: string (max 300), link: string, bron: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MAX_DOELEN = 20
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function isRateLimited(key: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', { p_key: key, p_max_count: maxCount, p_window_seconds: windowSeconds })
  return data === true
}

async function bepaalUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

function profielNaam(p: { voornaam?: string | null; achternaam?: string | null; email?: string | null } | null): string {
  if (!p) return 'Een collega'
  return [p.voornaam, p.achternaam].filter(Boolean).join(' ') || p.email || 'Een collega'
}

function appUrl(): string {
  return process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.doen.team')
}

async function stuurPush(userId: string, titel: string, tekst: string, url: string): Promise<void> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return
  try {
    await fetch(`${appUrl()}/api/push-verstuur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ service_user_id: userId, titel, tekst, url, tag: 'doen-genoemd', categorie: 'team' }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    console.warn('[noem-collega] push mislukt:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await bepaalUser(req)
    if (await isRateLimited(`noem-collega:${userId}`, 60, 3600)) {
      return res.status(429).json({ error: 'Te veel meldingen in korte tijd. Probeer het later opnieuw.' })
    }

    const body = (req.body ?? {}) as { userIds?: unknown; tekst?: unknown; link?: unknown; bron?: unknown }
    const doelen = Array.isArray(body.userIds)
      ? Array.from(new Set(body.userIds.filter((id): id is string => typeof id === 'string' && UUID.test(id) && id !== userId))).slice(0, MAX_DOELEN)
      : []
    if (doelen.length === 0) return res.status(200).json({ gemeld: 0 })

    const tekst = String(body.tekst ?? '').replace(/\s+/g, ' ').trim().slice(0, 300)
    const linkRuw = typeof body.link === 'string' ? body.link : '/'
    const link = linkRuw.startsWith('/') && !linkRuw.startsWith('//') ? linkRuw.slice(0, 300) : '/'
    const bron = typeof body.bron === 'string' ? body.bron.slice(0, 40) : 'notitie'

    const { data: afzender } = await supabaseAdmin
      .from('profiles')
      .select('voornaam, achternaam, email, organisatie_id')
      .eq('id', userId)
      .maybeSingle()
    if (!afzender?.organisatie_id) return res.status(403).json({ error: 'Geen organisatie' })

    const { data: instellingen } = await supabaseAdmin
      .from('app_settings')
      .select('functies')
      .eq('organisatie_id', afzender.organisatie_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const functies = (instellingen?.functies ?? {}) as Record<string, unknown>
    if (functies.noemen === false) return res.status(200).json({ gemeld: 0, uit: true })

    const { data: collegas } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('id', doelen)
      .eq('organisatie_id', afzender.organisatie_id)
    const geldigeDoelen = (collegas ?? []).map((c) => c.id as string)
    if (geldigeDoelen.length === 0) return res.status(200).json({ gemeld: 0 })

    const naam = profielNaam(afzender)
    const titel = `${naam} noemde je`
    const bericht = tekst || `In een ${bron}.`

    const { error } = await supabaseAdmin.from('notificaties').insert(
      geldigeDoelen.map((doel) => ({
        user_id: doel,
        organisatie_id: afzender.organisatie_id,
        type: 'genoemd',
        titel,
        bericht,
        link,
        gelezen: false,
      }))
    )
    if (error) throw error

    await Promise.all(geldigeDoelen.map((doel) => stuurPush(doel, titel, bericht.slice(0, 120), link)))

    return res.status(200).json({ gemeld: geldigeDoelen.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Melden mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('[noem-collega] Fatal:', err)
    return res.status(500).json({ error: msg })
  }
}
