'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const featureLinks = [
  { label: 'AI Tools', href: '/features/ai', color: 'bg-peach-light text-peach-deep' },
  { label: 'Offertes', href: '/features/offertes', color: 'bg-lavender-light text-lavender-deep' },
  { label: 'Klantportaal', href: '/features/klantportaal', color: 'bg-mist-light text-mist-deep' },
  { label: 'E-mail', href: '/features/email', color: 'bg-cream-light text-cream-deep' },
  { label: 'Sign Visualizer', href: '/features/sign-visualizer', color: 'bg-blush-light text-blush-deep' },
  { label: 'Werkbonnen', href: '/features/werkbonnen', color: 'bg-sage-light text-sage-deep' },
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
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
        scrolled || mobileOpen ? 'navbar-blur' : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between" style={{ height: 72 }}>
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-0">
          <span className="font-heading text-[22px] font-black text-ink tracking-tight">
            FORGE
          </span>
          <span className="font-sans text-[22px] font-normal text-ink-40">
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
                featuresOpen ? 'text-ink bg-ink-05' : 'text-ink-40 hover:text-ink-60'
              }`}
            >
              Features
              <svg
                className={`w-3.5 h-3.5 transition-transform ${featuresOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {featuresOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] bg-white rounded-2xl border border-ink-10 shadow-[0_16px_40px_rgba(0,0,0,0.08)] p-2 animate-in">
                {featureLinks.map(f => (
                  <Link
                    key={f.href}
                    href={f.href}
                    onClick={() => setFeaturesOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-ink-05 transition-colors group"
                  >
                    <span className={`w-2 h-2 rounded-full ${f.color.split(' ')[0]}`} />
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
              className="px-4 py-2 text-[13px] font-medium text-ink-40 hover:text-ink-60 rounded-full transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://app.forgedesk.io/login"
            className="px-5 py-2.5 text-[13px] font-medium text-ink-60 hover:text-ink rounded-full transition-colors"
          >
            Inloggen
          </a>
          <Button variant="ink" href="https://app.forgedesk.io">
            Start gratis &rarr;
          </Button>
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <Button variant="ink" href="https://app.forgedesk.io">
            Start gratis &rarr;
          </Button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-ink-40 hover:text-ink transition-colors"
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

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-ink-10 px-6 pb-6 pt-4 space-y-1">
          {/* Features section */}
          <button
            onClick={() => setMobileFeaturesOpen(!mobileFeaturesOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-[15px] font-medium text-ink-60 hover:text-ink rounded-xl transition-colors"
          >
            Features
            <svg
              className={`w-4 h-4 transition-transform ${mobileFeaturesOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {mobileFeaturesOpen && (
            <div className="pl-4 space-y-0.5 mb-2">
              {featureLinks.map(f => (
                <Link
                  key={f.href}
                  href={f.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-ink-40 hover:text-ink rounded-xl transition-colors"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${f.color.split(' ')[0]}`} />
                  {f.label}
                </Link>
              ))}
            </div>
          )}

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-[15px] font-medium text-ink-60 hover:text-ink rounded-xl transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://app.forgedesk.io/login"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-3 text-[15px] font-medium text-ink-40 hover:text-ink-60 rounded-xl transition-colors"
          >
            Inloggen
          </a>
        </div>
      )}
    </nav>
  );
}
