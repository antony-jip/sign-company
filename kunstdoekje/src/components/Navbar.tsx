'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/lib/cart'
import ThemeToggle from './ThemeToggle'

const shopLinks = [
  { href: '/shop', label: 'Alle kunstdoeken', desc: 'Ruim 1000 genummerde werken' },
  { href: '/frame', label: 'Los frame', desc: 'Alleen de aluminium wissellijst' },
]

const navLinks = [
  { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
  { href: '/contact', label: 'Contact' },
]

/** Masthead: microclaims-balk + woordmerk + kapitaal-navigatie. Verbergt bij omlaag scrollen. */
export default function Navbar() {
  const { count } = useCart()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        setScrolled(y > 50)
        if (Math.abs(y - lastY.current) > 5) {
          setHidden(y > lastY.current && y > 80)
          lastY.current = y
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItem = (actief: boolean) =>
    `group/link relative px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] transition ${
      actief ? 'text-ink' : 'text-ink/60 hover:text-ink'
    }`

  const underline = (actief: boolean) => (
    <span
      className={`absolute -bottom-0.5 left-4 right-4 h-0.5 origin-left bg-accent transition-transform duration-300 ${
        actief ? 'scale-x-100' : 'scale-x-0 group-hover/link:scale-x-100'
      }`}
    />
  )

  return (
    <header
      className={`sticky top-0 z-40 border-b border-ink/20 bg-canvas/95 backdrop-blur transition-transform duration-300 ${
        hidden && !open ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Microclaims */}
      <div className={`overflow-hidden border-b border-ink/15 transition-all duration-300 ${scrolled ? 'max-h-0 border-b-0' : 'max-h-10'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink/50">
          <span>Gratis verzending NL &amp; BE</span>
          <span className="max-md:hidden">Geprint in Nederland</span>
          <span>30 dagen bedenktijd</span>
        </div>
      </div>

      <nav aria-label="Hoofdnavigatie" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" aria-label="Kunstdoekje · naar homepage" className="transition hover:opacity-80">
          <Image src="/home/logo.png" alt="Kunstdoekje" width={166} height={30} priority className="h-7 w-auto" />
        </Link>

        {/* Desktop menu */}
        <div className="hidden items-center lg:flex">
          {/* Shop met dropdown */}
          <div className="group relative">
            <Link href="/shop" aria-haspopup="true" className={`${navItem(pathname.startsWith('/shop'))} flex items-center gap-1.5`}>
              Shop
              <span className="text-accent transition-transform duration-200 group-hover:rotate-45">+</span>
              {underline(pathname.startsWith('/shop'))}
            </Link>
            <div className="invisible absolute left-0 top-full z-50 w-80 translate-y-2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="rounded-[3px] border border-ink/20 bg-canvas shadow-hard">
                {shopLinks.map((l, i) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-baseline justify-between gap-3 px-5 py-4 transition hover:bg-accent/10 ${i > 0 ? 'border-t border-ink/15' : ''}`}
                  >
                    <span>
                      <span className="block text-sm font-bold">{l.label}</span>
                      <span className="mt-0.5 block text-xs text-muted">{l.desc}</span>
                    </span>
                    <span className="text-accent">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={navItem(pathname === l.href)}>
              {l.label}
              {underline(pathname === l.href)}
            </Link>
          ))}
        </div>

        {/* Rechts: thema + tas + CTA */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/cart"
            className="text-[12px] font-bold uppercase tracking-[0.18em] transition hover:text-accent-dark"
          >
            Tas ({count})
          </Link>
          <Link href="/shop" className="btn-primary !px-5 !py-2.5 !text-[11px] max-md:hidden">
            Collectie
          </Link>

          {/* Hamburger */}
          <button className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            <span className={`block h-0.5 w-6 bg-ink transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`mt-1.5 block h-0.5 w-6 bg-ink transition ${open ? 'opacity-0' : ''}`} />
            <span className={`mt-1.5 block h-0.5 w-6 bg-ink transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobiel menu */}
      {open && (
        <div className="border-t border-ink/15 px-6 py-4 lg:hidden">
          {[{ href: '/', label: 'Home' }, ...shopLinks, ...navLinks].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block border-b border-ink/10 py-3 text-[13px] font-bold uppercase tracking-[0.18em] ${
                pathname === l.href ? 'text-accent-dark' : 'text-ink/70'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
