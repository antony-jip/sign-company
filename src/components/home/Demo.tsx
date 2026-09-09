'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import AppShowcase from '@/components/home/AppShowcase'
import TelefoonMetDoen from '@/components/home/TelefoonMetDoen'

/* De demo is de pitch. Desktop: de klikbare app. Mobiel: een video-loop,
   want de geschaalde desktop-app is op een telefoon niet prettig klikbaar. */
export default function Demo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.removeAttribute('autoplay')
      el.pause()
      el.controls = true
    }
  }, [])

  return (
    <section className="tegel tegel-tint pb-0 md:pb-0">
      <div className="container-site">
        <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-4">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
          >
            Dit is doen<span className="text-flame">.</span>{' '}
            <span className="hidden md:inline">Klik maar door.</span>
          </h2>
          <div className="max-w-xs">
            <p className="tekst-body text-muted">
              <span className="md:hidden">Geen mockup, de echte app. Op desktop klik je er zelf doorheen.</span>
              <span className="hidden md:inline">Geen mockup, de echte app. Zo ziet je dag eruit als alles gewoon klopt.</span>
            </p>
            {/* Bewust geen pil: dit is een zijpad naast de subkop, geen
                keuze naast de hoofdactie. Alleen wat een echte actie is
                krijgt de pilvorm, anders raakt die vorm zijn betekenis
                kwijt. */}
            <Link
              href="/demo"
              className="group mt-3 inline-flex items-center gap-2 text-[15px] font-semibold text-petrol"
            >
              <span className="relative">
                Liever kijken? Bekijk de demo
                <span className="absolute left-0 -bottom-1 h-px w-full origin-left bg-petrol/30 transition-transform duration-300 group-hover:scale-x-0" />
              </span>
              <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

        {/* Mobiel: video-loop van de project-cockpit */}
        <div className="md:hidden mt-8">
          <div className="productbeeld rounded-card overflow-hidden">
            <video
              ref={videoRef}
              src="/videos/module-projecten.mp4"
              poster="/videos/module-projecten.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              width={1920}
              height={1080}
              className="w-full h-auto block aspect-video"
              aria-label="De project-cockpit van doen. in actie"
            />
          </div>
        </div>
      </div>

      {/* Desktop: de klikbare app */}
      <div className="hidden md:block">
        <AppShowcase />
      </div>

      {/* En hetzelfde systeem in de bus. Stond eerder in DitZitErin naast een
          lijst modules; hij hoort hier, want dit is het blok dat laat zien
          hoe de app werkt. */}
      <div className="container-site hidden md:block">
        <div className="mt-16 flex items-center gap-12 border-t border-petrol/10 pt-14 lg:gap-20">
          <div className="shrink-0">
            <TelefoonMetDoen />
          </div>
          <div className="max-w-md">
            <h3
              className="font-heading font-bold text-petrol leading-[1.04]"
              style={{ fontSize: 'clamp(24px, 2.6vw, 34px)', letterSpacing: '-0.03em' }}
            >
              En net zo goed vanuit de bus<span className="text-flame">.</span>
            </h3>
            <p className="mt-4 tekst-body text-muted">
              Dezelfde offerte, dezelfde werkbon, dezelfde planning. Tik de
              menubalk op de telefoon hiernaast aan, dan loop je er zelf
              doorheen.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
