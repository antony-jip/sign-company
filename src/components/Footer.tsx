import Link from 'next/link'

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Alle modules', href: '/features' },
      { label: 'Demo bekijken', href: '/demo' },
      { label: 'Hoe het werkt', href: '/hoe-het-werkt' },
      { label: 'Prijzen', href: '/prijzen' },
      { label: 'Vergelijk met Gripp en James Pro', href: '/vergelijk' },
    ],
  },
  {
    title: 'Voor wie',
    links: [
      { label: 'Signmakers', href: '/voor/signmakers' },
      { label: 'Autobelettering', href: '/voor/autobelettering' },
      { label: 'Grootformaat print', href: '/voor/grootformaat-print' },
      { label: 'Doeners', href: '/voor/doeners' },
    ],
  },
  {
    title: 'Bedrijf',
    links: [
      { label: 'Verhaal', href: '/over' },
      { label: 'Kennisbank', href: '/kennisbank' },
      { label: 'Veelgestelde vragen', href: '/veelgestelde-vragen' },
      { label: 'Contact', href: '/contact' },
      { label: 'Algemene voorwaarden', href: '/voorwaarden' },
      { label: 'Privacyverklaring', href: '/privacy' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-petrol-deep">
      <div className="container-site tegel">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_repeat(3,1fr)] gap-x-8 gap-y-8 md:gap-y-12 mb-10 md:mb-16">
          <div className="col-span-2 md:col-span-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/doen-logo-wit.svg" alt="doen." className="h-9 w-auto mb-4" />
            <p className="hidden md:block tekst-body max-w-[26ch]" style={{ color: 'rgba(226,240,241,0.6)' }}>
              Eén plek voor je hele signbedrijf. Slim gedaan
              <span className="text-flame">.</span>
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="tekst-caption font-semibold text-white mb-3">{col.title}</p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href} className="leading-[1.95]">
                    <Link
                      href={link.href}
                      className="text-[15px] tracking-apple transition-colors hover:text-white"
                      style={{ color: 'rgba(226,240,241,0.6)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-6 md:pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="tekst-fijn" style={{ color: 'rgba(226,240,241,0.45)' }}>
            © {new Date().getFullYear()} doen. · Gemaakt door signmakers, voor signmakers
          </p>
          <a
            href="/contact"
            className="tekst-fijn font-medium transition-colors hover:text-white"
            style={{ color: 'rgba(226,240,241,0.6)' }}
          >
            Stuur een bericht
          </a>
        </div>
      </div>
    </footer>
  )
}
