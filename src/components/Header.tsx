'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const featureLinks = [
  { name: 'AI Tools', href: '/features/ai', color: 'bg-peach-light text-peach-deep', desc: 'Forgie Chat, tekst verbeteren & inzichten' },
  { name: 'Offertes', href: '/features/offertes', color: 'bg-lavender-light text-lavender-deep', desc: 'Professionele offertes in 3 stappen' },
  { name: 'Klantportaal', href: '/features/klantportaal', color: 'bg-mist-light text-mist-deep', desc: 'Eigen portaal voor je klanten' },
  { name: 'E-mail', href: '/features/email', color: 'bg-cream-light text-cream-deep', desc: 'Inbox gekoppeld aan projecten' },
  { name: 'Integraties', href: '/features/integraties', color: 'bg-sage-light text-sage-deep', desc: 'Verbind met je favoriete tools' },
];

const navigation = [
  { name: 'Features', href: '#features', hasDropdown: true },
  { name: 'Pricing', href: '#pricing' },
  { name: 'Over ons', href: '#over-ons' },
];

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass border-b border-white/20 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              FORGE<span className="font-light">desk</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <div key={item.name} className="relative" ref={item.hasDropdown ? dropdownRef : undefined}>
                {item.hasDropdown ? (
                  <>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                    >
                      {item.name}
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {dropdownOpen && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                        <div className="space-y-1">
                          {featureLinks.map((feature) => (
                            <Link
                              key={feature.href}
                              href={feature.href}
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                            >
                              <span className={`pastel-pill ${feature.color} text-xs`}>
                                {feature.name.slice(0, 2)}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">{feature.name}</p>
                                <p className="text-xs text-gray-400">{feature.desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <a
                    href={item.href}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {item.name}
                  </a>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://app.forgedesk.io"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Inloggen
            </a>
            <a
              href="https://app.forgedesk.io/registreren"
              className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105 shadow-sm"
            >
              Gratis proberen
            </a>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menu openen"
          >
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden glass rounded-2xl shadow-lg mt-2 p-6 border border-white/20">
            <nav className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Features</p>
              {featureLinks.map((feature) => (
                <Link
                  key={feature.href}
                  href={feature.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 text-base font-medium text-gray-700 hover:text-gray-900 py-1"
                >
                  <span className={`pastel-pill ${feature.color} text-xs`}>
                    {feature.name.slice(0, 2)}
                  </span>
                  {feature.name}
                </Link>
              ))}
              <hr className="border-gray-100" />
              <a href="#pricing" onClick={() => setIsOpen(false)} className="text-base font-medium text-gray-700 hover:text-gray-900 py-2">Pricing</a>
              <a href="#over-ons" onClick={() => setIsOpen(false)} className="text-base font-medium text-gray-700 hover:text-gray-900 py-2">Over ons</a>
              <hr className="border-gray-100" />
              <a href="https://app.forgedesk.io" className="text-base font-medium text-gray-600 py-2">Inloggen</a>
              <a href="https://app.forgedesk.io/registreren" onClick={() => setIsOpen(false)} className="bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold px-6 py-3 rounded-xl text-center">
                Gratis proberen
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
