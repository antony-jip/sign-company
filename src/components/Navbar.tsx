'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Toast, { useEasterEgg } from './Toast'
import { modulesPerGroep } from '@/data/modules'
import { verticals } from '@/data/verticals'
import { RONDLEIDING_HREF, RONDLEIDING_LABEL } from '@/data/cta'

/* Zes items, net als eerst, maar met een andere verdeling.

   Wat veranderde na de kit.com-analyse (docs/verbeterplan-home-kit.md):
   - "Voor wie" stond alleen in de footer terwijl er vier landingspagina's
     liggen met echte zoekintentie. Nu een eigen menu.
   - "Kennisbank" idem: twintig artikelen zonder crawlpad vanuit de nav.
   - Het productmenu was één lijst van elf. Nu gegroepeerd op de vier
     werkwoorden waarin een signklus loopt, plus Daan.
   - Demo en Contact zijn uit de balk: Demo hangt onderaan het productmenu,
     Contact bereik je via "Plan een rondleiding" en de footer.
   - Rechts staat nu een tweede spoor naast de proef. */

type NavLink = {
  href: string
  label: string
  menu?: 'product' | 'voorwie'
}

const navLinks: NavLink[] = [
  { href: '/features', label: 'Product', menu: 'product' },
  { href: '/voor/signmakers', label: 'Voor wie', menu: 'voorwie' },
  { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
  { href: '/prijzen', label: 'Prijzen' },
  { href: '/kennisbank', label: 'Kennisbank' },
  { href: '/over', label: 'Verhaal' },
]

function isLinkActief(link: NavLink, pathname: string) {
  if (pathname === link.href) return true
  if (link.menu === 'product') return pathname.startsWith('/features')
  if (link.menu === 'voorwie') return pathname.startsWith('/voor/')
  if (link.href === '/kennisbank') return pathname.startsWith('/kennisbank')
  return false
}

/* theme="dark" voor pagina's met een petrol-hero (witte navbar-tekst bovenaan);
   zodra er gescrold is, krijgt de navbar altijd een lichte achtergrond. */
export default function Navbar({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<'product' | 'voorwie' | null>(null)
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
    setOpenMenu(null)
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
          <div className="container-site flex items-center justify-between gap-6">

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

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const isActive = isLinkActief(link, pathname)
                const heeftMenu = Boolean(link.menu)
                const isOpen = heeftMenu && openMenu === link.menu

                const linkEl = (
                  <Link
                    href={link.href}
                    className="relative px-3 py-2 text-[14px] font-medium transition-colors duration-200 hover:opacity-100 inline-flex items-center gap-1.5 whitespace-nowrap"
                    style={{
                      color: isActive ? activeColor : linkColor,
                      fontWeight: isActive ? 600 : 500,
                    }}
                    aria-expanded={heeftMenu ? isOpen : undefined}
                  >
                    {link.label}
                    {heeftMenu && (
                      <span
                        aria-hidden
                        className="transition-transform duration-200"
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'none',
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
                        className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full"
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
                    onMouseEnter={() => setOpenMenu(link.menu!)}
                    onMouseLeave={() => setOpenMenu(null)}
                    onFocus={() => setOpenMenu(link.menu!)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenMenu(null)
                    }}
                  >
                    {linkEl}
                    {isOpen && link.menu === 'product' && (
                      <ProductMenu pathname={pathname} sluit={() => setOpenMenu(null)} />
                    )}
                    {isOpen && link.menu === 'voorwie' && (
                      <VoorWieMenu pathname={pathname} sluit={() => setOpenMenu(null)} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right cluster. Twee snelheden: wie zelf wil proberen klikt
                "Start gratis", wie liever meekijkt plant een rondleiding. */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <a
                href="https://app.doen.team/login"
                className="hidden lg:inline-flex text-[14px] font-medium px-3 py-2 transition-opacity hover:opacity-60"
                style={{ color: linkColor }}
              >
                Inloggen
              </a>
              <Link
                href={RONDLEIDING_HREF}
                className="text-[14px] font-semibold px-3 py-2 transition-opacity hover:opacity-70 whitespace-nowrap"
                style={{ color: onDark ? '#FFFFFF' : '#1A535C' }}
              >
                {RONDLEIDING_LABEL}
              </Link>
              <a
                href="https://app.doen.team/register"
                className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-white px-5 h-[42px] rounded-[6px] bg-flame transition-transform duration-300 hover:scale-[1.03] active:scale-[0.97] whitespace-nowrap"
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
            className="fixed inset-0 z-40 flex flex-col bg-bg overflow-y-auto"
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
                        className="block py-3 font-heading text-[32px] font-bold tracking-tight leading-none"
                        style={{ color: isActive ? '#16262B' : '#54666A' }}
                      >
                        {link.label}
                        {isActive && <span style={{ color: '#F15025' }}>.</span>}
                      </Link>

                      {/* De modules per groep direct onder Product, anders is dit
                          op mobiel een doodlopende link naar een overzicht. */}
                      {link.menu === 'product' && (
                        <div className="mb-3 pl-0.5">
                          {modulesPerGroep.map((groep) => (
                            <div key={groep.groep} className="mt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-petrol/50 mb-0.5">
                                {groep.groep}
                              </p>
                              <ul className="grid grid-cols-2 gap-x-4">
                                {groep.items.map((mod) => (
                                  <li key={mod.href}>
                                    <Link
                                      href={mod.href}
                                      onClick={() => setIsMobileOpen(false)}
                                      className="block py-1 text-[15px] font-medium"
                                      style={{ color: pathname === mod.href ? '#1A535C' : '#54666A' }}
                                    >
                                      {mod.label}
                                      <span style={{ color: '#F15025' }}>.</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          <Link
                            href="/demo"
                            onClick={() => setIsMobileOpen(false)}
                            className="block mt-3 text-[15px] font-semibold text-petrol"
                          >
                            Bekijk de demo →
                          </Link>
                        </div>
                      )}

                      {link.menu === 'voorwie' && (
                        <ul className="grid grid-cols-2 gap-x-4 mb-3 pl-0.5">
                          {verticals.map((v) => (
                            <li key={v.slug}>
                              <Link
                                href={`/voor/${v.slug}`}
                                onClick={() => setIsMobileOpen(false)}
                                className="block py-1 text-[15px] font-medium"
                                style={{ color: pathname === `/voor/${v.slug}` ? '#1A535C' : '#54666A' }}
                              >
                                {v.naam}
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
                className="flex flex-col gap-4 mt-10"
              >
                <a
                  href="https://app.doen.team/register"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center justify-between text-[16px] font-semibold text-white px-6 h-[56px] rounded-[6px] bg-flame"
                >
                  <span>Start gratis</span>
                  <span aria-hidden>→</span>
                </a>
                <Link
                  href={RONDLEIDING_HREF}
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center justify-between text-[16px] font-semibold text-petrol px-6 h-[56px] rounded-[6px] border border-petrol/20"
                >
                  <span>{RONDLEIDING_LABEL}</span>
                  <span aria-hidden className="text-flame">→</span>
                </Link>
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

/* Productmenu: de elf modules gegroepeerd op de vier werkwoorden plus Daan,
   zodat je in het menu al ziet hoe een klus loopt in plaats van een
   alfabetische inventaris. */
function ProductMenu({ pathname, sluit }: { pathname: string; sluit: () => void }) {
  return (
    <div className="absolute left-0 top-full pt-3 w-[660px]" role="group" aria-label="Modules">
      <div
        className="rounded-[10px] border border-petrol/10 bg-white p-4"
        style={{ boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 18px 44px -20px rgba(19,62,69,0.35)' }}
      >
        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
          {modulesPerGroep.map((groep) => (
            <div key={groep.groep}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-petrol/50 px-2 mb-1">
                {groep.groep}
              </p>
              <ul>
                {groep.items.map((mod) => {
                  const modActief = pathname === mod.href
                  return (
                    <li key={mod.href}>
                      <Link
                        href={mod.href}
                        onClick={sluit}
                        className={`group flex flex-col gap-0.5 rounded-[7px] px-2 py-1.5 transition-colors duration-150 ${
                          modActief ? 'bg-petrol/[0.07]' : 'hover:bg-petrol/[0.05]'
                        }`}
                      >
                        <span className="text-[13.5px] font-semibold text-ink group-hover:text-petrol transition-colors">
                          {mod.label}
                          <span className="text-flame">.</span>
                        </span>
                        <span className="text-[11.5px] leading-tight text-muted">{mod.sub}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-petrol/10 flex items-center gap-2">
          <Link
            href="/features"
            onClick={sluit}
            className="flex-1 flex items-center justify-between rounded-[7px] px-2 py-2 text-[13px] font-semibold text-petrol hover:bg-petrol/[0.05] transition-colors"
          >
            Alle modules op een rij
            <span aria-hidden className="text-flame">→</span>
          </Link>
          <Link
            href="/demo"
            onClick={sluit}
            className="flex-1 flex items-center justify-between rounded-[7px] px-2 py-2 text-[13px] font-semibold text-petrol hover:bg-petrol/[0.05] transition-colors"
          >
            Bekijk de demo
            <span aria-hidden className="text-flame">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

/* Voor wie: de vier verticals stonden alleen in de footer. */
function VoorWieMenu({ pathname, sluit }: { pathname: string; sluit: () => void }) {
  return (
    <div className="absolute left-0 top-full pt-3 w-[300px]" role="group" aria-label="Voor wie">
      <div
        className="rounded-[10px] border border-petrol/10 bg-white p-2.5"
        style={{ boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 18px 44px -20px rgba(19,62,69,0.35)' }}
      >
        <ul>
          {verticals.map((v) => {
            const href = `/voor/${v.slug}`
            const actief = pathname === href
            return (
              <li key={v.slug}>
                <Link
                  href={href}
                  onClick={sluit}
                  className={`group flex flex-col gap-0.5 rounded-[7px] px-3 py-2 transition-colors duration-150 ${
                    actief ? 'bg-petrol/[0.07]' : 'hover:bg-petrol/[0.05]'
                  }`}
                >
                  <span className="text-[13.5px] font-semibold text-ink group-hover:text-petrol transition-colors">
                    {v.naam}
                  </span>
                  <span className="text-[11.5px] leading-tight text-muted">{v.h1Accent}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
