import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Ruler, ArrowUpRight, Type, Undo2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { MaatjeAnnotatie, MaatjeKleur, MaatjePunt } from '@/types'
import { MAATJE_KLEUREN, renderMaatje, tekenAnnotaties } from '@/utils/maatjeAnnotaties'

type Gereedschap = 'maatlijn' | 'pijl' | 'tekst'

interface MaatjeEditorProps {
  /** Gecomprimeerde foto: blob (verse opname) of signed URL (heropenen). */
  fotoBron: Blob | string
  beginAnnotaties?: MaatjeAnnotatie[]
  beginTitel?: string | null
  onBewaren: (data: { annotaties: MaatjeAnnotatie[]; titel: string | null; render: Blob }) => void | Promise<void>
  onAnnuleren: () => void
}

const KLEUR_VOLGORDE: MaatjeKleur[] = ['flame', 'petrol', 'groen', 'wit']

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function MaatjeEditor({
  fotoBron,
  beginAnnotaties = [],
  beginTitel = null,
  onBewaren,
  onAnnuleren,
}: MaatjeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [fotoUrl, setFotoUrl] = useState('')
  const [annotaties, setAnnotaties] = useState<MaatjeAnnotatie[]>(beginAnnotaties)
  const [historie, setHistorie] = useState<MaatjeAnnotatie[][]>([])
  const [tool, setTool] = useState<Gereedschap>('maatlijn')
  const [kleur, setKleur] = useState<MaatjeKleur>('flame')
  const [titel, setTitel] = useState(beginTitel ?? '')
  const [concept, setConcept] = useState<{ van: MaatjePunt; naar: MaatjePunt } | null>(null)
  const [bewerkLabel, setBewerkLabel] = useState<{ id: string; soort: 'cm' | 'tekst'; waarde: string } | null>(null)
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    if (typeof fotoBron === 'string') {
      setFotoUrl(fotoBron)
      return
    }
    const u = URL.createObjectURL(fotoBron)
    setFotoUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [fotoBron])

  const conceptAlsAnnotatie = useCallback((): MaatjeAnnotatie | null => {
    if (!concept) return null
    if (tool === 'maatlijn') return { id: '__concept', type: 'maatlijn', kleur, van: concept.van, naar: concept.naar, cm: null }
    if (tool === 'pijl') return { id: '__concept', type: 'pijl', kleur, van: concept.van, naar: concept.naar }
    return null
  }, [concept, tool, kleur])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.clientWidth) return
    const w = img.clientWidth
    const h = img.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)
    const concAnn = conceptAlsAnnotatie()
    tekenAnnotaties(ctx, concAnn ? [...annotaties, concAnn] : annotaties, w, h)
  }, [annotaties, conceptAlsAnnotatie])

  useEffect(() => {
    redraw()
  }, [redraw])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const obs = new ResizeObserver(() => redraw())
    obs.observe(img)
    return () => obs.disconnect()
  }, [redraw])

  const snapshot = useCallback(() => {
    setHistorie((prev) => [...prev, annotaties])
  }, [annotaties])

  const undo = useCallback(() => {
    setHistorie((prev) => {
      if (prev.length === 0) return prev
      setAnnotaties(prev[prev.length - 1])
      return prev.slice(0, -1)
    })
  }, [])

  const naarNorm = useCallback((e: React.PointerEvent): MaatjePunt => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const r = canvas.getBoundingClientRect()
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) }
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (bewerkLabel) return
    const p = naarNorm(e)
    if (tool === 'tekst') {
      const id = crypto.randomUUID()
      snapshot()
      setAnnotaties((prev) => [...prev, { id, type: 'tekst', kleur, positie: p, tekst: '' }])
      setBewerkLabel({ id, soort: 'tekst', waarde: '' })
      return
    }
    canvasRef.current?.setPointerCapture(e.pointerId)
    setConcept({ van: p, naar: p })
  }, [bewerkLabel, naarNorm, tool, kleur, snapshot])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    setConcept((c) => (c ? { van: c.van, naar: naarNorm(e) } : c))
  }, [naarNorm])

  const onPointerUp = useCallback(() => {
    setConcept((c) => {
      if (!c) return null
      const afstand = Math.hypot(c.naar.x - c.van.x, c.naar.y - c.van.y)
      if (afstand < 0.02) return null
      const id = crypto.randomUUID()
      snapshot()
      if (tool === 'maatlijn') {
        setAnnotaties((prev) => [...prev, { id, type: 'maatlijn', kleur, van: c.van, naar: c.naar, cm: null }])
        setBewerkLabel({ id, soort: 'cm', waarde: '' })
      } else if (tool === 'pijl') {
        setAnnotaties((prev) => [...prev, { id, type: 'pijl', kleur, van: c.van, naar: c.naar }])
      }
      return null
    })
  }, [snapshot, tool, kleur])

  const bevestigLabel = useCallback(() => {
    if (!bewerkLabel) return
    const { id, soort, waarde } = bewerkLabel
    if (soort === 'cm') {
      const cm = waarde.trim() === '' ? null : Number(waarde.replace(',', '.'))
      setAnnotaties((prev) => prev.map((a) =>
        a.id === id && a.type === 'maatlijn' ? { ...a, cm: cm != null && Number.isFinite(cm) ? cm : null } : a))
    } else {
      const tekst = waarde.trim()
      setAnnotaties((prev) => tekst === ''
        ? prev.filter((a) => a.id !== id)
        : prev.map((a) => (a.id === id && a.type === 'tekst' ? { ...a, tekst } : a)))
    }
    setBewerkLabel(null)
  }, [bewerkLabel])

  const bewaren = useCallback(async () => {
    setBezig(true)
    try {
      const render = await renderMaatje(fotoBron, annotaties)
      await onBewaren({ annotaties, titel: titel.trim() || null, render })
    } catch (err) {
      logger.error('Maatje bewaren mislukt:', err)
      toast.error('Bewaren mislukt')
      setBezig(false)
    }
  }, [fotoBron, annotaties, titel, onBewaren])

  const gereedschappen: { key: Gereedschap; label: string; Icon: typeof Ruler }[] = [
    { key: 'maatlijn', label: 'Maatlijn', Icon: Ruler },
    { key: 'pijl', label: 'Pijl', Icon: ArrowUpRight },
    { key: 'tekst', label: 'Tekst', Icon: Type },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0E2025]" ref={containerRef}>
      {/* Topbalk */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#1A535C]">
        <button
          type="button"
          onClick={onAnnuleren}
          className="text-[13px] font-medium text-white/80 hover:text-white"
        >
          Annuleren
        </button>
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Naam (optioneel)"
          className="flex-1 max-w-[60%] bg-transparent text-center text-[14px] font-semibold text-white placeholder:text-white/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={bewaren}
          disabled={bezig}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F15025] px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          <Check className="h-4 w-4" strokeWidth={2.25} />
          {bezig ? 'Bewaren...' : 'Bewaren'}
        </button>
      </div>

      {/* Foto + annotatie-overlay */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-2">
        {fotoUrl && (
          <div className="relative inline-block max-h-full max-w-full">
            <img
              ref={imgRef}
              src={fotoUrl}
              alt="Maatje"
              onLoad={redraw}
              className="block max-h-[calc(100vh-160px)] max-w-full select-none object-contain"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="absolute left-0 top-0 touch-none"
            />
          </div>
        )}
      </div>

      {/* Cm- / tekst-popup */}
      {bewerkLabel && (
        <div className="absolute inset-x-0 bottom-[88px] z-10 flex justify-center px-4">
          <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            <input
              autoFocus
              value={bewerkLabel.waarde}
              onChange={(e) => setBewerkLabel((b) => (b ? { ...b, waarde: e.target.value } : b))}
              onKeyDown={(e) => { if (e.key === 'Enter') bevestigLabel() }}
              inputMode={bewerkLabel.soort === 'cm' ? 'decimal' : 'text'}
              placeholder={bewerkLabel.soort === 'cm' ? 'Maat in cm' : 'Tekst'}
              className={cn(
                'flex-1 rounded-lg bg-[#F8F7F5] px-3 py-2 text-[15px] text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:ring-2 focus:ring-[#1A535C]',
                bewerkLabel.soort === 'cm' && 'font-mono',
              )}
            />
            <button
              type="button"
              onClick={bevestigLabel}
              className="rounded-lg bg-[#1A535C] px-4 py-2 text-[13px] font-semibold text-white"
            >
              Klaar
            </button>
          </div>
        </div>
      )}

      {/* Onderbalk: gereedschap, kleur, undo */}
      <div className="flex items-center justify-between gap-3 bg-[#13343A] px-4 py-3">
        <div className="flex items-center gap-1.5">
          {gereedschappen.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTool(key)}
              aria-label={label}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                tool === key ? 'bg-[#F15025] text-white' : 'text-white/70 hover:bg-white/10',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {KLEUR_VOLGORDE.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKleur(k)}
              aria-label={`Kleur ${k}`}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform',
                kleur === k ? 'scale-110 border-white' : 'border-white/30',
              )}
              style={{ backgroundColor: MAATJE_KLEUREN[k] }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={undo}
          disabled={historie.length === 0}
          aria-label="Ongedaan maken"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 disabled:opacity-30"
        >
          <Undo2 className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
