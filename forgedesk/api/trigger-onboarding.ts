import type { VercelRequest, VercelResponse } from '@vercel/node'
import { tasks } from '@trigger.dev/sdk/v3'
import type { onboardingSequence } from '../src/trigger/onboarding-sequence'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify internal call via Bearer token
  const auth = req.headers.authorization
  if (!auth || auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { userId, userEmail, userName } = req.body as {
    userId: string
    userEmail: string
    userName?: string
  }

  if (!userId || !userEmail) {
    return res.status(400).json({ error: 'userId and userEmail are required' })
  }

  try {
    await tasks.trigger<typeof onboardingSequence>("onboarding.email-sequence", {
      userId,
      userEmail,
      userName,
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[trigger-onboarding] failed:', err)
    // Non-critical: don't block registration if trigger fails
    return res.status(200).json({ success: false, fallback: true })
  }
}
