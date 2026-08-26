import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createHmac } from 'node:crypto'

// Stuurt een al verstuurde nieuwsbrief nog een keer, met een ander onderwerp,
// naar precies de mensen die hem niet openden. Dat levert opens op zonder dat
// er iets geschreven hoeft te worden.
//
// De herzending is een eigen nieuwsbrief-rij met herzending_van naar het
// origineel. Zou hij op dezelfde rij gaan, dan zouden de cijfers van de eerste
// en de tweede poging optellen tot iets wat geen van beide is.
//
// api/ mag niet uit src/ importeren; de personalisatie en de afmeldlink staan
// hier daarom nog een keer, gelijk aan api/nieuwsbrief-verzend.ts.
export const config = { maxDuration: 60 }

const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const FROM = 'Sign Company <antony@signcompany.nl>'
const REPLY_TO = 'antony@signcompany.nl'
const APP_URL = (process.env.VITE_APP_URL || process.env.APP_URL || 'https://app.doen.team').replace(/\/$/, '')
const BATCH_GROOTTE = 100
const THROTTLE_MS = 110
const MAX_PER_RUN = 1500

const AFMELD_GEHEIM = process.env.NIEUWSBRIEF_WEBHOOK_TOKEN || (process.env.SUPABASE_SERVICE_ROLE_KEY ? `afmeld:${process.env.SUPABASE_SERVICE_ROLE_KEY}` : '')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

interface Ontvanger {
  email: string
  voornaam: string
  achternaam: string
  klantId: string | null
  contactpersoonId: string | null
  naam: string
  bedrijfsnaam: string
  bron: 'klant' | 'contactpersoon'
}

function splitNaam(naam: string): { voornaam: string; achternaam: string } {
  const delen = naam.trim().split(/\s+/).filter(Boolean)
  if (delen.length === 0) return { voornaam: '', achternaam: '' }
  return { voornaam: delen[0], achternaam: delen.slice(1).join(' ') }
}

function afmeldUrl(email: string, nieuwsbriefId: string): string {
  const adres = email.toLowerCase()
  const token = createHmac('sha256', AFMELD_GEHEIM).update(`${adres}:${nieuwsbriefId}`).digest('hex').slice(0, 32)
  return `${APP_URL}/api/nieuwsbrief-afmelden?e=${encodeURIComponent(adres)}&t=${token}&n=${encodeURIComponent(nieuwsbriefId)}`
}

function personaliseer(html: string, o: Ontvanger, nieuwsbriefId: string): string {
  return html
    .replace(/\{\{\{contact\.first_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => o.voornaam || fb || '')
    .replace(/\{\{\{contact\.last_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => o.achternaam || fb || '')
    .replace(/\{\{\{contact\.email\}\}\}/g, o.email)
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, afmeldUrl(o.email, nieuwsbriefId))
}

async function verifyOwner(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.split(' ')[1])
  if (error || !user) return false
  return user.id === OWNER_USER_ID
}

async function paginaLangs<T>(tabel: string, kolommen: string, nieuwsbriefId: string, type?: string): Promise<T[]> {
  const uit: T[] = []
  for (let van = 0; ; van += 1000) {
    let vraag = supabase.from(tabel).select(kolommen).eq('nieuwsbrief_id', nieuwsbriefId).order('email').range(van, van + 999)
    if (type) vraag = vraag.eq('type', type)
    const { data, error } = await vraag
    if (error) throw error
    const rijen = (data ?? []) as unknown as T[]
    uit.push(...rijen)
    if (rijen.length < 1000) break
  }
  return uit
}

const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, '3600 s'), prefix: 'rl:nieuwsbrief-herzend', timeout: 2000 })
  : null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!resend) return res.status(500).json({ error: 'Resend is niet geconfigureerd' })
  if (!AFMELD_GEHEIM) return res.status(500).json({ error: 'NIEUWSBRIEF_WEBHOOK_TOKEN ontbreekt; de afmeldlink kan niet worden gemaakt' })

  try {
    if (!(await verifyOwner(req))) return res.status(403).json({ error: 'Geen toegang' })
    if (ratelimit) {
      const { success } = await ratelimit.limit(OWNER_USER_ID)
      if (!success) return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    }

    const { nieuwsbriefId, onderwerp, preheader, alleenTellen } = (req.body ?? {}) as {
      nieuwsbriefId?: string; onderwerp?: string; preheader?: string; alleenTellen?: boolean
    }
    if (!nieuwsbriefId) return res.status(400).json({ error: 'nieuwsbriefId ontbreekt' })

    const { data: bron } = await supabase
      .from('nieuwsbrieven')
      .select('id, user_id, status, onderwerp, html, blokken, editor_modus, template_key, ontvangers, verzend_html, herzending_van')
      .eq('id', nieuwsbriefId).maybeSingle()
    const rij = bron as Record<string, unknown> | null
    if (!rij || rij.user_id !== OWNER_USER_ID) return res.status(404).json({ error: 'Nieuwsbrief niet gevonden' })
    if (rij.status !== 'verzonden') return res.status(400).json({ error: 'Alleen een verzonden nieuwsbrief kan opnieuw' })
    if (rij.herzending_van) return res.status(400).json({ error: 'Dit is al een herzending. Stuur het origineel niet nog een derde keer.' })

    // Wie kreeg hem, en wie deed er niets mee.
    const ontvangers = await paginaLangs<{ email: string; naam: string | null; bedrijfsnaam: string | null; klant_id: string | null; contactpersoon_id: string | null; bron: string }>(
      'nieuwsbrief_ontvangers', 'email, naam, bedrijfsnaam, klant_id, contactpersoon_id, bron', nieuwsbriefId)
    if (ontvangers.length === 0) {
      return res.status(400).json({ error: 'Van deze verzending is niet vastgelegd wie hem kreeg. Herzenden kan alleen voor nieuwsbrieven die na deze update zijn verstuurd.' })
    }
    const geopend = new Set((await paginaLangs<{ email: string }>('nieuwsbrief_events', 'email', nieuwsbriefId, 'opened')).map(e => e.email))
    const gebouncet = new Set((await paginaLangs<{ email: string }>('nieuwsbrief_events', 'email', nieuwsbriefId, 'bounced')).map(e => e.email))

    const [{ data: afmeldingen }, { data: problemen }] = await Promise.all([
      supabase.from('nieuwsbrief_afmeldingen').select('email').eq('user_id', OWNER_USER_ID),
      supabase.from('nieuwsbrief_adres_problemen').select('email').eq('user_id', OWNER_USER_ID).eq('hard', true),
    ])
    const uitgesloten = new Set((afmeldingen ?? []).map(a => String((a as Record<string, unknown>).email).toLowerCase()))
    for (const p of problemen ?? []) uitgesloten.add(String((p as Record<string, unknown>).email).toLowerCase())

    const doelgroep: Ontvanger[] = ontvangers
      .filter(o => !geopend.has(o.email) && !gebouncet.has(o.email) && !uitgesloten.has(o.email))
      .map(o => ({
        email: o.email,
        ...splitNaam(o.naam || ''),
        naam: o.naam || '',
        bedrijfsnaam: o.bedrijfsnaam || '',
        klantId: o.klant_id,
        contactpersoonId: o.contactpersoon_id,
        bron: (o.bron === 'contactpersoon' ? 'contactpersoon' : 'klant') as 'klant' | 'contactpersoon',
      }))

    if (alleenTellen) return res.status(200).json({ ok: true, aantalNietGeopend: doelgroep.length })
    if (doelgroep.length === 0) return res.status(400).json({ error: 'Iedereen die hem kreeg heeft hem geopend. Mooier wordt het niet.' })
    if (!onderwerp?.trim()) return res.status(400).json({ error: 'Geef een nieuw onderwerp op' })
    if (onderwerp.trim().length > 200) return res.status(400).json({ error: 'Het onderwerp is te lang' })

    const volledigeHtml = String(rij.verzend_html || '')
    if (!volledigeHtml.trim()) {
      return res.status(400).json({ error: 'Van deze verzending is de verstuurde opmaak niet bewaard. Dupliceer hem en verstuur opnieuw.' })
    }

    const nu = new Date().toISOString()
    const { data: nieuw, error: maakErr } = await supabase
      .from('nieuwsbrieven')
      .insert({
        user_id: OWNER_USER_ID,
        onderwerp: onderwerp.trim(),
        preheader: preheader?.trim() || null,
        html: rij.html,
        blokken: rij.blokken,
        editor_modus: rij.editor_modus,
        template_key: rij.template_key,
        ontvangers: rij.ontvangers,
        verzend_html: volledigeHtml,
        herzending_van: nieuwsbriefId,
        status: 'verzonden',
        verzonden_op: nu,
        aantal_ontvangers: 0,
      })
      .select('id').single()
    if (maakErr || !nieuw) return res.status(500).json({ error: `Kon de herzending niet aanmaken: ${maakErr?.message ?? 'onbekend'}` })
    const herzendId = String((nieuw as { id: string }).id)

    const lijst = doelgroep.slice(0, MAX_PER_RUN)
    const tags = [{ name: 'nieuwsbrief_id', value: herzendId }]
    let verstuurd = 0
    for (let i = 0; i < lijst.length; i += BATCH_GROOTTE) {
      const deel = lijst.slice(i, i + BATCH_GROOTTE)
      const { data, error } = await resend.batch.send(deel.map(o => ({
        from: FROM,
        to: [o.email],
        replyTo: REPLY_TO,
        subject: personaliseer(onderwerp.trim(), o, herzendId),
        html: personaliseer(volledigeHtml, o, herzendId),
        headers: {
          'List-Unsubscribe': `<${afmeldUrl(o.email, herzendId)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags,
      })))
      if (error) {
        console.error('[nieuwsbrief-herzend] batch mislukt:', error)
        break
      }
      verstuurd += data?.data?.length ?? deel.length
      await supabase.from('nieuwsbrief_ontvangers').upsert(
        deel.map(o => ({
          nieuwsbrief_id: herzendId, email: o.email, klant_id: o.klantId, contactpersoon_id: o.contactpersoonId,
          naam: o.naam || null, bedrijfsnaam: o.bedrijfsnaam || null, bron: o.bron,
        })),
        { onConflict: 'nieuwsbrief_id,email', ignoreDuplicates: true },
      )
      await supabase.from('nieuwsbrief_events').upsert(
        deel.map(o => ({ nieuwsbrief_id: herzendId, email: o.email, type: 'sent' })),
        { onConflict: 'nieuwsbrief_id,email,type', ignoreDuplicates: true },
      )
      if (i + BATCH_GROOTTE < lijst.length) await sleep(THROTTLE_MS)
    }

    await supabase.from('nieuwsbrieven').update({ aantal_ontvangers: verstuurd, updated_at: new Date().toISOString() }).eq('id', herzendId)

    if (verstuurd === 0) {
      await supabase.from('nieuwsbrieven').delete().eq('id', herzendId)
      return res.status(502).json({ error: 'Geen enkele mail kon worden verstuurd. Controleer de Resend-instellingen.' })
    }

    return res.status(200).json({ ok: true, herzendingId: herzendId, aantalOntvangers: verstuurd, overgeslagen: doelgroep.length - lijst.length })
  } catch (err) {
    console.error('[nieuwsbrief-herzend] fout:', err)
    return res.status(500).json({ error: (err as Error).message || 'Herzenden mislukt' })
  }
}
