import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Ruler, ArrowUpRight, Type, Undo2, Check, Trash2, Pencil, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { MaatjeAnnotatie, MaatjeKleur, MaatjePunt } from '@/types'
import { MAATJE_KLEUREN, renderMaatje, tekenAnnotaties } from '@/utils/maatjeAnnotaties'

type Gereedschap = 'maatlijn' | 'pijl' | 'tekst'

interface MaatjeOpslag { annotaties: MaatjeAnnotatie[]; titel: string | null; render: Blob }

interface MaatjeEditorProps {
  /** Gecomprimeerde foto: blob (verse opname) of signed URL (heropenen). */
  fotoBron: Blob | string
  beginAnnotaties?: MaatjeAnnotatie[]
  beginTitel?: string | null
  onBewaren: (data: MaatjeOpslag) => void | Promise<void>
  /** Indien aanwezig: toont "Koppel aan project" en bewaart + koppelt in één keer. */
  onKoppelen?: (data: MaatjeOpslag) => void | Promise<void>
  onAnnuleren: () => void
}

const KLEUR_VOLGORDE: MaatjeKleur[] = ['flame', 'petrol', 'groen', 'wit']

// Raak-afstanden in CSS-px: ruim genoeg voor vingers.
const HANDLE_RAAK = 18
const LIJN_RAAK = 16
const HANDLE_TEKEN_R = 7

const TOOL_HINT: Record<Gereedschap, string> = {
  maatlijn: 'Sleep om een maatlijn te tekenen. Tik een element aan om te bewerken.',
  pijl: 'Sleep om een pijl te tekenen. Tik een element aan om te bewerken.',
  tekst: 'Tik om tekst te plaatsen. Tik een element aan om te bewerken.',
}

type Punt = { x: number; y: number }
type RaakSoort = 'endpoint-van' | 'endpoint-naar' | 'geheel'
interface SleepInfo { soort: RaakSoort; id: string; laatste: MaatjePunt; gesnapshot: boolean }

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function afstand(a: Punt, b: Punt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function afstandTotSegment(p: Punt, a: Punt, b: Punt): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return afstand(p, a)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return afstand(p, { x: a.x + t * dx, y: a.y + t * dy })
}

export function MaatjeEditor({
  fotoBron,
  beginAnnotaties = [],
  beginTitel = null,
  onBewaren,
  onKoppelen,
  onAnnuleren,
}: MaatjeEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sleepRef = useRef<SleepInfo | null>(null)

  const [fotoUrl, setFotoUrl] = useState('')
  const [annotaties, setAnnotaties] = useState<MaatjeAnnotatie[]>(beginAnnotaties)
  const [historie, setHistorie] = useState<MaatjeAnnotatie[][]>([])
  const [tool, setTool] = useState<Gereedschap>('maatlijn')
  const [kleur, setKleur] = useState<MaatjeKleur>('flame')
  const [titel, setTitel] = useState(beginTitel ?? '')
  const [concept, setConcept] = useState<{ van: MaatjePunt; naar: MaatjePunt } | null>(null)
  const [geselecteerdeId, setGeselecteerdeId] = useState<string | null>(null)
  const [bewerk, setBewerk] = useState<{ id: string; soort: 'cm' | 'tekst'; waarde: string } | null>(null)
  const [bezig, setBezig] = useState(false)

  const geselecteerd = annotaties.find((a) => a.id === geselecteerdeId) ?? null

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

  const tekenHandles = useCallback((ctx: CanvasRenderingContext2D, a: MaatjeAnnotatie, w: number, h: number) => {
    const toPx = (pt: MaatjePunt): Punt => ({ x: pt.x * w, y: pt.y * h })
    ctx.save()
    ctx.lineWidth = 2
    if (a.type === 'tekst') {
      const pos = toPx(a.positie)
      const fontPx = Math.max(14, Math.min(w, h) * 0.045)
      const tw = Math.max(20, (a.tekst.length || 3) * fontPx * 0.55)
      ctx.strokeStyle = '#1A535C'
      ctx.setLineDash([5, 4])
      ctx.strokeRect(pos.x - 6, pos.y - 6, tw + 12, fontPx + 12)
      ctx.setLineDash([])
    } else {
      for (const pt of [a.van, a.naar]) {
        const c = toPx(pt)
        ctx.beginPath()
        ctx.arc(c.x, c.y, HANDLE_TEKEN_R, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.strokeStyle = '#1A535C'
        ctx.stroke()
      }
    }
    ctx.restore()
  }, [])

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
    if (geselecteerd) tekenHandles(ctx, geselecteerd, w, h)
  }, [annotaties, conceptAlsAnnotatie, geselecteerd, tekenHandles])

  useEffect(() => { redraw() }, [redraw])

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
    if (historie.length === 0) return
    setAnnotaties(historie[historie.length - 1])
    setHistorie((prev) => prev.slice(0, -1))
    setGeselecteerdeId(null)
  }, [historie])

  const rectMaat = useCallback((): { rect: DOMRect; w: number; h: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return { rect, w: rect.width, h: rect.height }
  }, [])

  const naarNorm = useCallback((e: React.PointerEvent): MaatjePunt => {
    const rm = rectMaat()
    if (!rm) return { x: 0, y: 0 }
    return { x: clamp01((e.clientX - rm.rect.left) / rm.w), y: clamp01((e.clientY - rm.rect.top) / rm.h) }
  }, [rectMaat])

  // Hit-test in CSS-px. Geeft prioriteit aan de eindpunt-handles van de selectie.
  const raak = useCallback((pPx: Punt, w: number, h: number): { id: string; soort: RaakSoort } | null => {
    const toPx = (pt: MaatjePunt): Punt => ({ x: pt.x * w, y: pt.y * h })
    if (geselecteerd && geselecteerd.type !== 'tekst') {
      if (afstand(pPx, toPx(geselecteerd.van)) <= HANDLE_RAAK) return { id: geselecteerd.id, soort: 'endpoint-van' }
      if (afstand(pPx, toPx(geselecteerd.naar)) <= HANDLE_RAAK) return { id: geselecteerd.id, soort: 'endpoint-naar' }
    }
    for (let i = annotaties.length - 1; i >= 0; i--) {
      const a = annotaties[i]
      if (a.type === 'tekst') {
        const pos = toPx(a.positie)
        const fontPx = Math.max(14, Math.min(w, h) * 0.045)
        const tw = Math.max(20, (a.tekst.length || 3) * fontPx * 0.55)
        if (pPx.x >= pos.x - 10 && pPx.x <= pos.x + tw + 10 && pPx.y >= pos.y - 10 && pPx.y <= pos.y + fontPx + 10) {
          return { id: a.id, soort: 'geheel' }
        }
      } else {
        if (afstand(pPx, toPx(a.van)) <= HANDLE_RAAK) return { id: a.id, soort: 'endpoint-van' }
        if (afstand(pPx, toPx(a.naar)) <= HANDLE_RAAK) return { id: a.id, soort: 'endpoint-naar' }
        if (afstandTotSegment(pPx, toPx(a.van), toPx(a.naar)) <= LIJN_RAAK) return { id: a.id, soort: 'geheel' }
      }
    }
    return null
  }, [annotaties, geselecteerd])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (bewerk) return
    const pNorm = naarNorm(e)
    const rm = rectMaat()
    if (!rm) return

    // Tik altijd eerst op een bestaand element (ongeacht de actieve tool):
    // selecteren + verslepen. Zo is alles direct bewerkbaar.
    const pPx: Punt = { x: pNorm.x * rm.w, y: pNorm.y * rm.h }
    const hit = raak(pPx, rm.w, rm.h)
    if (hit) {
      setGeselecteerdeId(hit.id)
      canvasRef.current?.setPointerCapture(e.pointerId)
      sleepRef.current = { soort: hit.soort, id: hit.id, laatste: pNorm, gesnapshot: false }
      return
    }

    // Lege ruimte:
    if (tool === 'tekst') {
      const id = crypto.randomUUID()
      snapshot()
      setAnnotaties((prev) => [...prev, { id, type: 'tekst', kleur, positie: pNorm, tekst: '' }])
      setGeselecteerdeId(id)
      setBewerk({ id, soort: 'tekst', waarde: '' })
      return
    }
    // maatlijn / pijl: nieuwe vorm tekenen
    setGeselecteerdeId(null)
    canvasRef.current?.setPointerCapture(e.pointerId)
    setConcept({ van: pNorm, naar: pNorm })
  }, [bewerk, naarNorm, rectMaat, raak, tool, kleur, snapshot])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (concept) {
      const pNorm = naarNorm(e)
      setConcept((c) => (c ? { van: c.van, naar: pNorm } : c))
      return
    }
    const sleep = sleepRef.current
    if (!sleep) return
    if (!sleep.gesnapshot) { snapshot(); sleep.gesnapshot = true }
    const pNorm = naarNorm(e)
    if (sleep.soort === 'endpoint-van') {
      setAnnotaties((prev) => prev.map((a) => (a.id === sleep.id && a.type !== 'tekst' ? { ...a, van: pNorm } : a)))
    } else if (sleep.soort === 'endpoint-naar') {
      setAnnotaties((prev) => prev.map((a) => (a.id === sleep.id && a.type !== 'tekst' ? { ...a, naar: pNorm } : a)))
    } else {
      const dx = pNorm.x - sleep.laatste.x
      const dy = pNorm.y - sleep.laatste.y
      setAnnotaties((prev) => prev.map((a) => {
        if (a.id !== sleep.id) return a
        if (a.type === 'tekst') return { ...a, positie: { x: clamp01(a.positie.x + dx), y: clamp01(a.positie.y + dy) } }
        return {
          ...a,
          van: { x: clamp01(a.van.x + dx), y: clamp01(a.van.y + dy) },
          naar: { x: clamp01(a.naar.x + dx), y: clamp01(a.naar.y + dy) },
        }
      }))
      sleep.laatste = pNorm
    }
  }, [concept, naarNorm, snapshot])

  const onPointerUp = useCallback(() => {
    if (sleepRef.current) { sleepRef.current = null; return }
    if (!concept) return
    const c = concept
    setConcept(null)
    if (Math.hypot(c.naar.x - c.van.x, c.naar.y - c.van.y) < 0.02) return
    const id = crypto.randomUUID()
    snapshot()
    if (tool === 'maatlijn') {
      setAnnotaties((prev) => [...prev, { id, type: 'maatlijn', kleur, van: c.van, naar: c.naar, cm: null }])
      setGeselecteerdeId(id)
      setBewerk({ id, soort: 'cm', waarde: '' })
    } else if (tool === 'pijl') {
      setAnnotaties((prev) => [...prev, { id, type: 'pijl', kleur, van: c.van, naar: c.naar }])
      setGeselecteerdeId(id)
    }
  }, [concept, snapshot, tool, kleur])

  const kiesGereedschap = useCallback((g: Gereedschap) => {
    setTool(g)
    setConcept(null)
  }, [])

  const kiesKleur = useCallback((k: MaatjeKleur) => {
    setKleur(k)
    if (geselecteerdeId) {
      snapshot()
      setAnnotaties((prev) => prev.map((a) => (a.id === geselecteerdeId ? { ...a, kleur: k } : a)))
    }
  }, [geselecteerdeId, snapshot])

  const bewerkGeselecteerde = useCallback(() => {
    if (!geselecteerd) return
    snapshot()
    if (geselecteerd.type === 'maatlijn') {
      setBewerk({ id: geselecteerd.id, soort: 'cm', waarde: geselecteerd.cm != null ? String(geselecteerd.cm) : '' })
    } else if (geselecteerd.type === 'tekst') {
      setBewerk({ id: geselecteerd.id, soort: 'tekst', waarde: geselecteerd.tekst })
    }
  }, [geselecteerd, snapshot])

  const verwijderGeselecteerde = useCallback(() => {
    if (!geselecteerdeId) return
    snapshot()
    setAnnotaties((prev) => prev.filter((a) => a.id !== geselecteerdeId))
    setGeselecteerdeId(null)
  }, [geselecteerdeId, snapshot])

  const bevestigBewerk = useCallback(() => {
    if (!bewerk) return
    const { id, soort, waarde } = bewerk
    if (soort === 'cm') {
      const cm = waarde.trim() === '' ? null : Number(waarde.replace(',', '.'))
      setAnnotaties((prev) => prev.map((a) =>
        a.id === id && a.type === 'maatlijn' ? { ...a, cm: cm != null && Number.isFinite(cm) ? cm : null } : a))
    } else {
      const tekst = waarde.trim()
      if (tekst === '') {
        setAnnotaties((prev) => prev.filter((a) => a.id !== id))
        setGeselecteerdeId(null)
      } else {
        setAnnotaties((prev) => prev.map((a) => (a.id === id && a.type === 'tekst' ? { ...a, tekst } : a)))
      }
    }
    setBewerk(null)
  }, [bewerk])

  const voltooi = useCallback(async (actie: 'bewaren' | 'koppelen') => {
    setBezig(true)
    try {
      const render = await renderMaatje(fotoBron, annotaties)
      const payload: MaatjeOpslag = { annotaties, titel: titel.trim() || null, render }
      if (actie === 'koppelen' && onKoppelen) await onKoppelen(payload)
      else await onBewaren(payload)
    } catch (err) {
      logger.error('Maatje opslaan mislukt:', err)
      toast.error('Opslaan mislukt')
      setBezig(false)
    }
  }, [fotoBron, annotaties, titel, onBewaren, onKoppelen])

  const gereedschappen: { key: Gereedschap; label: string; Icon: typeof Ruler }[] = [
    { key: 'maatlijn', label: 'Maatlijn', Icon: Ruler },
    { key: 'pijl', label: 'Pijl', Icon: ArrowUpRight },
    { key: 'tekst', label: 'Tekst', Icon: Type },
  ]

  const selectieLabel = geselecteerd
    ? geselecteerd.type === 'maatlijn' ? 'Maatlijn' : geselecteerd.type === 'pijl' ? 'Pijl' : 'Tekst'
    : ''

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0E2025]">
      {/* Topbalk */}
      <div className="flex items-center justify-between gap-3 bg-[#1A535C] px-4 py-3">
        <button type="button" onClick={onAnnuleren} className="text-[13px] font-medium text-white/80 hover:text-white">
          Annuleren
        </button>
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Naam (optioneel)"
          className="min-w-0 flex-1 bg-transparent text-center text-[14px] font-semibold text-white placeholder:text-white/40 focus:outline-none"
        />
        <div className="flex shrink-0 items-center gap-2">
          {onKoppelen && (
            <button
              type="button"
              onClick={() => voltooi('koppelen')}
              disabled={bezig}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" strokeWidth={2} />
              Koppel
            </button>
          )}
          <button
            type="button"
            onClick={() => voltooi('bewaren')}
            disabled={bezig}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F15025] px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            <Check className="h-4 w-4" strokeWidth={2.25} />
            {bezig ? '...' : 'Bewaren'}
          </button>
        </div>
      </div>

      {/* Foto + annotatie-overlay */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-2">
        {/* Tool-hint */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-center text-[12px] font-medium text-white backdrop-blur-sm">
          {TOOL_HINT[tool]}
        </div>

        {fotoUrl && (
          <div className="relative inline-block max-h-full max-w-full">
            <img
              ref={imgRef}
              src={fotoUrl}
              alt="Maatje"
              onLoad={redraw}
              className="block max-h-[calc(100vh-200px)] max-w-full select-none object-contain"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="absolute left-0 top-0 touch-none"
            />
          </div>
        )}
      </div>

      {/* Cm- / tekst-popup — bovenin zodat het toetsenbord het niet bedekt */}
      {bewerk && (
        <>
          <div className="absolute inset-0 z-20 bg-black/40" onClick={bevestigBewerk} />
          <div className="absolute inset-x-0 top-20 z-30 flex justify-center px-4">
            <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
              <input
                autoFocus
                value={bewerk.waarde}
                onChange={(e) => setBewerk((b) => (b ? { ...b, waarde: e.target.value } : b))}
                onKeyDown={(e) => { if (e.key === 'Enter') bevestigBewerk() }}
                inputMode={bewerk.soort === 'cm' ? 'decimal' : 'text'}
                placeholder={bewerk.soort === 'cm' ? 'Maat in cm' : 'Tekst'}
                className={cn(
                  'flex-1 rounded-lg bg-[#F8F7F5] px-3 py-2 text-[15px] text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:ring-2 focus:ring-[#1A535C]',
                  bewerk.soort === 'cm' && 'font-mono',
                )}
              />
              <button type="button" onClick={bevestigBewerk} className="rounded-lg bg-[#1A535C] px-4 py-2 text-[13px] font-semibold text-white">
                Klaar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Onderbalk */}
      <div className="bg-[#13343A]">
        {/* Selectie-actiebalk */}
        {geselecteerd && !bewerk && (
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
            <span className="text-[12px] font-semibold text-white/90">{selectieLabel} geselecteerd</span>
            <div className="flex items-center gap-2">
              {geselecteerd.type !== 'pijl' && (
                <button
                  type="button"
                  onClick={bewerkGeselecteerde}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/15"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {geselecteerd.type === 'maatlijn' ? 'Maat' : 'Tekst'}
                </button>
              )}
              <button
                type="button"
                onClick={verwijderGeselecteerde}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F15025]/15 px-3 py-1.5 text-[12px] font-medium text-[#F8A38C] hover:bg-[#F15025]/25"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Verwijderen
              </button>
            </div>
          </div>
        )}

        {/* Gereedschap + undo */}
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-1.5">
            {gereedschappen.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => kiesGereedschap(key)}
                aria-label={label}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                  tool === key ? 'bg-[#F15025] text-white' : 'text-white/70 hover:bg-white/10',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={undo}
            disabled={historie.length === 0}
            aria-label="Ongedaan maken"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 disabled:opacity-30"
          >
            <Undo2 className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Kleur */}
        <div className="flex items-center justify-center gap-3 px-4 pb-3 pt-2.5">
          {KLEUR_VOLGORDE.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => kiesKleur(k)}
              aria-label={`Kleur ${k}`}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform',
                kleur === k ? 'scale-110 border-white' : 'border-white/30',
              )}
              style={{ backgroundColor: MAATJE_KLEUREN[k] }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
