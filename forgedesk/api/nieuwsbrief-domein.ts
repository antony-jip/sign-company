import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { resolveTxt } from 'node:dns/promises'

// Vertelt of het verzenddomein goed staat. Voor B2B is dit geen bijzaak: mail
// die zonder SPF, DKIM en DMARC binnenkomt, belandt bij grote bedrijven in de
// spam of wordt geweigerd, en dan zeggen open- en klikcijfers niets.
//
// Meteen ook de plek waar zichtbaar wordt of open- en kliktracking bij Resend
// aanstaan. Zonder die twee blijft het statistiekscherm leeg, en dat is niet aan
// de cijfers te zien.
const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const VERZEND_DOMEIN = 'signcompany.nl'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

async function verifyOwner(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.split(' ')[1])
  if (error || !user) return false
  return user.id === OWNER_USER_ID
}

async function leesDmarc(domein: string): Promise<{ aanwezig: boolean; beleid: string | null; ruw: string | null }> {
  try {
    const records = await resolveTxt(`_dmarc.${domein}`)
    const platte = records.map(r => r.join('')).find(r => r.toLowerCase().startsWith('v=dmarc1'))
    if (!platte) return { aanwezig: false, beleid: null, ruw: null }
    const beleid = /(?:^|;)\s*p\s*=\s*([a-z]+)/i.exec(platte)?.[1]?.toLowerCase() ?? null
    return { aanwezig: true, beleid, ruw: platte }
  } catch {
    return { aanwezig: false, beleid: null, ruw: null }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!(await verifyOwner(req))) return res.status(403).json({ error: 'Geen toegang' })

    const dmarc = await leesDmarc(VERZEND_DOMEIN)

    if (!resend) {
      return res.status(200).json({ domein: VERZEND_DOMEIN, gevonden: false, dmarc, webhookIngesteld: Boolean(process.env.NIEUWSBRIEF_WEBHOOK_TOKEN) })
    }

    const { data: lijst, error } = await resend.domains.list()
    if (error) return res.status(502).json({ error: `Resend antwoordt niet: ${error.message}` })
    const rij = (lijst?.data ?? []).find(d => d.name === VERZEND_DOMEIN)
    if (!rij) {
      return res.status(200).json({ domein: VERZEND_DOMEIN, gevonden: false, dmarc, webhookIngesteld: Boolean(process.env.NIEUWSBRIEF_WEBHOOK_TOKEN) })
    }

    const { data: detail } = await resend.domains.get(rij.id)
    const records = detail?.records ?? []
    const statusVan = (soort: string) => {
      const passend = records.filter(r => r.record === soort)
      if (passend.length === 0) return null
      return passend.every(r => r.status === 'verified') ? 'verified' : passend[0].status
    }

    return res.status(200).json({
      domein: VERZEND_DOMEIN,
      gevonden: true,
      status: detail?.status ?? rij.status,
      spf: statusVan('SPF'),
      dkim: statusVan('DKIM'),
      dmarc,
      openTracking: Boolean(detail?.open_tracking),
      klikTracking: Boolean(detail?.click_tracking),
      webhookIngesteld: Boolean(process.env.NIEUWSBRIEF_WEBHOOK_TOKEN),
    })
  } catch (err) {
    console.error('[nieuwsbrief-domein] fout:', err)
    return res.status(500).json({ error: (err as Error).message })
  }
}
