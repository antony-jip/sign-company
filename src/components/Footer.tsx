import Link from 'next/link'
import Logo from './Logo'

const footerLinks = {
  Product: [
    { href: '/features', label: 'Features' },
    { href: '/prijzen', label: 'Prijzen' },
  ],
  Bedrijf: [
    { href: '/over', label: 'Over ons' },
    { href: '/contact', label: 'Contact' },
  ],
}

export default function Footer() {
  return (
    <footer className="relative" style={{ backgroundColor: '#0F3A42' }}>
      <div className="container-site py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-heading text-[22px] font-bold text-white tracking-tight mb-2">
              doen<span className="text-flame">.</span>
            </div>
            <p className="text-[13px] text-white/30">slim gedaan<span className="text-flame/50">.</span></p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-[12px] text-white/50 uppercase tracking-wider mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-white/30 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-[12px] text-white/50 uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:hello@doen.team"
                  className="text-[13px] text-white/30 hover:text-white transition-colors duration-200"
                >
                  hello@doen.team
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="font-mono text-[11px] text-white/20">
            &copy; 2026 doen<span className="text-flame/40">.</span>
          </p>
          <p className="text-[11px] text-white/15">
            Vakmanschap verdient beter gereedschap<span className="text-flame/30">.</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
