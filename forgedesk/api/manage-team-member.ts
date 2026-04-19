import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const GELDIGE_ROLLEN = ['admin', 'medewerker', 'monteur'] as const
const GELDIGE_ACTIES = ['update_rol', 'deactiveer', 'heractiveer'] as const

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

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
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const { profile_id, action, rol } = req.body as {
      profile_id: string
      action: string
      rol?: string
    }

    if (!profile_id || !action) {
      return res.status(400).json({ error: 'profile_id en action zijn verplicht' })
    }

    if (!GELDIGE_ACTIES.includes(action as typeof GELDIGE_ACTIES[number])) {
      return res.status(400).json({ error: 'Ongeldige actie' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    // Voorkom dat gebruiker zichzelf beheert
    if (profile_id === userId) {
      return res.status(403).json({ error: 'Je kunt je eigen account niet beheren via dit endpoint' })
    }

    // Controleer of de aanvrager een admin is
    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, rol, email')
      .eq('id', userId)
      .single()

    if (!requesterProfile || requesterProfile.rol !== 'admin') {
      return res.status(403).json({ error: 'Alleen admins kunnen teamleden beheren' })
    }

    // Controleer of het doelprofiel bij dezelfde organisatie hoort
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, rol, email')
      .eq('id', profile_id)
      .single()

    if (!targetProfile || targetProfile.organisatie_id !== requesterProfile.organisatie_id) {
      return res.status(403).json({ error: 'Dit teamlid hoort niet bij jouw organisatie' })
    }

    const auditBase = {
      organisatie_id: requesterProfile.organisatie_id,
      actor_user_id: userId,
      actor_email: requesterProfile.email ?? null,
      resource_type: 'team_member',
      resource_id: profile_id,
      ip: getClientIp(req),
    } as const

    switch (action) {
      case 'update_rol': {
        if (!rol || !GELDIGE_ROLLEN.includes(rol as typeof GELDIGE_ROLLEN[number])) {
          return res.status(400).json({ error: 'Ongeldige rol' })
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ rol })
          .eq('id', profile_id)

        if (updateError) {
          console.error('manage-team-member update_rol error:', updateError)
          return res.status(500).json({ error: 'Kon rol niet bijwerken' })
        }

        await logAuditEvent(supabaseAdmin, {
          ...auditBase,
          action: 'team.role_changed',
          metadata: {
            target_email: targetProfile.email ?? null,
            oude_rol: targetProfile.rol ?? null,
            nieuwe_rol: rol,
          },
        })

        return res.status(200).json({ success: true, action: 'update_rol', rol })
      }

      case 'deactiveer': {
        // Update profile status
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ status: 'gedeactiveerd' })
          .eq('id', profile_id)

        if (profileError) {
          console.error('manage-team-member deactiveer profile error:', profileError)
          return res.status(500).json({ error: 'Kon profiel niet deactiveren' })
        }

        // Ban user in auth
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(profile_id, {
          ban_duration: '876000h' // ~100 jaar
        })

        if (banError) {
          console.error('manage-team-member deactiveer ban error:', banError)
          // Revert profile status
          await supabaseAdmin.from('profiles').update({ status: 'actief' }).eq('id', profile_id)
          return res.status(500).json({ error: 'Kon gebruiker niet blokkeren' })
        }

        await logAuditEvent(supabaseAdmin, {
          ...auditBase,
          action: 'team.member_deactivated',
          metadata: { target_email: targetProfile.email ?? null },
        })

        return res.status(200).json({ success: true, action: 'deactiveer' })
      }

      case 'heractiveer': {
        // Unban user in auth
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(profile_id, {
          ban_duration: 'none'
        })

        if (unbanError) {
          console.error('manage-team-member heractiveer unban error:', unbanError)
          return res.status(500).json({ error: 'Kon gebruiker niet deblokkeren' })
        }

        // Update profile status
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ status: 'actief' })
          .eq('id', profile_id)

        if (profileError) {
          console.error('manage-team-member heractiveer profile error:', profileError)
          return res.status(500).json({ error: 'Kon profiel niet heractiveren' })
        }

        await logAuditEvent(supabaseAdmin, {
          ...auditBase,
          action: 'team.member_reactivated',
          metadata: { target_email: targetProfile.email ?? null },
        })

        return res.status(200).json({ success: true, action: 'heractiveer' })
      }

      default:
        return res.status(400).json({ error: 'Ongeldige actie' })
    }
  } catch (error) {
    if ((error as Error).message === 'Niet geautoriseerd' || (error as Error).message === 'Ongeldige sessie') {
      return res.status(401).json({ error: (error as Error).message })
    }
    console.error('manage-team-member error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het beheren van het teamlid' })
  }
}
