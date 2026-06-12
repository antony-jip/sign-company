'use client'

import { useEffect } from 'react'
import { registreerBekeken } from '@/lib/kijkgedrag'
import type { Artwork } from '@/lib/types'

/** Registreert een productweergave in het lokale kijkgedrag (voor "Voor jou"). */
export default function TrackView({ artwork }: { artwork: Artwork }) {
  useEffect(() => {
    registreerBekeken({
      id: artwork.id,
      slug: artwork.slug,
      titel: artwork.titel,
      image: artwork.thumb_url || artwork.image_url,
      categoryId: artwork.category_id,
      tags: artwork.tags ?? [],
    })
  }, [artwork])

  return null
}
