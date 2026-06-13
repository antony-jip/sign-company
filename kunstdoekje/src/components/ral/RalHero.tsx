'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { RAL_HERO_IMAGES } from '@/lib/ral'

/** Auto-roterende hero-slider met fade-overgang en navigatiestippen. */
export default function RalHero() {
  const [actief, setActief] = useState(0)
  const totaal = RAL_HERO_IMAGES.length

  useEffect(() => {
    const id = window.setInterval(() => setActief((i) => (i + 1) % totaal), 5000)
    return () => window.clearInterval(id)
  }, [totaal])

  return (
    <section className="relative h-[80vh] min-h-[520px] w-full overflow-hidden bg-ink">
      {RAL_HERO_IMAGES.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === actief ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={src}
            alt="Maatwerk frame in RAL-kleur"
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover object-left"
          />
        </div>
      ))}

      {/* Donkere gradient voor leesbaarheid */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/45 to-transparent" />

      {/* Inhoud */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6">
        <div className="max-w-xl">
          <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
            Exclusief maatwerk
          </span>
          <h1 className="mt-6 font-serif text-[clamp(38px,6vw,72px)] leading-[0.96] tracking-tight text-canvas">
            Jouw frame,
            <br />
            jouw <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">kleur</em>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-canvas/85">
            Laat je aluminium frame professioneel spuiten in élke gewenste RAL-kleur. Complete
            harmonie met jouw interieur, tot in het kleinste detail.
          </p>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-canvas/80">
            <span className="font-semibold">100+ RAL-kleuren</span>
            <span className="font-semibold">Professioneel gespoten</span>
            <span className="font-semibold">±6 weken levertijd</span>
          </div>

          <a href="#kies-kleur" className="btn-primary mt-9 !border-accent !bg-accent !text-ink hover:!bg-accent-hover">
            Ontdek jouw kleur ↓
          </a>
        </div>
      </div>

      {/* Navigatiestippen */}
      <div className="absolute bottom-8 right-8 z-10 flex gap-2.5">
        {RAL_HERO_IMAGES.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Beeld ${i + 1}`}
            onClick={() => setActief(i)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              i === actief ? 'scale-125 bg-accent' : 'bg-canvas/40 hover:bg-canvas/70'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
