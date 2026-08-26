import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createHmac } from 'node:crypto'

// Maakt A/B-tests af. Een test verstuurt bij het verzenden alleen de testgroep;
// zodra de wachttijd om is kiest deze cron de winnaar op unieke opens en stuurt
// het winnende onderwerp naar de rest van de selectie.
//
// api/ mag niet uit src/ importeren en heeft geen gedeelde helpers, dus de
// verzendlogica staat hier bewust nog een keer. Wijzig je iets aan de mailshell,
// de afmeldlink of het verzamelen van ontvangers, wijzig het dan ook in
// api/nieuwsbrief-verzend.ts.
export const config = { maxDuration: 60 }

const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const FROM = 'Sign Company <antony@signcompany.nl>'
const REPLY_TO = 'antony@signcompany.nl'
const APP_URL = (process.env.VITE_APP_URL || process.env.APP_URL || 'https://app.doen.team').replace(/\/$/, '')
const BATCH_GROOTTE = 100
const THROTTLE_MS = 110
const MAX_PER_RUN = 1200

const AFMELD_GEHEIM = process.env.NIEUWSBRIEF_WEBHOOK_TOKEN || (process.env.SUPABASE_SERVICE_ROLE_KEY ? `afmeld:${process.env.SUPABASE_SERVICE_ROLE_KEY}` : '')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

interface OntvangerSelectie {
  type?: 'alle' | 'filter' | 'handmatig'
  statussen?: string[]
  labels?: string[]
  klantIds?: string[]
  inclusiefContactpersonen?: boolean
}

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
  const basis = nieuwsbriefId ? `${adres}:${nieuwsbriefId}` : adres
  const token = createHmac('sha256', AFMELD_GEHEIM).update(basis).digest('hex').slice(0, 32)
  return `${APP_URL}/api/nieuwsbrief-afmelden?e=${encodeURIComponent(adres)}&t=${token}&n=${encodeURIComponent(nieuwsbriefId)}`
}

function personaliseer(html: string, o: Ontvanger, nieuwsbriefId: string): string {
  return html
    .replace(/\{\{\{contact\.first_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => o.voornaam || fb || '')
    .replace(/\{\{\{contact\.last_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => o.achternaam || fb || '')
    .replace(/\{\{\{contact\.email\}\}\}/g, o.email)
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, afmeldUrl(o.email, nieuwsbriefId))
}

async function allesVanOrg(tabel: string, kolommen: string, orgId: string): Promise<Record<string, unknown>[]> {
  const uit: Record<string, unknown>[] = []
  for (let van = 0; ; van += 1000) {
    const { data, error } = await supabase.from(tabel).select(kolommen).eq('organisatie_id', orgId).order('id').range(van, van + 999)
    if (error) throw error
    const rijen = (data ?? []) as unknown as Record<string, unknown>[]
    uit.push(...rijen)
    if (rijen.length < 1000) break
  }
  return uit
}

// Spiegelt api/nieuwsbrief-verzend.ts :: verzamelOntvangers.
async function verzamelOntvangers(orgId: string, sel: OntvangerSelectie): Promise<Ontvanger[]> {
  const klanten = await allesVanOrg('klanten', 'id, email, bedrijfsnaam, contactpersoon, status, labels, is_demo_data', orgId)
  const statussen = sel.statussen ?? []
  const labels = sel.labels ?? []
  const klantIds = new Set(sel.klantIds ?? [])
  const gekozen = klanten.filter(rij => {
    if (rij.is_demo_data) return false
    if (sel.type === 'handmatig') return klantIds.has(String(rij.id))
    if (sel.type === 'filter') {
      const kl = Array.isArray(rij.labels) ? (rij.labels as string[]) : []
      if (statussen.length > 0 && !statussen.includes(String(rij.status || 'actief'))) return false
      if (labels.length > 0 && !labels.some(l => kl.includes(l))) return false
    }
    return true
  })
  const gekozenIds = new Set(gekozen.map(k => String(k.id)))

  const [{ data: afmeldingen }, { data: problemen }] = await Promise.all([
    supabase.from('nieuwsbrief_afmeldingen').select('email').eq('user_id', OWNER_USER_ID),
    supabase.from('nieuwsbrief_adres_problemen').select('email').eq('user_id', OWNER_USER_ID).eq('hard', true),
  ])
  const uitgesloten = new Set((afmeldingen ?? []).map(a => String((a as Record<string, unknown>).email).toLowerCase()))
  for (const r of problemen ?? []) uitgesloten.add(String((r as Record<string, unknown>).email).toLowerCase())

  const map = new Map<string, Ontvanger>()
  const voeg = (email: string, naam: string, herkomst: Omit<Ontvanger, 'email' | 'voornaam' | 'achternaam' | 'naam'>) => {
    const e = email.trim().toLowerCase()
    if (!isEmail(e) || map.has(e) || uitgesloten.has(e)) return
    map.set(e, { email: e, ...splitNaam(naam), naam: naam.trim(), ...herkomst })
  }
  for (const rij of gekozen) {
    voeg(String(rij.email || ''), String(rij.contactpersoon || rij.bedrijfsnaam || ''), {
      klantId: String(rij.id), contactpersoonId: null, bedrijfsnaam: String(rij.bedrijfsnaam || ''), bron: 'klant',
    })
  }
  if (sel.inclusiefContactpersonen !== false) {
    const cps = await allesVanOrg('contactpersonen', 'id, klant_id, email, naam', orgId)
    const bedrijfVan = new Map(gekozen.map(k => [String(k.id), String(k.bedrijfsnaam || '')]))
    for (const rij of cps) {
      const klantId = String(rij.klant_id)
      if (!gekozenIds.has(klantId)) continue
      voeg(String(rij.email || ''), String(rij.naam || ''), {
        klantId, contactpersoonId: String(rij.id), bedrijfsnaam: bedrijfVan.get(klantId) || '', bron: 'contactpersoon',
      })
    }
  }
  return Array.from(map.values())
}

async function paginaLangs<T>(tabel: string, kolommen: string, nieuwsbriefId: string, extra?: (q: unknown) => unknown): Promise<T[]> {
  const uit: T[] = []
  for (let van = 0; ; van += 1000) {
    let vraag = supabase.from(tabel).select(kolommen).eq('nieuwsbrief_id', nieuwsbriefId).order('email').range(van, van + 999)
    if (extra) vraag = extra(vraag) as typeof vraag
    const { data, error } = await vraag
    if (error) throw error
    const rijen = (data ?? []) as unknown as T[]
    uit.push(...rijen)
    if (rijen.length < 1000) break
  }
  return uit
}

interface AbUitslag { winnaar: 'a' | 'b'; opensA: number; opensB: number; groepA: number; groepB: number }

// Winnaar op unieke opens per variant. Gelijkspel of geen enkele open: variant a,
// het onderwerp dat de afzender zelf koos.
async function bepaalWinnaar(nieuwsbriefId: string): Promise<AbUitslag> {
  const ontvangers = await paginaLangs<{ email: string; variant: string }>('nieuwsbrief_ontvangers', 'email, variant', nieuwsbriefId)
  const events = await paginaLangs<{ email: string; type: string }>('nieuwsbrief_events', 'email, type', nieuwsbriefId, q =>
    (q as { eq: (k: string, v: string) => unknown }).eq('type', 'opened'))
  const geopend = new Set(events.map(e => e.email))
  let opensA = 0, opensB = 0, groepA = 0, groepB = 0
  for (const o of ontvangers) {
    if (o.variant === 'a') { groepA++; if (geopend.has(o.email)) opensA++ }
    if (o.variant === 'b') { groepB++; if (geopend.has(o.email)) opensB++ }
  }
  const deelA = groepA > 0 ? opensA / groepA : 0
  const deelB = groepB > 0 ? opensB / groepB : 0
  return { winnaar: deelB > deelA ? 'b' : 'a', opensA, opensB, groepA, groepB }
}

async function verwerkTest(rij: Record<string, unknown>, orgId: string): Promise<string> {
  const id = String(rij.id)
  const uitslag = await bepaalWinnaar(id)
  const onderwerp = uitslag.winnaar === 'b' ? String(rij.onderwerp_b || '') : String(rij.onderwerp || '')
  if (!onderwerp) {
    await supabase.from('nieuwsbrieven').update({ ab_winnaar: uitslag.winnaar, ab_beslist_op: new Date().toISOString(), ab_rest_verstuurd: 0 }).eq('id', id)
    return `${id}: winnaar ${uitslag.winnaar} maar geen onderwerp, rest overgeslagen`
  }

  const selectie = (rij.ontvangers ?? { type: 'alle' }) as OntvangerSelectie
  const alles = await verzamelOntvangers(orgId, selectie)
  const alGehad = new Set((await paginaLangs<{ email: string }>('nieuwsbrief_ontvangers', 'email', id)).map(o => o.email))
  const rest = alles.filter(o => !alGehad.has(o.email)).slice(0, MAX_PER_RUN)

  let verstuurd = 0
  const volledigeHtmlAanwezig = Boolean(String(rij.verzend_html || '').trim())
  if (rest.length > 0 && resend && volledigeHtmlAanwezig) {
    // Exact dezelfde mail als de testgroep kreeg; alleen het onderwerp verschilt.
    const volledigeHtml = String(rij.verzend_html || '')
    const tags = [{ name: 'nieuwsbrief_id', value: id }]
    const maak = (o: Ontvanger) => ({
      from: FROM,
      to: [o.email],
      replyTo: REPLY_TO,
      subject: personaliseer(onderwerp, o, id),
      html: personaliseer(volledigeHtml, o, id),
      headers: {
        'List-Unsubscribe': `<${afmeldUrl(o.email, id)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags,
    })
    for (let i = 0; i < rest.length; i += BATCH_GROOTTE) {
      const deel = rest.slice(i, i + BATCH_GROOTTE)
      const { data, error } = await resend.batch.send(deel.map(maak))
      if (error) {
        console.error('[cron-nieuwsbrief] batch mislukt:', error)
        break
      }
      verstuurd += data?.data?.length ?? deel.length
      await supabase.from('nieuwsbrief_ontvangers').upsert(
        deel.map(o => ({
          nieuwsbrief_id: id, email: o.email, klant_id: o.klantId, contactpersoon_id: o.contactpersoonId,
          naam: o.naam || null, bedrijfsnaam: o.bedrijfsnaam || null, bron: o.bron, variant: 'rest',
        })),
        { onConflict: 'nieuwsbrief_id,email', ignoreDuplicates: true },
      )
      await supabase.from('nieuwsbrief_events').upsert(
        deel.map(o => ({ nieuwsbrief_id: id, email: o.email, type: 'sent' })),
        { onConflict: 'nieuwsbrief_id,email,type', ignoreDuplicates: true },
      )
      if (i + BATCH_GROOTTE < rest.length) await sleep(THROTTLE_MS)
    }
  }

  const huidigAantal = Number(rij.aantal_ontvangers || 0)
  await supabase.from('nieuwsbrieven').update({
    ab_winnaar: uitslag.winnaar,
    ab_beslist_op: new Date().toISOString(),
    ab_rest_verstuurd: verstuurd,
    aantal_ontvangers: huidigAantal + verstuurd,
    onderwerp: onderwerp,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return `${id}: winnaar ${uitslag.winnaar} (${uitslag.opensA}/${uitslag.groepA} vs ${uitslag.opensB}/${uitslag.groepB}), ${verstuurd} naar de rest`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const geheim = process.env.CRON_SECRET
  const bevoegd = !geheim || req.headers.authorization === `Bearer ${geheim}`
  if (!bevoegd) return res.status(401).json({ error: 'Unauthorized' })
  if (!resend) return res.status(200).json({ ok: true, overgeslagen: 'Resend niet geconfigureerd' })
  if (!AFMELD_GEHEIM) return res.status(200).json({ ok: true, overgeslagen: 'afmeldsleutel ontbreekt' })

  try {
    const { data: profile } = await supabase.from('profiles').select('organisatie_id').eq('id', OWNER_USER_ID).maybeSingle()
    const orgId = (profile?.organisatie_id as string | null) ?? null
    if (!orgId) return res.status(200).json({ ok: true, overgeslagen: 'geen organisatie' })

    const { data: open } = await supabase
      .from('nieuwsbrieven')
      .select('id, onderwerp, onderwerp_b, verzend_html, ontvangers, aantal_ontvangers, verzonden_op, ab_wachttijd_uren')
      .eq('user_id', OWNER_USER_ID)
      .eq('status', 'verzonden')
      .eq('ab_actief', true)
      .is('ab_winnaar', null)
      .order('verzonden_op')
      .limit(3)

    const meldingen: string[] = []
    for (const rij of (open ?? []) as unknown as Record<string, unknown>[]) {
      const verzonden = rij.verzonden_op ? new Date(String(rij.verzonden_op)).getTime() : 0
      const wachttijd = Number(rij.ab_wachttijd_uren || 4) * 3600_000
      if (!verzonden || Date.now() < verzonden + wachttijd) continue
      meldingen.push(await verwerkTest(rij, orgId))
    }

    if (meldingen.length > 0) console.log('[cron-nieuwsbrief]', meldingen.join(' | '))
    return res.status(200).json({ ok: true, afgehandeld: meldingen.length, meldingen })
  } catch (err) {
    console.error('[cron-nieuwsbrief] fout:', err)
    return res.status(500).json({ error: (err as Error).message })
  }
}
