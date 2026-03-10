import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const PROBO_BASE_URL = 'https://api.proboprints.com'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

async function getProboApiKey(userId: string): Promise<string> {
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('probo_api_key, probo_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings?.probo_enabled || !settings?.probo_api_key) {
    throw new Error('Probo API key niet geconfigureerd. Ga naar Instellingen > Integraties.')
  }
  return settings.probo_api_key
}

// Simple in-memory cache (1 hour TTL)
interface CacheEntry {
  data: unknown
  expiresAt: number
}
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface ProboProduct {
  code: string
  name: string
  [key: string]: unknown
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const apiKey = await getProboApiKey(userId)
    const search = (req.query.search as string | undefined)?.toLowerCase()

    // Check cache
    const cacheKey = `products-${userId}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      let products = cached.data as ProboProduct[]
      if (search) {
        products = products.filter((p) =>
          p.code.toLowerCase().includes(search) ||
          p.name.toLowerCase().includes(search)
        )
      }
      return res.status(200).json({ products })
    }

    const response = await fetch(`${PROBO_BASE_URL}/products`, {
      headers: {
        'Authorization': `Basic ${apiKey}`,
      },
    })

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'Probo API key is ongeldig' })
    }

    if (!response.ok) {
      console.error('Probo products error:', response.status, await response.text())
      return res.status(502).json({ error: `Probo API fout: ${response.status}` })
    }

    const data = await response.json() as ProboProduct[]

    // Cache the full list
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS })

    let products = data
    if (search) {
      products = products.filter((p) =>
        p.code.toLowerCase().includes(search) ||
        p.name.toLowerCase().includes(search)
      )
    }

    return res.status(200).json({ products })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    if (message.includes('niet geconfigureerd')) {
      return res.status(400).json({ error: message })
    }
    console.error('Probo products error:', message)
    return res.status(500).json({ error: message })
  }
}
