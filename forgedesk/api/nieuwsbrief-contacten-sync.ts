import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Vercel-functie is standalone: geen imports uit src/, alles inline.
export const config = { maxDuration: 60 }

const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const AUDIENCE_NAAM = 'Sign Company nieuwsbrief'
// Resend-ratelimit is 10 req/s; met MAX_PER_RUN + throttle blijven we ruim
// binnen zowel dat als de serverless-tijdslimiet. Resterende contacten volgen
// bij een volgende sync (incrementeel: alleen nog-niet-bestaande worden gezet).
const MAX_PER_RUN = 400
const THROTTLE_MS = 130

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

async function verifyOwner(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return false
  return user.id === OWNER_USER_ID
}

async function vindOfMaakAudience(client: Resend): Promise<string> {
  const { data: lijst } = await client.audiences.list()
  const bestaand = (lijst?.data ?? []).find(a => a.name === AUDIENCE_NAAM)
  if (bestaand) return bestaand.id
  const { data, error } = await client.audiences.create({ name: AUDIENCE_NAAM })
  if (error || !data) throw new Error(`Kon audience niet aanmaken: ${error?.message ?? 'onbekend'}`)
  return data.id
}

interface Ontvanger { email: string; voornaam: string; achternaam: string }

function splitNaam(naam: string): { voornaam: string; achternaam: string } {
  const delen = naam.trim().split(/\s+/).filter(Boolean)
  if (delen.length === 0) return { voornaam: '', achternaam: '' }
  return { voornaam: delen[0], achternaam: delen.slice(1).join(' ') }
}

async function verzamelOntvangers(orgId: string): Promise<Ontvanger[]> {
  const map = new Map<string, Ontvanger>()

  const { data: klanten } = await supabase
    .from('klanten')
    .select('email, bedrijfsnaam, contactpersoon')
    .eq('organisatie_id', orgId)
  for (const k of klanten ?? []) {
    const rij = k as Record<string, unknown>
    const email = String(rij.email || '').trim().toLowerCase()
    if (!isEmail(email) || map.has(email)) continue
    const naam = String(rij.contactpersoon || rij.bedrijfsnaam || '')
    map.set(email, { email, ...splitNaam(naam) })
  }

  const { data: cps } = await supabase
    .from('contactpersonen')
    .select('email, naam')
    .eq('organisatie_id', orgId)
  for (const c of cps ?? []) {
    const rij = c as Record<string, unknown>
    const email = String(rij.email || '').trim().toLowerCase()
    if (!isEmail(email) || map.has(email)) continue
    map.set(email, { email, ...splitNaam(String(rij.naam || '')) })
  }

  return Array.from(map.values())
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!resend) return res.status(500).json({ error: 'Resend is niet geconfigureerd' })

  try {
    if (!(await verifyOwner(req))) return res.status(403).json({ error: 'Geen toegang' })

    const { data: profile } = await supabase
      .from('profiles').select('organisatie_id').eq('id', OWNER_USER_ID).maybeSingle()
    const orgId = (profile?.organisatie_id as string | null) ?? null
    if (!orgId) return res.status(400).json({ error: 'Geen organisatie gevonden voor de eigenaar' })

    const ontvangers = await verzamelOntvangers(orgId)

    const { data: afmeldingen } = await supabase
      .from('nieuwsbrief_afmeldingen').select('email').eq('user_id', OWNER_USER_ID)
    const afgemeld = new Set((afmeldingen ?? []).map(a => String((a as Record<string, unknown>).email).toLowerCase()))

    const audienceId = await vindOfMaakAudience(resend)

    const { data: bestaandeData } = await resend.contacts.list({ audienceId })
    const bestaand = new Set((bestaandeData?.data ?? []).map(c => String(c.email).toLowerCase()))

    const toeTeVoegen = ontvangers.filter(o => !bestaand.has(o.email) && !afgemeld.has(o.email))
    const batch = toeTeVoegen.slice(0, MAX_PER_RUN)

    let toegevoegd = 0
    for (const o of batch) {
      const { error } = await resend.contacts.create({
        email: o.email,
        firstName: o.voornaam || undefined,
        lastName: o.achternaam || undefined,
        unsubscribed: false,
        audienceId,
      })
      if (!error) toegevoegd++
      await sleep(THROTTLE_MS)
    }

    return res.status(200).json({
      audienceId,
      aantalContacten: bestaand.size + toegevoegd,
      nieuwToegevoegd: toegevoegd,
      resterend: Math.max(0, toeTeVoegen.length - batch.length),
      totaalGeschikt: ontvangers.length,
      afgemeld: afgemeld.size,
    })
  } catch (err) {
    console.error('[nieuwsbrief-contacten-sync] fout:', err)
    return res.status(500).json({ error: (err as Error).message || 'Synchronisatie mislukt' })
  }
}
