'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatEuro } from '@/lib/pricing'

/** Lichtgewicht artwork-DTO voor de shopgrid (geen beschrijvingen mee over de lijn). */
export interface ShopArtwork {
  id: string
  slug: string
  titel: string
  image: string
  sfeer: string | null
  sku: string | null
  categoryId: string | null
  tags: string[]
  featured: boolean
  liggend: boolean
  /** Chronologische sleutel (hoger = nieuwer) voor de "Alles"-weergave. */
  nieuw: number
}

export interface ShopCategorie {
  id: string
  slug: string
  naam: string
}

const BATCH = 24

// Subcategorieën die als chevron onder een hoofdcategorie vallen.
const KINDEREN: Record<string, string[]> = {
  'oude-meesters': ['van-gogh', 'claude-monet', 'da-vinci', 'gustav-klimt', 'aert-schouman'],
}
const KIND_SLUGS = new Set(Object.values(KINDEREN).flat())

export default function ShopGrid({
  artworks,
  categories,
  initialCategorie,
  vanafCents,
}: {
  artworks: ShopArtwork[]
  categories: ShopCategorie[]
  initialCategorie: string | null
  vanafCents: number
}) {
  const router = useRouter()
  const [catSlug, setCatSlug] = useState<string | null>(initialCategorie)
  const [zoek, setZoek] = useState('')
  const [zichtbaar, setZichtbaar] = useState(BATCH)
  const [openGroepen, setOpenGroepen] = useState<Set<string>>(new Set())
  const sentinel = useRef<HTMLDivElement>(null)

  // Aantal werken per categorie (voor de zijbalk)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of artworks) if (a.categoryId) m.set(a.categoryId, (m.get(a.categoryId) ?? 0) + 1)
    return m
  }, [artworks])

  const actieveCat = categories.find((c) => c.slug === catSlug) ?? null
  const catNaam = useMemo(() => new Map(categories.map((c) => [c.id, c.naam])), [categories])

  // Subcategorieën (met werken) van een hoofdcategorie
  const kinderenVan = (slug: string) =>
    (KINDEREN[slug] ?? [])
      .map((s) => categories.find((c) => c.slug === s))
      .filter((c): c is ShopCategorie => !!c && (counts.get(c.id) ?? 0) > 0)

  // Hoofdcategorieën: kinderen vallen eronder, dus niet apart in de lijst
  const topCategorieen = categories.filter(
    (c) =>
      !KIND_SLUGS.has(c.slug) &&
      ((counts.get(c.id) ?? 0) > 0 || kinderenVan(c.slug).length > 0),
  )

  const gefilterd = useMemo(() => {
    let lijst = artworks
    if (actieveCat) lijst = lijst.filter((a) => a.categoryId === actieveCat.id)
    const q = zoek.trim().toLowerCase()
    if (q) {
      lijst = lijst.filter(
        (a) => a.titel.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    // "Alles" (geen categoriefilter): toon de nieuwste werken eerst.
    if (!actieveCat) lijst = [...lijst].sort((a, b) => b.nieuw - a.nieuw)
    return lijst
  }, [artworks, actieveCat, zoek])

  function kies(slug: string | null) {
    setCatSlug(slug)
    setZichtbaar(BATCH)
    // URL in sync houden (deelbaar/bookmarkbaar) zonder page reload
    router.replace(slug ? `/shop?categorie=${slug}` : '/shop', { scroll: false })
  }

  // Oneindig scrollen
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setZichtbaar((z) => z + BATCH) },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => setZichtbaar(BATCH), [zoek])

  const items = gefilterd.slice(0, zichtbaar)

  const catKnop = (label: string, slug: string | null, aantal: number, actief: boolean) => (
    <button
      key={slug ?? '_alles'}
      type="button"
      onClick={() => kies(slug)}
      className={`flex w-full items-baseline justify-between gap-3 border-l px-3 py-2 text-left text-[13px] font-semibold uppercase tracking-[0.1em] transition max-lg:w-auto max-lg:shrink-0 max-lg:rounded-[3px] max-lg:border-l-0 max-lg:border max-lg:px-4 ${
        actief
          ? 'border-accent bg-accent/10 text-ink max-lg:border-ink max-lg:bg-ink max-lg:text-canvas'
          : 'border-ink/10 text-ink/55 hover:border-ink/50 hover:text-ink max-lg:border-ink/20'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className={`font-accent text-sm italic tracking-normal ${actief ? 'text-accent-dark max-lg:text-accent' : 'text-muted'}`}>
        {aantal}
      </span>
    </button>
  )

  return (
    <div className="mt-10 gap-12 lg:grid lg:grid-cols-[240px_1fr]">
      {/* Categorie-navigatie: zijbalk op desktop, rail op mobiel */}
      <aside className="scrollbar-none max-lg:-mx-6 max-lg:flex max-lg:gap-2 max-lg:overflow-x-auto max-lg:px-6 max-lg:pb-2 lg:sticky lg:top-32 lg:max-h-[calc(100vh-8rem)] lg:space-y-0.5 lg:overflow-y-auto lg:pr-1 lg:[-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_18px,#000_calc(100%_-_18px),transparent)] lg:[mask-image:linear-gradient(to_bottom,transparent,#000_18px,#000_calc(100%_-_18px),transparent)]">
        <p className="label-caps mb-4 text-ink/40 max-lg:hidden">Categorieën</p>
        {catKnop('Alles', null, artworks.length, !actieveCat)}
        {topCategorieen.map((c) => {
          const kinderen = kinderenVan(c.slug)
          if (!kinderen.length) {
            return catKnop(c.naam, c.slug, counts.get(c.id) ?? 0, actieveCat?.slug === c.slug)
          }
          const open =
            openGroepen.has(c.slug) ||
            actieveCat?.slug === c.slug ||
            kinderen.some((k) => k.slug === actieveCat?.slug)
          return (
            <div key={c.slug} className="max-lg:shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOpenGroepen((s) => {
                    const n = new Set(s)
                    n.has(c.slug) ? n.delete(c.slug) : n.add(c.slug)
                    return n
                  })
                  kies(c.slug)
                }}
                className={`flex w-full items-center justify-between gap-2 border-l px-3 py-2 text-left text-[13px] font-semibold uppercase tracking-[0.1em] transition max-lg:rounded-[3px] max-lg:border max-lg:border-l-0 max-lg:px-4 ${
                  actieveCat?.slug === c.slug
                    ? 'border-accent bg-accent/10 text-ink max-lg:border-ink'
                    : 'border-ink/10 text-ink/55 hover:border-ink/50 hover:text-ink max-lg:border-ink/20'
                }`}
              >
                <span className="truncate">{c.naam}</span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              </button>
              {open && (
                <div className="mt-1 space-y-1 border-l border-ink/10 pl-3 max-lg:hidden">
                  {kinderen.map((k) =>
                    catKnop(k.naam, k.slug, counts.get(k.id) ?? 0, actieveCat?.slug === k.slug),
                  )}
                </div>
              )}
            </div>
          )
        })}
      </aside>

      <div className="max-lg:mt-8">
        {/* Zoekveld + telling */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek op titel of stijl… (bv. Van Gogh)"
              className="w-full rounded-[3px] border border-ink/30 bg-paper py-3 pl-12 pr-4 text-sm outline-none transition focus:border-ink focus:shadow-hard-sm"
            />
          </div>
          <p className="label-caps text-ink/40">
            {gefilterd.length} {gefilterd.length === 1 ? 'werk' : 'werken'}
            {actieveCat && <> · {actieveCat.naam}</>}
            {vanafCents > 0 && <span className="text-accent-dark"> · elk werk v.a. {formatEuro(vanafCents)}</span>}
          </p>
        </div>

        {items.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
            {items.map((a) => (
              <Link key={a.id} href={`/product/${a.slug}`} className="group block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-[4px] bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-hard-sm">
                  <Image
                    src={a.image}
                    alt={a.titel}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className={`transition duration-500 ${a.liggend ? 'object-contain' : 'object-cover'} ${
                      a.sfeer ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'
                    }`}
                  />
                  {a.sfeer && (
                    <Image
                      src={a.sfeer}
                      alt={`${a.titel} · in interieur`}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                    />
                  )}
                  {a.featured && (
                    <span className="absolute left-0 top-3 z-10 bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-canvas">
                      Populair
                    </span>
                  )}
                  {a.liggend && (
                    <span
                      className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-[3px] bg-ink/70 text-canvas backdrop-blur"
                      title="Liggend formaat"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="7" width="18" height="10" rx="1" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  <span className="shrink-0">{a.sku ? `Nº ${a.sku}` : '·'}</span>
                  <span className="truncate">{(a.categoryId && catNaam.get(a.categoryId)) || ''}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate font-semibold leading-tight">{a.titel}</p>
                  <span className="shrink-0 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-16 border-2 border-dashed border-ink/20 p-12 text-center text-ink/50">
            <p>Niets gevonden{zoek && <> voor “{zoek}”</>}{actieveCat && <> in {actieveCat.naam}</>}.</p>
            <button onClick={() => { setZoek(''); kies(null) }} className="label-caps mt-4 text-accent-dark hover:underline">
              Toon alles
            </button>
          </div>
        )}

        {/* Sentinel voor oneindig scrollen */}
        {zichtbaar < gefilterd.length && (
          <div ref={sentinel} className="mt-12 flex justify-center">
            <button onClick={() => setZichtbaar((z) => z + BATCH)} className="btn-ghost">
              Meer laden ({gefilterd.length - zichtbaar})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
