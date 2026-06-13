import Image from 'next/image'
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
  {
    nr: '01',
    label: 'Eenmalig',
    titel: 'Premium frame',
    desc: 'Klik de vier aluminium profielen samen tot een strak frame en hang het één keer op.',
    feature: 'Montage in 2 minuten',
  },
  {
    nr: '02',
    label: 'Direct genieten',
    titel: 'Eerste doek',
    desc: 'Druk de pees van je doek in de gleuf. Het spansysteem trekt het kaarsrecht.',
    feature: 'Galeriekwaliteit',
  },
  {
    nr: '03',
    label: 'Cureer',
    titel: 'Breid uit',
    desc: 'Ontdek ruim 1000 doeken op fluweel of decostof, of upload je eigen beeld.',
    feature: 'Gratis thuisbezorgd',
  },
  {
    nr: '04',
    label: 'Onbeperkt',
    titel: 'Wissel',
    desc: 'Verwissel je kunst wanneer je wilt · per seizoen, per stemming. In 30 seconden.',
    feature: 'Eén frame, eindeloos',
  },
]

const kenmerken = [
  {
    titel: 'Duurzaam design',
    tekst: 'Tijdloos frame, eindeloze mogelijkheden',
    icon: <path d="M3 3h18v18H3zM3 9h18M9 21V9" />,
  },
  {
    titel: 'Ruimtebesparend',
    tekst: 'Doeken opgerold te bewaren',
    icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />,
  },
  {
    titel: 'Premium materialen',
    tekst: 'Fluweel en geborsteld aluminium',
    icon: <path d="M6 3h12l4 6-10 13L2 9zM11 3 8 9l4 13 4-13-3-6M2 9h20" />,
  },
  {
    titel: 'Circulair systeem',
    tekst: 'Eén frame, levenslang gebruik',
    icon: <path d="M21 12a9 9 0 1 1-3-6.7M21 3v5h-5" />,
  },
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
    // Catalogus nog niet beschikbaar · toon lege staat
  }

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pt-16">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div data-reveal-group>
            <p className="label-caps reg-mark pl-4 text-ink/50">
              Hét art frame van Nederland · sinds 2023
            </p>

            <h1 className="mt-7 font-serif text-[clamp(48px,7vw,104px)] leading-[0.92] tracking-tight">
              Eén frame.
              <br />
              Eindeloos
              <br />
              <em className="font-accent text-[1.04em] font-normal normal-case italic tracking-normal text-accent">
                wisselen.
              </em>
            </h1>

            <p className="mt-7 max-w-md text-lg leading-relaxed text-ink/70">
              Hang je frame één keer op. Elk doek heeft een pees die je in de gleuf drukt ·
              je muur wisselt mee met je smaak.
            </p>

            {/* Specs-strip */}
            <div className="mt-10 grid grid-cols-3 divide-x divide-ink/25 border-y border-ink/30">
              <div className="py-4 pr-4">
                <p className="font-serif text-2xl md:text-3xl">{vanafDeco ? formatEuro(vanafDeco) : '·'}</p>
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

          <div data-reveal>
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Merkband */}
      <Marquee />

      {/* Hoe het werkt · vier stappen + kenmerken */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center" data-reveal>
          <p className="label-caps reg-mark inline-block pl-4 text-ink/50">Het Kunstdoekje-systeem</p>
          <h2 className="mt-5 font-serif text-4xl md:text-5xl">
            Eenvoud ontmoet <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">elegantie</em>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink/65">
            Eén intelligent frame dat met je meebeweegt. Verander je kunst, behoud je frame.
          </p>
        </div>

        {/* Stappen */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-reveal-group>
          {stappen.map((s) => (
            <div
              key={s.nr}
              className="group flex flex-col rounded-[4px] border border-ink/15 bg-paper p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-ink/40 hover:shadow-hard-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-accent font-serif text-lg text-accent-dark">
                  {s.nr}
                </span>
                <span className="label-caps text-ink/40">{s.label}</span>
              </div>
              <h3 className="mt-5 font-serif text-2xl">{s.titel}</h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink/65">{s.desc}</p>
              <p className="mt-5 flex items-center gap-2 rounded-[3px] border border-accent/15 bg-accent/[0.07] px-3.5 py-2.5 text-[13px] font-semibold text-ink">
                <span className="text-accent">✓</span>
                {s.feature}
              </p>
            </div>
          ))}
        </div>

        {/* Kenmerken */}
        <div className="mt-20 grid gap-10 sm:grid-cols-2 lg:grid-cols-4" data-reveal-group>
          {kenmerken.map((k) => (
            <div key={k.titel} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-paper text-accent shadow-hard-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                  {k.icon}
                </svg>
              </div>
              <p className="mt-5 font-semibold">{k.titel}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{k.tekst}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link href="/hoe-het-werkt" className="btn-ghost group">
            Ontdek hoe het werkt
            <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </Link>
        </div>
      </section>

      {/* Framekleuren · drie afwerkingen */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <div className="relative order-2 md:order-1" data-reveal>
            <div className="rounded-[4px] border border-ink/15 bg-paper p-4 shadow-hard-sm sm:p-6">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src="https://kunstdoekje.nl/wp-content/uploads/2023/12/frames.png"
                  alt="De drie framekleuren van Kunstdoekje · zwart, zilver en wit aluminium"
                  fill
                  sizes="(max-width:768px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2" data-reveal>
            <p className="label-caps reg-mark pl-4 text-ink/50">Het frame</p>
            <h2 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">
              Drie kleuren,
              <br />
              één <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">signatuur</em>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
              Het aluminium art frame komt in drie tijdloze afwerkingen · zwart, zilver en wit. Zo
              past het bij elk interieur en bij elk doek. Strak geborsteld, mat afgewerkt en gemaakt
              om jarenlang mee te wisselen.
            </p>
            <p className="mt-4 max-w-md text-ink/60">
              Hang je frame één keer op; de kunst erin verander je wanneer je wilt · in 30 seconden.
            </p>
            <Link href="/shop" className="btn-ghost mt-9">
              Kies je framekleur
            </Link>
          </div>
        </div>
      </section>

      {/* Fluweel-carousel */}
      <VelvetCarousel />

      {/* Uitgelicht */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-end justify-between border-b border-ink/25 pb-6" data-reveal>
          <h2 className="font-serif text-4xl md:text-6xl">
            <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">Uitgelicht</em>
          </h2>
          <Link href="/shop" className="label-caps shrink-0 pb-2 text-ink/50 transition hover:text-accent-dark">
            Alles bekijken →
          </Link>
        </div>
        {featured.length ? (
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4" data-reveal-group>
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
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr]" data-reveal-group>
            <div>
              <p className="label-caps reg-mark pl-4 text-canvas/50">De combideal</p>
              <h2 className="mt-5 font-serif text-3xl leading-tight md:text-5xl">
                Frame erbij?
                <br />
                Elk los doek <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">−{COMBIDEAL_PCT}%</em>
              </h2>
            </div>
            <div className="md:justify-self-end">
              <p className="max-w-sm text-canvas/70">
                Bestel je een compleet frame, dan krijgt elk extra los doek in dezelfde bestelling
                automatisch {COMBIDEAL_PCT}% korting · v.a. {formatEuro(Math.round(losVanaf * (1 - COMBIDEAL_PCT / 100)))} per doek.
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
          <div className="border-b border-ink/25 pb-6" data-reveal>
            <h2 className="font-serif text-4xl md:text-6xl">
              Vind jouw <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">stijl</em>
            </h2>
          </div>
          <div className="mt-8 flex flex-wrap gap-3" data-reveal-group>
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
