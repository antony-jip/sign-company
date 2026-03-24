'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Logo from './Logo'
import Toast, { useEasterEgg } from './Toast'

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/prijzen', label: 'Prijzen' },
  { href: '/over', label: 'Over ons' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { handlePuntClick, showToast, closeToast } = useEasterEgg()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobileOpen])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out-expo ${
          isScrolled
            ? 'nav-blur bg-bg/80 py-3 shadow-sm'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="container-site flex items-center justify-between">
          <Logo
            className={`transition-all duration-300 ${isScrolled ? 'text-xl' : 'text-2xl'}`}
            onPuntClick={handlePuntClick}
          />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink/70 hover:text-petrol transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/#wachtlijst"
              className="bg-flame text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-flame/90 transition-colors duration-200"
            >
              Doe mee.
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden relative w-10 h-10 flex items-center justify-center"
            aria-label={isMobileOpen ? 'Menu sluiten' : 'Menu openen'}
          >
            <div className="w-6 flex flex-col gap-1.5">
              <span
                className={`block h-[2px] bg-ink transition-all duration-300 ${
                  isMobileOpen ? 'rotate-45 translate-y-[5px]' : ''
                }`}
              />
              <span
                className={`block h-[2px] bg-ink transition-all duration-300 ${
                  isMobileOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-[2px] bg-ink transition-all duration-300 ${
                  isMobileOpen ? '-rotate-45 -translate-y-[5px]' : ''
                }`}
              />
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
            className="fixed inset-0 z-40 bg-bg flex flex-col items-center justify-center"
          >
            <nav className="flex flex-col items-center gap-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="font-heading text-4xl text-petrol tracking-tight"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href="/#wachtlijst"
                  onClick={() => setIsMobileOpen(false)}
                  className="bg-flame text-white font-semibold text-lg px-8 py-4 rounded-lg"
                >
                  Doe mee.
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Easter egg toast */}
      <Toast
        message="je hebt het gevonden"
        isVisible={showToast}
        onClose={closeToast}
      />
    </>
  )
}
