import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import ProductExperience from '@/components/product/ProductExperience'
import TrackView from '@/components/TrackView'
import VoorJou from '@/components/VoorJou'
import { getArtworkBySlug, getArtworks, getFabrics, getFormats, getFrameColors, getPrices } from '@/lib/catalog'
import { vanafCompleetCents } from '@/lib/pricing'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  try {
    const art = await getArtworkBySlug(params.slug)
    if (art) {
      const beschrijving = (art.beschrijving ?? '').replace(/\\n/g, ' ').slice(0, 100)
      return {
        title: `${art.titel} · kunstdoek voor je art frame`,
        description: `${art.titel} als wisselbaar kunstdoek op fluweel of decostof, voor het Kunstdoekje art frame (wissellijst). ${beschrijving}`.trim(),
        alternates: { canonical: `/product/${art.slug}` },
        openGraph: {
          title: `${art.titel} · Kunstdoekje`,
          images: [{ url: art.image_url, alt: art.titel }],
        },
      }
    }
  } catch { /* noop */ }
  return { title: 'Kunstdoek voor je art frame' }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let artwork = null
  let formats, fabrics, frameColors, prices
  try {
    ;[artwork, formats, fabrics, frameColors, prices] = await Promise.all([
      getArtworkBySlug(params.slug),
      getFormats(),
      getFabrics(),
      getFrameColors(),
      getPrices(),
    ])
  } catch {
    notFound()
  }
  if (!artwork || !formats || !fabrics || !frameColors || !prices) notFound()

  // Vergelijkbare doeken uit dezelfde categorie (max 4)
  let vergelijkbaar: Awaited<ReturnType<typeof getArtworks>> = []
  let vanaf = 0
  try {
    if (artwork.category_id) {
      const all = await getArtworks()
      vergelijkbaar = all
        .filter((a) => a.category_id === artwork!.category_id && a.id !== artwork!.id)
        .sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
        .slice(0, 4)
    }
    vanaf = vanafCompleetCents(prices, frameColors)
  } catch { /* aanbevelingen zijn nice-to-have */ }

  // Structured data: product met prijsbereik (rich results in Google)
  const losVanaf = prices.length ? Math.min(...prices.map((p) => p.doek_price_cents)) : 0
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: artwork.titel,
    description:
      artwork.beschrijving ??
      `${artwork.titel} als wisselbaar kunstdoek op fluweel of decostof voor het Kunstdoekje art frame.`,
    image: [artwork.image_url, ...(artwork.gallery_urls ?? []).slice(0, 3)],
    sku: artwork.woo_sku ?? undefined,
    brand: { '@type': 'Brand', name: 'Kunstdoekje' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: (losVanaf / 100).toFixed(2),
      highPrice: prices.length
        ? (Math.max(...prices.map((p) => p.compleet_price_cents)) / 100).toFixed(2)
        : undefined,
      offerCount: prices.length * 2,
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <TrackView artwork={artwork} />
      <Link href="/shop" className="text-sm text-ink/50 hover:text-ink">← Terug naar de collectie</Link>

      <div className="mt-6">
        <ProductExperience
          artwork={artwork}
          formats={formats}
          fabrics={fabrics}
          frameColors={frameColors}
          prices={prices}
        />
      </div>

      {/* Vergelijkbare doeken · zelfde categorie */}
      {vergelijkbaar.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-3xl">Vergelijkbare doeken</h2>
            <Link href="/shop" className="text-sm text-accent hover:underline">Alles bekijken →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
            {vergelijkbaar.map((a) => (
              <ProductCard key={a.id} artwork={a} vanafCents={vanaf || undefined} />
            ))}
          </div>
        </section>
      )}

      {/* Persoonlijke aanbevelingen + verder kijken */}
      <div className="mt-20">
        <VoorJou huidigeId={artwork.id} />
      </div>
    </div>
  )
}
