'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { recentBekeken, voorkeursprofiel, type BekekenItem } from '@/lib/kijkgedrag'
import { formatEuro } from '@/lib/pricing'
import type { Artwork } from '@/lib/types'

/**
 * "Voor jou": aanbevelingen op basis van lokaal kijkgedrag + "verder kijken"
 * met recent bekeken doeken. Verschijnt pas zodra er iets te personaliseren valt.
 */
export default function VoorJou({ huidigeId }: { huidigeId?: string }) {
  const [aanbevolen, setAanbevolen] = useState<Artwork[]>([])
  const [vanafCents, setVanafCents] = useState(0)
  const [recent, setRecent] = useState<BekekenItem[]>([])

  useEffect(() => {
    const profiel = voorkeursprofiel()
    setRecent(recentBekeken(8).filter((b) => b.id !== huidigeId))
    if (!profiel.cats.length && !profiel.tags.length) return

    const q = new URLSearchParams({
      cats: profiel.cats.join(','),
      tags: profiel.tags.join(','),
      exclude: [...profiel.bekekenIds, huidigeId].filter(Boolean).join(','),
      limit: '8',
    })
    fetch(`/api/aanbevolen?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.artworks) {
          setAanbevolen(d.artworks)
          setVanafCents(d.vanafCents ?? 0)
        }
      })
      .catch(() => {})
  }, [huidigeId])

  if (!aanbevolen.length && recent.length < 2) return null

  return (
    <div className="space-y-14">
      {aanbevolen.length > 0 && (
        <section>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent">
                Op basis van jouw kijkgedrag
              </p>
              <h2 className="mt-1 font-serif text-3xl">Voor jou</h2>
            </div>
            <Link href="/shop" className="text-sm text-accent hover:underline">Alles bekijken →</Link>
          </div>
          <div className="scrollbar-none -mx-6 mt-6 flex snap-x gap-4 overflow-x-auto px-6 pb-2">
            {aanbevolen.map((a) => (
              <Link
                key={a.id}
                href={`/product/${a.slug}`}
                className="group w-44 shrink-0 snap-start md:w-56"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-black/5">
                  <Image
                    src={a.thumb_url || a.image_url}
                    alt={a.titel}
                    fill
                    sizes="224px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2.5 truncate text-sm font-semibold">{a.titel}</p>
                {vanafCents > 0 && (
                  <p className="text-[13px] text-muted">vanaf {formatEuro(vanafCents)}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {recent.length >= 2 && (
        <section>
          <h2 className="font-serif text-2xl">Verder kijken waar je bleef</h2>
          <div className="scrollbar-none -mx-6 mt-5 flex snap-x gap-4 overflow-x-auto px-6 pb-2">
            {recent.map((b) => (
              <Link
                key={b.id}
                href={`/product/${b.slug}`}
                className="group w-36 shrink-0 snap-start md:w-44"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-black/5">
                  <Image
                    src={b.image}
                    alt={b.titel}
                    fill
                    sizes="176px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 truncate text-[13px] text-ink/70">{b.titel}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
