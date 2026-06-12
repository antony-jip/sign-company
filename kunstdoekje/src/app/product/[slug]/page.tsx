import Link from 'next/link'
import { notFound } from 'next/navigation'
import Configurator from '@/components/Configurator'
import ProductCard from '@/components/ProductCard'
import ProductFaq from '@/components/ProductFaq'
import ProductGallery from '@/components/ProductGallery'
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
      return {
        title: `${art.titel} — Kunstdoekje`,
        description: art.beschrijving ?? `${art.titel} als wisselbaar kunstdoek op luxe stof.`,
        openGraph: { images: [art.image_url] },
      }
    }
  } catch { /* noop */ }
  return { title: 'Kunstdoek — Kunstdoekje' }
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <TrackView artwork={artwork} />
      <Link href="/shop" className="text-sm text-ink/50 hover:text-ink">← Terug naar de collectie</Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {/* Beeld + sfeerfoto's + kwaliteit-FAQ */}
        <div>
          <ProductGallery
            titel={artwork.titel}
            images={[artwork.image_url, ...(artwork.gallery_urls ?? [])]}
          />
          <ProductFaq />
        </div>

        {/* Configuratie */}
        <div>
          {artwork.woo_sku && (
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent">
              Nº {artwork.woo_sku} — uit de collectie
            </p>
          )}
          <h1 className="mt-1 font-serif text-3xl md:text-4xl">{artwork.titel}</h1>
          {artwork.kunstenaar && (
            <p className="mt-1 text-sm text-ink/60">door {artwork.kunstenaar}</p>
          )}
          {artwork.beschrijving && (
            <p className="mt-4 text-ink/70">{artwork.beschrijving}</p>
          )}

          <div className="mt-8">
            <Configurator
              artwork={artwork}
              formats={formats}
              fabrics={fabrics}
              frameColors={frameColors}
              prices={prices}
            />
          </div>
        </div>
      </div>

      {/* Vergelijkbare doeken — zelfde categorie */}
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
