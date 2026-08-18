import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Service-role client — RLS-bypass, admin-toegang server-side afgedwongen.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Support wordt door één persoon beheerd: deze auth-user (niet de hele org).
const ADMIN_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
// Org van de support-beheerder — alleen om de eigen org uit de klant-lijst te filteren.
const ADMIN_ORG_ID = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'

const STANDAARD_PAGINA = 25
// Ruim boven het aantal klant-organisaties: een reload na een realtime-INSERT
// vraagt alle al geladen pagina's in één keer terug, en die mag de cap niet raken.
const MAX_PAGINA = 200
// Backstop op de preview-query. Zonder deze grens kan één gesprek met een zeer
// lange thread de hele pagina-response opblazen.
const MAX_PREVIEW_BERICHTEN_PER_GESPREK = 50

interface BerichtPreview {
  bericht: string
  afzender: string
  aangemaakt_op: string
}

/**
 * 42703 is undefined_column; PGRST204 is dezelfde situatie via de schema-cache.
 * Bewust alleen op foutcode en niet op de tekst van de melding: een RLS- of
 * permissiefout die de kolomnaam echoot zou anders als "niet gemigreerd" gelezen
 * worden, en dan zou de inbox de toewijzing stil verstoppen terwijl hij bestaat.
 */
export function kolomOntbreekt(fout: { code?: string } | null): boolean {
  return fout?.code === '42703' || fout?.code === 'PGRST204'
}

// Cache voor de kolomprobe. Zodra de kolom bestaat verdwijnt hij niet meer, dus
// een positief antwoord mag blijven staan; een negatief antwoord verloopt, zodat
// de UI de toewijzing binnen een minuut na de migratie ziet opduiken.
const PROBE_TTL_MS = 60_000
let toewijzingKolomAanwezig: boolean | null = null
let toewijzingProbeTijd = 0

/**
 * Bestaat support_gesprekken.toegewezen_aan al?
 *
 * Tussen de deploy van deze code en het draaien van migratie 201 zit tijd, en in
 * die tijd moet de inbox blijven werken. De lees- en schrijfpaden vallen terug in
 * plaats van te klappen; dit vertelt de UI of de toewijzingsknop zin heeft.
 */
async function toewijzingBeschikbaar(): Promise<boolean> {
  if (toewijzingKolomAanwezig === true) return true
  if (toewijzingKolomAanwezig === false && Date.now() - toewijzingProbeTijd < PROBE_TTL_MS) return false

  const { error } = await supabaseAdmin.from('support_gesprekken').select('toegewezen_aan').limit(1)
  toewijzingProbeTijd = Date.now()

  if (kolomOntbreekt(error)) {
    toewijzingKolomAanwezig = false
    return false
  }
  if (error) {
    // Een andere fout (RLS, netwerk) zegt niets over de kolom en wordt daarom
    // niet gecached: de volgende request probeert opnieuw. Een reeds vastgesteld
    // 'true' is hierboven al teruggegeven, dus hier resteert alleen 'nog niet
    // aangetoond' en dat leest als niet beschikbaar.
    console.error('[support-inbox] probe toewijzing', error.message)
    return false
  }
  toewijzingKolomAanwezig = true
  return true
}

/**
 * Pure paginatie-parser. Onbruikbare of negatieve waarden vallen terug op de
 * standaardpagina in plaats van een fout te geven: een kapotte querystring mag
 * de inbox niet onbruikbaar maken.
 */
export function leesPaginatie(query: Record<string, unknown>): { limiet: number; offset: number } {
  const ruweLimiet = Number.parseInt(String(query.limit ?? ''), 10)
  const ruweOffset = Number.parseInt(String(query.offset ?? ''), 10)
  return {
    limiet: Number.isFinite(ruweLimiet) && ruweLimiet > 0 ? Math.min(ruweLimiet, MAX_PAGINA) : STANDAARD_PAGINA,
    offset: Number.isFinite(ruweOffset) && ruweOffset > 0 ? ruweOffset : 0,
  }
}

/**
 * Ondergrens voor de preview-query.
 *
 * Het laatste bericht van een gesprek heeft altijd een aangemaakt_op >=
 * laatste_bericht_op van dat gesprek (de schrijvers zetten die stempel vóór de
 * insert). De oudste laatste_bericht_op van de pagina is dus een veilige
 * ondergrens, waardoor we niet de volledige berichthistorie hoeven te lezen om
 * één regel preview per gesprek te krijgen.
 *
 * De marge dekt klok-scheefstand en legacy-rijen af; een te lage ondergrens
 * kost wat extra rijen, een te hoge zou previews laten verdwijnen.
 */
export function ondergrensVoorPreviews(
  gesprekken: { laatste_bericht_op?: string | null }[],
  margeMs = 60_000
): string | null {
  let oudste: number | null = null
  for (const g of gesprekken) {
    if (!g.laatste_bericht_op) return null
    const t = new Date(g.laatste_bericht_op).getTime()
    if (!Number.isFinite(t)) return null
    if (oudste === null || t < oudste) oudste = t
  }
  if (oudste === null) return null
  return new Date(oudste - margeMs).toISOString()
}

/**
 * Laatste bericht per gesprek. Vergelijkt op tijdstempel in plaats van te
 * vertrouwen op de sorteerrichting van de query, zodat een gewijzigde
 * order-clausule de preview niet stil omdraait.
 */
export function laatsteBerichtPerGesprek(
  berichten: { gesprek_id: string; bericht: string; afzender: string; aangemaakt_op: string }[]
): Record<string, BerichtPreview> {
  const perGesprek: Record<string, BerichtPreview> = {}
  for (const b of berichten) {
    const huidig = perGesprek[b.gesprek_id]
    if (!huidig || b.aangemaakt_op > huidig.aangemaakt_op) {
      perGesprek[b.gesprek_id] = {
        bericht: b.bericht,
        afzender: b.afzender,
        aangemaakt_op: b.aangemaakt_op,
      }
    }
  }
  return perGesprek
}

/** Een gesprek vraagt aandacht zolang het open staat en de klant het laatst sprak. */
export function telAttentie(
  gesprekIds: string[],
  laatste: Record<string, BerichtPreview>
): number {
  return gesprekIds.filter(id => laatste[id]?.afzender === 'klant').length
}

// Previews voor een set gesprekken, begrensd op tijd én aantal.
async function haalPreviews(
  gesprekken: { id: string; laatste_bericht_op?: string | null }[]
): Promise<Record<string, BerichtPreview>> {
  const ids = gesprekken.map(g => g.id)
  if (ids.length === 0) return {}

  let query = supabaseAdmin
    .from('support_berichten')
    .select('gesprek_id, bericht, afzender, aangemaakt_op')
    .in('gesprek_id', ids)

  const ondergrens = ondergrensVoorPreviews(gesprekken)
  if (ondergrens) query = query.gte('aangemaakt_op', ondergrens)

  const { data, error } = await query
    .order('aangemaakt_op', { ascending: false })
    .limit(ids.length * MAX_PREVIEW_BERICHTEN_PER_GESPREK)

  if (error) {
    console.error('[support-inbox] previews', error.message)
    return {}
  }
  return laatsteBerichtPerGesprek(data || [])
}

/**
 * Attentie-teller voor de sidebar-badge.
 *
 * Bewust alleen over openstaande gesprekken: dat is een van nature kleine set
 * (een supportwachtrij), dus deze telling blijft begrensd terwijl de inbox
 * zelf gepagineerd is. De badge mag niet met de paginagrootte meebewegen.
 */
async function berekenAttentie(): Promise<number> {
  const { data: open, error } = await supabaseAdmin
    .from('support_gesprekken')
    .select('id, laatste_bericht_op')
    .eq('status', 'open')
  if (error || !open?.length) return 0

  const previews = await haalPreviews(open as { id: string; laatste_bericht_op: string | null }[])
  return telAttentie(open.map(g => g.id as string), previews)
}

// ── Auth helper (inline; Vercel bundelt geen api/_helpers/ imports) ──
async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// Admin-gate: alleen de support-beheerder (één specifieke user) mag verder.
async function assertAdmin(userId: string): Promise<void> {
  if (userId !== ADMIN_USER_ID) {
    throw new Error('Geen toegang')
  }
}

// Notificeer alleen de eigenaar van de klant-org — één melding per bericht, geen org-spam.
async function notifyOrg(orgId: string, tekst: string): Promise<void> {
  const { data: org } = await supabaseAdmin
    .from('organisaties')
    .select('eigenaar_id')
    .eq('id', orgId)
    .maybeSingle()
  const ownerId = (org?.eigenaar_id as string | null) ?? null
  if (!ownerId) return
  const preview = tekst.length > 140 ? tekst.slice(0, 137) + '…' : tekst
  await supabaseAdmin.from('notificaties').insert({
    user_id: ownerId,
    organisatie_id: orgId,
    type: 'algemeen',
    titel: 'Nieuw bericht van doen. support',
    bericht: preview,
    link: '/',
    gelezen: false,
  })
}

async function getOrgNaam(orgId: string): Promise<string> {
  const { data } = await supabaseAdmin.from('organisaties').select('naam').eq('id', orgId).maybeSingle()
  return (data?.naam as string | null) || 'Onbekend'
}

// Pak het open gesprek van een org, of maak er één aan.
async function findOrCreateGesprek(orgId: string): Promise<string> {
  const { data: bestaand } = await supabaseAdmin
    .from('support_gesprekken')
    .select('id')
    .eq('organisatie_id', orgId)
    .eq('status', 'open')
    .order('laatste_bericht_op', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (bestaand?.id) return bestaand.id as string

  const orgNaam = await getOrgNaam(orgId)
  const { data: nieuw, error } = await supabaseAdmin
    .from('support_gesprekken')
    .insert({ organisatie_id: orgId, org_naam: orgNaam })
    .select('id')
    .single()
  if (error || !nieuw) throw new Error('Gesprek aanmaken mislukt')
  return nieuw.id as string
}

// Plaats een admin-bericht, bump het gesprek en notificeer de org.
async function plaatsAdminBericht(gesprekId: string, orgId: string, userId: string, tekst: string) {
  const nu = new Date().toISOString()
  const { data: nieuwBericht, error } = await supabaseAdmin
    .from('support_berichten')
    .insert({ gesprek_id: gesprekId, afzender: 'admin', bericht: tekst, medewerker_id: userId })
    .select('*')
    .single()
  if (error || !nieuwBericht) throw new Error('Bericht opslaan mislukt')

  await supabaseAdmin
    .from('support_gesprekken')
    .update({ laatste_bericht_op: nu, status: 'open' })
    .eq('id', gesprekId)

  await notifyOrg(orgId, tekst)
  return nieuwBericht
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const userId = await verifyUser(req)
    await assertAdmin(userId)

    // ── GET: accounts-overzicht, thread van één gesprek, of de inbox-lijst ──
    if (req.method === 'GET') {
      // Alle klant-organisaties (voor het account-overzicht).
      if (req.query.accounts) {
        const { data: orgs, error } = await supabaseAdmin
          .from('organisaties')
          .select('id, naam')
          .neq('id', ADMIN_ORG_ID)
          .order('naam', { ascending: true })
        if (error) throw new Error('Accounts ophalen mislukt')
        return res.status(200).json({ accounts: orgs || [] })
      }

      // Alleen de badge-teller — de sidebar hoeft de lijst niet te laden.
      if (req.query.attentie) {
        return res.status(200).json({ attentie: await berekenAttentie() })
      }

      // Toewijsbare medewerkers: uitsluitend de supportorganisatie. Deze tabel is
      // cross-tenant, dus zonder die filter zou elk profiel van elke klant-org
      // in de lijst belanden.
      if (req.query.medewerkers) {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, voornaam, achternaam, email')
          .eq('organisatie_id', ADMIN_ORG_ID)
          .order('voornaam', { ascending: true })
        if (error) throw new Error('Medewerkers ophalen mislukt')
        const medewerkers = (data || []).map(p => ({
          id: p.id as string,
          naam:
            [p.voornaam, p.achternaam].filter(Boolean).join(' ').trim() ||
            (p.email as string | null) ||
            'Naamloos',
        }))
        return res.status(200).json({ medewerkers })
      }

      const gesprekId = (req.query.gesprek_id as string | undefined)?.trim()

      // Eén gesprek → volledige thread.
      if (gesprekId) {
        const { data: gesprek, error: gesprekError } = await supabaseAdmin
          .from('support_gesprekken')
          .select('*')
          .eq('id', gesprekId)
          .maybeSingle()
        if (gesprekError) throw new Error('Gesprek ophalen mislukt')
        if (!gesprek) return res.status(404).json({ error: 'Gesprek niet gevonden' })

        const { data: berichten, error: berichtenError } = await supabaseAdmin
          .from('support_berichten')
          .select('*')
          .eq('gesprek_id', gesprekId)
          .order('aangemaakt_op', { ascending: true })
        if (berichtenError) throw new Error('Berichten ophalen mislukt')

        return res.status(200).json({ gesprek, berichten: berichten || [] })
      }

      // Lijst → één pagina, nieuwste activiteit eerst, met laatste-bericht-preview.
      const { limiet, offset } = leesPaginatie(req.query as Record<string, unknown>)
      const { data: gesprekken, count, error: lijstError } = await supabaseAdmin
        .from('support_gesprekken')
        .select('*', { count: 'exact' })
        .order('laatste_bericht_op', { ascending: false })
        // Tweede, unieke sleutel. Zonder tiebreaker zijn OFFSET-vensters alleen
        // stabiel als laatste_bericht_op uniek is; twee gesprekken met dezelfde
        // stempel kunnen dan van venster wisselen en zo net buiten beide vallen.
        // Een dubbele rij vangt voegGesprekkenSamen op, een gemiste rij niet.
        .order('id', { ascending: false })
        .range(offset, offset + limiet - 1)
      if (lijstError) throw new Error('Inbox ophalen mislukt')

      const pagina = (gesprekken || []) as { id: string; laatste_bericht_op: string | null }[]
      const laatstePerGesprek = await haalPreviews(pagina)

      const resultaat = pagina.map(g => ({
        ...g,
        laatste_bericht: laatstePerGesprek[g.id] || null,
      }))

      return res.status(200).json({
        gesprekken: resultaat,
        totaal: count ?? resultaat.length,
        attentie: await berekenAttentie(),
        toewijzing_beschikbaar: await toewijzingBeschikbaar(),
      })
    }

    // ── POST: antwoord, update naar één account, broadcast, of status ──
    if (req.method === 'POST') {
      const { gesprek_id, organisatie_id, bericht, status, broadcast, toegewezen_aan } = req.body as {
        gesprek_id?: string; organisatie_id?: string; bericht?: string; status?: string
        broadcast?: boolean; toegewezen_aan?: string | null
      }

      // Toewijzen, of vrijgeven met null — geen bericht vereist.
      if (toegewezen_aan !== undefined) {
        if (!gesprek_id) return res.status(400).json({ error: 'gesprek_id ontbreekt' })

        const doelId = toegewezen_aan === null ? null : String(toegewezen_aan).trim()
        if (doelId) {
          const { data: profiel } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', doelId)
            .eq('organisatie_id', ADMIN_ORG_ID)
            .maybeSingle()
          if (!profiel) return res.status(400).json({ error: 'Onbekende medewerker' })
        }

        const { data: bijgewerkt, error: toewijsError } = await supabaseAdmin
          .from('support_gesprekken')
          .update({
            toegewezen_aan: doelId || null,
            toegewezen_op: doelId ? new Date().toISOString() : null,
          })
          .eq('id', gesprek_id)
          .select('*')
          .single()

        // Migratie 201 nog niet gedraaid: expliciet melden in plaats van een
        // generieke 500, zodat de UI kan zeggen wat eraan schort.
        if (kolomOntbreekt(toewijsError)) {
          toewijzingKolomAanwezig = false
          toewijzingProbeTijd = Date.now()
          return res.status(503).json({
            error: 'Toewijzen kan nog niet: migratie 201 moet eerst draaien.',
            migratie_ontbreekt: true,
          })
        }
        if (toewijsError || !bijgewerkt) throw new Error('Toewijzen mislukt')
        return res.status(200).json({ gesprek: bijgewerkt })
      }

      // Status-update (afronden / heropenen) — geen bericht vereist.
      if (status !== undefined) {
        if (!gesprek_id) return res.status(400).json({ error: 'gesprek_id ontbreekt' })
        if (status !== 'open' && status !== 'afgerond') {
          return res.status(400).json({ error: 'Ongeldige status' })
        }
        const { data: bijgewerkt, error: statusError } = await supabaseAdmin
          .from('support_gesprekken')
          .update({ status })
          .eq('id', gesprek_id)
          .select('*')
          .single()
        if (statusError || !bijgewerkt) throw new Error('Status bijwerken mislukt')
        return res.status(200).json({ gesprek: bijgewerkt })
      }

      const tekst = (bericht || '').trim()
      if (!tekst) return res.status(400).json({ error: 'Bericht is leeg' })
      if (tekst.length > 5000) return res.status(400).json({ error: 'Bericht is te lang' })

      // Broadcast naar alle klant-organisaties.
      if (broadcast) {
        const { data: orgs } = await supabaseAdmin
          .from('organisaties')
          .select('id')
          .neq('id', ADMIN_ORG_ID)
        let verstuurd = 0
        for (const o of orgs || []) {
          try {
            const gid = await findOrCreateGesprek(o.id as string)
            await plaatsAdminBericht(gid, o.id as string, userId, tekst)
            verstuurd++
          } catch (e) {
            console.error('[support-inbox] broadcast org', o.id, (e as Error).message)
          }
        }
        return res.status(200).json({ verstuurd })
      }

      // Update naar één account (nieuw of bestaand gesprek).
      if (organisatie_id) {
        const gid = await findOrCreateGesprek(organisatie_id)
        const nieuwBericht = await plaatsAdminBericht(gid, organisatie_id, userId, tekst)
        return res.status(200).json({ gesprek_id: gid, bericht: nieuwBericht })
      }

      // Antwoord op bestaand gesprek.
      if (gesprek_id) {
        const { data: gesprek } = await supabaseAdmin
          .from('support_gesprekken')
          .select('id, organisatie_id')
          .eq('id', gesprek_id)
          .maybeSingle()
        if (!gesprek) return res.status(404).json({ error: 'Gesprek niet gevonden' })
        const nieuwBericht = await plaatsAdminBericht(gesprek_id, gesprek.organisatie_id as string, userId, tekst)
        return res.status(200).json({ bericht: nieuwBericht })
      }

      return res.status(400).json({ error: 'gesprek_id, organisatie_id of broadcast vereist' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const message = (err as Error).message
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    if (message === 'Geen toegang') {
      return res.status(403).json({ error: message })
    }
    console.error('[support-inbox]', message)
    return res.status(500).json({ error: message || 'Interne fout' })
  }
}
