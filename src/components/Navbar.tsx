'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Toast, { useEasterEgg } from './Toast'
import { modules } from '@/data/modules'

const navLinks = [
  { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
  { href: '/features', label: 'Cockpit' },
  { href: '/prijzen', label: 'Prijzen' },
  { href: '/over', label: 'Verhaal' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [cockpitOpen, setCockpitOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    setCockpitOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!cockpitOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCockpitOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cockpitOpen])

  const openCockpit = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setCockpitOpen(true)
  }
  const scheduleCloseCockpit = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setCockpitOpen(false), 140)
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: isScrolled ? 'rgba(243,242,237,0.92)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
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
                src="/logos/doen-logo.svg"
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

            {/* Desktop nav — numbered, pill-hover, active flame dot */}
            <div className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link, i) => {
                const isActive = pathname === link.href || (link.href === '/features' && pathname.startsWith('/features'))
                const nr = String(i + 1).padStart(2, '0')
                const isCockpit = link.href === '/features'
                const linkEl = (
                  <Link
                    href={link.href}
                    className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[14px] font-medium transition-all duration-200 hover:bg-[rgba(26,83,92,0.06)] group"
                    style={{ color: isActive ? '#1A535C' : '#5A5A55' }}
                    aria-haspopup={isCockpit ? 'true' : undefined}
                    aria-expanded={isCockpit ? cockpitOpen : undefined}
                    onFocus={isCockpit ? openCockpit : undefined}
                  >
                    <span
                      className="font-mono text-[10px] tabular-nums transition-colors"
                      style={{
                        color: isActive ? '#F15025' : 'rgba(155,155,149,0.7)',
                      }}
                    >
                      {nr}
                    </span>
                    <span className="relative">
                      {link.label}
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                          style={{ backgroundColor: '#F15025' }}
                        />
                      )}
                    </span>
                    {isCockpit && (
                      <svg
                        aria-hidden
                        width="9"
                        height="9"
                        viewBox="0 0 10 10"
                        className="transition-transform duration-200"
                        style={{
                          transform: cockpitOpen ? 'rotate(180deg)' : 'rotate(0)',
                          color: isActive ? '#1A535C' : '#9B9B95',
                        }}
                      >
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    )}
                  </Link>
                )

                if (!isCockpit) {
                  return <div key={link.href}>{linkEl}</div>
                }

                return (
                  <div
                    key={link.href}
                    className="relative"
                    onMouseEnter={openCockpit}
                    onMouseLeave={scheduleCloseCockpit}
                  >
                    {linkEl}
                    <CockpitMegaMenu open={cockpitOpen} pathname={pathname} onClose={() => setCockpitOpen(false)} />
                  </div>
                )
              })}
            </div>

            {/* Right cluster */}
            <div className="hidden md:flex items-center gap-2">
              <a
                href="https://app.doen.team/login"
                className="text-[14px] font-medium px-3 py-2 transition-opacity hover:opacity-60"
                style={{ color: '#5A5A55' }}
              >
                Inloggen
              </a>
              <a
                href="https://app.doen.team/register"
                className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-5 h-[42px] rounded-[6px] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_22px_-2px_rgba(241,80,37,0.5)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
                style={{
                  backgroundColor: '#F15025',
                  boxShadow: '0 6px 18px -2px rgba(241,80,37,0.38)',
                }}
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
                <span
                  className={`block h-[2px] transition-all duration-300 ${
                    isMobileOpen ? 'rotate-45 translate-y-[5px]' : ''
                  }`}
                  style={{ backgroundColor: '#1A1A1A' }}
                />
                <span
                  className={`block h-[2px] transition-all duration-300 ${
                    isMobileOpen ? 'opacity-0' : ''
                  }`}
                  style={{ backgroundColor: '#1A1A1A' }}
                />
                <span
                  className={`block h-[2px] transition-all duration-300 ${
                    isMobileOpen ? '-rotate-45 -translate-y-[5px]' : ''
                  }`}
                  style={{ backgroundColor: '#1A1A1A' }}
                />
              </div>
            </button>
          </div>
        </nav>

        {/* Flame-accent onderrand — verschijnt bij scrollen */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300"
          style={{
            opacity: isScrolled ? 1 : 0,
            background:
              'linear-gradient(90deg, rgba(241,80,37,0) 0%, rgba(241,80,37,0.55) 22%, rgba(26,83,92,0.16) 55%, rgba(241,80,37,0) 100%)',
          }}
        />
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col"
            style={{ backgroundColor: '#F3F2ED' }}
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
                        style={{ color: isActive ? '#1A1A1A' : '#5A5A55' }}
                      >
                        {link.label}
                        {isActive && <span style={{ color: '#F15025' }}>.</span>}
                      </Link>
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
                  className="flex items-center justify-between text-[16px] font-semibold text-white px-6 h-[56px] rounded-[6px]"
                  style={{ backgroundColor: '#F15025', boxShadow: '0 6px 18px -2px rgba(241,80,37,0.38)' }}
                >
                  <span>Start gratis</span>
                  <span aria-hidden>→</span>
                </a>
                <a
                  href="https://app.doen.team/login"
                  onClick={() => setIsMobileOpen(false)}
                  className="text-center text-[15px] font-medium"
                  style={{ color: '#5A5A55' }}
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

function CockpitMegaMenu({
  open,
  pathname,
  onClose,
}: {
  open: boolean
  pathname: string
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50"
          role="region"
          aria-label="Cockpit modules"
        >
          <div
            className="w-[760px] max-w-[92vw] rounded-[14px] overflow-hidden"
            style={{
              backgroundColor: '#FBFAF6',
              border: '1px solid rgba(26,83,92,0.10)',
              boxShadow: '0 24px 60px -16px rgba(20,40,40,0.28), 0 4px 14px rgba(20,40,40,0.08)',
            }}
          >
            {/* Top accent strip */}
            <div aria-hidden className="h-[3px] w-full" style={{ backgroundColor: '#F15025' }} />

            {/* Header row */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b" style={{ borderColor: 'rgba(26,83,92,0.08)' }}>
              <div className="inline-flex items-center gap-2">
                <span className="relative inline-flex items-center justify-center w-2 h-2">
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#F15025', opacity: 0.4 }} />
                  <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
                </span>
                <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: '#6B6B66' }}>
                  10 modules · 1 cockpit
                </span>
              </div>
              <Link
                href="/features"
                onClick={onClose}
                className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: '#F15025' }}
              >
                Alles bekijken
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Modules grid */}
            <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: 'rgba(26,83,92,0.06)' }}>
              {modules.map((mod, i) => {
                const Icon = mod.icon
                const isActive = pathname === mod.href
                const nr = String(i + 1).padStart(2, '0')
                return (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    onClick={onClose}
                    className="group relative flex items-start gap-3 px-4 py-3.5 transition-colors"
                    style={{
                      backgroundColor: isActive ? 'rgba(241,80,37,0.05)' : '#FBFAF6',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(26,83,92,0.05)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor = isActive ? 'rgba(241,80,37,0.05)' : '#FBFAF6'
                    }}
                  >
                    {/* Icon tile */}
                    <div
                      className="shrink-0 w-10 h-10 rounded-[8px] flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.06]"
                      style={{
                        backgroundColor: 'rgba(26,83,92,0.05)',
                        border: '1px solid rgba(26,83,92,0.08)',
                      }}
                    >
                      <Icon width={20} height={20} style={{ color: mod.color }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[9px] font-bold tabular-nums tracking-[0.18em]" style={{ color: 'rgba(155,155,149,0.9)' }}>
                          {nr}
                        </span>
                        <span className="font-heading text-[14px] font-bold tracking-tight leading-none" style={{ color: '#1A535C' }}>
                          {mod.label}
                          <span style={{ color: '#F15025' }}>.</span>
                        </span>
                        {mod.comingSoon && (
                          <span
                            className="font-mono text-[8px] font-bold tracking-[0.16em] uppercase px-1.5 py-0.5 rounded-[3px]"
                            style={{ backgroundColor: '#1A1A1A', color: 'white' }}
                          >
                            Binnenkort
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] leading-[1.35]" style={{ color: '#6B6B66' }}>
                        {mod.sub}
                      </p>
                    </div>

                    {/* Arrow */}
                    <span
                      aria-hidden
                      className="shrink-0 self-center opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                      style={{ color: '#F15025' }}
                    >
                      →
                    </span>
                  </Link>
                )
              })}
            </div>

            {/* Footer — CTA strip */}
            <div
              className="px-5 py-3.5 flex items-center justify-between gap-4"
              style={{ backgroundColor: '#F3F2ED', borderTop: '1px solid rgba(26,83,92,0.08)' }}
            >
              <p className="text-[12px]" style={{ color: '#5A5A55' }}>
                Alles inbegrepen.{' '}
                <span
                  style={{
                    fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                    fontStyle: 'italic',
                    color: '#1A535C',
                  }}
                >
                  Eén prijs.
                </span>
              </p>
              <a
                href="https://app.doen.team/register"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.18em] uppercase text-white px-3.5 h-9 rounded-[6px] transition-transform hover:scale-[1.03]"
                style={{ backgroundColor: '#F15025', boxShadow: '0 4px 12px rgba(241,80,37,0.28)' }}
              >
                Probeer gratis
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
