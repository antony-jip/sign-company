import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const PROBO_BASE_URL = 'https://api.proboprints.com'

let supabaseAdmin: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!url || !key) throw new Error('Supabase niet geconfigureerd')
    supabaseAdmin = createClient(url, key)
  }
  return supabaseAdmin
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await getSupabase().auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

async function getProboApiKey(userId: string): Promise<string> {
  const { data: settings } = await getSupabase()
    .from('app_settings')
    .select('probo_api_key, probo_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings?.probo_enabled || !settings?.probo_api_key) {
    throw new Error('Probo API key niet geconfigureerd. Ga naar Instellingen > Integraties.')
  }
  return settings.probo_api_key
}

/**
 * POST /api/probo-configure
 *
 * Wraps the Probo /products/configure endpoint.
 * This endpoint is used step-by-step to configure a product:
 * 1. First call with just a product code → returns first set of options
 * 2. Each subsequent call with selected options → returns next options
 * 3. When all options are selected → returns complete configuration
 *
 * Body: { product_code: string, options?: Array<{ code: string, value?: string }> }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const apiKey = await getProboApiKey(userId)

    const { product_code, options } = req.body as {
      product_code: string
      options?: Array<{ code: string; value?: string }>
    }

    if (!product_code) {
      return res.status(400).json({ error: 'product_code is verplicht' })
    }

    // Build the configure request
    const productEntry: Record<string, unknown> = { code: product_code }
    if (options && options.length > 0) {
      productEntry.options = options
    }

    const proboRequest = {
      products: [productEntry],
    }

    const response = await fetch(`${PROBO_BASE_URL}/products/configure`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proboRequest),
    })

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'Probo API key is ongeldig' })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Probo configure error:', response.status, errorText)
      try {
        const errorData = JSON.parse(errorText) as { message?: string; error?: string }
        return res.status(400).json({
          error: errorData.message || errorData.error || `Probo configuratie mislukt (${response.status})`,
        })
      } catch {
        return res.status(502).json({ error: `Probo API fout: ${response.status}` })
      }
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Probo configure handler error:', error)
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    if (message.includes('niet geconfigureerd')) {
      return res.status(400).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
}
