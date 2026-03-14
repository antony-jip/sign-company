import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const KVK_TEST_KEY = 'l7xx1f2691f2520d487b902f4e0b57a0b197'
const KVK_PROD_BASE = 'https://api.kvk.nl/api/v2/zoeken'
const KVK_TEST_BASE = 'https://api.kvk.nl/test/api/v2/zoeken'

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

interface KvkApiResultaat {
  kvkNummer?: string
  handelsnaam?: string
  naam?: string
  straatnaam?: string
  plaats?: string
  type?: string
  vestigingsnummer?: string
  adres?: {
    binnenlandsAdres?: {
      straatnaam?: string
      huisnummer?: number
      huisnummerToevoeging?: string
      postcode?: string
      plaats?: string
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (await isRateLimited(userId, 'kvk-zoeken', 20, 60)) {
      return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    }

    const q = req.query.q as string | undefined
    const kvknummer = req.query.kvknummer as string | undefined

    if (!q && !kvknummer) {
      return res.status(400).json({ error: 'Zoekterm (q) of kvknummer is verplicht' })
    }

    if (q && q.length < 3) {
      return res.status(400).json({ error: 'Zoekterm moet minimaal 3 tekens zijn' })
    }

    // Bepaal API key en test/productie mode
    let apiKey = process.env.KVK_API_KEY || ''
    const isTestMode = process.env.KVK_TEST_MODE === 'true' || !apiKey

    if (!apiKey) {
      // Probeer uit app_settings voor de user
      const { data: settings } = await supabaseAdmin
        .from('app_settings')
        .select('kvk_api_key')
        .eq('user_id', userId)
        .maybeSingle()

      if (settings?.kvk_api_key) {
        apiKey = settings.kvk_api_key
      }
    }

    // Fallback naar test key
    if (!apiKey) {
      apiKey = KVK_TEST_KEY
    }

    const baseUrl = isTestMode && apiKey === KVK_TEST_KEY ? KVK_TEST_BASE : KVK_PROD_BASE

    // Bouw query params
    const params = new URLSearchParams()
    if (kvknummer) {
      params.set('kvkNummer', kvknummer)
    } else if (q) {
      params.set('naam', q)
      params.set('resultatenPerPagina', '10')
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        'apikey': apiKey,
      },
    })

    if (response.status === 404) {
      return res.status(200).json({ resultaten: [] })
    }

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'KvK API key ongeldig' })
    }

    if (!response.ok) {
      console.error('KvK API error:', response.status, await response.text())
      return res.status(502).json({ error: 'KvK lookup mislukt' })
    }

    const data = await response.json() as {
      resultaten?: KvkApiResultaat[]
    }

    const resultaten = (data.resultaten || []).map((r) => {
      const adresObj = r.adres?.binnenlandsAdres
      const straat = adresObj
        ? `${adresObj.straatnaam || ''} ${adresObj.huisnummer || ''}${adresObj.huisnummerToevoeging || ''}`.trim()
        : r.straatnaam || ''

      return {
        kvkNummer: r.kvkNummer || '',
        naam: r.handelsnaam || r.naam || '',
        adres: {
          straat,
          plaats: adresObj?.plaats || r.plaats || '',
        },
        postcode: adresObj?.postcode || '',
        type: r.type || '',
        vestigingsnummer: r.vestigingsnummer,
      }
    })

    return res.status(200).json({ resultaten })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('KvK zoeken error:', message)
    return res.status(500).json({ error: message })
  }
}
