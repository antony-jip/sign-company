import supabase from './supabaseClient'

function db() {
  if (!supabase) throw new Error('Supabase is niet beschikbaar')
  return supabase
}

export type NieuwsbriefStatus = 'concept' | 'gepland' | 'verzonden'

export type EditorModus = 'blokken' | 'html'

export interface OntvangerSelectie {
  type: 'alle' | 'filter' | 'handmatig'
  statussen?: string[]
  labels?: string[]
  klantIds?: string[]
  inclusiefContactpersonen?: boolean
}

export const STANDAARD_SELECTIE: OntvangerSelectie = { type: 'alle', inclusiefContactpersonen: true }

export interface Nieuwsbrief {
  id: string
  user_id: string
  onderwerp: string
  html: string
  blokken: unknown | null
  editor_modus: EditorModus
  template_key: string | null
  ontvangers: OntvangerSelectie
  test_verstuurd_op: string | null
  status: NieuwsbriefStatus
  preheader: string | null
  resend_broadcast_id: string | null
  aantal_ontvangers: number | null
  gepland_op: string | null
  verzonden_op: string | null
  created_at: string
  updated_at: string
}

export interface NieuwsbriefAfmelding {
  id: string
  user_id: string
  email: string
  reden: string | null
  afgemeld_op: string
}

export async function getNieuwsbrieven(): Promise<Nieuwsbrief[]> {
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Nieuwsbrief[]
}

export interface NieuwConcept {
  onderwerp: string
  html: string
  preheader?: string
  blokken?: unknown
  editor_modus?: EditorModus
  template_key?: string | null
}

export async function maakConcept(concept: NieuwConcept): Promise<Nieuwsbrief> {
  const { data: { user } } = await db().auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .insert({
      user_id: user.id,
      onderwerp: concept.onderwerp,
      html: concept.html,
      preheader: concept.preheader || null,
      blokken: concept.blokken ?? null,
      editor_modus: concept.editor_modus ?? 'html',
      template_key: concept.template_key ?? null,
      ontvangers: STANDAARD_SELECTIE,
      status: 'concept',
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Nieuwsbrief
}

export async function dupliceerNieuwsbrief(bron: Nieuwsbrief): Promise<Nieuwsbrief> {
  const { data: { user } } = await db().auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .insert({
      user_id: user.id,
      onderwerp: bron.onderwerp ? `${bron.onderwerp} (kopie)` : '',
      html: bron.html,
      preheader: bron.preheader,
      blokken: bron.blokken,
      editor_modus: bron.editor_modus,
      template_key: bron.template_key,
      ontvangers: bron.ontvangers ?? STANDAARD_SELECTIE,
      status: 'concept',
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Nieuwsbrief
}

export async function updateConcept(
  id: string,
  velden: Partial<Pick<Nieuwsbrief, 'onderwerp' | 'html' | 'preheader' | 'blokken' | 'editor_modus' | 'template_key' | 'ontvangers' | 'test_verstuurd_op'>>,
): Promise<Nieuwsbrief> {
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .update({ ...velden, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Nieuwsbrief
}

// Een verzending die halverwege stierf (time-out) laat de rij op 'gepland'
// staan zonder broadcast of aantal. Alleen die situatie mag terug naar concept.
export async function herstelVastgelopenConcept(id: string): Promise<Nieuwsbrief | null> {
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .update({ status: 'concept', gepland_op: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'gepland')
    .is('resend_broadcast_id', null)
    .is('aantal_ontvangers', null)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return (data as Nieuwsbrief | null) ?? null
}

export async function verwijderNieuwsbrief(id: string): Promise<void> {
  const { error } = await db().from('nieuwsbrieven').delete().eq('id', id)
  if (error) throw error
}

const NIEUWSBRIEF_BUCKET = 'nieuwsbrief-media'

// Upload een afbeelding naar de publieke nieuwsbrief-bucket en geef een blijvende
// publieke URL terug (bruikbaar in de nieuwsbrief-HTML). Pad begint met de user-id
// zodat het binnen de storage-RLS van migratie 181 valt.
export async function uploadAfbeelding(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Alleen afbeeldingen toegestaan')
  if (file.size > 10 * 1024 * 1024) throw new Error('Afbeelding is groter dan 10MB')
  const client = db()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  // Eigen bucket (migratie 181), niet documenten. Deze afbeeldingen moeten
  // permanent publiek blijven omdat een mailclient geen vervallende link kan
  // openen, en dat verdroeg zich niet met een bucket vol klantdocumenten.
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
  const { error } = await client.storage.from(NIEUWSBRIEF_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = client.storage.from(NIEUWSBRIEF_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await db().auth.getSession()
  if (!session) throw new Error('Niet ingelogd')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export interface SyncResultaat {
  audienceId: string
  aantalContacten: number
  nieuwToegevoegd: number
  resterend: number
  totaalGeschikt: number
  afgemeld: number
}

// Sync loopt in porties van 400 (Resend-ratelimit); herhaal tot de lijst
// compleet is zodat "Iedereen" echt iedereen is.
export async function syncContactenVolledig(onVoortgang?: (r: SyncResultaat) => void): Promise<SyncResultaat> {
  let r = await syncContacten()
  onVoortgang?.(r)
  for (let i = 0; i < 12 && r.resterend > 0; i++) {
    r = await syncContacten()
    onVoortgang?.(r)
  }
  return r
}

export async function syncContacten(): Promise<SyncResultaat> {
  const res = await fetch('/api/nieuwsbrief-contacten-sync', { method: 'POST', headers: await authHeader() })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Synchronisatie mislukt')
  return body as SyncResultaat
}

export interface VerzendResultaat {
  ok: boolean
  status: NieuwsbriefStatus
  aantalOntvangers: number
  broadcastId: string
  nieuwsbrief: Nieuwsbrief | null
}

export async function genereerMetDaan(brief: string, afbeeldingen: string[]): Promise<string> {
  const res = await fetch('/api/nieuwsbrief-ai', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ brief, afbeeldingen, modus: 'html' }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'AI-generatie mislukt')
  return (body as { html: string }).html
}

export async function genereerBlokkenMetDaan(brief: string, afbeeldingen: string[]): Promise<unknown[]> {
  const res = await fetch('/api/nieuwsbrief-ai', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ brief, afbeeldingen, modus: 'blokken' }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'AI-generatie mislukt')
  return (body as { blokken: unknown[] }).blokken
}

// ── Ontvangers uit doen. ───────────────────────────────────────────────────
// Spiegelt de server-logica in api/nieuwsbrief-verzend.ts (api mag niet uit
// src importeren). De klant-tabel is org-breed via RLS, dus geen user-filter.

export interface Ontvanger {
  email: string
  naam: string
  bedrijfsnaam: string
  klantId: string
  bron: 'klant' | 'contactpersoon'
}

export interface KlantKeuze {
  id: string
  bedrijfsnaam: string
  contactpersoon: string
  email: string
  status: string
  labels: string[]
  aantalContactpersonen: number
}

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

interface KlantRij { id: string; bedrijfsnaam: string | null; contactpersoon: string | null; email: string | null; status: string | null; labels: string[] | null; is_demo_data: boolean | null }
interface ContactRij { klant_id: string; naam: string | null; email: string | null }

// PostgREST geeft maximaal 1000 rijen per aanroep; met 900+ klanten en hun
// contactpersonen zit je daar zo overheen, dus altijd in pagina's ophalen.
const PAGINA = 1000
async function alles<T>(tabel: string, kolommen: string, sorteer: string): Promise<T[]> {
  const uit: T[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db().from(tabel).select(kolommen).order(sorteer).order('id').range(van, van + PAGINA - 1)
    if (error) throw error
    const rijen = (data ?? []) as T[]
    uit.push(...rijen)
    if (rijen.length < PAGINA) break
  }
  return uit
}

let klantenCache: { op: number; belofte: Promise<{ klanten: KlantRij[]; contacten: ContactRij[]; afgemeld: Set<string> }> } | null = null
// Drie grote tabellen; één keer per minuut ophalen is genoeg voor tellen en filteren.
async function laadKlantenEnContacten(): Promise<{ klanten: KlantRij[]; contacten: ContactRij[]; afgemeld: Set<string> }> {
  if (klantenCache && Date.now() - klantenCache.op < 60_000) return klantenCache.belofte
  const belofte = laadKlantenEnContactenVers().catch(e => { klantenCache = null; throw e })
  klantenCache = { op: Date.now(), belofte }
  return belofte
}
async function laadKlantenEnContactenVers(): Promise<{ klanten: KlantRij[]; contacten: ContactRij[]; afgemeld: Set<string> }> {
  const [klanten, contacten, afm] = await Promise.all([
    alles<KlantRij>('klanten', 'id, bedrijfsnaam, contactpersoon, email, status, labels, is_demo_data', 'bedrijfsnaam'),
    alles<ContactRij>('contactpersonen', 'id, klant_id, naam, email', 'klant_id'),
    alles<{ email: string }>('nieuwsbrief_afmeldingen', 'id, email', 'email'),
  ])
  const afgemeld = new Set(afm.map(a => String(a.email).toLowerCase()))
  return { klanten: klanten.filter(k => !k.is_demo_data), contacten, afgemeld }
}

export async function getKlantKeuzes(): Promise<KlantKeuze[]> {
  const { klanten, contacten } = await laadKlantenEnContacten()
  const perKlant = new Map<string, number>()
  for (const c of contacten) {
    if (isEmail(String(c.email || '').trim())) perKlant.set(c.klant_id, (perKlant.get(c.klant_id) ?? 0) + 1)
  }
  return klanten.map(k => ({
    id: k.id,
    bedrijfsnaam: k.bedrijfsnaam || '',
    contactpersoon: k.contactpersoon || '',
    email: k.email || '',
    status: k.status || 'actief',
    labels: Array.isArray(k.labels) ? k.labels : [],
    aantalContactpersonen: perKlant.get(k.id) ?? 0,
  }))
}

export function klantVoldoet(k: { id: string; status: string; labels: string[] }, sel: OntvangerSelectie): boolean {
  if (sel.type === 'alle') return true
  if (sel.type === 'handmatig') return (sel.klantIds ?? []).includes(k.id)
  const statussen = sel.statussen ?? []
  const labels = sel.labels ?? []
  if (statussen.length > 0 && !statussen.includes(k.status)) return false
  if (labels.length > 0 && !labels.some(l => k.labels.includes(l))) return false
  return true
}

export async function verzamelOntvangers(sel: OntvangerSelectie): Promise<{ ontvangers: Ontvanger[]; afgemeld: number }> {
  const { klanten, contacten, afgemeld } = await laadKlantenEnContacten()
  const map = new Map<string, Ontvanger>()
  let afgemeldGeteld = 0
  const voeg = (o: Ontvanger) => {
    if (!isEmail(o.email) || map.has(o.email)) return
    if (afgemeld.has(o.email)) { afgemeldGeteld++; return }
    map.set(o.email, o)
  }
  const gekozen = klanten.filter(k => klantVoldoet({ id: k.id, status: k.status || 'actief', labels: Array.isArray(k.labels) ? k.labels : [] }, sel))
  const gekozenIds = new Set(gekozen.map(k => k.id))
  for (const k of gekozen) {
    voeg({ email: String(k.email || '').trim().toLowerCase(), naam: k.contactpersoon || '', bedrijfsnaam: k.bedrijfsnaam || '', klantId: k.id, bron: 'klant' })
  }
  // 'Iedereen' gaat als broadcast naar de hele Resend-lijst; daar telt de vinkje niet.
  if (sel.type === 'alle' || sel.inclusiefContactpersonen !== false) {
    const naamVanKlant = new Map(gekozen.map(k => [k.id, k.bedrijfsnaam || '']))
    for (const c of contacten) {
      if (!gekozenIds.has(c.klant_id)) continue
      voeg({ email: String(c.email || '').trim().toLowerCase(), naam: c.naam || '', bedrijfsnaam: naamVanKlant.get(c.klant_id) || '', klantId: c.klant_id, bron: 'contactpersoon' })
    }
  }
  return { ontvangers: Array.from(map.values()), afgemeld: afgemeldGeteld }
}

// Subset van de bouwer-stijl die de server nodig heeft voor de mailshell.
export interface MailStijl { font: string; achtergrond: string; kaart: string; tekst: string }

export async function stelOnderwerpenVoor(html: string, huidig: string): Promise<{ onderwerp: string; preheader: string }[]> {
  const res = await fetch('/api/nieuwsbrief-ai', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ modus: 'onderwerp', html, huidig }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Voorstellen mislukt')
  return ((body as { suggesties?: { onderwerp: string; preheader: string }[] }).suggesties ?? []).filter(s => s.onderwerp)
}

export async function verstuurNieuwsbrief(
  nieuwsbriefId: string,
  onderwerp: string,
  html: string,
  preheader?: string,
  scheduledAt?: string,
  ontvangers: OntvangerSelectie = STANDAARD_SELECTIE,
  stijl?: MailStijl,
): Promise<VerzendResultaat> {
  const res = await fetch('/api/nieuwsbrief-verzend', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ nieuwsbriefId, onderwerp, html, preheader, scheduledAt, ontvangers, stijl }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Verzenden mislukt')
  return body as VerzendResultaat
}

export async function verstuurTest(
  onderwerp: string,
  html: string,
  preheader?: string,
  naar?: string,
  stijl?: MailStijl,
): Promise<string> {
  const res = await fetch('/api/nieuwsbrief-test', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ onderwerp, html, preheader, naar, stijl }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Test versturen mislukt')
  return (body as { naar: string }).naar
}

export interface NieuwsbriefStats {
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
}

export async function getStats(nieuwsbriefId: string): Promise<NieuwsbriefStats> {
  const { data, error } = await db()
    .from('nieuwsbrief_events')
    .select('type')
    .eq('nieuwsbrief_id', nieuwsbriefId)
  if (error) throw error
  const stats: NieuwsbriefStats = { delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 }
  for (const rij of data ?? []) {
    const t = (rij as { type: string }).type as keyof NieuwsbriefStats
    if (t in stats) stats[t]++
  }
  return stats
}
