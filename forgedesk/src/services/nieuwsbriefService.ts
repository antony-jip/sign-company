import supabase from './supabaseClient'

function db() {
  if (!supabase) throw new Error('Supabase is niet beschikbaar')
  return supabase
}

export type NieuwsbriefStatus = 'concept' | 'gepland' | 'verzonden'

export type EditorModus = 'blokken' | 'html'

// Gedrag uit eerdere verzendingen als extra zeef op de selectie. Het venster
// is het aantal recentste verzendingen waar 'betrokken' en 'sluimerend' naar
// kijken; 'klikkers' kijkt naar alles, 'nieuw' naar of iemand ooit iets kreeg.
export type Gedrag = 'alle' | 'betrokken' | 'sluimerend' | 'klikkers' | 'nieuw'

export const GEDRAG_LABEL: Record<Gedrag, { titel: string; uitleg: string }> = {
  alle: { titel: 'Iedereen', uitleg: 'geen zeef op gedrag' },
  betrokken: { titel: 'Betrokken', uitleg: 'openden er minstens een van de laatste paar' },
  sluimerend: { titel: 'Sluimerend', uitleg: 'kregen post maar openden niets' },
  klikkers: { titel: 'Klikten ooit', uitleg: 'drukten wel eens op een link' },
  nieuw: { titel: 'Nog nooit gemaild', uitleg: 'stonden nog in geen enkele verzending' },
}

export interface OntvangerSelectie {
  type: 'alle' | 'filter' | 'handmatig' | 'lijst'
  statussen?: string[]
  labels?: string[]
  klantIds?: string[]
  /** Bij type 'lijst': de losse adreslijst die gemaild wordt. Klanten blijven dan volledig buiten beeld. */
  lijstId?: string
  inclusiefContactpersonen?: boolean
  gedrag?: Gedrag
  gedragVenster?: number
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
  onderwerp_b: string | null
  preheader_b: string | null
  ab_actief: boolean
  ab_testdeel: number
  ab_wachttijd_uren: number
  ab_winnaar: 'a' | 'b' | null
  ab_beslist_op: string | null
  ab_rest_verstuurd: number | null
  herzending_van: string | null
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
  velden: Partial<Pick<Nieuwsbrief,
    'onderwerp' | 'html' | 'preheader' | 'blokken' | 'editor_modus' | 'template_key' | 'ontvangers' | 'test_verstuurd_op'
    | 'onderwerp_b' | 'preheader_b' | 'ab_actief' | 'ab_testdeel' | 'ab_wachttijd_uren'>>,
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
  /** Bij een A/B-test: hoeveel mensen nog op het winnende onderwerp wachten. */
  wachtOpWinnaar?: number
  broadcastId: string
  nieuwsbrief: Nieuwsbrief | null
}

export interface AbInstelling {
  actief: boolean
  onderwerpB: string
  preheaderB?: string
  /** Percentage van de selectie dat de test krijgt, in twee helften gesplitst. */
  testdeel: number
  wachttijdUren: number
}

export const STANDAARD_AB: AbInstelling = { actief: false, onderwerpB: '', preheaderB: '', testdeel: 30, wachttijdUren: 4 }

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

export interface DaanChatBericht { rol: 'user' | 'daan'; tekst: string }
export interface DaanActie { actie: 'vervang' | 'voeg_toe' | 'verwijder' | 'verplaats' | 'onderwerp' | 'alles'; id?: string; na?: string | null; blok?: unknown; blokken?: unknown[]; onderwerp?: string; preheader?: string }

export async function chatMetDaan(berichten: DaanChatBericht[], blokken: unknown[], onderwerp: string, preheader: string, afbeeldingen: string[] = []): Promise<{ antwoord: string; acties: DaanActie[] }> {
  const res = await fetch('/api/nieuwsbrief-ai', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ modus: 'chat', berichten, blokken, onderwerp, preheader, afbeeldingen }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Daan reageert niet')
  return { antwoord: String(body.antwoord || ''), acties: Array.isArray(body.acties) ? body.acties : [] }
}

// ── Ontvangers uit doen. ───────────────────────────────────────────────────
// Spiegelt de server-logica in api/nieuwsbrief-verzend.ts (api mag niet uit
// src importeren). De klant-tabel is org-breed via RLS, dus geen user-filter.

export interface Ontvanger {
  email: string
  naam: string
  bedrijfsnaam: string
  /** Null voor adressen uit een losse lijst: die hangen aan geen enkele klant. */
  klantId: string | null
  bron: 'klant' | 'contactpersoon' | 'lijst'
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
  const [klanten, contacten, afm, problemen] = await Promise.all([
    alles<KlantRij>('klanten', 'id, bedrijfsnaam, contactpersoon, email, status, labels, is_demo_data', 'bedrijfsnaam'),
    alles<ContactRij>('contactpersonen', 'id, klant_id, naam, email', 'klant_id'),
    alles<{ email: string }>('nieuwsbrief_afmeldingen', 'id, email', 'email'),
    alles<{ email: string; hard: boolean }>('nieuwsbrief_adres_problemen', 'id, email, hard', 'email'),
  ])
  const afgemeld = new Set(afm.map(a => String(a.email).toLowerCase()))
  // Spiegelt api/nieuwsbrief-verzend.ts: harde bounces en klachten tellen niet
  // mee als ontvanger, anders wijkt de telling in het scherm af van wat er
  // daadwerkelijk de deur uit gaat.
  for (const p of problemen) if (p.hard) afgemeld.add(String(p.email).toLowerCase())
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
  // Een losse lijst staat los van het klantenbestand. Hier geen enkele klant
  // doorlaten is precies het punt: anders lekt je eigen klantenbestand alsnog
  // mee in een verzending die daar niet voor bedoeld is.
  if (sel.type === 'lijst') return false
  if (sel.type === 'alle') return true
  if (sel.type === 'handmatig') return (sel.klantIds ?? []).includes(k.id)
  const statussen = sel.statussen ?? []
  const labels = sel.labels ?? []
  if (statussen.length > 0 && !statussen.includes(k.status)) return false
  if (labels.length > 0 && !labels.some(l => k.labels.includes(l))) return false
  return true
}

export interface GedragGegevens {
  /** Adressen die in het venster minstens een verzending openden. */
  openers: Set<string>
  /** Adressen die in het venster minstens een verzending kregen. */
  ontving: Set<string>
  /** Adressen die ooit ergens op klikten. */
  klikkers: Set<string>
  /** Adressen die ooit een verzending kregen. */
  ooitOntvangen: Set<string>
}

const LEEG_GEDRAG: GedragGegevens = { openers: new Set(), ontving: new Set(), klikkers: new Set(), ooitOntvangen: new Set() }

let gedragCache: { op: number; venster: number; belofte: Promise<GedragGegevens> } | null = null

export async function laadGedrag(venster = 3): Promise<GedragGegevens> {
  if (gedragCache && gedragCache.venster === venster && Date.now() - gedragCache.op < 60_000) return gedragCache.belofte
  const belofte = laadGedragVers(venster).catch(e => { gedragCache = null; throw e })
  gedragCache = { op: Date.now(), venster, belofte }
  return belofte
}

async function laadGedragVers(venster: number): Promise<GedragGegevens> {
  const { data: verzonden, error } = await db()
    .from('nieuwsbrieven')
    .select('id, verzonden_op')
    .eq('status', 'verzonden')
    .not('verzonden_op', 'is', null)
    .order('verzonden_op', { ascending: false })
  if (error) throw error
  const alle = ((verzonden ?? []) as unknown as { id: string }[]).map(r => r.id)
  if (alle.length === 0) return LEEG_GEDRAG
  const recent = alle.slice(0, Math.max(1, venster))

  const ontvangersRijen = await paginaOverIds<{ email: string; nieuwsbrief_id: string }>(
    'nieuwsbrief_ontvangers', 'email, nieuwsbrief_id', alle)
  const eventRijen = await paginaOverIds<{ email: string; nieuwsbrief_id: string; type: string }>(
    'nieuwsbrief_events', 'email, nieuwsbrief_id, type', alle)

  const recentSet = new Set(recent)
  const gegevens: GedragGegevens = { openers: new Set(), ontving: new Set(), klikkers: new Set(), ooitOntvangen: new Set() }
  for (const r of ontvangersRijen) {
    gegevens.ooitOntvangen.add(r.email)
    if (recentSet.has(r.nieuwsbrief_id)) gegevens.ontving.add(r.email)
  }
  for (const e of eventRijen) {
    if (e.type === 'clicked') gegevens.klikkers.add(e.email)
    if (e.type === 'opened' && recentSet.has(e.nieuwsbrief_id)) gegevens.openers.add(e.email)
  }
  return gegevens
}

// PostgREST kapt af op 1000 rijen; met alle verzendingen samen loopt dat hard op.
async function paginaOverIds<T>(tabel: string, kolommen: string, ids: string[]): Promise<T[]> {
  const uit: T[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db()
      .from(tabel).select(kolommen).in('nieuwsbrief_id', ids).order('email').range(van, van + PAGINA - 1)
    if (error) throw error
    const deel = (data ?? []) as unknown as T[]
    uit.push(...deel)
    if (deel.length < PAGINA) break
  }
  return uit
}

export function voldoetAanGedrag(email: string, gedrag: Gedrag | undefined, g: GedragGegevens): boolean {
  switch (gedrag) {
    case 'betrokken': return g.openers.has(email)
    case 'sluimerend': return g.ontving.has(email) && !g.openers.has(email)
    case 'klikkers': return g.klikkers.has(email)
    case 'nieuw': return !g.ooitOntvangen.has(email)
    default: return true
  }
}

export async function verzamelOntvangers(sel: OntvangerSelectie): Promise<{ ontvangers: Ontvanger[]; afgemeld: number }> {
  const { klanten, contacten, afgemeld } = await laadKlantenEnContacten()
  // Een losse lijst gaat langs klanten en contactpersonen heen. Afmeldingen en
  // harde bounces gelden wel: die staan op e-mailadres, niet op klant.
  if (sel.type === 'lijst') {
    if (!sel.lijstId) return { ontvangers: [], afgemeld: 0 }
    const adressen = await getLijstAdressen(sel.lijstId)
    const gezien = new Set<string>()
    let afgemeldGeteld = 0
    let uitLijst: Ontvanger[] = []
    for (const a of adressen) {
      const e = String(a.email || '').trim().toLowerCase()
      if (!isEmail(e) || gezien.has(e)) continue
      gezien.add(e)
      if (afgemeld.has(e)) { afgemeldGeteld++; continue }
      uitLijst.push({ email: e, naam: a.naam || '', bedrijfsnaam: a.bedrijfsnaam || '', klantId: null, bron: 'lijst' })
    }
    if (sel.gedrag && sel.gedrag !== 'alle') {
      const g = await laadGedrag(sel.gedragVenster ?? 3)
      uitLijst = uitLijst.filter(o => voldoetAanGedrag(o.email, sel.gedrag, g))
    }
    return { ontvangers: uitLijst, afgemeld: afgemeldGeteld }
  }
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
  let uit = Array.from(map.values())
  if (sel.gedrag && sel.gedrag !== 'alle') {
    const g = await laadGedrag(sel.gedragVenster ?? 3)
    uit = uit.filter(o => voldoetAanGedrag(o.email, sel.gedrag, g))
  }
  return { ontvangers: uit, afgemeld: afgemeldGeteld }
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
  ab?: AbInstelling,
): Promise<VerzendResultaat> {
  const res = await fetch('/api/nieuwsbrief-verzend', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ nieuwsbriefId, onderwerp, html, preheader, scheduledAt, ontvangers, stijl, ab }),
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
  verstuurd: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  unsubscribed: number
  /** Totaal aantal keer geopend, herhalingen meegeteld. */
  openTotaal: number
  /** Totaal aantal kliks, herhalingen meegeteld. */
  klikTotaal: number
}

const LEGE_STATS: NieuwsbriefStats = {
  verstuurd: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0,
  complained: 0, unsubscribed: 0, openTotaal: 0, klikTotaal: 0,
}

// Percentages die er in B2B toe doen. De noemer is bewust "afgeleverd" en niet
// "verstuurd": een adres dat bouncet heeft de mail nooit gezien en hoort niet
// je openpercentage te drukken.
export interface NieuwsbriefPercentages {
  afgeleverd: number | null
  geopend: number | null
  geklikt: number | null
  /** Klik-door-open: van wie hem opende, hoeveel deden er iets. Zegt of de inhoud werkt. */
  ctor: number | null
  afgemeld: number | null
  gebouncet: number | null
}

export function berekenPercentages(s: NieuwsbriefStats): NieuwsbriefPercentages {
  const deel = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null)
  const basis = s.delivered || s.verstuurd
  return {
    afgeleverd: deel(s.delivered, s.verstuurd),
    geopend: deel(s.opened, basis),
    geklikt: deel(s.clicked, basis),
    ctor: deel(s.clicked, s.opened),
    afgemeld: deel(s.unsubscribed, basis),
    gebouncet: deel(s.bounced, s.verstuurd),
  }
}

interface EventRij { email: string; type: string; aantal: number | null }

// PostgREST geeft maximaal 1000 rijen; één verzending naar 2000 adressen
// levert al meer events dan dat, dus in pagina's ophalen.
async function alleEvents(nieuwsbriefId: string): Promise<EventRij[]> {
  const uit: EventRij[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db()
      .from('nieuwsbrief_events')
      .select('email, type, aantal')
      .eq('nieuwsbrief_id', nieuwsbriefId)
      .order('email')
      .range(van, van + PAGINA - 1)
    if (error) throw error
    const rijen = (data ?? []) as unknown as EventRij[]
    uit.push(...rijen)
    if (rijen.length < PAGINA) break
  }
  return uit
}

function telEvents(rijen: EventRij[]): NieuwsbriefStats {
  const stats: NieuwsbriefStats = { ...LEGE_STATS }
  for (const rij of rijen) {
    const herhaling = rij.aantal && rij.aantal > 0 ? rij.aantal : 1
    switch (rij.type) {
      case 'sent': stats.verstuurd++; break
      case 'delivered': stats.delivered++; break
      case 'opened': stats.opened++; stats.openTotaal += herhaling; break
      case 'clicked': stats.clicked++; stats.klikTotaal += herhaling; break
      case 'bounced': stats.bounced++; break
      case 'complained': stats.complained++; break
      case 'unsubscribed': stats.unsubscribed++; break
    }
  }
  return stats
}

export async function getStats(nieuwsbriefId: string, aantalOntvangers?: number | null): Promise<NieuwsbriefStats> {
  const stats = telEvents(await alleEvents(nieuwsbriefId))
  // Een broadcast levert geen 'sent'-events per adres; dan is het opgeslagen
  // aantal ontvangers de enige noemer die we hebben.
  if (stats.verstuurd === 0 && aantalOntvangers) stats.verstuurd = aantalOntvangers
  return stats
}

export interface LinkPrestatie {
  link: string
  kliks: number
  klikkers: number
}

// Welke knop werkte. Zonder deze uitsplitsing weet je alleen dát er geklikt is.
export async function getKliksPerLink(nieuwsbriefId: string): Promise<LinkPrestatie[]> {
  const rijen: { email: string; link: string }[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db()
      .from('nieuwsbrief_kliks')
      .select('email, link')
      .eq('nieuwsbrief_id', nieuwsbriefId)
      .order('created_at')
      .range(van, van + PAGINA - 1)
    if (error) throw error
    const deel = (data ?? []) as unknown as { email: string; link: string }[]
    rijen.push(...deel)
    if (deel.length < PAGINA) break
  }
  const perLink = new Map<string, { kliks: number; klikkers: Set<string> }>()
  for (const r of rijen) {
    const schoon = zonderUtm(r.link)
    const huidig = perLink.get(schoon) ?? { kliks: 0, klikkers: new Set<string>() }
    huidig.kliks++
    huidig.klikkers.add(r.email)
    perLink.set(schoon, huidig)
  }
  return Array.from(perLink.entries())
    .map(([link, v]) => ({ link, kliks: v.kliks, klikkers: v.klikkers.size }))
    .sort((a, b) => b.kliks - a.kliks)
}

// De UTM's die de verzender toevoegt maken van één knop tien verschillende
// links in het overzicht. Voor het tellen horen ze eraf.
function zonderUtm(link: string): string {
  try {
    const url = new URL(link)
    for (const sleutel of Array.from(url.searchParams.keys())) {
      if (sleutel.toLowerCase().startsWith('utm_')) url.searchParams.delete(sleutel)
    }
    return url.toString().replace(/\?$/, '')
  } catch {
    return link
  }
}

export interface OntvangerActiviteit {
  email: string
  naam: string
  bedrijfsnaam: string
  klantId: string | null
  geopend: number
  geklikt: number
  afgemeld: boolean
  gebouncet: boolean
  /** Welke links deze persoon aanklikte. Zegt waar de belangstelling zit. */
  links: string[]
}

// Wie deed wat. Dit is het scherm dat een nieuwsbrief van een cijfer in een
// verkoopgesprek verandert: niet "12% klikte" maar "deze vijf klikten".
export async function getOntvangerActiviteit(nieuwsbriefId: string): Promise<OntvangerActiviteit[]> {
  const ontvangers: { email: string; naam: string | null; bedrijfsnaam: string | null; klant_id: string | null }[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db()
      .from('nieuwsbrief_ontvangers')
      .select('email, naam, bedrijfsnaam, klant_id')
      .eq('nieuwsbrief_id', nieuwsbriefId)
      .order('email')
      .range(van, van + PAGINA - 1)
    if (error) throw error
    const deel = (data ?? []) as unknown as typeof ontvangers
    ontvangers.push(...deel)
    if (deel.length < PAGINA) break
  }

  const kliks: { email: string; link: string }[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db()
      .from('nieuwsbrief_kliks')
      .select('email, link')
      .eq('nieuwsbrief_id', nieuwsbriefId)
      .order('created_at')
      .range(van, van + PAGINA - 1)
    if (error) throw error
    const deel = (data ?? []) as unknown as typeof kliks
    kliks.push(...deel)
    if (deel.length < PAGINA) break
  }
  const linksPerEmail = new Map<string, Set<string>>()
  for (const k of kliks) {
    const set = linksPerEmail.get(k.email) ?? new Set<string>()
    set.add(zonderUtm(k.link))
    linksPerEmail.set(k.email, set)
  }

  const events = await alleEvents(nieuwsbriefId)
  const perEmail = new Map<string, { geopend: number; geklikt: number; afgemeld: boolean; gebouncet: boolean }>()
  for (const e of events) {
    const huidig = perEmail.get(e.email) ?? { geopend: 0, geklikt: 0, afgemeld: false, gebouncet: false }
    const herhaling = e.aantal && e.aantal > 0 ? e.aantal : 1
    if (e.type === 'opened') huidig.geopend = herhaling
    if (e.type === 'clicked') huidig.geklikt = herhaling
    if (e.type === 'unsubscribed') huidig.afgemeld = true
    if (e.type === 'bounced') huidig.gebouncet = true
    perEmail.set(e.email, huidig)
  }

  // Een verzending van vóór migratie 225 heeft geen snapshot. Dan is het
  // e-mailadres uit de events het enige wat we hebben; beter dan een leeg scherm.
  const basis = ontvangers.length > 0
    ? ontvangers
    : Array.from(perEmail.keys()).map(email => ({ email, naam: null, bedrijfsnaam: null, klant_id: null }))

  return basis
    .map(o => {
      const a = perEmail.get(o.email) ?? { geopend: 0, geklikt: 0, afgemeld: false, gebouncet: false }
      return {
        email: o.email,
        naam: o.naam || '',
        bedrijfsnaam: o.bedrijfsnaam || '',
        klantId: o.klant_id,
        ...a,
        links: Array.from(linksPerEmail.get(o.email) ?? []),
      }
    })
    .sort((a, b) => (b.geklikt - a.geklikt) || (b.geopend - a.geopend) || a.email.localeCompare(b.email))
}

export interface VerzendingSamenvatting {
  id: string
  onderwerp: string
  verzondenOp: string | null
  aantalOntvangers: number
  stats: NieuwsbriefStats
  percentages: NieuwsbriefPercentages
}

// Eén verzending zegt niets, de reeks zegt alles. Kit toont dit over de laatste
// acht sends; hier hetzelfde, zodat een dalende lijn opvalt vóór hij een
// probleem is.
export async function getVerzendReeks(limiet = 8): Promise<VerzendingSamenvatting[]> {
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .select('id, onderwerp, verzonden_op, aantal_ontvangers')
    .eq('status', 'verzonden')
    .not('verzonden_op', 'is', null)
    .order('verzonden_op', { ascending: false })
    .limit(limiet)
  if (error) throw error
  const rijen = (data ?? []) as unknown as { id: string; onderwerp: string; verzonden_op: string | null; aantal_ontvangers: number | null }[]

  const uit = await Promise.all(rijen.map(async r => {
    const stats = await getStats(r.id, r.aantal_ontvangers)
    return {
      id: r.id,
      onderwerp: r.onderwerp || 'Zonder onderwerp',
      verzondenOp: r.verzonden_op,
      aantalOntvangers: r.aantal_ontvangers ?? 0,
      stats,
      percentages: berekenPercentages(stats),
    }
  }))
  return uit.reverse()
}

export interface AfmeldReden { reden: string; aantal: number }

export async function getAfmeldRedenen(): Promise<AfmeldReden[]> {
  const { data, error } = await db().from('nieuwsbrief_afmeldingen').select('reden')
  if (error) throw error
  const per = new Map<string, number>()
  for (const r of (data ?? []) as unknown as { reden: string | null }[]) {
    const sleutel = r.reden || 'uitgeschreven'
    per.set(sleutel, (per.get(sleutel) ?? 0) + 1)
  }
  return Array.from(per.entries()).map(([reden, aantal]) => ({ reden, aantal })).sort((a, b) => b.aantal - a.aantal)
}

export const AFMELD_REDEN_LABEL: Record<string, string> = {
  te_vaak: 'Kreeg te veel mail',
  niet_relevant: 'Ging niet over hun werk',
  niet_aangemeld: 'Zeggen zich nooit te hebben aangemeld',
  anders: 'Andere reden',
  uitgeschreven: 'Zonder opgaaf',
  klacht: 'Gemarkeerd als spam',
}

export interface AdresProbleem {
  id: string
  email: string
  soort: 'bounce' | 'klacht'
  hard: boolean
  reden: string | null
  aantal: number
  laatst_op: string
}

export async function getAdresProblemen(): Promise<AdresProbleem[]> {
  const { data, error } = await db()
    .from('nieuwsbrief_adres_problemen')
    .select('id, email, soort, hard, reden, aantal, laatst_op')
    .order('laatst_op', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as AdresProbleem[]
}

export interface Betrokkenheid {
  email: string
  naam: string
  bedrijfsnaam: string
  klantId: string | null
  ontvangen: number
  geopend: number
  geklikt: number
  /** 0 tot 5. 0 = kreeg wel post, deed nooit iets. */
  score: number
  laatsteActie: string | null
}

// Kit geeft elke abonnee 1 tot 5 sterren op opens en kliks. Hier hetzelfde,
// maar dan gekoppeld aan een klant in doen., want dat is waar het in B2B om
// gaat: niet "wie is een fan" maar "bij wie is het warm".
//
// Een klik weegt zwaarder dan een open. Een open kan een preview-venster zijn
// of een afbeeldingenproxy; een klik is een handeling.
function scoreVan(ontvangen: number, geopend: number, geklikt: number): number {
  if (ontvangen === 0) return 0
  const openDeel = geopend / ontvangen
  const klikDeel = geklikt / ontvangen
  const gewogen = openDeel * 0.4 + klikDeel * 1.6
  if (gewogen >= 0.8) return 5
  if (gewogen >= 0.5) return 4
  if (gewogen >= 0.3) return 3
  if (gewogen >= 0.12) return 2
  if (gewogen > 0) return 1
  return 0
}

export async function getBetrokkenheid(): Promise<Betrokkenheid[]> {
  const { data: verzonden, error: vErr } = await db()
    .from('nieuwsbrieven')
    .select('id')
    .eq('status', 'verzonden')
  if (vErr) throw vErr
  const ids = ((verzonden ?? []) as unknown as { id: string }[]).map(r => r.id)
  if (ids.length === 0) return []

  const ontvangers: { email: string; naam: string | null; bedrijfsnaam: string | null; klant_id: string | null }[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db()
      .from('nieuwsbrief_ontvangers')
      .select('email, naam, bedrijfsnaam, klant_id')
      .in('nieuwsbrief_id', ids)
      .order('email')
      .range(van, van + PAGINA - 1)
    if (error) throw error
    const deel = (data ?? []) as unknown as typeof ontvangers
    ontvangers.push(...deel)
    if (deel.length < PAGINA) break
  }

  const events: { email: string; type: string; laatst_op: string | null; created_at: string }[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db()
      .from('nieuwsbrief_events')
      .select('email, type, laatst_op, created_at')
      .in('nieuwsbrief_id', ids)
      .in('type', ['opened', 'clicked'])
      .order('email')
      .range(van, van + PAGINA - 1)
    if (error) throw error
    const deel = (data ?? []) as unknown as typeof events
    events.push(...deel)
    if (deel.length < PAGINA) break
  }

  const per = new Map<string, Betrokkenheid>()
  for (const o of ontvangers) {
    const huidig = per.get(o.email)
    if (huidig) {
      huidig.ontvangen++
      // Latere verzendingen dragen de actuelere klantnaam.
      if (o.bedrijfsnaam) huidig.bedrijfsnaam = o.bedrijfsnaam
      if (o.naam) huidig.naam = o.naam
      if (o.klant_id) huidig.klantId = o.klant_id
      continue
    }
    per.set(o.email, {
      email: o.email,
      naam: o.naam || '',
      bedrijfsnaam: o.bedrijfsnaam || '',
      klantId: o.klant_id,
      ontvangen: 1,
      geopend: 0,
      geklikt: 0,
      score: 0,
      laatsteActie: null,
    })
  }
  for (const e of events) {
    const rij = per.get(e.email)
    if (!rij) continue
    if (e.type === 'opened') rij.geopend++
    if (e.type === 'clicked') rij.geklikt++
    const moment = e.laatst_op || e.created_at
    if (moment && (!rij.laatsteActie || moment > rij.laatsteActie)) rij.laatsteActie = moment
  }
  for (const rij of per.values()) rij.score = scoreVan(rij.ontvangen, rij.geopend, rij.geklikt)

  return Array.from(per.values()).sort((a, b) => (b.score - a.score) || (b.geklikt - a.geklikt) || a.email.localeCompare(b.email))
}

// ── Herzenden naar wie niet opende ─────────────────────────────────────────

export async function telNietGeopend(nieuwsbriefId: string): Promise<number> {
  const res = await fetch('/api/nieuwsbrief-herzend', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ nieuwsbriefId, alleenTellen: true }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Tellen mislukt')
  return Number((body as { aantalNietGeopend?: number }).aantalNietGeopend ?? 0)
}

export interface HerzendResultaat {
  herzendingId: string
  aantalOntvangers: number
  overgeslagen: number
}

export async function herzendNaarNietOpeners(
  nieuwsbriefId: string,
  onderwerp: string,
  preheader?: string,
): Promise<HerzendResultaat> {
  const res = await fetch('/api/nieuwsbrief-herzend', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ nieuwsbriefId, onderwerp, preheader }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Herzenden mislukt')
  return body as HerzendResultaat
}

// ── Segmenten ──────────────────────────────────────────────────────────────

export interface Segment {
  id: string
  user_id: string
  naam: string
  omschrijving: string | null
  selectie: OntvangerSelectie
  laatst_gebruikt_op: string | null
  created_at: string
  updated_at: string
}

export async function getSegmenten(): Promise<Segment[]> {
  const { data, error } = await db()
    .from('nieuwsbrief_segmenten')
    .select('*')
    .order('naam')
  if (error) throw error
  return (data ?? []) as unknown as Segment[]
}

export async function bewaarSegment(naam: string, selectie: OntvangerSelectie, omschrijving?: string): Promise<Segment> {
  const { data: { user } } = await db().auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  // Zelfde naam betekent bijwerken, niet een tweede segment met dezelfde naam.
  const { data, error } = await db()
    .from('nieuwsbrief_segmenten')
    .upsert(
      { user_id: user.id, naam: naam.trim(), omschrijving: omschrijving?.trim() || null, selectie, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,naam' },
    )
    .select('*')
    .single()
  if (error) throw error
  return data as unknown as Segment
}

export async function verwijderSegment(id: string): Promise<void> {
  const { error } = await db().from('nieuwsbrief_segmenten').delete().eq('id', id)
  if (error) throw error
}

export async function markeerSegmentGebruikt(id: string): Promise<void> {
  const { error } = await db()
    .from('nieuwsbrief_segmenten')
    .update({ laatst_gebruikt_op: new Date().toISOString() })
    .eq('id', id)
  if (error) console.warn('[nieuwsbrief] segment-gebruik bijwerken mislukt:', error.message)
}

// ── Losse adreslijsten ──────────────────────────────────────────────────────
// Adressen die geen klant in doen. zijn: een branchelijst, beursbezoekers, een
// eigen bestand. Ze staan bewust in een eigen tabel en niet in `klanten`, zodat
// ze nooit meeliften in een verzending naar "Iedereen".

export interface Lijst {
  id: string
  user_id: string
  naam: string
  omschrijving: string | null
  created_at: string
  updated_at: string
  aantal?: number
}

export interface LijstAdres {
  id: string
  lijst_id: string
  email: string
  naam: string
  bedrijfsnaam: string
  created_at: string
}

export async function getLijsten(): Promise<Lijst[]> {
  const { data, error } = await db()
    .from('nieuwsbrief_lijsten')
    .select('*, nieuwsbrief_lijst_adressen(count)')
    .order('naam')
  if (error) throw error
  return (data ?? []).map(rij => {
    const r = rij as unknown as Lijst & { nieuwsbrief_lijst_adressen?: { count: number }[] }
    const { nieuwsbrief_lijst_adressen: telling, ...rest } = r
    return { ...rest, aantal: telling?.[0]?.count ?? 0 }
  })
}

export async function getLijstAdressen(lijstId: string): Promise<LijstAdres[]> {
  const uit: LijstAdres[] = []
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await db()
      .from('nieuwsbrief_lijst_adressen')
      .select('id, lijst_id, email, naam, bedrijfsnaam, created_at')
      .eq('lijst_id', lijstId)
      .order('email')
      .range(van, van + PAGINA - 1)
    if (error) throw error
    const rijen = (data ?? []) as unknown as LijstAdres[]
    uit.push(...rijen)
    if (rijen.length < PAGINA) break
  }
  return uit
}

export async function maakLijst(naam: string, omschrijving?: string): Promise<Lijst> {
  const { data: { user } } = await db().auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  const { data, error } = await db()
    .from('nieuwsbrief_lijsten')
    .insert({ user_id: user.id, naam: naam.trim(), omschrijving: omschrijving?.trim() || null })
    .select('*')
    .single()
  if (error) throw new Error(error.code === '23505' ? `Je hebt al een lijst met de naam "${naam.trim()}"` : error.message)
  return { ...(data as unknown as Lijst), aantal: 0 }
}

export async function verwijderLijst(id: string): Promise<void> {
  const { error } = await db().from('nieuwsbrief_lijsten').delete().eq('id', id)
  if (error) throw error
}

export async function verwijderLijstAdres(id: string): Promise<void> {
  const { error } = await db().from('nieuwsbrief_lijst_adressen').delete().eq('id', id)
  if (error) throw error
}

/**
 * Voegt adressen toe aan een lijst. Bestaande adressen worden overgeslagen, niet
 * overschreven: twee keer hetzelfde bestand importeren mag geen dubbele mail
 * opleveren. Per 500 wegschrijven, want een lijst van duizenden adressen past
 * niet in één PostgREST-aanroep.
 */
export async function voegAdressenToe(lijstId: string, rijen: NieuwAdres[]): Promise<{ toegevoegd: number; overgeslagen: number }> {
  const { data: { user } } = await db().auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  const bestaand = new Set((await getLijstAdressen(lijstId)).map(a => a.email))
  const gezien = new Set<string>()
  const nieuw: Record<string, unknown>[] = []
  let overgeslagen = 0
  for (const r of rijen) {
    const email = String(r.email || '').trim().toLowerCase()
    if (!isEmail(email) || bestaand.has(email) || gezien.has(email)) { overgeslagen++; continue }
    gezien.add(email)
    nieuw.push({ lijst_id: lijstId, user_id: user.id, email, naam: (r.naam || '').trim(), bedrijfsnaam: (r.bedrijfsnaam || '').trim() })
  }
  const BROK = 500
  for (let i = 0; i < nieuw.length; i += BROK) {
    const { error } = await db().from('nieuwsbrief_lijst_adressen').insert(nieuw.slice(i, i + BROK))
    if (error) throw error
  }
  if (nieuw.length > 0) {
    await db().from('nieuwsbrief_lijsten').update({ updated_at: new Date().toISOString() }).eq('id', lijstId)
  }
  return { toegevoegd: nieuw.length, overgeslagen }
}

export interface NieuwAdres { email: string; naam?: string; bedrijfsnaam?: string }

/**
 * Leest geplakte tekst of een CSV-export uit Excel. Slikt komma's, puntkomma's
 * en tabs als scheidingsteken, en herkent een kopregel aan het woord e-mail.
 * Zonder kopregel wordt de kolom met een @ als adres genomen, zodat "Bedrijf;
 * Naam; adres@..." net zo goed werkt als een kale lijst adressen.
 */
export function parseAdressen(tekst: string): NieuwAdres[] {
  const regels = tekst.split(/\r?\n/).map(r => r.trim()).filter(Boolean)
  if (regels.length === 0) return []
  const splits = (r: string) => r.split(/[;,\t]/).map(v => v.trim().replace(/^"|"$/g, ''))

  let kolEmail = -1, kolNaam = -1, kolBedrijf = -1
  const kop = splits(regels[0]).map(v => v.toLowerCase())
  const heeftKop = kop.some(v => /e-?mail|mailadres/.test(v)) && !kop.some(v => v.includes('@'))
  if (heeftKop) {
    kolEmail = kop.findIndex(v => /e-?mail|mailadres/.test(v))
    kolNaam = kop.findIndex(v => /naam|contact/.test(v) && !/bedrijf/.test(v))
    kolBedrijf = kop.findIndex(v => /bedrijf|organisatie|company/.test(v))
  }

  const uit: NieuwAdres[] = []
  for (const regel of regels.slice(heeftKop ? 1 : 0)) {
    const velden = splits(regel)
    const email = kolEmail >= 0 ? (velden[kolEmail] ?? '') : (velden.find(v => v.includes('@')) ?? '')
    if (!email) continue
    uit.push({
      email,
      naam: kolNaam >= 0 ? (velden[kolNaam] ?? '') : '',
      bedrijfsnaam: kolBedrijf >= 0 ? (velden[kolBedrijf] ?? '') : '',
    })
  }
  return uit
}

// Korte omschrijving van een selectie, voor in de lijst met segmenten.
export function omschrijfSelectie(sel: OntvangerSelectie): string {
  const delen: string[] = []
  if (sel.type === 'alle') delen.push('iedereen')
  else if (sel.type === 'lijst') delen.push('losse adreslijst')
  else if (sel.type === 'handmatig') delen.push(`${(sel.klantIds ?? []).length} gekozen klanten`)
  else {
    const st = sel.statussen ?? []
    const lb = sel.labels ?? []
    if (st.length > 0) delen.push(st.join(', '))
    if (lb.length > 0) delen.push(`label ${lb.join(', ')}`)
    if (delen.length === 0) delen.push('alle klanten')
  }
  if (sel.gedrag && sel.gedrag !== 'alle') delen.push(GEDRAG_LABEL[sel.gedrag].titel.toLowerCase())
  if (sel.inclusiefContactpersonen === false) delen.push('zonder contactpersonen')
  return delen.join(' · ')
}

// Labels die daadwerkelijk op klanten staan. Apart van getKlantKeuzes omdat de
// blok-inspector alleen de namen nodig heeft en niet de hele klantenlijst.
let labelCache: { op: number; belofte: Promise<string[]> } | null = null

export async function getGebruikteLabels(): Promise<string[]> {
  if (labelCache && Date.now() - labelCache.op < 300_000) return labelCache.belofte
  const belofte = (async () => {
    const rijen = await alles<{ labels: string[] | null }>('klanten', 'id, labels', 'id')
    const uniek = new Set<string>()
    for (const r of rijen) for (const l of r.labels ?? []) if (l?.trim()) uniek.add(l.trim())
    return Array.from(uniek).sort((a, b) => a.localeCompare(b))
  })().catch(e => { labelCache = null; throw e })
  labelCache = { op: Date.now(), belofte }
  return belofte
}

// ── Bezorgbaarheid ─────────────────────────────────────────────────────────

export interface DomeinStatus {
  domein: string
  gevonden: boolean
  status?: string
  spf?: string | null
  dkim?: string | null
  dmarc: { aanwezig: boolean; beleid: string | null; ruw: string | null }
  openTracking?: boolean
  klikTracking?: boolean
  webhookIngesteld: boolean
}

export async function getDomeinStatus(): Promise<DomeinStatus> {
  const res = await fetch('/api/nieuwsbrief-domein', { headers: await authHeader() })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Kon het domein niet controleren')
  return body as DomeinStatus
}
