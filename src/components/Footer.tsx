import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative overflow-hidden" style={{ backgroundColor: '#0F3A42' }}>
      {/* Dark blobs — match CTA section variant */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -left-20 w-[460px] h-[460px] rounded-full"
          style={{ backgroundColor: '#1A535C', opacity: 0.4, filter: 'blur(80px)' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-[420px] h-[420px] rounded-full"
          style={{ backgroundColor: '#1A535C', opacity: 0.35, filter: 'blur(90px)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='white' opacity='0.06'/></svg>")`,
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <div className="container-site relative py-16 md:py-20">

        {/* Top: wordmark + CTA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/doen-logo-wit.svg" alt="doen." className="h-10 md:h-12 w-auto mb-2" />
            <p
              className="text-[15px] mt-3"
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              Slim gedaan<span style={{ color: '#F15025' }}>.</span>
            </p>
          </div>
          <a
            href="https://app.doen.team/register"
            className="inline-flex items-center justify-center gap-2 font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-white px-7 h-[52px] rounded-[6px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] self-start md:self-end"
            style={{
              backgroundColor: '#F15025',
              boxShadow: '0 8px 24px rgba(241,80,37,0.32)',
            }}
          >
            <span>Start gratis</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </a>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-14">
          {[
            {
              title: 'Product',
              items: [
                { href: '/features', label: 'Cockpit' },
                { href: '/prijzen', label: 'Prijzen' },
                { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
              ],
            },
            {
              title: 'Modules',
              items: [
                { href: '/features/projecten', label: 'Projecten' },
                { href: '/features/offertes', label: 'Offertes' },
                { href: '/features/portaal', label: 'Klantportaal' },
                { href: '/features/planning', label: 'Planning' },
              ],
            },
            {
              title: 'Voor wie',
              items: [
                { href: '/voor/signmakers', label: 'Signmakers' },
                { href: '/voor/autobelettering', label: 'Autobelettering' },
                { href: '/voor/grootformaat-print', label: 'Grootformaat print' },
                { href: '/voor/lichtreclame', label: 'Lichtreclame' },
              ],
            },
            {
              title: 'Bedrijf',
              items: [
                { href: '/over', label: 'Waarom doen.' },
                { href: '/kennisbank', label: 'Kennisbank' },
                { href: '/contact', label: 'Contact' },
              ],
            },
            {
              title: 'Contact',
              items: [
                { href: 'mailto:info@signcompany.nl', label: 'info@signcompany.nl' },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.items.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[14px] transition-colors duration-200 hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[10px] tracking-[0.18em] uppercase"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          <p>
            &copy; {new Date().getFullYear()} doen<span style={{ color: '#F15025' }}>.</span> Alle rechten voorbehouden
          </p>
          <p>Vakmanschap verdient beter gereedschap<span style={{ color: '#F15025' }}>.</span></p>
        </div>
      </div>
    </footer>
  )
}
