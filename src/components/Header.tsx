'use client';

import React, { useState, useEffect, useRef } from 'react';

const featurePages = [
  { name: 'AI Tools', href: '/features/ai', icon: '✦', color: 'text-lavender-deep' },
  { name: 'Offertes & Facturen', href: '/features/offertes', icon: '📄', color: 'text-blush-deep' },
  { name: 'Klantportaal', href: '/features/klantportaal', icon: '🌐', color: 'text-sage-deep' },
  { name: 'Email', href: '/features/email', icon: '✉', color: 'text-mist-deep' },
  { name: 'Integraties', href: '/features/integraties', icon: '🔗', color: 'text-cream-deep' },
];

const navigation = [
  { name: 'Features', href: '#features', hasDropdown: true },
  { name: 'AI Tools', href: '/features/ai', highlight: true },
  { name: 'Pricing', href: '/#pricing' },
  { name: 'Over ons', href: '/#over-ons' },
];

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleDropdownEnter = () => {
    clearTimeout(timeoutRef.current);
    setShowDropdown(true);
  };

  const handleDropdownLeave = () => {
    timeoutRef.current = setTimeout(() => setShowDropdown(false), 200);
  };

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
              <div key={item.name} className="relative" ref={item.hasDropdown ? dropdownRef : undefined}>
                {item.hasDropdown ? (
                  <button
                    onMouseEnter={handleDropdownEnter}
                    onMouseLeave={handleDropdownLeave}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                  >
                    {item.name}
                    <svg className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                ) : (
                  <a
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
                )}

                {/* Features Dropdown */}
                {item.hasDropdown && showDropdown && (
                  <div
                    onMouseEnter={handleDropdownEnter}
                    onMouseLeave={handleDropdownLeave}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 px-2 z-50"
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45" />
                    {featurePages.map((fp) => (
                      <a
                        key={fp.href}
                        href={fp.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-base">{fp.icon}</span>
                        <span className={`text-sm font-medium text-gray-700 group-hover:${fp.color} transition-colors`}>
                          {fp.name}
                        </span>
                      </a>
                    ))}
                    <hr className="my-2 border-gray-100" />
                    <a
                      href="/#features"
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-sm text-gray-400 hover:text-gray-600"
                    >
                      Alle features bekijken →
                    </a>
                  </div>
                )}
              </div>
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
              href="https://app.forgedesk.nl/registreren"
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
            <nav className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Features</p>
              {featurePages.map((fp) => (
                <a
                  key={fp.href}
                  href={fp.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base">{fp.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{fp.name}</span>
                </a>
              ))}
              <hr className="border-gray-100 my-2" />
              <a href="/#pricing" onClick={() => setIsOpen(false)} className="text-base font-medium text-gray-700 hover:text-gray-900 py-2 px-3">Pricing</a>
              <a href="/#over-ons" onClick={() => setIsOpen(false)} className="text-base font-medium text-gray-700 hover:text-gray-900 py-2 px-3">Over ons</a>
              <hr className="border-gray-100 my-2" />
              <a href="https://app.forgedesk.nl" className="text-base font-medium text-gray-600 py-2 px-3">Inloggen</a>
              <a href="https://app.forgedesk.nl/registreren" onClick={() => setIsOpen(false)} className="bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold px-6 py-3 rounded-xl text-center mt-2">
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
