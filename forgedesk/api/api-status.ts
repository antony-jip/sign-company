import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  if (_req.method === 'OPTIONS') return res.status(200).end()

  return res.status(200).json({
    fal_ai: !!process.env.FAL_AI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  })
}
