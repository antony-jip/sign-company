'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

const SLIDES = [
  { src: '/home/fluweel-1.webp', titel: 'Fluwelen Luxe', tekst: 'Premium fluweel voor een ultieme tactiele ervaring' },
  { src: '/home/fluweel-2.webp', titel: 'Voelbare Kunst', tekst: 'Elke textuur komt tot leven op zacht fluweel' },
  { src: '/home/fluweel-3.webp', titel: 'Premium Kwaliteit', tekst: 'Hoogwaardige materialen voor langdurig plezier' },
  { src: '/home/fluweel-4.webp', titel: 'Rijke Kleuren', tekst: 'Diepere tinten door de fluwelen structuur' },
  { src: '/home/fluweel-5.webp', titel: 'Exclusief Design', tekst: 'Unieke kunstwerken in luxe uitvoering' },
  { src: '/home/fluweel-6.webp', titel: 'Handgemaakte Elegantie', tekst: 'Met zorg vervaardigd voor perfecte afwerking' },
]

const INTERVAL_MS = 5000

/** Fluweel-carousel: autoplay, pijlen, dots, swipe en pauze bij hover. */
export default function VelvetCarousel() {
  const [actief, setActief] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const touchStart = useRef(0)
  const touchEnd = useRef(0)

  const ga = useCallback((i: number) => setActief((i + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    if (!autoplay) return
    const t = setInterval(() => setActief((a) => (a + 1) % SLIDES.length), INTERVAL_MS)
    return () => clearInterval(t)
  }, [autoplay])

  function onTouchEnd() {
    const diff = touchStart.current - touchEnd.current
    if (Math.abs(diff) > 50) ga(actief + (diff > 0 ? 1 : -1))
  }

  return (
    <section className="overflow-hidden py-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-ink/25 pb-6">
          <div>
            <p className="label-caps reg-mark pl-4 text-ink/50">Premium fluweel</p>
            <h2 className="mt-3 font-serif text-4xl md:text-6xl">
              Voelbare <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">kunst</em>
            </h2>
          </div>
          <p className="max-w-sm pb-1 text-sm leading-relaxed text-ink/60">
            Fluweel absorbeert licht en geeft diepere tinten. Elk detail voelbaar, elk moment
            tastbaar.
          </p>
        </div>

        {/* Carousel */}
        <div
          className="group relative overflow-hidden rounded-[3px] border border-ink/25 bg-paper shadow-hard"
          onMouseEnter={() => setAutoplay(false)}
          onMouseLeave={() => setAutoplay(true)}
        >
          <div
            className="flex transition-transform duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]"
            style={{ transform: `translateX(-${actief * 100}%)` }}
            onTouchStart={(e) => { touchStart.current = e.touches[0].clientX }}
            onTouchMove={(e) => { touchEnd.current = e.touches[0].clientX }}
            onTouchEnd={onTouchEnd}
          >
            {SLIDES.map((s, i) => (
              <div key={s.src} className="relative min-w-full">
                <Image
                  src={s.src}
                  alt={s.titel}
                  width={1400}
                  height={700}
                  priority={i === 0}
                  className="h-[450px] w-full object-cover object-[center_30%] md:h-[600px] lg:h-[700px]"
                />
                {/* Overlay */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-start bg-gradient-to-t from-black/85 via-black/40 to-transparent px-8 pb-9 pt-20 text-white md:px-12">
                  <p className="label-caps text-accent">{String(i + 1).padStart(2, '0')} / 06</p>
                  <h3 className="mt-2 font-serif text-2xl md:text-4xl">{s.titel}</h3>
                  <p className="mt-2 max-w-lg text-sm text-white/80 md:text-base">{s.tekst}</p>
                  <Link href="/shop" className="btn-invert mt-6 !py-3">
                    Bekijk collectie →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pijlen */}
          <button
            type="button"
            aria-label="Vorige slide"
            onClick={() => ga(actief - 1)}
            className="absolute left-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-l-0 border-ink/30 bg-canvas text-xl transition hover:bg-accent md:h-14 md:w-14"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Volgende slide"
            onClick={() => ga(actief + 1)}
            className="absolute right-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-r-0 border-ink/30 bg-canvas text-xl transition hover:bg-accent md:h-14 md:w-14"
          >
            →
          </button>
        </div>

        {/* Voortgangsstrepen */}
        <div className="mt-6 flex gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Ga naar slide ${i + 1}`}
              onClick={() => ga(i)}
              className={`h-1 flex-1 transition-colors duration-300 ${
                i === actief ? 'bg-accent' : 'bg-ink/15 hover:bg-ink/40'
              }`}
            />
          ))}
        </div>

        {/* Infobanner */}
        <div className="mt-10 flex flex-col items-baseline justify-between gap-2 border-t border-ink/25 pt-5 md:flex-row">
          <p className="label-caps text-ink/50">Fluweel of decostof?</p>
          <p className="max-w-xl text-sm text-ink/70">
            Je kiest tijdens het samenstellen · zelfde kunst, zelfde frame, andere beleving.
          </p>
        </div>
      </div>
    </section>
  )
}
