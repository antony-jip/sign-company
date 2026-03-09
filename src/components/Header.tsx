'use client';

import React, { useState, useEffect } from 'react';

const navigation = [
  { name: 'Features', href: '#features' },
  { name: 'AI Tools', href: '#ai-tools', highlight: true },
  { name: 'Pricing', href: '#pricing' },
  { name: 'Over ons', href: '#over-ons' },
];

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
          <a href="/" className="flex items-center">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              FORGE<span className="font-light">desk</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  item.highlight
                    ? 'text-lavender-deep hover:text-lavender-vivid flex items-center gap-1.5'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.highlight && (
                  <svg className="w-3.5 h-3.5 ai-sparkle" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                )}
                {item.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://app.forgedesk.nl"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Inloggen
            </a>
            <a
              href="#start"
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
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-base font-medium py-2 flex items-center gap-2 ${
                    item.highlight ? 'text-lavender-deep' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {item.highlight && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  )}
                  {item.name}
                </a>
              ))}
              <hr className="border-gray-100" />
              <a href="https://app.forgedesk.nl" className="text-base font-medium text-gray-600 py-2">Inloggen</a>
              <a href="#start" onClick={() => setIsOpen(false)} className="bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold px-6 py-3 rounded-xl text-center">
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
