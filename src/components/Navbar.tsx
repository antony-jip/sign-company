'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Toast, { useEasterEgg } from './Toast'
import { modules } from '@/data/modules'

const navLinks = [
  { href: '/features', label: 'Product' },
  { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
  { href: '/prijzen', label: 'Prijzen' },
  { href: '/over', label: 'Verhaal' },
  { href: '/contact', label: 'Contact' },
]

/* theme="dark" voor pagina's met een petrol-hero (witte navbar-tekst bovenaan);
   zodra er gescrold is, krijgt de navbar altijd een lichte achtergrond. */
export default function Navbar({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const { handlePuntClick, showToast, closeToast } = useEasterEgg()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  useEffect(() => {
    setIsMobileOpen(false)
    setProductOpen(false)
  }, [pathname])

  const onDark = theme === 'dark' && !isScrolled && !isMobileOpen
  const linkColor = onDark ? 'rgba(255,255,255,0.75)' : '#54666A'
  const activeColor = onDark ? '#FFFFFF' : '#1A535C'

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: isScrolled ? 'rgba(244,247,247,0.92)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(26,83,92,0.08)' : '1px solid transparent',
        }}
      >
        <nav className={`transition-all duration-300 ${isScrolled ? 'py-3.5' : 'py-6'}`}>
          <div className="container-site flex items-center justify-between gap-8">

            {/* Wordmark */}
            <Link
              href="/"
              className="relative inline-flex items-center shrink-0"
              onClick={(e) => {
                if (pathname === '/') e.preventDefault()
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={onDark ? '/logos/doen-logo-wit.svg' : '/logos/doen-logo.svg'}
                alt="doen."
                className={`w-auto transition-all duration-300 ${isScrolled ? 'h-6' : 'h-7'}`}
              />
              {/* Easter egg: klik op de punt */}
              <span
                role="button"
                tabIndex={0}
                aria-label="doen. punt"
                className="absolute right-0 bottom-0 h-1/2 w-[18%] cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePuntClick()
                }}
              />
            </Link>

            {/* Desktop nav. Product klapt alle modules uit, zodat je
                vanaf elke pagina direct naar een module kunt. */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href === '/features' && pathname.startsWith('/features'))
                const heeftMenu = link.href === '/features'

                const linkEl = (
                  <Link
                    href={link.href}
                    className="relative px-3.5 py-2 text-[14px] font-medium transition-colors duration-200 hover:opacity-100 inline-flex items-center gap-1.5"
                    style={{
                      color: isActive ? activeColor : linkColor,
                      fontWeight: isActive ? 600 : 500,
                    }}
                    aria-expanded={heeftMenu ? productOpen : undefined}
                  >
                    {link.label}
                    {heeftMenu && (
                      <span
                        aria-hidden
                        className="transition-transform duration-200"
                        style={{
                          transform: productOpen ? 'rotate(180deg)' : 'none',
                          opacity: 0.55,
                          fontSize: 9,
                        }}
                      >
                        ▼
                      </span>
                    )}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-3.5 right-3.5 -bottom-0.5 h-[2px] rounded-full"
                        style={{ backgroundColor: '#F15025' }}
                      />
                    )}
                  </Link>
                )

                if (!heeftMenu) return <div key={link.href}>{linkEl}</div>

                return (
                  <div
                    key={link.href}
                    className="relative"
                    onMouseEnter={() => setProductOpen(true)}
                    onMouseLeave={() => setProductOpen(false)}
                    onFocus={() => setProductOpen(true)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setProductOpen(false)
                    }}
                  >
                    {linkEl}
                    {productOpen && (
                      <div
                        className="absolute left-0 top-full pt-3 w-[420px]"
                        role="group"
                        aria-label="Modules"
                      >
                        <div
                          className="rounded-[10px] border border-petrol/10 bg-white p-2.5"
                          style={{ boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 18px 44px -20px rgba(19,62,69,0.35)' }}
                        >
                          <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                            {modules.map((mod) => {
                              const modActief = pathname === mod.href
                              return (
                                <Link
                                  key={mod.href}
                                  href={mod.href}
                                  onClick={() => setProductOpen(false)}
                                  className={`group flex flex-col gap-0.5 rounded-[7px] px-3 py-2 transition-colors duration-150 ${
                                    modActief ? 'bg-petrol/[0.07]' : 'hover:bg-petrol/[0.05]'
                                  }`}
                                >
                                  <span className="text-[13.5px] font-semibold text-ink group-hover:text-petrol transition-colors">
                                    {mod.label}
                                    <span className="text-flame">.</span>
                                  </span>
                                  <span className="text-[11.5px] leading-tight text-muted">{mod.sub}</span>
                                </Link>
                              )
                            })}
                          </div>
                          <Link
                            href="/features"
                            onClick={() => setProductOpen(false)}
                            className="mt-1.5 flex items-center justify-between rounded-[7px] px-3 py-2 text-[13px] font-semibold text-petrol hover:bg-petrol/[0.05] transition-colors"
                          >
                            Alle modules op een rij
                            <span aria-hidden className="text-flame">→</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right cluster */}
            <div className="hidden md:flex items-center gap-2">
              <a
                href="https://app.doen.team/login"
                className="text-[14px] font-medium px-3 py-2 transition-opacity hover:opacity-60"
                style={{ color: linkColor }}
              >
                Inloggen
              </a>
              <a
                href="https://app.doen.team/register"
                className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-white px-5 h-[42px] rounded-[6px] bg-flame transition-transform duration-300 hover:scale-[1.03] active:scale-[0.97]"
              >
                <span>Start gratis</span>
                <svg width="12" height="12" viewBox="0 0 11 11" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5">
                  <path d="M1 5.5h8.5M6.5 2L10 5.5 6.5 9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden relative w-10 h-10 flex items-center justify-center"
              aria-label={isMobileOpen ? 'Menu sluiten' : 'Menu openen'}
              aria-expanded={isMobileOpen}
            >
              <div className="w-6 flex flex-col gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`block h-[2px] transition-all duration-300 ${
                      isMobileOpen
                        ? i === 0
                          ? 'rotate-45 translate-y-[5px]'
                          : i === 1
                            ? 'opacity-0'
                            : '-rotate-45 -translate-y-[5px]'
                        : ''
                    }`}
                    style={{ backgroundColor: onDark ? '#FFFFFF' : '#16262B' }}
                  />
                ))}
              </div>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col bg-bg"
          >
            <div className="flex-1 flex flex-col justify-between pt-24 pb-10 px-7">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link, i) => {
                  const isActive = pathname === link.href
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: i * 0.04,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileOpen(false)}
                        className="block py-4 font-heading text-[36px] font-bold tracking-tight leading-none"
                        style={{ color: isActive ? '#16262B' : '#54666A' }}
                      >
                        {link.label}
                        {isActive && <span style={{ color: '#F15025' }}>.</span>}
                      </Link>

                      {/* De modules direct onder Product, anders is dit op
                          mobiel een doodlopende link naar een overzicht. */}
                      {link.href === '/features' && (
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 -mt-1 mb-3 pl-0.5">
                          {modules.map((mod) => (
                            <li key={mod.href}>
                              <Link
                                href={mod.href}
                                onClick={() => setIsMobileOpen(false)}
                                className="block py-1.5 text-[15px] font-medium"
                                style={{ color: pathname === mod.href ? '#1A535C' : '#54666A' }}
                              >
                                {mod.label}
                                <span style={{ color: '#F15025' }}>.</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )
                })}
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-4"
              >
                <a
                  href="https://app.doen.team/register"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center justify-between text-[16px] font-semibold text-white px-6 h-[56px] rounded-[6px] bg-flame"
                >
                  <span>Start gratis</span>
                  <span aria-hidden>→</span>
                </a>
                <a
                  href="https://app.doen.team/login"
                  onClick={() => setIsMobileOpen(false)}
                  className="text-center text-[15px] font-medium text-muted"
                >
                  Inloggen
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message="je hebt het gevonden" isVisible={showToast} onClose={closeToast} />
    </>
  )
}
