'use client'

import Image from 'next/image'
import { useState } from 'react'

/** Hoofdbeeld + sfeerfoto's; klik op een thumbnail om het grote beeld te wisselen. */
export default function ProductGallery({ titel, images }: { titel: string; images: string[] }) {
  const [active, setActive] = useState(0)

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] overflow-hidden border border-ink/40 bg-black/5">
        <Image
          src={images[active]}
          alt={active === 0 ? titel : `${titel} — sfeerfoto ${active}`}
          fill
          priority
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={i === 0 ? 'Hoofdbeeld' : `Sfeerfoto ${i}`}
              className={`relative aspect-square overflow-hidden border-2 bg-black/5 transition ${
                i === active ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width:768px) 20vw, 10vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-ink/50">
        Voorbeeld in frame. De werkelijke kleurweergave is afhankelijk van je stofkeuze.
      </p>
    </div>
  )
}
