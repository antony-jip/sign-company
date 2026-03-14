import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const KVK_TEST_KEY = 'l7xx1f2691f2520d487b902f4e0b57a0b197'
const KVK_PROD_BASE = 'https://api.kvk.nl/api/v1/basisprofielen'
const KVK_TEST_BASE = 'https://api.kvk.nl/test/api/v1/basisprofielen'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

async function isRateLimited(ip: string, endpoint: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data } = await supabase.rpc('check_rate_limit', {
    p_key: `${endpoint}:${ip}`,
    p_max_count: maxCount,
    p_window_seconds: windowSeconds,
  })
  return data === true
}

interface KvkBasisProfiel {
  kvkNummer?: string
  naam?: string
  indNonMailing?: string
  formeleRegistratiedatum?: string
  materieleRegistratie?: {
    datumAanvang?: string
    datumEinde?: string
  }
  totaleBedrijfsactiviteiten?: number
  statutaireNaam?: string
  handelsnamen?: Array<{ naam: string; volgorde: number }>
  spiActiviteiten?: Array<{ sbiCode: string; sbiOmschrijving: string; indHoofdactiviteit: string }>
  _embedded?: {
    eigenaar?: {
      rechtsvorm?: string
      rsin?: string
    }
    hoofdvestiging?: {
      vestigingsnummer?: string
      adressen?: Array<{
        type?: string
        straatnaam?: string
        huisnummer?: number
        huisnummerToevoeging?: string
        postcode?: string
        plaats?: string
        land?: string
      }>
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (await isRateLimited(userId, 'kvk-basisprofiel', 20, 60)) {
      return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    }

    const kvknummer = req.query.kvknummer as string | undefined

    if (!kvknummer) {
      return res.status(400).json({ error: 'kvknummer is verplicht' })
    }

    // Bepaal API key en test/productie mode
    let apiKey = process.env.KVK_API_KEY || ''
    const isTestMode = process.env.KVK_TEST_MODE === 'true' || !apiKey

    if (!apiKey) {
      const { data: settings } = await supabaseAdmin
        .from('app_settings')
        .select('kvk_api_key')
        .eq('user_id', userId)
        .maybeSingle()

      if (settings?.kvk_api_key) {
        apiKey = settings.kvk_api_key
      }
    }

    if (!apiKey) {
      apiKey = KVK_TEST_KEY
    }

    const baseUrl = isTestMode && apiKey === KVK_TEST_KEY ? KVK_TEST_BASE : KVK_PROD_BASE

    const response = await fetch(`${baseUrl}/${kvknummer}`, {
      headers: {
        'apikey': apiKey,
      },
    })

    if (response.status === 404) {
      return res.status(404).json({ error: 'Bedrijf niet gevonden' })
    }

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'KvK API key ongeldig' })
    }

    if (!response.ok) {
      console.error('KvK basisprofiel error:', response.status, await response.text())
      return res.status(502).json({ error: 'KvK lookup mislukt' })
    }

    const data = await response.json() as KvkBasisProfiel

    const hoofdvestiging = data._embedded?.hoofdvestiging
    const adres = hoofdvestiging?.adressen?.find((a) => a.type === 'bezoekadres') || hoofdvestiging?.adressen?.[0]
    const rechtsvorm = data._embedded?.eigenaar?.rechtsvorm || ''

    const huisnummerStr = adres?.huisnummer
      ? `${adres.huisnummer}${adres.huisnummerToevoeging || ''}`
      : ''

    return res.status(200).json({
      kvkNummer: data.kvkNummer || kvknummer,
      naam: data.statutaireNaam || data.naam || data.handelsnamen?.[0]?.naam || '',
      rechtsvorm,
      adres: {
        straat: adres?.straatnaam || '',
        huisnummer: huisnummerStr,
        postcode: adres?.postcode || '',
        stad: adres?.plaats || '',
      },
      actief: !data.materieleRegistratie?.datumEinde,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('KvK basisprofiel error:', message)
    return res.status(500).json({ error: message })
  }
}
