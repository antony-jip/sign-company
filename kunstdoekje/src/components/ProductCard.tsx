import Link from 'next/link'
import Image from 'next/image'
import { formatEuro } from '@/lib/pricing'
import type { Artwork } from '@/lib/types'

export default function ProductCard({
  artwork,
  vanafCents,
}: {
  artwork: Artwork
  vanafCents?: number
}) {
  return (
    <Link href={`/product/${artwork.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-black/5">
        <Image
          src={artwork.thumb_url || artwork.image_url}
          alt={artwork.titel}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        {artwork.is_featured && (
          <span className="absolute left-3 top-3 rounded-full bg-canvas/90 px-2.5 py-1 text-xs font-medium">
            Populair
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="font-medium leading-tight">{artwork.titel}</p>
        {typeof vanafCents === 'number' && (
          <p className="mt-0.5 text-sm text-ink/60">vanaf {formatEuro(vanafCents)}</p>
        )}
      </div>
    </Link>
  )
}
