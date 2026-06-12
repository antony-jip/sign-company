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
      <div className="rounded-[3px] border border-ink/15 bg-paper p-2.5 transition-all duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:border-ink/40 group-hover:shadow-hard-sm sm:p-3">
        <div className="relative aspect-[4/5] overflow-hidden bg-black/5">
          <Image
            src={artwork.thumb_url || artwork.image_url}
            alt={artwork.titel}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={`scale-[1.12] object-cover transition duration-500 ${
              sfeer ? 'group-hover:opacity-0' : 'group-hover:scale-[1.18]'
            }`}
          />
          {sfeer && (
            <Image
              src={sfeer}
              alt={`${artwork.titel} — in interieur`}
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
        </div>
        {/* Galerijlabel onder het doek */}
        <div className="flex items-baseline justify-between pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          <span>{artwork.woo_sku ? `Nº ${artwork.woo_sku}` : '—'}</span>
          {typeof vanafCents === 'number' && <span>v.a. {formatEuro(vanafCents)}</span>}
        </div>
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
