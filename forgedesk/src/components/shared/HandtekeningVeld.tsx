import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface HandtekeningVeldProps {
  /** Krijgt de PNG als data-URL na elke streek; undefined na wissen. */
  onChange: (dataUrl: string | undefined) => void
  className?: string
  /** Canvas-pixels; het element schaalt mee met de breedte van de container. */
  breedte?: number
  hoogte?: number
}

/**
 * Eenvoudig tekenveld voor een handtekening. Pointer events, dus muis, vinger
 * en pen werken hetzelfde; touch-action none voorkomt dat de pagina meescrolt.
 */
export function HandtekeningVeld({ onChange, className, breedte = 600, hoogte = 200 }: HandtekeningVeldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tekenendRef = useRef(false)
  const [heeftStreek, setHeeftStreek] = useState(false)

  const coords = (e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const start = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.setPointerCapture(e.pointerId)
    tekenendRef.current = true
    const { x, y } = coords(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const beweeg = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!tekenendRef.current) return
    const canvas = e.currentTarget
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = coords(e, canvas)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1A1A1A'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHeeftStreek(true)
  }, [])

  const stop = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!tekenendRef.current) return
    tekenendRef.current = false
    const canvas = e.currentTarget
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    onChange(canvas.toDataURL('image/png'))
  }, [onChange])

  const wis = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHeeftStreek(false)
    onChange(undefined)
  }, [onChange])

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={breedte}
          height={hoogte}
          onPointerDown={start}
          onPointerMove={beweeg}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
          className="w-full h-auto rounded-xl border border-dashed border-[#1A535C]/30 bg-white cursor-crosshair"
          style={{ touchAction: 'none' }}
          aria-label="Tekenveld voor handtekening"
        />
        {!heeftStreek && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#9B9B95]">
            Teken hier je handtekening
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={wis}
          disabled={!heeftStreek}
          className="text-xs text-[#6B6B66] hover:text-[#1A535C] disabled:opacity-40 min-h-[44px] px-2"
        >
          Opnieuw
        </button>
      </div>
    </div>
  )
}
