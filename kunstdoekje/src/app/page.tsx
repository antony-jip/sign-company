import Link from 'next/link'
import Image from 'next/image'
import ProductCard from '@/components/ProductCard'
import { getArtworks, getCategories, getFabrics, getFormats, getFrameColors } from '@/lib/catalog'
import { vanafCompleetCents } from '@/lib/pricing'
import type { Artwork, Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

const usps = [
  { titel: 'Eén lijst, eindeloos wisselen', tekst: 'Klik je doek in seconden in de lijst. Wissel wanneer je wilt.' },
  { titel: 'Op bestelling in Nederland', tekst: 'Elk doek wordt voor jou geprint — geen overproductie.' },
  { titel: 'Luxe velvet of deco stof', tekst: 'Diepe, kleurvaste print op fluweelzachte of matte stof.' },
  { titel: 'Gratis verzending vanaf €50', tekst: 'Veilig verpakt, snel bezorgd.' },
]

const stappen = [
  { n: '1', t: 'Kies je kunst', d: 'Honderden kunstwerken — of upload je eigen foto.' },
  { n: '2', t: 'Kies formaat & stof', d: 'Bepaal je formaat, velvet of deco, en de lijstkleur.' },
  { n: '3', t: 'Hang & wissel', d: 'Lijst eenmalig aan de muur. Doeken wissel je in een minuut.' },
]

export default async function Home() {
  let featured: Artwork[] = []
  let categories: Category[] = []
  let vanaf = 0
  try {
    const [f, c, formats, fabrics, frameColors] = await Promise.all([
      getArtworks({ featured: true, limit: 8 }),
      getCategories(),
      getFormats(),
      getFabrics(),
      getFrameColors(),
    ])
    featured = f
    categories = c
    vanaf = vanafCompleetCents(formats, fabrics, frameColors)
  } catch {
    // Catalogus nog niet beschikbaar (env/Supabase niet ingesteld) — toon lege staat
  }

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-16 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-widest text-accent">Wisselbare kunstdoeken</p>
            <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              Eén lijst.<br />Eindeloos wisselen.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink/70">
              Luxe kunstdoeken op velvet of deco stof. Klik een nieuw doek in je
              lijst en geef je muur in een minuut een heel nieuwe sfeer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="rounded-xl bg-ink px-6 py-3.5 font-medium text-canvas transition hover:bg-ink/90">
                Bekijk de collectie
              </Link>
              <Link href="/hoe-het-werkt" className="rounded-xl border border-black/15 px-6 py-3.5 font-medium transition hover:border-black/40">
                Hoe het werkt
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
            {featured[0] ? (
              <Image src={featured[0].image_url} alt={featured[0].titel} fill className="object-cover" priority sizes="(max-width:768px) 100vw, 50vw" />
            ) : (
              <div className="flex h-full items-center justify-center text-ink/30">Kunstdoek</div>
            )}
          </div>
        </div>
      </section>

      {/* USP-strip */}
      <section className="border-y border-black/5 bg-white/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {usps.map((u) => (
            <div key={u.titel}>
              <p className="font-medium">{u.titel}</p>
              <p className="mt-1 text-sm text-ink/60">{u.tekst}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Uitgelicht */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-3xl">Uitgelicht</h2>
          <Link href="/shop" className="text-sm text-accent hover:underline">Alles bekijken →</Link>
        </div>
        {featured.length ? (
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {featured.map((a) => (
              <ProductCard key={a.id} artwork={a} vanafCents={vanaf || undefined} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-ink/50">
            De collectie wordt geladen zodra de catalogus gekoppeld is.
          </p>
        )}
      </section>

      {/* Hoe het werkt */}
      <section className="bg-white/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl">In drie stappen aan de muur</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {stappen.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 font-serif text-xl text-accent">
                  {s.n}
                </div>
                <p className="mt-4 font-medium">{s.t}</p>
                <p className="mt-1 text-sm text-ink/60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categorieën */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-serif text-3xl">Categorieën</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/shop?categorie=${c.slug}`}
                className="rounded-full border border-black/10 px-5 py-2.5 text-sm transition hover:border-black/40"
              >
                {c.naam}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
