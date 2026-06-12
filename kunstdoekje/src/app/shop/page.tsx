import ShopGrid, { type ShopArtwork, type ShopCategorie } from '@/components/ShopGrid'
import VoorJou from '@/components/VoorJou'
import { getArtworks, getCategories, getFrameColors, getPrices } from '@/lib/catalog'
import { vanafCompleetCents } from '@/lib/pricing'
import type { Artwork, Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { categorie?: string }
}) {
  let artworks: Artwork[] = []
  let categories: Category[] = []
  let vanaf = 0
  try {
    // Volledige catalogus laden; categoriefilter gebeurt client-side (instant wisselen)
    const [a, c, prices, frameColors] = await Promise.all([
      getArtworks(),
      getCategories(),
      getPrices(),
      getFrameColors(),
    ])
    artworks = a
    categories = c
    vanaf = vanafCompleetCents(prices, frameColors)
  } catch {
    /* catalogus niet beschikbaar */
  }

  // Lichtgewicht DTO: geen beschrijvingen over de lijn naar de client-grid
  const grid: ShopArtwork[] = artworks.map((a) => ({
    id: a.id,
    slug: a.slug,
    titel: a.titel,
    image: a.thumb_url || a.image_url,
    sfeer: a.gallery_urls?.[0] ?? null,
    sku: a.woo_sku ?? null,
    categoryId: a.category_id,
    tags: a.tags ?? [],
    featured: a.is_featured,
  }))
  const cats: ShopCategorie[] = categories.map((c) => ({ id: c.id, slug: c.slug, naam: c.naam }))

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="label-caps reg-mark pl-4 text-ink/50">De collectie</p>
      <h1 className="mt-3 font-serif text-4xl uppercase md:text-6xl">
        Alle kunst<em className="font-accent font-normal normal-case italic tracking-normal text-accent">doekjes</em>
      </h1>
      <p className="mt-4 max-w-xl text-ink/60">
        Eén prijs per formaat &amp; stof — de kunst kies je gratis. Hover over een doek om het in
        een interieur te zien.
      </p>

      <ShopGrid
        artworks={grid}
        categories={cats}
        initialCategorie={searchParams.categorie ?? null}
        vanafCents={vanaf}
      />

      <div className="mt-24">
        <VoorJou />
      </div>
    </div>
  )
}
