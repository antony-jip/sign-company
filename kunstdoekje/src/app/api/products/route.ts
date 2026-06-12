import { NextRequest, NextResponse } from 'next/server'
import { getArtworks, getFabrics, getFormats, getFrameColors } from '@/lib/catalog'

export const runtime = 'nodejs'
export const revalidate = 60 // ISR cache: catalogus 60s

/**
 * Publieke catalogus-endpoint. Geeft artworks + alle prijsopties terug zodat de
 * frontend de configurator kan opbouwen en live prijzen kan tonen.
 * GET /api/products?category=natuur&limit=24&featured=1
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categorySlug = searchParams.get('category') ?? undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined
  const featured = searchParams.get('featured') === '1'

  try {
    const [artworks, formats, fabrics, frameColors] = await Promise.all([
      getArtworks({ categorySlug, limit, featured }),
      getFormats(),
      getFabrics(),
      getFrameColors(),
    ])
    return NextResponse.json({ artworks, options: { formats, fabrics, frameColors } })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Catalogus laden mislukt' },
      { status: 500 },
    )
  }
}
