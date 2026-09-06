/**
 * Meldingen rond de weekstaat (schakelaar uren_goedkeuren).
 *
 * Loopt via service_role omdat een notificatie voor een ander niet vanuit de
 * client kan (notificaties-RLS is user_id-only sinds migratie 217).
 *
 * Body: { actie: 'ingediend' | 'goedgekeurd' | 'teruggestuurd', weekStart: ISO-maandag,
 *         uren: number, doelUserId?: string, opmerking?: string }
 *
 * - ingediend: medewerker dient zijn week in; alle admins van de organisatie
 *   krijgen 'uren_week_ingediend' met link naar /tijdregistratie?keuren=1.
 * - goedgekeurd / teruggestuurd: alleen admins; de medewerker (doelUserId, zelfde
 *   organisatie) krijgt 'uren_week_goedgekeurd' met de uitkomst en opmerking.
 * Push gaat met categorie 'planning', zodat de meldingsvoorkeuren gelden.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/
const ACTIES = ['ingediend', 'goedgekeurd', 'teruggestuurd'] as const
type Actie = (typeof ACTIES)[number]

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

function weekNummer(datumIso: string): number {
  const d = new Date(datumIso + 'T00:00:00Z')
  const dag = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dag)
  const jaarStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - jaarStart.getTime()) / 86400000 + 1) / 7)
}

function formatUren(uren: number): string {
  return uren.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

async function stuurPush(userId: string, titel: string, tekst: string, url: string): Promise<void> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return
  try {
    await fetch(`${appUrl()}/api/push-verstuur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ service_user_id: userId, titel, tekst, url, tag: 'doen-uren-week', categorie: 'planning' }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    console.warn('[uren-week-ingediend] push mislukt:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await bepaalUser(req)
    if (await isRateLimited(`uren-week:${userId}`, 60, 3600)) {
      return res.status(429).json({ error: 'Te veel meldingen in korte tijd. Probeer het later opnieuw.' })
    }

    const body = (req.body ?? {}) as { actie?: unknown; weekStart?: unknown; uren?: unknown; doelUserId?: unknown; opmerking?: unknown }
    const actie = ACTIES.find((a) => a === body.actie) as Actie | undefined
    if (!actie) return res.status(400).json({ error: 'Onbekende actie' })
    const weekStart = typeof body.weekStart === 'string' && ISO_DATUM.test(body.weekStart) ? body.weekStart : null
    if (!weekStart) return res.status(400).json({ error: 'weekStart ontbreekt' })
    const uren = typeof body.uren === 'number' && Number.isFinite(body.uren) ? Math.max(0, body.uren) : 0
    const opmerking = String(body.opmerking ?? '').replace(/\s+/g, ' ').trim().slice(0, 300)

    const { data: afzender } = await supabaseAdmin
      .from('profiles')
      .select('voornaam, achternaam, email, organisatie_id, rol')
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
    if (functies.uren_goedkeuren !== true) return res.status(200).json({ gemeld: 0, uit: true })

    const week = weekNummer(weekStart)
    const naam = profielNaam(afzender)
    let doelen: string[] = []
    let titel = ''
    let bericht = ''
    let link = '/tijdregistratie'
    let type: 'uren_week_ingediend' | 'uren_week_goedgekeurd' = 'uren_week_ingediend'

    if (actie === 'ingediend') {
      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('organisatie_id', afzender.organisatie_id)
        .eq('rol', 'admin')
      doelen = (admins ?? []).map((a) => a.id as string).filter((id) => id !== userId)
      titel = `${naam} diende week ${week} in`
      bericht = `${formatUren(uren)} uur wacht op goedkeuring.`
      link = '/tijdregistratie?keuren=1'
    } else {
      if (afzender.rol !== 'admin') return res.status(403).json({ error: 'Alleen beheerders keuren uren' })
      const doelUserId = typeof body.doelUserId === 'string' && UUID.test(body.doelUserId) ? body.doelUserId : null
      if (!doelUserId) return res.status(400).json({ error: 'doelUserId ontbreekt' })
      const { data: doel } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', doelUserId)
        .eq('organisatie_id', afzender.organisatie_id)
        .maybeSingle()
      if (!doel) return res.status(403).json({ error: 'Medewerker hoort niet bij deze organisatie' })
      doelen = [doelUserId]
      type = 'uren_week_goedgekeurd'
      if (actie === 'goedgekeurd') {
        titel = `Week ${week} goedgekeurd`
        bericht = `${naam} keurde ${formatUren(uren)} uur goed.${opmerking ? ` ${opmerking}` : ''}`
      } else {
        titel = `Week ${week} teruggestuurd`
        bericht = `${naam} zette je week terug naar concept.${opmerking ? ` ${opmerking}` : ' Pas je uren aan en dien opnieuw in.'}`
      }
    }

    if (doelen.length === 0) return res.status(200).json({ gemeld: 0 })

    const { error } = await supabaseAdmin.from('notificaties').insert(
      doelen.map((doel) => ({
        user_id: doel,
        organisatie_id: afzender.organisatie_id,
        type,
        titel,
        bericht,
        link,
        gelezen: false,
      }))
    )
    if (error) throw error

    await Promise.all(doelen.map((doel) => stuurPush(doel, titel, bericht.slice(0, 120), link)))

    return res.status(200).json({ gemeld: doelen.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Melden mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('[uren-week-ingediend] Fatal:', err)
    return res.status(500).json({ error: msg })
  }
}
