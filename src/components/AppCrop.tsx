'use client'

import { AppFrame, type View } from '@/components/home/AppShowcase'

/* Een uitsnede uit de echte app-mockup, als beeld bij een pijler.

   Waarom geen screenshot: AppShowcase is tegen de forgedesk-UI geverifieerd
   en beweegt mee als die verandert. Een los plaatje veroudert, dit niet.

   De frame wordt op vaste breedte gerenderd, geschaald en verschoven naar het
   stuk dat de pijler uitlegt. x/y zijn de linkerbovenhoek van de uitsnede in
   frame-pixels (bij 1240 breed), scale de vergroting. Niet klikbaar: het is
   een beeld, klikken doe je in de demo erboven. */

export type Crop = { view: View; scale?: number; x?: number; y?: number }

const FRAME_W = 1240

export default function AppCrop({ crop, className = '' }: { crop: Crop; className?: string }) {
  const { view, scale = 1, x = 0, y = 0 } = crop
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden select-none pointer-events-none ${className}`}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: FRAME_W,
          transform: `scale(${scale}) translate(${-x}px, ${-y}px)`,
          transformOrigin: 'top left',
        }}
      >
        <AppFrame view={view} setView={() => {}} />
      </div>
    </div>
  )
}
