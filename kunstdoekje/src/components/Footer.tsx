import Link from 'next/link'

const kolommen = [
  {
    titel: 'Shop',
    links: [
      { href: '/shop', label: 'Alle kunstdoeken' },
      { href: '/eigen-foto', label: 'Eigen foto' },
      { href: '/maatwerk', label: 'Maatwerk' },
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

export default function Footer() {
  return (
    <footer className="mt-24 overflow-hidden bg-ink text-canvas">
      <div className="h-1 bg-accent" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-10 pt-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-2xl font-extrabold uppercase">Kunstdoekje<span className="text-accent">.</span></p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-canvas/60">
            Wisselgalerie voor thuis. Eén frame aan de muur, een hele collectie in de kast —
            wisselen in 30 seconden.
          </p>
          <Link href="/shop" className="btn-invert mt-7 !py-3">
            Bekijk de collectie →
          </Link>
        </div>

        {kolommen.map((k) => (
          <div key={k.titel}>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent">{k.titel}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-canvas/60">
              {k.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition hover:text-accent">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent">Contact</p>
          <ul className="mt-4 space-y-2.5 text-sm text-canvas/60">
            <li><a href="mailto:info@kunstdoekje.nl" className="transition hover:text-accent">info@kunstdoekje.nl</a></li>
            <li><a href="tel:+31850608476" className="transition hover:text-accent">+31 (0)85 060 8476</a></li>
            <li>Enkhuizen</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-canvas/10 px-6 py-5 text-xs text-canvas/40">
        <span>© {new Date().getFullYear()} Kunstdoekje — Alle rechten voorbehouden</span>
        <span className="font-accent text-base italic text-accent">+</span>
      </div>

      {/* Gigantisch afgesneden woordmerk */}
      <div aria-hidden className="select-none px-2">
        <p className="-mb-[0.36em] whitespace-nowrap text-center font-serif text-[17.5vw] font-extrabold leading-none tracking-tight text-canvas/10">
          KUNSTDOEKJE
        </p>
      </div>
    </footer>
  )
}
