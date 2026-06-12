import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import { getArtworks, getCategories, getFabrics, getFormats, getFrameColors } from '@/lib/catalog'
import { vanafCompleetCents } from '@/lib/pricing'
import type { Artwork, Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { categorie?: string }
}) {
  const categorie = searchParams.categorie
  let artworks: Artwork[] = []
  let categories: Category[] = []
  let vanaf = 0
  try {
    const [a, c, formats, fabrics, frameColors] = await Promise.all([
      getArtworks({ categorySlug: categorie }),
      getCategories(),
      getFormats(),
      getFabrics(),
      getFrameColors(),
    ])
    artworks = a
    categories = c
    vanaf = vanafCompleetCents(formats, fabrics, frameColors)
  } catch {
    /* catalogus niet beschikbaar */
  }

  const actieveCat = categories.find((c) => c.slug === categorie)

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-serif text-4xl">{actieveCat ? actieveCat.naam : 'Alle kunstdoeken'}</h1>
      <p className="mt-2 text-ink/60">
        {artworks.length} {artworks.length === 1 ? 'kunstwerk' : 'kunstwerken'} · prijs hangt af van
        formaat & stof, niet van de print
      </p>

      {/* Filterbalk */}
      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/shop"
            className={`rounded-full border px-4 py-2 text-sm transition ${
              !categorie ? 'border-accent bg-accent/10' : 'border-black/10 hover:border-black/30'
            }`}
          >
            Alles
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?categorie=${c.slug}`}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                categorie === c.slug ? 'border-accent bg-accent/10' : 'border-black/10 hover:border-black/30'
              }`}
            >
              {c.naam}
            </Link>
          ))}
        </div>
      )}

      {/* Grid */}
      {artworks.length ? (
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {artworks.map((a) => (
            <ProductCard key={a.id} artwork={a} vanafCents={vanaf || undefined} />
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-xl border border-dashed border-black/15 p-12 text-center text-ink/50">
          <p>Geen kunstwerken gevonden.</p>
          <p className="mt-1 text-sm">
            Zodra de catalogus gekoppeld is (Supabase + WooCommerce-import) verschijnen de doeken hier.
          </p>
        </div>
      )}
    </div>
  )
}
