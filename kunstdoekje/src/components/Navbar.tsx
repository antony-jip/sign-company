'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/lib/cart'

const links = [
  { href: '/shop', label: 'Shop' },
  { href: '/eigen-foto', label: 'Eigen foto' },
  { href: '/zakelijk', label: 'Zakelijk' },
  { href: '/maatwerk', label: 'Maatwerk' },
  { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
]

export default function Navbar() {
  const { count } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-canvas/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Kunstdoekje<span className="text-accent">.</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-ink/70 transition hover:text-ink">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative text-sm text-ink/80 hover:text-ink">
            Winkelwagen
            {count > 0 && (
              <span className="absolute -right-4 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <span className="block h-0.5 w-6 bg-ink" />
            <span className="mt-1.5 block h-0.5 w-6 bg-ink" />
            <span className="mt-1.5 block h-0.5 w-6 bg-ink" />
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-black/5 px-6 py-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-ink/80"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
