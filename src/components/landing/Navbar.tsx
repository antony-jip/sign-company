'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const navLinks = [
  { label: 'Hoe het werkt', href: '/#stappen' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Over ons', href: '/over-ons' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
        <div className="hidden md:flex items-center gap-2">
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
