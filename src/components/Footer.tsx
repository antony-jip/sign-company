import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="relative">
      {/* Spectrum bar */}
      <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #1A535C, #F15025)' }} />

      <div style={{ backgroundColor: '#0F3A42' }}>
        <div className="container-site py-16 md:py-20">

          {/* Top: logo + tagline */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
            <div>
              <div className="font-heading text-[32px] font-bold text-white tracking-tight leading-none mb-2">
                doen<span style={{ color: '#F15025' }}>.</span>
              </div>
              <p className="text-[15px] text-white/30">
                De kracht achter doeners<span style={{ color: '#F15025', opacity: 0.5 }}>.</span>
              </p>
            </div>
            <div>
              <Link
                href="/#wachtlijst"
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-white px-6 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02]"
                style={{ backgroundColor: '#F15025' }}
              >
                Schrijf je in voor early access
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
            <div>
              <h4 className="font-mono text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-4">Product</h4>
              <ul className="space-y-3">
                {[
                  { href: '/features', label: 'Cockpit' },
                  { href: '/prijzen', label: 'Prijzen' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[14px] text-white/40 hover:text-white transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-4">Modules</h4>
              <ul className="space-y-3">
                {['Projecten', 'Offertes', 'Klantportaal', 'Planning'].map((m) => (
                  <li key={m}>
                    <Link href="/features" className="text-[14px] text-white/40 hover:text-white transition-colors duration-200">
                      {m}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-4">Bedrijf</h4>
              <ul className="space-y-3">
                {[
                  { href: '/over', label: 'Waarom doen.' },
                  { href: '/contact', label: 'Contact' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[14px] text-white/40 hover:text-white transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-4">Contact</h4>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:hello@doen.team" className="text-[14px] text-white/40 hover:text-white transition-colors duration-200">
                    hello@doen.team
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[12px] text-white/20">
              &copy; {new Date().getFullYear()} doen<span style={{ color: '#F15025', opacity: 0.4 }}>.</span> Alle rechten voorbehouden.
            </p>
            <p className="text-[12px] text-white/15">
              Vakmanschap verdient beter gereedschap<span style={{ color: '#F15025', opacity: 0.3 }}>.</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
