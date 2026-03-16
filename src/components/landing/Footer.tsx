'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

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
    <footer className="relative border-t border-ink-10 bg-bg overflow-hidden" style={{ paddingTop: 80, paddingBottom: 48 }}>
      {/* Subtle ambient glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(232,169,144,0.06), transparent 70%)', filter: 'blur(60px)' }}
      />

      <div className="container relative z-10">
        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          {/* Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-baseline gap-0 mb-3 group">
              <span className="font-heading text-[20px] font-black tracking-tight text-ink transition-colors duration-300 group-hover:text-blush-vivid">FORGE</span>
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
                      <a href={link.href} className="link-hover text-[13px] text-ink-60 hover:text-ink transition-colors duration-300">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="link-hover text-[13px] text-ink-60 hover:text-ink transition-colors duration-300">
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
        <motion.div
          className="border-t border-ink-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-ink-40"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span>&copy; 2026 FORGEdesk</span>
          <span className="flex items-center gap-1.5">
            Gebouwd met
            <motion.span
              className="inline-block text-blush-vivid"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              &#9829;
            </motion.span>
            in Nederland
          </span>
        </motion.div>
      </div>
    </footer>
  );
}
