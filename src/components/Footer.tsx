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
    <footer className="relative bg-bg border-t border-ink/5 dot-grid-subtle">
      <div className="container-site py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo className="text-2xl mb-3" />
            <p className="text-muted text-sm">slim gedaan<span className="text-flame">.</span></p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-sm text-ink mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted hover:text-petrol transition-colors duration-200"
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
            <h4 className="font-semibold text-sm text-ink mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@doen.team"
                  className="text-sm text-muted hover:text-petrol transition-colors duration-200"
                >
                  info@doen.team
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-6 border-t border-ink/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-muted">
            &copy; 2026 doen<span className="text-flame">.</span>
          </p>
          <p className="text-xs text-muted/50">
            Vakmanschap verdient beter gereedschap.
          </p>
        </div>
      </div>
    </footer>
  )
}
