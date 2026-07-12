'use client'

import { useEffect, useRef } from 'react'
import AppShowcase from '@/components/home/AppShowcase'

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
    <section className="pt-14 md:pt-28">
      <div className="container-site">
        <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 max-w-5xl">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
          >
            Dit is doen<span className="text-flame">.</span>{' '}
            <span className="hidden md:inline">Klik maar door.</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
            <span className="md:hidden">Geen mockup, de echte app. Op desktop klik je er zelf doorheen.</span>
            <span className="hidden md:inline">Negen schermen, geen video en geen mockup. Zo ziet je werkdag eruit.</span>
          </p>
        </div>

        {/* Mobiel: video-loop van de project-cockpit */}
        <div className="md:hidden mt-6 pb-14">
          <div className="rounded-[10px] overflow-hidden border border-petrol/10 shadow-[0_1px_2px_rgba(20,40,40,0.04),0_20px_48px_-28px_rgba(13,52,60,0.35)]">
            <video
              ref={videoRef}
              src="/videos/module-projecten.mp4"
              poster="/videos/module-projecten.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-auto block"
              aria-label="De project-cockpit van doen. in actie"
            />
          </div>
        </div>
      </div>

      {/* Desktop: de klikbare app */}
      <div className="hidden md:block">
        <AppShowcase />
      </div>
    </section>
  )
}
