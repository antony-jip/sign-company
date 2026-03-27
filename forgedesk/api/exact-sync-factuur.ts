import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
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
}

async function getValidToken(
  user_id: string,
  host: string,
  protocol: string
): Promise<string> {
  const { data: tokenData } = await supabaseAdmin
    .from('exact_tokens')
    .select('access_token, expires_at')
    .eq('user_id', user_id)
    .single() as { data: { access_token: string; expires_at: string } | null }

  if (!tokenData) {
    throw new Error('Geen Exact Online tokens gevonden. Verbind opnieuw via Instellingen.')
  }

  // Token verloopt binnen 5 minuten? Ververs.
  const expiresAt = new Date(tokenData.expires_at).getTime()
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    const refreshResponse = await fetch(`${protocol}://${host}/api/exact-refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    })

    if (!refreshResponse.ok) {
      throw new Error('Token vernieuwen mislukt. Verbind Exact Online opnieuw.')
    }

    const refreshed = await refreshResponse.json() as { access_token: string }
    return refreshed.access_token
  }

  return tokenData.access_token
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
  if (btwPercentage >= 21) return settings.exact_btw_hoog
  if (btwPercentage >= 9) return settings.exact_btw_laag
  return settings.exact_btw_nul
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
  // Zoek klant op naam
  const encodedName = klantNaam.replace(/'/g, "''")
  const searchData = await exactGet(
    token,
    division,
    `crm/Accounts?$filter=Name eq '${encodedName}'&$select=ID`
  ) as { d?: { results?: Array<{ ID: string }> } }

  const existingId = searchData?.d?.results?.[0]?.ID
  if (existingId) return existingId

  // Klant niet gevonden, maak aan
  const newAccount: Record<string, string> = { Name: klantNaam }
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

// ── Main Handler ──

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)
    const { factuur_id } = req.body as { factuur_id: string }

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
      token = await getValidToken(user_id, host, protocol)
    } catch {
      return res.status(401).json({
        error: 'Exact Online sessie verlopen. Verbind opnieuw via Instellingen > Integraties.',
      })
    }

    // 3. Haal Exact instellingen op
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('exact_administratie_id, exact_verkoopboek, exact_grootboek, exact_btw_hoog, exact_btw_laag, exact_btw_nul')
      .eq('user_id', user_id)
      .single()

    if (!settings?.exact_administratie_id) {
      return res.status(400).json({
        error: 'Exact Online administratie niet geconfigureerd. Controleer Instellingen > Integraties.',
      })
    }

    const exactSettings = settings as unknown as ExactSettings
    const division = exactSettings.exact_administratie_id

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
      // Bereken totaal excl BTW per regel
      const regelTotaal = item.totaal / (1 + item.btw_percentage / 100)
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

    const salesEntry = {
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
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout bij synchroniseren'
    console.error('Exact sync factuur error:', message)
    return res.status(500).json({ success: false, error: message })
  }
}
