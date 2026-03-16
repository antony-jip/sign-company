'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const featureLinks = [
  { label: 'AI Tools', href: '/features/ai', color: 'bg-peach-light' },
  { label: 'Offertes', href: '/features/offertes', color: 'bg-lavender-light' },
  { label: 'Klantportaal', href: '/features/klantportaal', color: 'bg-mist-light' },
  { label: 'E-mail', href: '/features/email', color: 'bg-cream-light' },
  { label: 'Sign Visualizer', href: '/features/sign-visualizer', color: 'bg-blush-light' },
  { label: 'Werkbonnen', href: '/features/werkbonnen', color: 'bg-sage-light' },
];

const navLinks = [
  { label: 'Hoe het werkt', href: '/#stappen' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Over ons', href: '/over-ons' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const textBase = scrolled ? 'text-ink-40' : 'text-white/50';
  const textHover = scrolled ? 'hover:text-ink-60' : 'hover:text-white/80';
  const textActive = scrolled ? 'text-ink' : 'text-white';
  const logoColor = scrolled ? 'text-ink' : 'text-white';
  const logoDim = scrolled ? 'text-ink-40' : 'text-white/50';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'navbar-blur' : 'bg-transparent'
        }`}
      >
        <div className="container flex items-center justify-between" style={{ height: 72 }}>
          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-0 relative z-[60]">
            <span className={`font-heading text-[22px] font-black tracking-tight transition-colors duration-500 ${mobileOpen ? 'text-ink' : logoColor}`}>
              FORGE
            </span>
            <span className={`font-sans text-[22px] font-normal transition-colors duration-500 ${mobileOpen ? 'text-ink-40' : logoDim}`}>
              desk
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Features dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className={`px-4 py-2 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1 ${
                  featuresOpen ? `${textActive} bg-white/10` : `${textBase} ${textHover}`
                }`}
              >
                Features
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-300 ease-out-expo ${featuresOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {featuresOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] bg-white rounded-2xl border border-ink-10 shadow-[0_16px_40px_rgba(0,0,0,0.08)] p-2">
                  {featureLinks.map(f => (
                    <Link
                      key={f.href}
                      href={f.href}
                      onClick={() => setFeaturesOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-ink-05 transition-colors group"
                    >
                      <span className={`w-2 h-2 rounded-full ${f.color}`} />
                      <span className="text-[13px] font-medium text-ink-60 group-hover:text-ink transition-colors">
                        {f.label}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-[13px] font-medium rounded-full transition-colors duration-500 ${textBase} ${textHover}`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://app.forgedesk.io/login"
              className={`px-5 py-2.5 text-[13px] font-medium rounded-full transition-colors duration-500 ${textBase} ${textHover}`}
            >
              Inloggen
            </a>
            {scrolled ? (
              <Button variant="ink" href="https://app.forgedesk.io">
                Probeer 30 dagen gratis &rarr;
              </Button>
            ) : (
              <a
                href="https://app.forgedesk.io"
                className="px-5 py-2.5 text-[13px] font-semibold text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/10"
              >
                Probeer 30 dagen gratis &rarr;
              </a>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-3 relative z-[60]">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`p-3 min-w-[48px] min-h-[48px] flex items-center justify-center transition-colors ${
                mobileOpen ? 'text-ink' : scrolled ? 'text-ink-40 hover:text-ink' : 'text-white/50 hover:text-white'
              }`}
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileOpen ? (
                  <>
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="6" y1="18" x2="18" y2="6" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Fullscreen mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-bg flex flex-col md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex-1 flex flex-col justify-center px-8" style={{ paddingTop: 72 }}>
              {/* Main nav links */}
              <div className="space-y-2 mb-12">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-3 text-[28px] font-heading font-black text-ink tracking-tight min-h-[48px] flex items-center"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                >
                  <a
                    href="https://app.forgedesk.io/login"
                    onClick={() => setMobileOpen(false)}
                    className="block py-3 text-[28px] font-heading font-black text-ink-40 tracking-tight min-h-[48px] flex items-center"
                  >
                    Inloggen
                  </a>
                </motion.div>
              </div>

              {/* Feature links grid */}
              <motion.div
                className="grid grid-cols-2 gap-3 mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              >
                {featureLinks.map(f => (
                  <Link
                    key={f.href}
                    href={f.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-ink-05 min-h-[48px]"
                  >
                    <span className={`w-2 h-2 rounded-full ${f.color}`} />
                    <span className="text-[14px] font-medium text-ink-60">{f.label}</span>
                  </Link>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              >
                <Button variant="ink" size="lg" href="https://app.forgedesk.io" className="w-full justify-center">
                  Probeer 30 dagen gratis &rarr;
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
