import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { tasks } from '@trigger.dev/sdk/v3'
import type { onboardingSequence } from '../src/trigger/onboarding-sequence'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function verifyUser(req: VercelRequest): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return { id: user.id, email: user.email || '' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await verifyUser(req)

    // Haal profile → organisatie_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, voornaam')
      .eq('id', user.id)
      .single()

    if (!profile?.organisatie_id) {
      return res.status(200).json({ skipped: true, reason: 'no_org' })
    }

    // Haal organisatie → eigenaar check + dedup guard
    const { data: org } = await supabaseAdmin
      .from('organisaties')
      .select('id, eigenaar_id, onboarding_compleet, onboarding_getriggerd_op')
      .eq('id', profile.organisatie_id)
      .single()

    if (!org) {
      return res.status(200).json({ skipped: true, reason: 'org_not_found' })
    }

    if (org.eigenaar_id !== user.id) {
      return res.status(200).json({ skipped: true, reason: 'not_owner' })
    }

    if (org.onboarding_compleet) {
      return res.status(200).json({ skipped: true, reason: 'already_done' })
    }

    // Dedup: skip als onboarding recent is getriggerd (< 5 minuten)
    if (org.onboarding_getriggerd_op) {
      const elapsed = Date.now() - new Date(org.onboarding_getriggerd_op).getTime()
      if (elapsed < 5 * 60 * 1000) {
        return res.status(200).json({ skipped: true, reason: 'recently_triggered' })
      }
    }

    // Markeer als getriggerd (altijd, ongeacht wat hierna gebeurt)
    await supabaseAdmin
      .from('organisaties')
      .update({ onboarding_getriggerd_op: new Date().toISOString() })
      .eq('id', org.id)

    // Trigger onboarding email sequence
    const handle = await tasks.trigger<typeof onboardingSequence>("onboarding.email-sequence", {
      userId: user.id,
      userEmail: user.email,
      userName: profile.voornaam || undefined,
    })

    return res.status(200).json({ success: true, task_id: handle.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'

    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }

    console.warn('[onboarding-trigger] failed:', message)
    return res.status(500).json({ error: 'trigger_failed' })
  }
}
