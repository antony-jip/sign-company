import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * Toont welk service-account toegang moet krijgen, en controleert of een
 * ingevulde hoofdmap ook echt bereikbaar is.
 *
 * Zonder deze controle merkt iemand pas twee minuten later — en dan alleen in
 * een tabel die niemand openslaat — dat hij de map niet gedeeld heeft.
 *
 * De Drive-helpers staan hier inline en niet gedeeld met src/trigger/utils:
 * api/ is standalone, zie CLAUDE.md.
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/drive'
const MAP_MIME = 'application/vnd.google-apps.folder'

interface ServiceAccount {
  client_email: string
  private_key: string
}

function leesServiceAccount(): ServiceAccount | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (json) {
    try {
      const parsed = JSON.parse(json) as Partial<ServiceAccount>
      if (parsed.client_email && parsed.private_key) {
        return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, '\n') }
      }
    } catch {
      return null
    }
    return null
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !key) return null
  return { client_email: email, private_key: key.replace(/\\n/g, '\n') }
}

function base64url(waarde: Buffer | string): string {
  return Buffer.from(waarde).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function haalToken(account: ServiceAccount): Promise<string> {
  const nu = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: nu,
    exp: nu + 3600,
  }))
  const handtekening = crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(account.private_key)
  const jwt = `${header}.${claim}.${base64url(handtekening)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`token (${res.status})`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

/**
 * Uit een geplakte Drive-link het folder-id vissen. Vrijwel niemand plakt het
 * kale id; het is een URL uit de adresbalk.
 */
export function leesMapId(invoer: string): string {
  const schoon = invoer.trim()
  const uitUrl = schoon.match(/\/folders\/([A-Za-z0-9_-]+)/)
  if (uitUrl) return uitUrl[1]
  const uitQuery = schoon.match(/[?&]id=([A-Za-z0-9_-]+)/)
  if (uitQuery) return uitQuery[1]
  return schoon
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    await verifyUser(req)

    const account = leesServiceAccount()
    if (!account) {
      return res.status(200).json({
        geconfigureerd: false,
        bericht: 'Google Drive is nog niet ingesteld op de server. Neem contact op met doen.',
      })
    }

    if (req.method === 'GET') {
      return res.status(200).json({ geconfigureerd: true, serviceAccount: account.client_email })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { hoofdmap } = (req.body ?? {}) as { hoofdmap?: string }
    if (!hoofdmap || typeof hoofdmap !== 'string') {
      return res.status(400).json({ error: 'Geen map opgegeven' })
    }
    const mapId = leesMapId(hoofdmap)

    const token = await haalToken(account)
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(mapId)}?fields=id,name,mimeType,driveId&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) },
    )

    if (driveRes.status === 404) {
      return res.status(200).json({
        geconfigureerd: true,
        ok: false,
        mapId,
        serviceAccount: account.client_email,
        bericht: `Map niet gevonden. Deel de gedeelde schijf met ${account.client_email} als Inhoudsbeheerder en probeer het opnieuw.`,
      })
    }
    if (!driveRes.ok) {
      return res.status(200).json({
        geconfigureerd: true,
        ok: false,
        mapId,
        serviceAccount: account.client_email,
        bericht: `Google gaf een fout terug (${driveRes.status}).`,
      })
    }

    const map = await driveRes.json() as { id: string; name: string; mimeType: string; driveId?: string }
    if (map.mimeType !== MAP_MIME) {
      return res.status(200).json({
        geconfigureerd: true,
        ok: false,
        mapId,
        bericht: 'Dit is een bestand, geen map. Kies de map waarin de klantmappen staan.',
      })
    }

    return res.status(200).json({
      geconfigureerd: true,
      ok: true,
      mapId: map.id,
      naam: map.name,
      // Zonder driveId staat de map in een persoonlijke Drive; daar kan het
      // service-account wel lezen maar niets neerzetten dat blijft staan.
      gedeeldeSchijf: !!map.driveId,
      serviceAccount: account.client_email,
    })
  } catch (err: unknown) {
    const bericht = err instanceof Error ? err.message : 'Onbekende fout'
    if (bericht === 'Niet geautoriseerd' || bericht === 'Ongeldige sessie') {
      return res.status(401).json({ error: bericht })
    }
    console.error('[drive-status] fout', bericht)
    return res.status(500).json({ error: 'Controle mislukt' })
  }
}
