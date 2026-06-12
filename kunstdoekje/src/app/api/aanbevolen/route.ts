import { NextRequest, NextResponse } from 'next/server'
import { getArtworks, getFrameColors, getPrices } from '@/lib/catalog'
import { vanafCompleetCents } from '@/lib/pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Aanbevelingen op basis van het (client-side bijgehouden) kijkgedrag.
 * GET /api/aanbevolen?cats=<id,id>&tags=<tag,tag>&exclude=<id,id>&limit=8
 * Score: categorie-match zwaar, tag-match licht, featured als tiebreaker.
 * Zonder profiel vallen we terug op featured werk.
 */
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams
  const cats = new Set((p.get('cats') ?? '').split(',').filter(Boolean))
  const tags = new Set((p.get('tags') ?? '').split(',').filter(Boolean))
  const exclude = new Set((p.get('exclude') ?? '').split(',').filter(Boolean))
  const limit = Math.min(24, parseInt(p.get('limit') ?? '8', 10) || 8)

  try {
    const [artworks, prices, frameColors] = await Promise.all([
      getArtworks(),
      getPrices(),
      getFrameColors(),
    ])
    const vanafCents = vanafCompleetCents(prices, frameColors)

    const score = (a: (typeof artworks)[number]) => {
      let s = 0
      if (a.category_id && cats.has(a.category_id)) s += 3
      for (const t of a.tags ?? []) if (tags.has(t)) s += 1
      if (a.is_featured) s += 0.5
      return s
    }

    const aanbevolen = artworks
      .filter((a) => !exclude.has(a.id))
      .map((a) => ({ a, s: score(a) }))
      .filter(({ s }) => (cats.size || tags.size ? s > 0 : true))
      .sort((x, y) => y.s - x.s || (y.a.is_featured ? 1 : 0) - (x.a.is_featured ? 1 : 0))
      .slice(0, limit)
      .map(({ a }) => a)

    return NextResponse.json({ artworks: aanbevolen, vanafCents })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Aanbevelingen laden mislukt' },
      { status: 500 },
    )
  }
}
