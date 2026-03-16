import Link from 'next/link';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'AI Tools', href: '/features/ai' },
      { label: 'Offertes', href: '/features/offertes' },
      { label: 'Klantportaal', href: '/features/klantportaal' },
      { label: 'E-mail', href: '/features/email' },
      { label: 'Sign Visualizer', href: '/features/sign-visualizer' },
      { label: 'Werkbonnen', href: '/features/werkbonnen' },
    ],
  },
  {
    title: 'Bedrijf',
    links: [
      { label: 'Over ons', href: '/over-ons' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact', href: 'mailto:support@forgedesk.io' },
    ],
  },
  {
    title: 'Juridisch',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Voorwaarden', href: '/voorwaarden' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-10 bg-bg" style={{ paddingTop: 64, paddingBottom: 48 }}>
      <div className="container">
        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          {/* Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-baseline gap-0 mb-3">
              <span className="font-heading text-[20px] font-black tracking-tight text-ink">FORGE</span>
              <span className="font-sans text-[20px] font-normal text-ink-40">desk</span>
            </Link>
            <p className="text-[13px] text-ink-40 leading-[1.6] max-w-[200px]">
              Smeed je bedrijf. Software gebouwd door signmakers, sinds 1983.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-40 mb-4">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('mailto:') ? (
                      <a href={link.href} className="text-[13px] text-ink-60 hover:text-ink transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-[13px] text-ink-60 hover:text-ink transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-ink-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-ink-40">
          <span>&copy; 2026 FORGEdesk</span>
          <span>Gebouwd met liefde in Nederland</span>
        </div>
      </div>
    </footer>
  );
}
