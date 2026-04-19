/**
 * Slaat integratie-credentials encrypted op in app_settings.
 *
 * BEVEILIGD: verifyUser() + organisatie_id check.
 * Secrets (mollie_api_key, exact_online_client_secret) worden encrypted
 * met INTEGRATION_ENCRYPTION_KEY (AES-256-CBC). Client_id blijft plaintext.
 *
 * Dit is de "master" versie van het encryption patroon.
 * Andere api/ bestanden kopiëren decryptSecret() hieruit.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// -- Integration credential encryption (AES-256-CBC) --
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || ''

function encryptSecret(text: string): string {
  if (!INT_KEY) throw new Error('INTEGRATION_ENCRYPTION_KEY niet geconfigureerd')
  const key = crypto.scryptSync(INT_KEY, 'integration', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}

const ALLOWED_FIELDS = [
  'mollie_api_key',
  'mollie_enabled',
  'exact_online_client_id',
  'exact_online_client_secret',
  'exact_administratie_id',
  'exact_verkoopboek',
  'exact_grootboek',
  'exact_btw_hoog',
  'exact_btw_laag',
  'exact_btw_nul',
] as const

const SECRET_FIELDS = ['mollie_api_key', 'exact_online_client_secret']

function getClientIp(req: VercelRequest): string | null {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim() || null
  if (Array.isArray(fwd)) return fwd[0] || null
  return null
}

async function logAuditEvent(
  supabase: SupabaseClient,
  event: {
    organisatie_id?: string | null
    actor_user_id?: string | null
    actor_email?: string | null
    action: string
    resource_type?: string
    resource_id?: string
    metadata?: Record<string, unknown>
    ip?: string | null
  },
): Promise<void> {
  try {
    const ipHash = event.ip
      ? crypto.createHash('sha256').update(event.ip).digest('hex').slice(0, 32)
      : null
    await supabase.from('audit_log').insert({
      organisatie_id: event.organisatie_id ?? null,
      actor_user_id: event.actor_user_id ?? null,
      actor_email: event.actor_email ?? null,
      action: event.action,
      resource_type: event.resource_type ?? null,
      resource_id: event.resource_id ?? null,
      metadata: event.metadata ?? {},
      ip_hash: ipHash,
    })
  } catch (err) {
    console.warn('[audit] log failed:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    // Haal organisatie_id uit profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, email')
      .eq('id', userId)
      .single()

    if (!profile?.organisatie_id) {
      return res.status(403).json({ error: 'Geen organisatie gevonden' })
    }

    const body = req.body as Record<string, unknown>
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body verplicht' })
    }

    // Filter alleen toegestane velden
    // Lege secret velden worden overgeslagen (behoud bestaande encrypted waarde)
    const updates: Record<string, unknown> = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        const value = body[field]
        if (SECRET_FIELDS.includes(field)) {
          if (typeof value === 'string' && value.length > 0) {
            updates[field] = encryptSecret(value)
          }
          // Skip empty strings for secrets — don't overwrite encrypted value
        } else {
          updates[field] = value
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Geen geldige velden opgegeven' })
    }

    // Bepaal audit-events door oude staat op te halen vóór de update.
    // Mollie: connect/disconnect volgt mollie_enabled flip.
    let mollieWasEnabled: boolean | null = null
    if ('mollie_enabled' in updates) {
      const { data: oldSettings } = await supabaseAdmin
        .from('app_settings')
        .select('mollie_enabled')
        .eq('organisatie_id', profile.organisatie_id)
        .maybeSingle()
      mollieWasEnabled = (oldSettings?.mollie_enabled as boolean | null) ?? null
    }

    // Schrijf naar app_settings van eigen organisatie
    const { error: updateError } = await supabaseAdmin
      .from('app_settings')
      .update(updates)
      .eq('organisatie_id', profile.organisatie_id)

    if (updateError) {
      console.error('[save-integration-settings] update error:', updateError.message)
      return res.status(500).json({ error: 'Kon instellingen niet opslaan' })
    }

    if ('mollie_enabled' in updates) {
      const nieuweEnabled = updates.mollie_enabled === true
      if (nieuweEnabled && mollieWasEnabled !== true) {
        await logAuditEvent(supabaseAdmin, {
          organisatie_id: profile.organisatie_id,
          actor_user_id: userId,
          actor_email: profile.email ?? null,
          action: 'integration.mollie_connected',
          resource_type: 'integration',
          resource_id: 'mollie',
          ip: getClientIp(req),
        })
      } else if (!nieuweEnabled && mollieWasEnabled === true) {
        await logAuditEvent(supabaseAdmin, {
          organisatie_id: profile.organisatie_id,
          actor_user_id: userId,
          actor_email: profile.email ?? null,
          action: 'integration.mollie_disconnected',
          resource_type: 'integration',
          resource_id: 'mollie',
          ip: getClientIp(req),
        })
      }
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.warn('[save-integration-settings] error:', message)
    return res.status(500).json({ error: message })
  }
}
