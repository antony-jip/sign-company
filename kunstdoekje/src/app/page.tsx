import Link from 'next/link'
import HeroVisual from '@/components/HeroVisual'
import Marquee from '@/components/Marquee'
import ProductCard from '@/components/ProductCard'
import VelvetCarousel from '@/components/VelvetCarousel'
import VoorJou from '@/components/VoorJou'
import { getArtworks, getCategories, getFabrics, getFrameColors, getPrices } from '@/lib/catalog'
import { COMBIDEAL_PCT, formatEuro, vanafCompleetCents } from '@/lib/pricing'
import type { Artwork, Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

const stappen = [
  { nr: '01', label: 'Het frame', desc: 'Aluminium frame met gleuf. Eén keer ophangen.' },
  { nr: '02', label: 'Het doek', desc: 'Kunst op fluweel of decostof, met pees rondom.' },
  { nr: '03', label: 'Wisselen', desc: 'Pees in de gleuf drukken. Klaar in 30 seconden.' },
]

export default async function Home() {
  let featured: Artwork[] = []
  let categories: Category[] = []
  let vanaf = 0
  let vanafDeco = 0
  let losVanaf = 0
  try {
    const [f, c, prices, frameColors, fabrics] = await Promise.all([
      getArtworks({ featured: true, limit: 8 }),
      getCategories(),
      getPrices(),
      getFrameColors(),
      getFabrics(),
    ])
    featured = f
    categories = c
    vanaf = vanafCompleetCents(prices, frameColors)
    const minFrame = frameColors.length ? Math.min(...frameColors.map((fc) => fc.surcharge_cents)) : 0
    const deco = fabrics.find((s) => s.key === 'deco')
    if (deco) {
      const perStof = prices.filter((p) => p.fabric_id === deco.id)
      if (perStof.length) {
        vanafDeco = Math.min(...perStof.map((p) => p.compleet_price_cents)) + minFrame
        losVanaf = Math.min(...perStof.map((p) => p.doek_price_cents))
      }
    }
  } catch {
    // Catalogus nog niet beschikbaar — toon lege staat
  }

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pt-16">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="label-caps reg-mark pl-4 text-ink/50">
              Hét art frame van Nederland — sinds 2023
            </p>

            <h1 className="mt-7 font-serif text-[clamp(48px,7vw,104px)] uppercase leading-[0.92] tracking-tight">
              Eén frame.
              <br />
              Eindeloos
              <br />
              <em className="font-accent text-[1.04em] font-normal normal-case italic tracking-normal text-accent">
                wisselen.
              </em>
            </h1>

            <p className="mt-7 max-w-md text-lg leading-relaxed text-ink/70">
              Hang je frame één keer op. Elk doek heeft een pees die je in de gleuf drukt —
              je muur wisselt mee met je smaak.
            </p>

            {/* Specs-strip */}
            <div className="mt-10 grid grid-cols-3 divide-x divide-ink/25 border-y border-ink/30">
              <div className="py-4 pr-4">
                <p className="font-serif text-2xl md:text-3xl">{vanafDeco ? formatEuro(vanafDeco) : '—'}</p>
                <p className="label-caps mt-1 text-ink/50">Compleet v.a.</p>
              </div>
              <div className="px-4 py-4">
                <p className="font-serif text-2xl md:text-3xl">−{COMBIDEAL_PCT}%</p>
                <p className="label-caps mt-1 text-ink/50">Los doek bij frame</p>
              </div>
              <div className="py-4 pl-4">
                <p className="font-serif text-2xl md:text-3xl">30 sec</p>
                <p className="label-caps mt-1 text-ink/50">Wisselen</p>
              </div>
            </div>

            {/* CTA's */}
            <div className="mt-10 flex gap-4 max-md:flex-col">
              <Link href="/shop" className="btn-primary group">
                Bekijk de collectie
                <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
              </Link>
              <Link href="/hoe-het-werkt" className="btn-ghost">
                Zo werkt het
              </Link>
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* Merkband */}
      <Marquee />

      {/* Drie stappen — genummerd, haarlijnen */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {stappen.map((s) => (
            <div key={s.nr} className="border-t border-ink/30 pt-5">
              <p className="font-accent text-3xl italic text-accent">{s.nr}</p>
              <p className="mt-3 font-serif text-xl uppercase">{s.label}</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fluweel-carousel */}
      <VelvetCarousel />

      {/* Uitgelicht */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-end justify-between border-b border-ink/25 pb-6">
          <h2 className="font-serif text-4xl uppercase md:text-6xl">
            Uit<em className="font-accent font-normal normal-case italic tracking-normal text-accent">gelicht</em>
          </h2>
          <Link href="/shop" className="label-caps shrink-0 pb-2 text-ink/50 transition hover:text-accent-dark">
            Alles bekijken →
          </Link>
        </div>
        {featured.length ? (
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {featured.map((a) => (
              <ProductCard key={a.id} artwork={a} vanafCents={vanaf || undefined} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-ink/50">De collectie wordt geladen zodra de catalogus gekoppeld is.</p>
        )}
      </section>

      {/* Combideal-statement */}
      {losVanaf > 0 && (
        <section className="bg-ink text-canvas">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="label-caps reg-mark pl-4 text-canvas/50">De combideal</p>
              <h2 className="mt-5 font-serif text-3xl uppercase leading-tight md:text-5xl">
                Frame erbij?
                <br />
                Elk los doek <em className="font-accent font-normal normal-case italic tracking-normal text-accent">−{COMBIDEAL_PCT}%</em>
              </h2>
            </div>
            <div className="md:justify-self-end">
              <p className="max-w-sm text-canvas/70">
                Bestel je een compleet frame, dan krijgt elk extra los doek in dezelfde bestelling
                automatisch {COMBIDEAL_PCT}% korting — v.a. {formatEuro(Math.round(losVanaf * (1 - COMBIDEAL_PCT / 100)))} per doek.
                Zo wissel je vanaf dag één.
              </p>
              <Link href="/shop" className="btn-invert mt-7">
                Stel je set samen
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Persoonlijke aanbevelingen */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <VoorJou />
      </section>

      {/* Categorieën */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="border-b border-ink/25 pb-6">
            <h2 className="font-serif text-4xl uppercase md:text-6xl">
              Vind jouw <em className="font-accent font-normal normal-case italic tracking-normal text-accent">stijl</em>
            </h2>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/shop?categorie=${c.slug}`}
                className="rounded-[3px] border border-ink/30 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition hover:bg-ink hover:text-canvas"
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
