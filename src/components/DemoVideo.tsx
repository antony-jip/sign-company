'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'

/* De demofilm-speler: 16:9, gedeeld door de homepage en /demo.
   Standaard click-to-play; met autoStart speelt hij direct gedempt af
   (de video is muted-first gemaakt: captions dragen het verhaal) en
   verschijnt na afloop de Start-gratis-knop ín het beeld. */
export default function DemoVideo({
  autoStart = false,
  ctaHref = 'https://app.doen.team/register',
  ctaLabel = 'Start gratis · 30 dagen',
}: {
  autoStart?: boolean
  ctaHref?: string
  /** Hoort bij ctaHref: op /demo-plannen wijst de knop naar het formulier, niet naar registreren. */
  ctaLabel?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(autoStart)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    if (!autoStart) return
    const el = videoRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.removeAttribute('autoplay')
      el.pause()
    }
  }, [autoStart])

  const start = () => {
    setPlaying(true)
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => {
        /* Afspelen geweigerd: controls staan nu aan, de bezoeker klikt zelf. */
      })
    })
  }

  const geluidAan = () => {
    const el = videoRef.current
    if (!el) return
    el.muted = false
    setMuted(false)
    if (el.paused) el.play().catch(() => {})
  }

  const opnieuw = () => {
    const el = videoRef.current
    if (!el) return
    setEnded(false)
    el.currentTime = 0
    el.play().catch(() => {})
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src="/videos/doen-demo.mp4"
        poster="/videos/doen-demo-poster.jpg"
        autoPlay={autoStart}
        muted={muted}
        controls={autoStart || playing}
        preload={autoStart ? 'auto' : 'none'}
        playsInline
        width={1920}
        height={1080}
        className="w-full h-auto block aspect-video"
        onPlay={() => setPlaying(true)}
        onEnded={() => setEnded(true)}
        aria-label="Demofilm: één klus van aanvraag tot betaling in doen."
      />

      {/* Homepage-flow: één klik om te kijken */}
      {!autoStart && !playing && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0 flex items-center justify-center group cursor-pointer"
          aria-label="Speel de demofilm af"
        >
          <span className="knop knop-flame pl-5 pr-6">
            <span aria-hidden className="text-[13px]">▶</span>
            Bekijk de demo · 2 min
          </span>
        </button>
      )}

      {/* Autoplay-flow: hij speelt al, één optionele klik voor geluid */}
      {autoStart && muted && !ended && (
        <div className="absolute inset-x-0 bottom-16 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={geluidAan}
            className="knop pointer-events-auto bg-petrol/90 text-white backdrop-blur"
          >
            <span aria-hidden>🔊</span>
            Zet het geluid aan
          </button>
        </div>
      )}

      {/* Na afloop: de conversie-knop in het beeld zelf */}
      {ended && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-petrol/70 backdrop-blur-[2px]">
          <a
            href={ctaHref}
            className="knop knop-groot knop-flame group"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </a>
          <button
            type="button"
            onClick={opnieuw}
            className="text-[14px] font-medium text-white/80 hover:text-white underline underline-offset-4 transition-colors"
          >
            Opnieuw kijken
          </button>
        </div>
      )}
    </div>
  )
}
