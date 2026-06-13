'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  { href: '/admin/orders', label: 'Bestellingen' },
  { href: '/admin/aanvragen', label: 'Aanvragen' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <header className="border-b border-ink/15 bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/admin/orders" className="font-serif text-xl">
            Kunstdoekje · <span className="text-accent-dark">Beheer</span>
          </Link>
          <nav className="flex gap-1">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.href)
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`rounded-[3px] px-3 py-1.5 text-sm font-semibold transition ${
                    active ? 'bg-ink text-canvas' : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <button onClick={logout} className="text-sm font-semibold text-ink/60 transition hover:text-ink">
          Uitloggen
        </button>
      </div>
    </header>
  )
}
