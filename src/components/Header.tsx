'use client';

import React, { useState } from 'react';
import { companyInfo } from '@/lib/company-info';

interface HeaderProps {
  transparent?: boolean;
}

const navigation = [
  { name: 'Home', href: '/' },
  {
    name: 'Diensten',
    href: '/diensten',
    children: [
      { name: 'Gevelreclame', href: '/gevelreclame/' },
      { name: 'Autobelettering', href: '/autobelettering/' },
      { name: 'Bootstickers', href: '/bootstickers-enkhuizen/' },
      { name: 'Interieur Signing', href: '/interieur-signing-noord-holland/' },
      { name: 'Bewegwijzering', href: '/bewegwijzering-west-friesland/' },
      { name: 'Carwrapping', href: '/carwrapping-lelystad/' },
    ],
  },
  {
    name: 'Locaties',
    href: '/locaties',
    children: [
      { name: 'Enkhuizen', href: '/gevelreclame-enkhuizen/' },
      { name: 'Hoorn', href: '/gevelreclame-hoorn/' },
      { name: 'Medemblik', href: '/gevelreclame-medemblik/' },
      { name: 'Lelystad', href: '/signing-lelystad/' },
      { name: 'Alkmaar', href: '/gevelreclame-alkmaar/' },
      { name: 'Texel', href: '/signing-texel/' },
    ],
  },
  { name: 'Projecten', href: '/projecten' },
  { name: 'Over ons', href: '/over-ons' },
  { name: 'Contact', href: '/contact' },
];

export const Header: React.FC<HeaderProps> = ({ transparent = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header
      className={`w-full z-50 ${
        transparent
          ? 'absolute top-0 left-0 right-0 bg-transparent'
          : 'relative bg-white shadow-sm'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <span
              className={`text-2xl font-bold ${
                transparent ? 'text-white' : 'text-primary-900'
              }`}
            >
              {companyInfo.name}
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigation.map((item) => (
              <div key={item.name} className="relative group">
                <a
                  href={item.href}
                  className={`font-medium transition-colors ${
                    transparent
                      ? 'text-white/90 hover:text-white'
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  onMouseEnter={() => item.children && setOpenDropdown(item.name)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  {item.name}
                  {item.children && (
                    <svg
                      className="inline-block w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </a>
                {item.children && openDropdown === item.name && (
                  <div
                    className="absolute top-full left-0 w-56 bg-white rounded-lg shadow-lg py-2 mt-1"
                    onMouseEnter={() => setOpenDropdown(item.name)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    {item.children.map((child) => (
                      <a
                        key={child.name}
                        href={child.href}
                        className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                      >
                        {child.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center space-x-4">
            <a
              href={`tel:${companyInfo.phone}`}
              className={`font-medium ${
                transparent ? 'text-white' : 'text-gray-700'
              }`}
            >
              {companyInfo.phone}
            </a>
            <a
              href="#contact"
              className="bg-secondary-500 hover:bg-secondary-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Offerte aanvragen
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className={`w-6 h-6 ${transparent ? 'text-white' : 'text-gray-900'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden bg-white rounded-lg shadow-lg mt-2 py-4">
            {navigation.map((item) => (
              <div key={item.name}>
                <a
                  href={item.href}
                  className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                >
                  {item.name}
                </a>
                {item.children && (
                  <div className="pl-4">
                    {item.children.map((child) => (
                      <a
                        key={child.name}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600"
                      >
                        {child.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 pt-4 mt-4 border-t">
              <a
                href="#contact"
                className="block w-full bg-secondary-500 hover:bg-secondary-600 text-white font-semibold px-6 py-3 rounded-lg text-center transition-colors"
              >
                Offerte aanvragen
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
