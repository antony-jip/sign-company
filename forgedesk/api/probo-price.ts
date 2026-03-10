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

interface ProboOptie {
  code: string
  value?: string
}

interface PriceRequestBody {
  product_code: string
  customer_code?: string
  options: ProboOptie[]
}

interface CompanyAddress {
  bedrijfsnaam?: string
  adres?: string
  postcode?: string
  stad?: string
}

interface ProboPriceResponse {
  products_purchase_base_price?: number
  products_purchase_rush_surcharge?: number
  products_purchase_price?: number
  products_purchase_price_incl_vat?: number
  products_sales_price?: number
  products_sales_price_incl_vat?: number
  purchase_shipping_price?: number
  [key: string]: unknown
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const apiKey = await getProboApiKey(userId)
    const { product_code, customer_code, options } = req.body as PriceRequestBody

    if (!product_code && !customer_code) {
      return res.status(400).json({ error: 'product_code of customer_code is verplicht' })
    }

    // Haal bedrijfsadres op uit company_settings of app_settings
    const { data: companyData } = await supabaseAdmin
      .from('app_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const address: CompanyAddress = {
      bedrijfsnaam: (companyData as Record<string, unknown>)?.afzender_naam as string | undefined,
      adres: (companyData as Record<string, unknown>)?.bedrijf_adres as string | undefined,
      postcode: (companyData as Record<string, unknown>)?.bedrijf_postcode as string | undefined,
      stad: (companyData as Record<string, unknown>)?.bedrijf_stad as string | undefined,
    }

    // Bouw Probo price request
    const productEntry = customer_code
      ? { customer_code, options: options || [] }
      : { code: product_code, options: options || [] }

    const proboRequest = {
      deliveries: [
        {
          address: {
            company_name: address.bedrijfsnaam || 'Sign Company',
            street: address.adres?.replace(/\s*\d+.*$/, '') || 'Hoofdstraat',
            house_number: address.adres?.match(/\d+/)?.[0] || '1',
            postal_code: address.postcode || '1000AA',
            city: address.stad || 'Amsterdam',
            country: 'NL',
          },
          delivery_date_preset: 'cheapest',
          shipping_method_preset: 'cheapest',
        },
      ],
      products: [productEntry],
    }

    const response = await fetch(`${PROBO_BASE_URL}/price`, {
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
      console.error('Probo price error:', response.status, errorText)
      // Try to parse Probo's error message
      try {
        const errorData = JSON.parse(errorText) as { message?: string; error?: string }
        return res.status(400).json({
          error: errorData.message || errorData.error || `Probo prijsberekening mislukt (${response.status})`,
        })
      } catch {
        return res.status(502).json({ error: `Probo API fout: ${response.status}` })
      }
    }

    const data = await response.json() as ProboPriceResponse

    return res.status(200).json({
      inkoop_excl: data.products_purchase_price ?? 0,
      inkoop_incl: data.products_purchase_price_incl_vat ?? 0,
      inkoop_basis: data.products_purchase_base_price ?? 0,
      advies_verkoop: data.products_sales_price ?? 0,
      advies_verkoop_incl: data.products_sales_price_incl_vat ?? 0,
      verzendkosten: data.purchase_shipping_price ?? 0,
      rush_toeslag: data.products_purchase_rush_surcharge ?? 0,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    if (message.includes('niet geconfigureerd')) {
      return res.status(400).json({ error: message })
    }
    console.error('Probo price error:', message)
    return res.status(500).json({ error: message })
  }
}
