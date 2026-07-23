'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'

/* De demofilm-speler: 16:9, gedeeld door de homepage en /demo.
   Standaard click-to-play; met autoStart speelt hij direct gedempt af
   (de video is muted-first gemaakt: captions dragen het verhaal) en
   verschijnt na afloop de Start-gratis-knop ín het beeld. */
export default function DemoVideo({ autoStart = false, ctaHref = 'https://app.doen.team/register' }: { autoStart?: boolean; ctaHref?: string }) {
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
          <span className="inline-flex items-center gap-3 rounded-full bg-flame text-white pl-5 pr-6 py-3 text-[15px] md:text-[16px] font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.35)] transition-transform duration-150 group-hover:scale-[1.04]">
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
            className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full bg-petrol/90 text-white px-6 py-3 text-[14px] md:text-[15px] font-semibold shadow-[0_4px_16px_rgba(13,52,60,0.35)] backdrop-blur transition-transform duration-150 hover:scale-[1.04]"
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
            className="group inline-flex items-center gap-2.5 text-[16px] md:text-[17px] font-semibold text-white bg-flame px-9 h-[60px] rounded-[8px] shadow-[0_4px_16px_rgba(241,80,37,0.4)] transition-transform duration-300 hover:scale-[1.04] active:scale-[0.97]"
          >
            <span>Start gratis · 30 dagen</span>
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
