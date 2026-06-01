import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
    sendDefaultPii: false,
  })
}

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// -- Integration credential encryption (copied from api/save-integration-settings.ts) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''
function encryptSecret(text: string): string {
  if (!INT_KEY) return text
  const key = crypto.scryptSync(INT_KEY, 'integration', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}
function decryptSecret(text: string): string {
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

// ─── Inline org-aware app_settings helpers (zie profielService.ts) ───
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
    if (data) return data as Record<string, unknown>
  }
  const { data } = await supabase
    .from('app_settings')
    .select(columns)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Record<string, unknown> | null) ?? null
}

async function updateAppSettingsOrgFirst(
  supabase: SupabaseClient,
  userId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const orgId = await getOrgIdForUser(supabase, userId)
  if (orgId) {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('organisatie_id', orgId)
      .maybeSingle()
    if (existing) {
      await supabase
        .from('app_settings')
        .update(updates)
        .eq('id', (existing as { id: string }).id)
      return
    }
  }
  await supabase.from('app_settings').update(updates).eq('user_id', userId)
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

const EXACT_API_BASE = 'https://start.exactonline.nl/api/v1'

// ── Helpers ──

interface ExactSettings {
  exact_administratie_id: string
  exact_verkoopboek: string
  exact_grootboek: string
  exact_btw_hoog: string
  exact_btw_laag: string | null
  exact_btw_nul: string | null
  exact_document_type_id: number | null
}

async function getValidToken(user_id: string): Promise<string> {
  const { data: tokenData } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user_id)
    .single() as { data: { access_token: string; refresh_token: string; expires_at: string } | null }

  if (!tokenData) {
    throw new Error('Geen Exact Online tokens gevonden. Verbind opnieuw via Instellingen.')
  }

  // Token verloopt binnen 5 minuten? Ververs direct.
  const expiresAt = new Date(tokenData.expires_at).getTime()
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    const settings = await loadAppSettingsOrgFirst(
      supabaseAdmin,
      user_id,
      'exact_online_client_id, exact_online_client_secret',
    )
    const exactClientId = settings?.exact_online_client_id as string | undefined
    const exactClientSecret = settings?.exact_online_client_secret ? decryptSecret(settings.exact_online_client_secret as string) : undefined

    if (!exactClientId || !exactClientSecret) {
      throw new Error('Exact credentials niet gevonden')
    }

    // client_id en client_secret als form-encoded body params (standaard
    // Exact Online methode, zelfde als in exact-callback.ts).
    const refreshRes = await fetch('https://start.exactonline.nl/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptSecret(tokenData.refresh_token),
        client_id: exactClientId,
        client_secret: exactClientSecret,
      }),
    })

    if (!refreshRes.ok) {
      if (refreshRes.status === 400 || refreshRes.status === 401) {
        // Per-user token-status. Bij invalid_grant heeft Exact DEZE user
        // uitgegooid — vaak doordat een collega zojuist opnieuw OAuth'de
        // op hetzelfde Exact-bedrijfsaccount (Exact staat geen twee
        // gelijktijdige sessies toe). Verwijder alleen DEZE user's
        // tokens; raak de org-brede `exact_online_connected` niet aan.
        // Smaller behavior shift t.o.v. voorheen: deze sync flipte de
        // org-flag bij ELKE refresh-failure (ook netwerk/5xx). Nu pas
        // bij expliciete 400/401 van Exact — consistent met de andere
        // endpoints.
        await supabaseAdmin.from('exact_tokens').delete().eq('user_id', user_id)
        console.error('[Exact] invalid_grant — token rejected', {
          user_id, endpoint: 'exact-sync-factuur.ts', status: refreshRes.status,
        })
        Sentry.captureException(new Error('Exact invalid_grant'), {
          level: 'warning',
          tags: { exact_endpoint: 'exact-sync-factuur', oauth_error: 'invalid_grant' },
          extra: { user_id, status: refreshRes.status },
        })
      }
      throw new Error('Token vernieuwen mislukt. Verbind Exact Online opnieuw.')
    }

    const tokens = await refreshRes.json()
    await supabaseAdmin.from('exact_tokens').update({
      access_token: encryptSecret(tokens.access_token),
      refresh_token: encryptSecret(tokens.refresh_token || decryptSecret(tokenData.refresh_token)),
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user_id)

    return tokens.access_token
  }

  return decryptSecret(tokenData.access_token)
}

async function exactGet(token: string, division: string, endpoint: string): Promise<unknown> {
  const url = `${EXACT_API_BASE}/${division}/${endpoint}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Exact API fout (GET ${endpoint}): ${response.status} - ${body}`)
  }

  return response.json()
}

async function exactPost(token: string, division: string, endpoint: string, data: unknown): Promise<unknown> {
  const url = `${EXACT_API_BASE}/${division}/${endpoint}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Exact API fout (POST ${endpoint}): ${response.status} - ${body}`)
  }

  return response.json()
}

function bepaalBtwCode(btwPercentage: number, settings: ExactSettings): string | null {
  if (btwPercentage >= 21) return settings.exact_btw_hoog || null
  if (btwPercentage >= 9) return settings.exact_btw_laag || null
  return settings.exact_btw_nul || null
}

// ── Grootboek GUID cache per request ──

const grootboekCache = new Map<string, string>()

async function getGrootboekGuid(token: string, division: string, rekeningNummer: string): Promise<string> {
  const cached = grootboekCache.get(rekeningNummer)
  if (cached) return cached

  const data = await exactGet(
    token,
    division,
    `financial/GLAccounts?$filter=Code eq '${rekeningNummer}'&$select=ID`
  ) as { d?: { results?: Array<{ ID: string }> } }

  const guid = data?.d?.results?.[0]?.ID
  if (!guid) {
    throw new Error(`Grootboekrekening ${rekeningNummer} niet gevonden in Exact Online.`)
  }

  grootboekCache.set(rekeningNummer, guid)
  return guid
}

// ── Klant zoeken/aanmaken ──

async function findOrCreateKlant(
  token: string,
  division: string,
  klantNaam: string,
  klantEmail?: string,
  klantTelefoon?: string
): Promise<string> {
  // Zoek alleen onder customer accounts (Status 'C') zodat we geen
  // leveranciers of prospects matchen die toevallig dezelfde naam hebben.
  const encodedName = klantNaam.replace(/'/g, "''")
  const searchData = await exactGet(
    token,
    division,
    `crm/Accounts?$filter=Name eq '${encodedName}' and Status eq 'C'&$select=ID`
  ) as { d?: { results?: Array<{ ID: string }> } }

  const existingId = searchData?.d?.results?.[0]?.ID
  if (existingId) return existingId

  // Klant niet gevonden, maak aan met Status 'C' (Customer) zodat de
  // latere SalesEntry-sync werkt — Exact accepteert geen SalesEntry voor
  // een account zonder customer rol.
  const newAccount: Record<string, string> = { Name: klantNaam, Status: 'C' }
  if (klantEmail) newAccount.Email = klantEmail
  if (klantTelefoon) newAccount.Phone = klantTelefoon

  const createData = await exactPost(token, division, 'crm/Accounts', newAccount) as {
    d?: { ID: string }
  }

  const newId = createData?.d?.ID
  if (!newId) {
    throw new Error(`Klant "${klantNaam}" kon niet aangemaakt worden in Exact Online.`)
  }

  return newId
}

// Loop factuur_bijlagen (alleen onsync'd) en POST elk als DocumentAttachment.
// Werkt best-effort: één gefaalde bijlage blokkeert de rest niet.
// `tokenRef.current` wordt bijgewerkt na een succesvolle refresh zodat de
// caller met een vers token verder kan.
async function syncFactuurBijlagenToExact(params: {
  factuurId: string
  documentId: string
  tokenRef: { current: string }
  division: string
  protocol: string
  host: string
  user_id: string
}): Promise<{ synced: number; failed: number; geprobeerd: number }> {
  const { factuurId, documentId, tokenRef, division, protocol, host, user_id } = params

  const { data: bijlagen, error: bijErr } = await supabaseAdmin
    .from('factuur_bijlagen')
    .select('id, bestandsnaam, storage_path')
    .eq('factuur_id', factuurId)
    .is('exact_synced_op', null)

  if (bijErr) {
    console.error('factuur_bijlagen lookup mislukt:', bijErr)
    return { synced: 0, failed: 0, geprobeerd: 0 }
  }
  if (!bijlagen?.length) {
    return { synced: 0, failed: 0, geprobeerd: 0 }
  }

  let synced = 0
  let failed = 0

  for (const bij of bijlagen) {
    try {
      const { data: blob, error: dlError } = await supabaseAdmin.storage
        .from('factuur-bijlagen')
        .download(bij.storage_path as string)
      if (dlError || !blob) {
        console.error(`Bijlage download mislukt: ${bij.storage_path}`, dlError)
        failed++
        continue
      }
      const buffer = Buffer.from(await blob.arrayBuffer())
      const base64 = buffer.toString('base64')
      const payload = {
        Document: documentId,
        FileName: bij.bestandsnaam,
        Attachment: base64,
      }

      try {
        await exactPost(tokenRef.current, division, 'documents/DocumentAttachments', payload)
      } catch (firstErr) {
        try {
          const refreshResponse = await fetch(`${protocol}://${host}/api/exact-refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id }),
          })
          if (!refreshResponse.ok) throw new Error('Refresh mislukt')
          const refreshed = (await refreshResponse.json()) as { access_token: string }
          tokenRef.current = refreshed.access_token
          await exactPost(tokenRef.current, division, 'documents/DocumentAttachments', payload)
        } catch (retryErr) {
          console.error(`Bijlage DocumentAttachment POST mislukt voor ${bij.bestandsnaam}:`, firstErr, retryErr)
          failed++
          continue
        }
      }

      const { error: updateErr } = await supabaseAdmin
        .from('factuur_bijlagen')
        .update({ exact_synced_op: new Date().toISOString() })
        .eq('id', bij.id)
      if (updateErr) {
        console.error(`exact_synced_op update mislukt voor ${bij.id}:`, updateErr)
      }
      synced++
    } catch (err) {
      console.error(`Bijlage sync exception voor ${bij.bestandsnaam}:`, err)
      failed++
    }
  }

  return { synced, failed, geprobeerd: bijlagen.length }
}

// ── Main Handler ──

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    const { factuur_id, attachment_only, bijlagen_only } = req.body as { factuur_id: string; attachment_only?: boolean; bijlagen_only?: boolean }

    if (!factuur_id) {
      return res.status(400).json({ error: 'factuur_id is verplicht' })
    }

    const host = (req.headers['x-forwarded-host'] || req.headers.host || 'app.doen.team') as string
    const protocol = (req.headers['x-forwarded-proto'] || 'https') as string

    // 1. Haal factuur + items op
    const { data: factuur, error: factuurError } = await supabaseAdmin
      .from('facturen')
      .select('*')
      .eq('id', factuur_id)
      .single()

    if (factuurError || !factuur) {
      return res.status(404).json({ error: 'Factuur niet gevonden.' })
    }

    const { data: factuurItems, error: itemsError } = await supabaseAdmin
      .from('factuur_items')
      .select('*')
      .eq('factuur_id', factuur_id)
      .order('volgorde', { ascending: true })

    if (itemsError) {
      return res.status(500).json({ error: 'Factuurregels ophalen mislukt.' })
    }

    // 2. Haal geldige access_token op
    let token: string
    try {
      token = await getValidToken(user_id)
    } catch {
      return res.status(401).json({
        error: 'Exact Online sessie verlopen. Verbind opnieuw via Instellingen > Integraties.',
      })
    }

    // 3. Haal Exact instellingen op (org-first)
    const settings = await loadAppSettingsOrgFirst(
      supabaseAdmin,
      user_id,
      'exact_administratie_id, exact_verkoopboek, exact_grootboek, exact_btw_hoog, exact_btw_laag, exact_btw_nul, exact_document_type_id',
    )

    if (!settings?.exact_administratie_id) {
      return res.status(400).json({
        error: 'Exact Online administratie niet geconfigureerd. Controleer Instellingen > Integraties.',
      })
    }

    const exactSettings = settings as unknown as ExactSettings
    const division = exactSettings.exact_administratie_id

    // 3b. Pre-check: Document-type moet geconfigureerd zijn voor de bijlage-flow.
    if (exactSettings.exact_document_type_id == null) {
      return res.status(400).json({
        error: 'Configureer eerst Document-type in Exact-instellingen voordat je een factuur kunt syncen.',
      })
    }

    // 3b-bis. bijlagen_only flow: retry alleen de factuur_bijlagen die nog niet
    // gesynced zijn. Vereist dat de factuur al een Document GUID in Exact heeft;
    // raakt SalesEntry of de factuur-PDF zelf niet aan.
    if (bijlagen_only) {
      if (!factuur.exact_document_id) {
        return res.status(400).json({
          error: 'Bijlagen-sync vereist dat de factuur al een Document in Exact heeft. Sync eerst de factuur volledig.',
        })
      }
      const tokenRef = { current: token }
      const result = await syncFactuurBijlagenToExact({
        factuurId: factuur_id,
        documentId: factuur.exact_document_id as string,
        tokenRef,
        division,
        protocol,
        host,
        user_id,
      })
      return res.status(200).json({
        success: true,
        bijlagen_synced: result.synced,
        bijlagen_failed: result.failed,
        bijlagen_geprobeerd: result.geprobeerd,
      })
    }

    // 3c. Download PDF uit Storage. Failure is soft — sync gaat door zonder
    // bijlage als pdf_storage_path NULL is (oude facturen) of download mislukt.
    let pdfBase64: string | null = null
    if (factuur.pdf_storage_path) {
      try {
        const { data: pdfBlob, error: dlError } = await supabaseAdmin.storage
          .from('facturen')
          .download(factuur.pdf_storage_path as string)
        if (dlError || !pdfBlob) {
          console.warn('PDF download uit storage.facturen mislukt:', dlError)
        } else {
          const buffer = Buffer.from(await pdfBlob.arrayBuffer())
          pdfBase64 = buffer.toString('base64')
        }
      } catch (dlErr) {
        console.warn('PDF download uit storage.facturen exception:', dlErr)
      }
    } else {
      console.warn(`Factuur ${factuur_id} heeft geen pdf_storage_path, sync zonder bijlage`)
    }

    let documentId: string | null = null
    let bijlageSynced = false
    let mainBijlagenSyncResult: { synced: number; failed: number; geprobeerd: number } = { synced: 0, failed: 0, geprobeerd: 0 }

    // 3d. Retry-only flow: alleen Document + Attachment opnieuw proberen voor
    // een factuur die al een SalesEntry heeft. Vermijdt dubbele Documents als
    // exact_document_id al gezet is.
    if (attachment_only) {
      if (!factuur.exact_entry_id) {
        return res.status(400).json({
          error: 'Retry vereist eerst een succesvolle SalesEntry sync',
        })
      }
      if (!pdfBase64) {
        return res.status(400).json({
          error: 'Geen PDF beschikbaar in Storage voor deze factuur',
        })
      }

      documentId = (factuur.exact_document_id as string | null) ?? null

      if (!documentId) {
        // Resolve klant alleen als we het Document echt nog moeten aanmaken.
        const { data: retryKlant } = await supabaseAdmin
          .from('klanten')
          .select('naam, email, telefoon')
          .eq('id', factuur.klant_id)
          .single()
        const retryKlantNaam = retryKlant?.naam || factuur.klant_naam || 'Onbekende klant'
        let retryCustomerGuid: string
        try {
          retryCustomerGuid = await findOrCreateKlant(
            token,
            division,
            retryKlantNaam,
            retryKlant?.email,
            retryKlant?.telefoon,
          )
        } catch (klantErr) {
          console.error('Klant lookup mislukt in retry-flow:', klantErr)
          return res.status(502).json({ error: 'Klant niet gevonden in Exact' })
        }

        const retrySubject = factuur.factuur_type === 'creditnota'
          ? `Creditnota ${factuur.nummer}`
          : `Factuur ${factuur.nummer}`
        const docPayload = {
          Subject: retrySubject,
          Type: exactSettings.exact_document_type_id,
          Account: retryCustomerGuid,
        }

        try {
          const docResult = await exactPost(
            token,
            division,
            'documents/Documents',
            docPayload,
          ) as { d?: { ID?: string } }
          documentId = docResult?.d?.ID ?? null
        } catch (docErr) {
          try {
            const refreshResponse = await fetch(`${protocol}://${host}/api/exact-refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id }),
            })
            if (!refreshResponse.ok) throw new Error('Refresh mislukt')
            const refreshed = await refreshResponse.json() as { access_token: string }
            token = refreshed.access_token
            const docResult = await exactPost(
              token,
              division,
              'documents/Documents',
              docPayload,
            ) as { d?: { ID?: string } }
            documentId = docResult?.d?.ID ?? null
          } catch (retryErr) {
            console.error('Document POST mislukt in retry-flow:', docErr, retryErr)
            return res.status(502).json({ error: 'Document aanmaken in Exact mislukt' })
          }
        }

        if (!documentId) {
          return res.status(502).json({ error: 'Document GUID niet terug van Exact' })
        }

        await supabaseAdmin
          .from('facturen')
          .update({ exact_document_id: documentId })
          .eq('id', factuur_id)
      }

      const attPayload = {
        Document: documentId,
        FileName: `Factuur-${factuur.nummer}.pdf`,
        Attachment: pdfBase64,
      }
      try {
        await exactPost(token, division, 'documents/DocumentAttachments', attPayload)
        bijlageSynced = true
      } catch (attErr) {
        try {
          const refreshResponse = await fetch(`${protocol}://${host}/api/exact-refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id }),
          })
          if (!refreshResponse.ok) throw new Error('Refresh mislukt')
          const refreshed = await refreshResponse.json() as { access_token: string }
          token = refreshed.access_token
          await exactPost(token, division, 'documents/DocumentAttachments', attPayload)
          bijlageSynced = true
        } catch (retryErr) {
          console.error('DocumentAttachment POST mislukt in retry-flow:', attErr, retryErr)
          return res.status(502).json({ error: 'Bijlage uploaden naar Exact mislukt' })
        }
      }

      if (bijlageSynced) {
        await supabaseAdmin
          .from('facturen')
          .update({ exact_bijlage_gesynced_op: new Date().toISOString() })
          .eq('id', factuur_id)
      }

      // Best-effort: sync ook de losse factuur_bijlagen (klant-inkooporders,
      // extra docs) die nog niet aan Exact gekoppeld zijn. Falures blokkeren
      // de attachment-retry-flow niet — die is succesvol zolang de factuur-PDF
      // gekoppeld is.
      const retryTokenRef = { current: token }
      const bijlagenResult = documentId
        ? await syncFactuurBijlagenToExact({
            factuurId: factuur_id,
            documentId,
            tokenRef: retryTokenRef,
            division,
            protocol,
            host,
            user_id,
          })
        : { synced: 0, failed: 0, geprobeerd: 0 }
      token = retryTokenRef.current

      // Best-effort: koppel het Document inline aan de SalesEntry via PUT.
      // Niet-kritiek — Document is al gekoppeld via DocumentAttachment-relatie.
      // Sommige Exact-tenants weigeren PUT op SalesEntry, dat is acceptabel.
      try {
        const putUrl = `${EXACT_API_BASE}/${division}/salesentry/SalesEntries(guid'${factuur.exact_entry_id}')`
        const putRes = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ Document: documentId }),
        })
        if (!putRes.ok) {
          const putBody = await putRes.text()
          console.warn('SalesEntry PUT met Document mislukt (niet-kritiek):', putRes.status, putBody)
        }
      } catch (putErr) {
        console.warn('SalesEntry PUT exception (niet-kritiek):', putErr)
      }

      return res.status(200).json({
        success: true,
        exact_entry_id: factuur.exact_entry_id,
        document_id: documentId,
        bijlage_synced: bijlageSynced,
        bijlagen_synced: bijlagenResult.synced,
        bijlagen_failed: bijlagenResult.failed,
        bijlagen_geprobeerd: bijlagenResult.geprobeerd,
      })
    }

    // 4. Klant zoeken/aanmaken
    // Haal klantgegevens op uit Supabase
    const { data: klant } = await supabaseAdmin
      .from('klanten')
      .select('naam, email, telefoon')
      .eq('id', factuur.klant_id)
      .single()

    const klantNaam = klant?.naam || factuur.klant_naam || 'Onbekende klant'
    let customerGuid: string

    try {
      customerGuid = await findOrCreateKlant(
        token,
        division,
        klantNaam,
        klant?.email,
        klant?.telefoon
      )
    } catch (klantError: unknown) {
      // Token verlopen tijdens klant zoeken? Refresh en retry 1x
      try {
        const refreshResponse = await fetch(`${protocol}://${host}/api/exact-refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id }),
        })
        if (!refreshResponse.ok) throw new Error('Refresh mislukt')
        const refreshed = await refreshResponse.json() as { access_token: string }
        token = refreshed.access_token

        customerGuid = await findOrCreateKlant(
          token,
          division,
          klantNaam,
          klant?.email,
          klant?.telefoon
        )
      } catch {
        const msg = klantError instanceof Error ? klantError.message : 'Klant aanmaken mislukt'
        return res.status(502).json({ error: msg })
      }
    }

    // 5. Grootboek GUID opzoeken
    const grootboekGuid = await getGrootboekGuid(token, division, exactSettings.exact_grootboek)

    // 5b. Document POST + DocumentAttachment POST (alleen als PDF beschikbaar).
    // Bij failure: log, sla over, sync gaat door zonder bijlage-koppeling.
    // Aparte 401-retry per call zodat een retry op Attachment geen dubbele
    // Document aanmaakt (Exact heeft geen idempotency-key).
    if (pdfBase64) {
      const documentSubject = factuur.factuur_type === 'creditnota'
        ? `Creditnota ${factuur.nummer}`
        : `Factuur ${factuur.nummer}`

      const documentPayload = {
        Subject: documentSubject,
        Type: exactSettings.exact_document_type_id,
        Account: customerGuid,
      }

      try {
        const docResult = await exactPost(
          token,
          division,
          'documents/Documents',
          documentPayload,
        ) as { d?: { ID?: string } }
        documentId = docResult?.d?.ID ?? null
      } catch (docErr) {
        try {
          const refreshResponse = await fetch(`${protocol}://${host}/api/exact-refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id }),
          })
          if (!refreshResponse.ok) throw new Error('Refresh mislukt')
          const refreshed = await refreshResponse.json() as { access_token: string }
          token = refreshed.access_token

          const docResult = await exactPost(
            token,
            division,
            'documents/Documents',
            documentPayload,
          ) as { d?: { ID?: string } }
          documentId = docResult?.d?.ID ?? null
        } catch (retryErr) {
          console.error('Document POST mislukt (na retry):', docErr, retryErr)
          documentId = null
        }
      }

      if (documentId) {
        await supabaseAdmin
          .from('facturen')
          .update({ exact_document_id: documentId })
          .eq('id', factuur_id)

        const attachmentPayload = {
          Document: documentId,
          FileName: `Factuur-${factuur.nummer}.pdf`,
          Attachment: pdfBase64,
        }

        try {
          await exactPost(token, division, 'documents/DocumentAttachments', attachmentPayload)
          bijlageSynced = true
        } catch (attErr) {
          try {
            const refreshResponse = await fetch(`${protocol}://${host}/api/exact-refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id }),
            })
            if (!refreshResponse.ok) throw new Error('Refresh mislukt')
            const refreshed = await refreshResponse.json() as { access_token: string }
            token = refreshed.access_token

            await exactPost(token, division, 'documents/DocumentAttachments', attachmentPayload)
            bijlageSynced = true
          } catch (retryErr) {
            console.error('DocumentAttachment POST mislukt (na retry):', attErr, retryErr)
          }
        }

        if (bijlageSynced) {
          await supabaseAdmin
            .from('facturen')
            .update({ exact_bijlage_gesynced_op: new Date().toISOString() })
            .eq('id', factuur_id)
        }

        // Losse factuur_bijlagen (klant-inkooporders, extra docs) elk als
        // aparte DocumentAttachment posten. Best-effort: faalt één, dan
        // blijven de andere staan en blokkeert het de factuur-sync niet.
        const mainTokenRef = { current: token }
        const bijlagenResult = await syncFactuurBijlagenToExact({
          factuurId: factuur_id,
          documentId,
          tokenRef: mainTokenRef,
          division,
          protocol,
          host,
          user_id,
        })
        token = mainTokenRef.current
        mainBijlagenSyncResult = bijlagenResult
      }
    }

    // 6. SalesEntry aanmaken
    const factuurdatum = factuur.factuurdatum || new Date().toISOString().split('T')[0]
    const dateParts = factuurdatum.split('-')
    const reportingYear = parseInt(dateParts[0], 10)
    const reportingPeriod = parseInt(dateParts[1], 10)

    const salesEntryLines = (factuurItems || []).map((item: {
      beschrijving: string
      btw_percentage: number
      totaal: number
      aantal: number
      eenheidsprijs: number
      korting_percentage: number
    }) => {
      // factuur_items.totaal is al excl. BTW (zie calcLineTotal in FactuurEditor)
      const regelTotaal = item.totaal
      const btwCode = bepaalBtwCode(item.btw_percentage, exactSettings)

      const line: Record<string, string | null> = {
        AmountDC: regelTotaal.toFixed(2),
        AmountFC: regelTotaal.toFixed(2),
        Description: item.beschrijving,
        GLAccount: grootboekGuid,
        VATCode: btwCode,
      }

      return line
    })

    const salesEntry: Record<string, unknown> = {
      Journal: exactSettings.exact_verkoopboek,
      YourRef: factuur.nummer,
      Customer: customerGuid,
      EntryDate: `${factuurdatum}T00:00:00`,
      ReportingPeriod: reportingPeriod,
      ReportingYear: reportingYear,
      VATAmountDC: (factuur.btw_bedrag as number).toFixed(2),
      VATAmountFC: (factuur.btw_bedrag as number).toFixed(2),
      SalesEntryLines: salesEntryLines,
    }
    if (documentId) {
      salesEntry.Document = documentId
    }

    let entryResult: { d?: { EntryID?: string } }
    try {
      entryResult = await exactPost(
        token,
        division,
        'salesentry/SalesEntries',
        salesEntry
      ) as { d?: { EntryID?: string } }
    } catch (syncError: unknown) {
      // Retry 1x na token refresh
      try {
        const refreshResponse = await fetch(`${protocol}://${host}/api/exact-refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id }),
        })
        if (!refreshResponse.ok) throw new Error('Refresh mislukt')
        const refreshed = await refreshResponse.json() as { access_token: string }
        token = refreshed.access_token

        entryResult = await exactPost(
          token,
          division,
          'salesentry/SalesEntries',
          salesEntry
        ) as { d?: { EntryID?: string } }
      } catch {
        const msg = syncError instanceof Error ? syncError.message : 'Factuur synchroniseren mislukt'
        return res.status(502).json({ success: false, error: msg })
      }
    }

    const exactEntryId = entryResult?.d?.EntryID

    // 7. Sla op in factuur
    await supabaseAdmin
      .from('facturen')
      .update({
        exact_entry_id: exactEntryId || null,
        exact_synced_at: new Date().toISOString(),
      })
      .eq('id', factuur_id)

    return res.status(200).json({
      success: true,
      exact_entry_id: exactEntryId,
      document_id: documentId,
      bijlage_synced: bijlageSynced,
      bijlagen_synced: mainBijlagenSyncResult.synced,
      bijlagen_failed: mainBijlagenSyncResult.failed,
      bijlagen_geprobeerd: mainBijlagenSyncResult.geprobeerd,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout bij synchroniseren'
    console.error('Exact sync factuur error:', message)
    return res.status(500).json({ success: false, error: message })
  }
}
