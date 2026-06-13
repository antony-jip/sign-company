import Link from 'next/link'
import Image from 'next/image'
import { formatEuro } from '@/lib/pricing'
import type { Artwork } from '@/lib/types'

/**
 * Productkaart als ingelijst doek: passe-partout-rand + catalogusnummer (SKU).
 * Hover onthult de sfeerfoto (doek in interieur); zonder sfeerfoto zoomt het doek.
 */
export default function ProductCard({
  artwork,
  vanafCents,
}: {
  artwork: Artwork
  vanafCents?: number
}) {
  const sfeer = artwork.gallery_urls?.[0]

  return (
    <Link href={`/product/${artwork.slug}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-[4px] bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-hard-sm">
        <Image
          src={artwork.thumb_url || artwork.image_url}
          alt={artwork.titel}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className={`transition duration-500 ${artwork.is_liggend ? 'object-contain' : 'object-cover'} ${
            sfeer ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'
          }`}
        />
        {sfeer && (
          <Image
            src={sfeer}
            alt={`${artwork.titel} · in interieur`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        )}
        {artwork.is_featured && (
          <span className="absolute left-0 top-3 z-10 bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-canvas">
            Populair
          </span>
        )}
        {artwork.is_liggend && (
          <span
            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-[3px] bg-ink/70 text-canvas backdrop-blur"
            title="Liggend formaat"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="7" width="18" height="10" rx="1" />
            </svg>
          </span>
        )}
      </div>
      {/* Galerijlabel onder het doek */}
      <div className="mt-3 flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        <span>{artwork.woo_sku ? `Nº ${artwork.woo_sku}` : '·'}</span>
        {typeof vanafCents === 'number' && <span>v.a. {formatEuro(vanafCents)}</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="truncate font-semibold leading-tight">{artwork.titel}</p>
        <span className="shrink-0 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          →
        </span>
      </div>
    </Link>
  )
}
