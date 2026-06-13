import Link from 'next/link'
import ShopGrid, { type ShopArtwork, type ShopCategorie } from '@/components/ShopGrid'
import VoorJou from '@/components/VoorJou'
import { getArtworks, getCategories, getFrameColors, getPrices } from '@/lib/catalog'
import { vanafCompleetCents } from '@/lib/pricing'
import type { Artwork, Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Alle kunstdoekjes · wisselbare kunst voor je art frame',
  description:
    'Ruim 1000 kunstdoeken op fluweel of decostof voor je art frame (wissellijst). Van oude meesters tot moderne kunst · wissel je kunst in 30 seconden.',
  alternates: { canonical: '/shop' },
}

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
    liggend: a.is_liggend,
    // Nieuwheid: aanmaakdatum primair, woo_id als fijne tiebreaker (de import
    // deelt vaak één created_at, dan bepaalt het oplopende woo_id de volgorde).
    nieuw: (a.created_at ? Date.parse(a.created_at) : 0) + (a.woo_id ?? 0),
  }))
  const cats: ShopCategorie[] = categories.map((c) => ({ id: c.id, slug: c.slug, naam: c.naam }))

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div data-reveal>
        <p className="label-caps reg-mark pl-4 text-ink/50">De collectie</p>
        <h1 className="mt-3 font-serif text-4xl md:text-6xl">
          Alle <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">kunstdoekjes</em>
        </h1>
        <p className="mt-4 max-w-xl text-ink/60">
          Ruim 1000 wisselbare kunstdoeken. Eén prijs per formaat &amp; stof · de kunst kies je gratis.
        </p>
      </div>

      {/* USP: alle werken passen in hetzelfde frame */}
      <div className="mt-6 flex items-start gap-3 rounded-[4px] border border-accent/30 bg-accent/[0.07] px-4 py-3.5" data-reveal>
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-6 w-6 shrink-0 text-accent-dark"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <rect x="3" y="5" width="18" height="14" rx="1.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5 7 12l2.5 2.5M14.5 9.5 17 12l-2.5 2.5" />
        </svg>
        <p className="text-sm leading-relaxed text-ink/80">
          <strong className="font-semibold text-ink">Élk werk past in hetzelfde art frame.</strong>{' '}
          Hang je frame één keer op en wissel je kunst in 30 seconden · geen nieuwe lijst nodig.
        </p>
      </div>

      {/* Los frame kopen */}
      <Link
        href="/frame"
        className="group mt-8 flex flex-col items-start gap-4 rounded-[4px] border border-ink/20 bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-ink/45 hover:shadow-hard-sm sm:flex-row sm:items-center sm:justify-between"
        data-reveal
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[3px] border-2 border-ink/70" aria-hidden>
            <span className="h-6 w-4 border-2 border-ink/40" />
          </span>
          <div>
            <p className="font-serif text-xl">Alleen een frame nodig?</p>
            <p className="text-sm text-ink/60">
              Koop los je aluminium wissellijst · in elke maat en kleur.
            </p>
          </div>
        </div>
        <span className="label-caps shrink-0 text-accent-dark transition-transform group-hover:translate-x-1">
          Frame samenstellen →
        </span>
      </Link>

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
