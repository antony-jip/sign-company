'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'navbar-blur border-b border-gray-200/50' : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" className="flex items-baseline gap-0.5">
          <span className="text-xl font-bold tracking-tight text-gray-900">
            FORGE
          </span>
          <span className="text-xl text-gray-400 font-light">desk</span>
        </a>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="#stappen"
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-full transition-colors"
          >
            Hoe het werkt
          </a>
          <Button variant="ghost" size="sm" href="https://app.forgedesk.io/login">
            Inloggen
          </Button>
          <Button variant="primary" size="sm" href="https://app.forgedesk.io">
            Start gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Button>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <Button variant="primary" size="sm" href="https://app.forgedesk.io">
            Start gratis
          </Button>
        </div>
      </div>
    </nav>
  );
}
