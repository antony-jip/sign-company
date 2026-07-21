import { useMemo } from 'react'

// Kleine CSS-only confetti. Geen extra dependency en geen JS-animatieloop, zodat
// dit overal ingezet kan worden zonder de motion-conventie te doorbreken.

const KLEUREN = ['#F15025', '#1A535C', '#3A7D52', '#E8B44A', '#4E96A3']

interface Props {
  /** Aantal snippers. Houd dit laag op kleine kaarten. */
  aantal?: number
  className?: string
}

export function ConfettiBurst({ aantal = 28, className = '' }: Props) {
  // Deterministisch per mount: de posities mogen niet per render verspringen.
  const snippers = useMemo(
    () =>
      Array.from({ length: aantal }, (_, i) => {
        const hoek = (i / aantal) * 360
        const afstand = 90 + ((i * 37) % 70)
        return {
          kleur: KLEUREN[i % KLEUREN.length],
          dx: Math.cos((hoek * Math.PI) / 180) * afstand,
          dy: Math.sin((hoek * Math.PI) / 180) * afstand - 40,
          draai: ((i * 53) % 360) + 180,
          vertraging: (i % 6) * 40,
          breedte: 5 + (i % 3) * 2,
          hoogte: 9 + (i % 4) * 3,
        }
      }),
    [aantal],
  )

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <style>{`
        @keyframes doen-confetti {
          0%   { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate3d(var(--dx), var(--dy), 0) rotate(var(--draai)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .doen-confetti-snipper { animation: none !important; opacity: 0; }
        }
      `}</style>
      {snippers.map((s, i) => (
        <span
          key={i}
          className="doen-confetti-snipper absolute left-1/2 top-1/2 rounded-[1px]"
          style={{
            width: s.breedte,
            height: s.hoogte,
            backgroundColor: s.kleur,
            ['--dx' as string]: `${s.dx}px`,
            ['--dy' as string]: `${s.dy}px`,
            ['--draai' as string]: `${s.draai}deg`,
            animation: `doen-confetti 1.1s cubic-bezier(0.16, 1, 0.3, 1) ${s.vertraging}ms forwards`,
          }}
        />
      ))}
    </div>
  )
}
