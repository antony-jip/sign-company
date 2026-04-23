'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Toast, { useEasterEgg } from './Toast'

const navLinks = [
  { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
  { href: '/features', label: 'Features' },
  { href: '/prijzen', label: 'Prijzen' },
  { href: '/over', label: 'Waarom doen.' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { handlePuntClick, showToast, closeToast } = useEasterEgg()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileOpen])

  // Close mobile menu on route change
  useEffect(() => { setIsMobileOpen(false) }, [pathname])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'nav-blur py-3'
            : 'bg-transparent py-5'
        }`}
        style={isScrolled ? { backgroundColor: 'rgba(245,244,241,0.85)' } : {}}
      >
        <div className="container-site flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="inline-flex items-baseline" onClick={(e) => { if (pathname === '/') e.preventDefault() }}>
            <span className={`font-heading font-bold tracking-tighter transition-all duration-300 ${isScrolled ? 'text-[22px]' : 'text-[26px]'}`} style={{ color: '#1A535C' }}>
              doen
            </span>
            <span
              className={`font-heading font-bold tracking-tighter transition-all duration-300 ${isScrolled ? 'text-[22px]' : 'text-[26px]'}`}
              style={{ color: '#F15025' }}
              onClick={(e) => { e.preventDefault(); handlePuntClick() }}
            >.</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[14px] font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-petrol'
                      : 'text-[#6B6B66] hover:text-petrol hover:bg-black/[0.03]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <Link
              href="/#wachtlijst"
              className="ml-3 text-white text-[14px] font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#F15025' }}
            >
              Schrijf je in
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden relative w-10 h-10 flex items-center justify-center"
            aria-label={isMobileOpen ? 'Menu sluiten' : 'Menu openen'}
          >
            <div className="w-6 flex flex-col gap-1.5">
              <span className={`block h-[2px] transition-all duration-300 ${isMobileOpen ? 'rotate-45 translate-y-[5px]' : ''}`} style={{ backgroundColor: '#1A1A1A' }} />
              <span className={`block h-[2px] transition-all duration-300 ${isMobileOpen ? 'opacity-0' : ''}`} style={{ backgroundColor: '#1A1A1A' }} />
              <span className={`block h-[2px] transition-all duration-300 ${isMobileOpen ? '-rotate-45 -translate-y-[5px]' : ''}`} style={{ backgroundColor: '#1A1A1A' }} />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center"
            style={{ backgroundColor: '#F5F4F1' }}
          >
            <nav className="flex flex-col items-center gap-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="font-heading text-[36px] font-bold tracking-tight"
                    style={{ color: pathname === link.href ? '#1A535C' : '#1A1A1A' }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4"
              >
                <Link
                  href="/#wachtlijst"
                  onClick={() => setIsMobileOpen(false)}
                  className="text-white font-semibold text-[17px] px-8 py-4 rounded-xl inline-block"
                  style={{ backgroundColor: '#F15025' }}
                >
                  Schrijf je in
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message="je hebt het gevonden" isVisible={showToast} onClose={closeToast} />
    </>
  )
}
