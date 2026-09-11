import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'

const KLEUREN = ['#D24620', '#1A535C', '#3A7D52', '#E8B44A', '#4E96A3', '#F2A88A']

/**
 * Confetti over het hele scherm, op een canvas zonder extra package. Loopt
 * een paar seconden en ruimt zichzelf op. Bij "minder beweging" tekent hij
 * niets.
 */
function Confetti({ duurMs = 3800 }: { duurMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const b = canvas.width = Math.floor(innerWidth * dpr)
    const h = canvas.height = Math.floor(innerHeight * dpr)
    canvas.style.width = `${innerWidth}px`
    canvas.style.height = `${innerHeight}px`

    const snippers = Array.from({ length: 160 }, (_, i) => ({
      x: Math.random() * b,
      y: -Math.random() * h * 0.4,
      vx: (Math.random() - 0.5) * 2.2 * dpr,
      vy: (2.2 + Math.random() * 2.8) * dpr,
      w: (6 + Math.random() * 6) * dpr,
      l: (9 + Math.random() * 8) * dpr,
      hoek: Math.random() * Math.PI,
      draai: (Math.random() - 0.5) * 0.25,
      kleur: KLEUREN[i % KLEUREN.length],
      zwaai: Math.random() * Math.PI * 2,
    }))

    const start = performance.now()
    let frame = 0
    const teken = (nu: number) => {
      const t = nu - start
      ctx.clearRect(0, 0, b, h)
      const vervaag = t > duurMs - 900 ? Math.max(0, (duurMs - t) / 900) : 1
      ctx.globalAlpha = vervaag
      for (const s of snippers) {
        s.x += s.vx + Math.sin((t / 400) + s.zwaai) * 0.6 * dpr
        s.y += s.vy
        s.hoek += s.draai
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.hoek)
        ctx.fillStyle = s.kleur
        ctx.fillRect(-s.w / 2, -s.l / 2, s.w, s.l)
        ctx.restore()
      }
      if (t < duurMs) frame = requestAnimationFrame(teken)
      else ctx.clearRect(0, 0, b, h)
    }
    frame = requestAnimationFrame(teken)
    return () => cancelAnimationFrame(frame)
  }, [duurMs])

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60]" />
}

interface BedanktMomentProps {
  kop: string
  tekst: string
  onSluiten: () => void
}

/**
 * Het moment na het tekenen. Confetti over het scherm en één boodschap:
 * bedankt, we bellen je. Sluiten via de knop, de achtergrond of Escape.
 */
export function BedanktMoment({ kop, tekst, onSluiten }: BedanktMomentProps) {
  useEffect(() => {
    const opEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onSluiten() }
    window.addEventListener('keydown', opEscape)
    return () => window.removeEventListener('keydown', opEscape)
  }, [onSluiten])

  return (
    <>
      <Confetti />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/30 p-4 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onSluiten}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bedankt-kop"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-[#FFFFFF] p-8 text-center shadow-[0_24px_48px_rgba(0,0,0,0.16)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 md:p-10"
        >
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F2EC]">
            <Check className="h-8 w-8 text-[#3A7D52]" strokeWidth={2.5} />
          </span>
          <h2 id="bedankt-kop" className="text-[26px] font-bold leading-tight tracking-[-0.3px] text-[#1A1A1A]">
            {kop}<span className="text-[#D24620]">.</span>
          </h2>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[#6B6B66]">{tekst}</p>
          <button
            type="button"
            onClick={onSluiten}
            autoFocus
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#1A535C] px-6 text-base font-semibold text-white transition-colors hover:bg-[#15464E]"
          >
            Verder
          </button>
        </div>
      </div>
    </>
  )
}
