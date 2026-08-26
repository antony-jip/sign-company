'use client'

import { useEffect, useRef } from 'react'

/* De moduleloops uit ~/doen-video, in het standaardkader.

   Dezelfde reduced-motion-afhandeling als in Demo.tsx: wie beweging uit heeft
   staan krijgt de poster met bediening in plaats van een loop die vanzelf
   speelt. Losgetrokken omdat de home dit nu vier keer nodig heeft. */
export default function LoopVideo({
  bron,
  label,
  className = '',
}: {
  /** Naam zonder pad en zonder extensie, bijvoorbeeld 'module-offertes' */
  bron: string
  label: string
  className?: string
}) {
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
    <div
      className={`rounded-[10px] overflow-hidden border border-petrol/10 shadow-[0_1px_2px_rgba(20,40,40,0.04),0_20px_48px_-28px_rgba(13,52,60,0.35)] ${className}`}
    >
      <video
        ref={videoRef}
        src={`/videos/${bron}.mp4`}
        poster={`/videos/${bron}.jpg`}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        width={1920}
        height={1080}
        className="w-full h-auto block aspect-video"
        aria-label={label}
      />
    </div>
  )
}
