import Link from 'next/link'
import { getCategories } from '@/lib/catalog'
import type { Category } from '@/lib/types'

const kolommen = [
  {
    titel: 'Shop',
    links: [
      { href: '/shop', label: 'Alle kunstdoeken' },
      { href: '/frame', label: 'Los frame' },
      { href: '/eigen-foto', label: 'Eigen foto' },
      { href: '/kunst-op-maat', label: 'Kunst op maat' },
      { href: '/ral-frame', label: 'Frame in RAL-kleur' },
      { href: '/maatwerk', label: 'Maatwerk' },
      { href: '/stoffen', label: 'Stoffen vergelijken' },
      { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
    ],
  },
  {
    titel: 'Zakelijk',
    links: [
      { href: '/zakelijk', label: 'Voor bedrijven' },
      { href: '/contact', label: 'Contact' },
    ],
  },
]

// Diepe, fluwelen bruin: warme goudglans linksboven, schaduw rechtsonder.
const velvetBg = {
  backgroundColor: '#2E2719',
  backgroundImage: [
    'radial-gradient(135% 120% at 18% -10%, rgba(206,169,53,0.16), transparent 52%)',
    'radial-gradient(120% 130% at 88% 120%, rgba(0,0,0,0.55), transparent 58%)',
    'linear-gradient(168deg, #483A29 0%, #3A3024 42%, #281F14 100%)',
  ].join(','),
}

// Fluweel-nap: fijne verticale 'pile' die het licht subtiel breekt.
const velvetPile = {
  backgroundImage:
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 4px)',
}

export default async function Footer() {
  let categories: Category[] = []
  try {
    categories = await getCategories()
  } catch {
    /* catalogus niet beschikbaar · overzicht weglaten */
  }

  return (
    <footer className="relative mt-24 overflow-hidden text-canvas" style={velvetBg}>
      {/* Fluweel-textuur + zachte glans bovenrand */}
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light" style={velvetPile} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
      <div className="pointer-events-none absolute -left-1/4 top-0 h-64 w-1/2 rotate-12 bg-gradient-to-b from-white/[0.06] to-transparent blur-2xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-12 pt-20 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-3xl font-extrabold tracking-tight">
            Kunstdoekje<span className="text-accent">.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-canvas/65">
            Wisselgalerie voor thuis. Eén frame aan de muur, een hele collectie in de kast ·
            wisselen in 30 seconden.
          </p>
          <Link href="/shop" className="btn-invert mt-8 !py-3">
            Bekijk de collectie →
          </Link>
        </div>

        {kolommen.map((k) => (
          <div key={k.titel}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{k.titel}</p>
            <ul className="mt-5 space-y-3 text-sm text-canvas/65">
              {k.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-accent">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact + collectie-overzicht */}
      <div className="relative mx-auto grid max-w-7xl gap-10 border-t border-canvas/10 px-6 py-12 md:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Contact</p>
          <ul className="mt-5 space-y-3 text-sm text-canvas/65">
            <li><a href="mailto:info@kunstdoekje.nl" className="transition-colors hover:text-accent">info@kunstdoekje.nl</a></li>
            <li><a href="tel:+31850608476" className="transition-colors hover:text-accent">+31 (0)85 060 8476</a></li>
            <li>Enkhuizen, Nederland</li>
          </ul>
        </div>

        {categories.length > 0 && (
          <div className="md:col-span-3">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">De collectie</p>
              <Link href="/shop" className="text-xs text-canvas/55 transition-colors hover:text-accent">
                Alles bekijken →
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5 text-sm text-canvas/55">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/shop?categorie=${c.slug}`}
                  className="transition-colors hover:text-accent"
                >
                  {c.naam}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-canvas/10 px-6 py-6 text-xs text-canvas/45">
        <span>© {new Date().getFullYear()} Kunstdoekje · Alle rechten voorbehouden</span>
        <span className="flex items-center gap-4">
          <span>Geprint in Nederland</span>
          <span className="font-accent text-base italic text-accent">+</span>
        </span>
      </div>
    </footer>
  )
}
