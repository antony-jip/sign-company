'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
        scrolled ? 'navbar-blur' : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between" style={{ height: 72 }}>
        {/* Logo: "FORGE" in Donatto 900 22px ink + "desk" in DM Sans 400 ink-40 */}
        <a href="/" className="flex items-baseline gap-0">
          <span className="font-heading text-[22px] font-black text-ink tracking-tight">
            FORGE
          </span>
          <span className="font-sans text-[22px] font-normal text-ink-40">
            desk
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="#stappen"
            className="px-4 py-2 text-[13px] font-medium text-ink-40 hover:text-ink-60 rounded-full transition-colors"
          >
            Hoe het werkt
          </a>
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

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-2">
          <Button variant="ink" href="https://app.forgedesk.io">
            Start gratis &rarr;
          </Button>
        </div>
      </div>
    </nav>
  );
}
