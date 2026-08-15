/**
 * Dagelijkse terugkoppeling Exact -> doen. voor betaalstatus.
 *
 * Leest per gekoppelde organisatie de gewijzigde betaaltermijnen uit Exact
 * (sync/Cashflow/PaymentTerms, delta op de Int64-rowversion Timestamp) en
 * spiegelt ze in exact_betaaltermijnen. Termijnbedragen gaan bewust NIET los
 * door factuur_betalingen: een Mollie-betaling duikt na het afletteren van de
 * payout ook in Exact op en zou dan dubbel tellen. Pas als álle termijnen van
 * een factuur status 50 (afgeletterd) hebben, boekt de cron het nog
 * openstaande restant als één betaling via factuur_markeer_betaald
 * (bron 'exact', referentie 'exact-settle:<factuur_id>', idempotent).
 *
 * Exact-webhooks zijn hier bewust niet gebruikt: er bestaat geen topic voor
 * betalingen/afletteren en Exact geeft geen afleveringsgarantie. Eén delta-run
 * per dag kost een handvol calls en valt ruim binnen de limieten (60/min,
 * 5000/dag per app per administratie).
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET} header.
 * Schedule: dagelijks 06:45 UTC (07:45/08:45 Amsterdam), ruim vóór de
 * factuur-herinnering-cron van 09:30 zodat die met een verse stand draait.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as Sentry from '@sentry/node'

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

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ZOMBIE_ORG = '08352d84-e2be-4760-9436-f468b4327438'
const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'
// Grens per run: 20 pagina's van max 1000 termijnen. De eerste inhaalslag kan
// meerdere runs duren; zolang dat loopt (inhaalslag_bezig) wordt er nog niets
// betaald gemarkeerd, omdat de spiegel dan incompleet kan zijn.
const MAX_PAGINAS_PER_RUN = 20

// -- Integration credential encryption (zelfde formaat als exact-sync-factuur.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function encryptSecret(text: string): string {
  if (!INT_KEY) return text
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(INT_KEY, salt, 32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return 'g1:' + Buffer.concat([salt, iv, cipher.getAuthTag(), ct]).toString('base64')
}
function decryptSecret(text: string): string {
  if (text && text.startsWith('g1:')) {
    if (!INT_KEY) throw new Error('Server-encryptie is niet geconfigureerd (INTEGRATION_ENCRYPTION_KEY).')
    try {
      const raw = Buffer.from(text.slice(3), 'base64')
      const key = crypto.scryptSync(INT_KEY, raw.subarray(0, 16), 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(16, 28))
      decipher.setAuthTag(raw.subarray(28, 44))
      return Buffer.concat([decipher.update(raw.subarray(44)), decipher.final()]).toString('utf8')
    } catch {
      throw new Error('Integratie-token kan niet ontsleuteld worden (encryptie-key gewijzigd?).')
    }
  }
  if (!text || !text.includes(':') || text.length < 34) return text
  if (!INT_KEY) { console.warn('[encryption] INTEGRATION_ENCRYPTION_KEY not set'); return text }
  try {
    const key = crypto.scryptSync(INT_KEY, 'integration', 32)
    const [ivHex, enc] = text.split(':')
    if (!ivHex || ivHex.length !== 32 || !enc) return text
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
    return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8')
  } catch { console.warn('[encryption] decrypt failed, treating as plaintext'); return text }
}

async function getOrgIdForUser(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return ((data as { organisatie_id?: string } | null)?.organisatie_id) ?? null
}

async function loadAppSettingsOrgFirst(
  supabase: SupabaseClient,
  userId: string,
  columns: string,
): Promise<Record<string, unknown> | null> {
  const orgId = await getOrgIdForUser(supabase, userId)
  if (orgId) {
    const { data } = await supabase
      .from('app_settings')
      .select(columns)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (data) return data as unknown as Record<string, unknown>
  }
  const { data } = await supabase
    .from('app_settings')
    .select(columns)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Record<string, unknown> | null) ?? null
}

// ── Token-machinerie: zelfde compare-and-swap-rotatie als exact-sync-factuur.ts.
// De cache leeft per org-run; de cron draait organisaties sequentieel.
type TokenCache = { accessToken: string | null; expiresAt: number }

async function schrijfGeroteerdeKeten(params: {
  tokenUserId: string
  gelezenRefreshToken: string
  nieuweRij: Record<string, unknown>
  versAccessToken: string
}): Promise<string> {
  const { tokenUserId, gelezenRefreshToken, nieuweRij, versAccessToken } = params

  const { data: bijgewerkt, error: updateFout } = await supabaseAdmin
    .from('exact_tokens')
    .update(nieuweRij)
    .eq('user_id', tokenUserId)
    .eq('refresh_token', gelezenRefreshToken)
    .select('user_id')

  if (!updateFout && bijgewerkt?.length) return versAccessToken

  if (updateFout) {
    console.error('[Exact] geroteerde token NIET opgeslagen — keten is hierna dood', {
      token_user_id: tokenUserId, endpoint: 'cron-exact-betaalsync.ts', fout: updateFout.message,
    })
    Sentry.captureException(new Error('Exact token rotation not persisted'), {
      level: 'error',
      tags: { exact_endpoint: 'cron-exact-betaalsync', oauth_error: 'rotation_not_persisted' },
      extra: { token_user_id: tokenUserId, fout: updateFout.message },
    })
    return versAccessToken
  }

  // Nul rijen geraakt: iemand anders (parallelle refresh of verse OAuth-
  // callback) schreef een nieuwere keten, of de koppeling is net ontkoppeld.
  // De cron maakt de rij bewust nooit opnieuw aan: een nachtelijke job mag
  // een expliciete ontkoppeling niet tot leven wekken. De keepalive-cron en
  // de eerstvolgende handmatige sync herstellen een gemiste rotatie.
  const { data: huidig } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token')
    .eq('user_id', tokenUserId)
    .maybeSingle()
  const huidigToken = (huidig as { access_token?: string | null } | null)?.access_token
  if (huidigToken) return decryptSecret(huidigToken)
  return versAccessToken
}

async function getValidToken(tokenUserId: string, cache: TokenCache): Promise<{ token: string; division: number | null }> {
  const { data: tokenData } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token, refresh_token, expires_at, division')
    .eq('user_id', tokenUserId)
    .maybeSingle() as { data: { access_token: string; refresh_token: string; expires_at: string; division: number | null } | null }

  if (!tokenData) throw new Error('GEEN_TOKENS')

  if (cache.accessToken && cache.expiresAt - Date.now() > 5 * 60 * 1000) {
    return { token: cache.accessToken, division: tokenData.division }
  }

  const expiresAt = new Date(tokenData.expires_at).getTime()
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    const settings = await loadAppSettingsOrgFirst(
      supabaseAdmin,
      tokenUserId,
      'exact_online_client_id, exact_online_client_secret',
    )
    const exactClientId = settings?.exact_online_client_id as string | undefined
    const exactClientSecret = settings?.exact_online_client_secret ? decryptSecret(settings.exact_online_client_secret as string) : undefined
    if (!exactClientId || !exactClientSecret) throw new Error('Exact credentials niet gevonden')

    const refreshRes = await fetch('https://start.exactonline.nl/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptSecret(tokenData.refresh_token),
        client_id: exactClientId,
        client_secret: exactClientSecret,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!refreshRes.ok) {
      const errorBody = await refreshRes.text()
      if (refreshRes.status === 400 || refreshRes.status === 401) {
        // Single-use refresh tokens: een parallelle refresh kan net gewonnen
        // hebben. Herlees; staat er een nieuwe keten, gebruik die. De cron
        // verwijdert bij invalid_grant bewust NIETS — dat oordeel is aan de
        // interactieve paden, een nachtelijke job mag niet ontkoppelen.
        await new Promise((r) => setTimeout(r, 1500))
        const { data: herlezen } = await supabaseAdmin
          .from('exact_tokens')
          .select('access_token, refresh_token')
          .eq('user_id', tokenUserId)
          .maybeSingle()
        if (herlezen?.refresh_token && herlezen.refresh_token !== tokenData.refresh_token) {
          return { token: decryptSecret(herlezen.access_token), division: tokenData.division }
        }
        if (errorBody.includes('invalid_grant')) {
          Sentry.captureException(new Error('Exact invalid_grant'), {
            level: 'warning',
            tags: { exact_endpoint: 'cron-exact-betaalsync', oauth_error: 'invalid_grant' },
            extra: { token_user_id: tokenUserId },
          })
          throw new Error('TOKEN_AFGEWEZEN')
        }
      }
      throw new Error(`Token vernieuwen mislukt (${refreshRes.status})`)
    }

    const tokens = await refreshRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!tokens?.access_token) throw new Error('Token-refresh gaf 200 zonder access_token')

    const nieuweRij = {
      user_id: tokenUserId,
      access_token: encryptSecret(tokens.access_token),
      refresh_token: encryptSecret(tokens.refresh_token || decryptSecret(tokenData.refresh_token)),
      expires_at: new Date(Date.now() + (tokens.expires_in ?? 600) * 1000).toISOString(),
      division: tokenData.division,
      updated_at: new Date().toISOString(),
    }
    const uitkomst = await schrijfGeroteerdeKeten({
      tokenUserId,
      gelezenRefreshToken: tokenData.refresh_token,
      nieuweRij,
      versAccessToken: tokens.access_token,
    })
    cache.accessToken = uitkomst
    cache.expiresAt = new Date(nieuweRij.expires_at).getTime()
    return { token: uitkomst, division: tokenData.division }
  }

  const bestaand = decryptSecret(tokenData.access_token)
  cache.accessToken = bestaand
  cache.expiresAt = expiresAt
  return { token: bestaand, division: tokenData.division }
}

// 429 met Retry-After (gecapt) en maximaal twee extra pogingen; GET's zijn
// idempotent dus ook timeouts mogen opnieuw.
async function exactFetchMetRetry(url: string, init: RequestInit): Promise<Response> {
  for (let poging = 0; ; poging++) {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) })
    if (response.status !== 429 || poging >= 2) return response
    const retryAfter = Number(response.headers.get('Retry-After'))
    const wachtMs = Math.min((retryAfter > 0 ? retryAfter : 5) * 1000, 15_000)
    await new Promise((r) => setTimeout(r, wachtMs))
  }
}

interface ExactPaymentTerm {
  ID?: string
  Timestamp?: number
  EntryNumber?: number
  InvoiceNumber?: number | null
  YourRef?: string | null
  AmountDC?: number | null
  AmountDiscountDC?: number | null
  Status?: number | null
  LineType?: number | null
  LastPaymentDate?: string | null
}

// Exact serialiseert datums als "/Date(1618963200000)/".
function parseExactDate(value: string | null | undefined): string | null {
  if (!value) return null
  const m = /\/Date\((\d+)/.exec(value)
  if (!m) return null
  return new Date(Number(m[1])).toISOString().split('T')[0]
}

async function haalTermijnPaginas(token: string, division: string, vanafTimestamp: number): Promise<{
  termijnen: ExactPaymentTerm[]
  afgekapt: boolean
}> {
  const select = 'ID,Timestamp,EntryNumber,InvoiceNumber,YourRef,AmountDC,AmountDiscountDC,Status,LineType,LastPaymentDate'
  // Int64-literal vereist het L-suffix; eerste run start op 0.
  let url: string | null =
    `${EXACT_API_BASE}/${division}/sync/Cashflow/PaymentTerms` +
    `?$filter=${encodeURIComponent(`Timestamp gt ${vanafTimestamp}L`)}` +
    `&$select=${encodeURIComponent(select)}`
  const termijnen: ExactPaymentTerm[] = []
  let paginas = 0

  while (url && paginas < MAX_PAGINAS_PER_RUN) {
    const response = await exactFetchMetRetry(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Exact API fout (sync/Cashflow/PaymentTerms): ${response.status} - ${body.slice(0, 300)}`)
    }
    const json = await response.json() as { d?: { results?: ExactPaymentTerm[]; __next?: string } }
    termijnen.push(...(json?.d?.results ?? []))
    url = json?.d?.__next ?? null
    paginas++
  }
  return { termijnen, afgekapt: !!url }
}

interface OrgConfig {
  organisatie_id: string
  exact_owner_user_id: string | null
  exact_administratie_id: string | null
}

async function syncOrganisatie(org: OrgConfig): Promise<{ verwerkt: number; gesettled: number; afgekapt: boolean }> {
  if (!org.exact_owner_user_id) throw new Error('GEEN_EIGENAAR')

  const cache: TokenCache = { accessToken: null, expiresAt: 0 }
  const { token, division: tokenDivision } = await getValidToken(org.exact_owner_user_id, cache)
  const division = org.exact_administratie_id || (tokenDivision != null ? String(tokenDivision) : null)
  if (!division) throw new Error('GEEN_ADMINISTRATIE')

  const { data: state } = await supabaseAdmin
    .from('exact_sync_state')
    .select('laatste_timestamp, inhaalslag_bezig')
    .eq('organisatie_id', org.organisatie_id)
    .maybeSingle()
  const vanaf = Number((state as { laatste_timestamp?: number } | null)?.laatste_timestamp ?? 0)

  const { termijnen, afgekapt } = await haalTermijnPaginas(token, division, vanaf)

  // Alleen debiteurentermijnen (LineType 20); crediteuren (22) zijn de
  // inkoopkant en blijven buiten dit domein.
  const relevant = termijnen.filter((t) => t.LineType === 20 && t.ID)
  const maxTimestamp = termijnen.reduce((max, t) => Math.max(max, Number(t.Timestamp) || 0), vanaf)

  // Match op YourRef: daar staat het doen.-factuurnummer sinds de eerste
  // sync (exact-sync-factuur.ts stuurt nummer als YourRef mee). Exacts eigen
  // InvoiceNumber is een integer met een eigen reeks en matcht dus niet.
  const refs = Array.from(new Set(relevant.map((t) => (t.YourRef || '').trim()).filter(Boolean)))
  const factuurPerRef = new Map<string, { id: string; status: string }>()
  for (let i = 0; i < refs.length; i += 100) {
    const chunk = refs.slice(i, i + 100)
    const { data: facturen, error } = await supabaseAdmin
      .from('facturen')
      .select('id, nummer, status')
      .eq('organisatie_id', org.organisatie_id)
      .in('nummer', chunk)
    if (error) throw new Error(`facturen-lookup mislukt: ${error.message}`)
    for (const f of (facturen ?? []) as { id: string; nummer: string; status: string }[]) {
      factuurPerRef.set(f.nummer, { id: f.id, status: f.status })
    }
  }

  if (relevant.length > 0) {
    const nu = new Date().toISOString()
    const spiegelRijen = relevant.map((t) => ({
      organisatie_id: org.organisatie_id,
      term_id: t.ID,
      factuur_id: factuurPerRef.get((t.YourRef || '').trim())?.id ?? null,
      entry_number: t.EntryNumber ?? null,
      invoice_number: t.InvoiceNumber ?? null,
      your_ref: (t.YourRef || '').trim() || null,
      bedrag: Math.round((Number(t.AmountDC) || 0) * 100) / 100,
      korting: t.AmountDiscountDC != null ? Math.round(Number(t.AmountDiscountDC) * 100) / 100 : null,
      status: t.Status ?? null,
      line_type: t.LineType ?? null,
      laatste_betaaldatum: parseExactDate(t.LastPaymentDate),
      exact_timestamp: Number(t.Timestamp) || null,
      updated_at: nu,
    }))
    for (let i = 0; i < spiegelRijen.length; i += 500) {
      const { error } = await supabaseAdmin
        .from('exact_betaaltermijnen')
        .upsert(spiegelRijen.slice(i, i + 500), { onConflict: 'organisatie_id,term_id' })
      if (error) throw new Error(`spiegel-upsert mislukt: ${error.message}`)
    }
  }

  // Zolang de inhaalslag loopt kan de spiegel incompleet zijn; dan alleen
  // spiegelen en nog niets betaald markeren of openstaand terugschrijven.
  let gesettled = 0
  if (!afgekapt) {
    const geraakteFacturen = Array.from(new Set(
      relevant.map((t) => factuurPerRef.get((t.YourRef || '').trim())?.id).filter((id): id is string => !!id)
    ))
    for (const factuurId of geraakteFacturen) {
      const { data: termRijen, error } = await supabaseAdmin
        .from('exact_betaaltermijnen')
        .select('bedrag, status')
        .eq('organisatie_id', org.organisatie_id)
        .eq('factuur_id', factuurId)
        .eq('line_type', 20)
      if (error) throw new Error(`spiegel-lezing mislukt: ${error.message}`)
      const rijen = (termRijen ?? []) as { bedrag: number; status: number | null }[]
      if (rijen.length === 0) continue

      const openstaand = Math.round(rijen
        .filter((r) => r.status !== 50)
        .reduce((som, r) => som + (Number(r.bedrag) || 0), 0) * 100) / 100
      const allesAfgeletterd = rijen.every((r) => r.status === 50)

      const { error: standFout } = await supabaseAdmin
        .from('facturen')
        .update({ openstaand_exact: openstaand, exact_stand_op: new Date().toISOString() })
        .eq('id', factuurId)
      if (standFout) throw new Error(`openstaand_exact-update mislukt: ${standFout.message}`)

      if (allesAfgeletterd) {
        const factuurStatus = Array.from(factuurPerRef.values()).find((f) => f.id === factuurId)?.status
        if (factuurStatus && ['open', 'verzonden', 'vervallen'].includes(factuurStatus)) {
          const { error: settleFout } = await supabaseAdmin.rpc('factuur_markeer_betaald', {
            p_factuur_id: factuurId,
            p_bron: 'exact',
            p_referentie: `exact-settle:${factuurId}`,
          })
          if (settleFout) throw new Error(`settle mislukt voor factuur ${factuurId}: ${settleFout.message}`)
          gesettled++
        }
      }
    }
  }

  const { error: stateFout } = await supabaseAdmin
    .from('exact_sync_state')
    .upsert({
      organisatie_id: org.organisatie_id,
      division,
      laatste_timestamp: maxTimestamp,
      laatste_sync_op: new Date().toISOString(),
      laatste_fout: null,
      inhaalslag_bezig: afgekapt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organisatie_id' })
  if (stateFout) throw new Error(`sync_state-upsert mislukt: ${stateFout.message}`)

  return { verwerkt: relevant.length, gesettled, afgekapt }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Migratie 211 nog niet gedraaid? Dan is er niets te doen en niets kapot.
  const { error: tabelProbe } = await supabaseAdmin.from('exact_sync_state').select('organisatie_id').limit(1)
  if (tabelProbe && tabelProbe.code === 'PGRST205') {
    console.warn('[cron-exact-betaalsync] migratie 211 ontbreekt nog, run overgeslagen')
    return res.status(200).json({ skipped: 'migratie_211_ontbreekt' })
  }

  const { data: orgRijen, error: orgFout } = await supabaseAdmin
    .from('app_settings')
    .select('organisatie_id, exact_owner_user_id, exact_administratie_id')
    .eq('exact_online_connected', true)
    .not('organisatie_id', 'is', null)
    .neq('organisatie_id', ZOMBIE_ORG)

  if (orgFout) {
    Sentry.captureException(orgFout)
    return res.status(500).json({ error: orgFout.message })
  }

  const resultaten: Record<string, unknown> = {}
  // Sequentieel: elke org heeft eigen rate-limits, maar de token-refresh-keten
  // per eigenaar verdraagt geen parallelle refreshes vanuit dezelfde run.
  for (const org of (orgRijen ?? []) as OrgConfig[]) {
    try {
      resultaten[org.organisatie_id] = await syncOrganisatie(org)
    } catch (err) {
      const melding = err instanceof Error ? err.message : String(err)
      resultaten[org.organisatie_id] = { fout: melding }
      // Verwachte configuratie-gaten niet naar Sentry; echte fouten wel.
      if (!['GEEN_TOKENS', 'GEEN_EIGENAAR', 'GEEN_ADMINISTRATIE'].includes(melding)) {
        Sentry.captureException(err instanceof Error ? err : new Error(melding), {
          tags: { cron: 'exact-betaalsync' },
          extra: { organisatie_id: org.organisatie_id },
        })
      }
      await supabaseAdmin
        .from('exact_sync_state')
        .upsert({
          organisatie_id: org.organisatie_id,
          laatste_fout: melding.slice(0, 500),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organisatie_id' })
    }
  }

  return res.status(200).json({ ok: true, organisaties: resultaten })
}
