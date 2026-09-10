import { useLayoutEffect, useRef, useState } from 'react'
import { continueRender, delayRender } from 'remotion'
import { merk } from '../brand'
import { ease, vlak, lerp } from '../tijd'
import { useFormaat } from './formaat'

// De grote Flame-pijl. Doelen zijn data-doel-attributen in de schermen: de
// cursor meet ze elke frame in de DOM, inclusief cameratransform, dus de
// positie klopt altijd, ook tijdens een pan.
// Timing (MOTION.md): een klik landt op ms + 780, de aankomst 7 f eerder
// (hover, scale 1,10), druk 4 f op 0,9, dubbele ripple. De reisduur schaalt
// met sqrt(afstand) tussen 600 en 1000 ms; het vertrek volgt uit de aankomst.
export type CursorStap = { ms: number; doel: string | { x: number; y: number }; klik?: boolean; dx?: number; dy?: number }

type Positie = { x: number; y: number }

const SVG = 64
const SCHAAL = SVG / 24
// Hotspot: de punt van de pijl in de 24-viewBox.
const TIP = { x: 4, y: 3 }
const AANKOMST_MS = 700
const HOVER_MS = 233
const DRUK_MS = 133
const KLIK_NA_MS = AANKOMST_MS + 80

// Tijdens een verborgen renderpass van Remotion staat de root op breedte 0 en
// valt er niets te meten. Deze hook plant dan een nieuwe meting op het volgende
// animatieframe en houdt de render zolang vast.
export const useHermeet = () => {
  const [, zetPoging] = useState(0)
  const pogingen = useRef(0)
  return () => {
    if (pogingen.current > 120) return
    pogingen.current++
    const h = delayRender('meet doel')
    requestAnimationFrame(() => { zetPoging((p) => p + 1); continueRender(h) })
  }
}

export const rootMeetbaar = () => {
  if (typeof document === 'undefined') return false
  const f = document.querySelector('[data-film-root]')?.getBoundingClientRect()
  return !!f && f.width > 0
}

const meet = (doel: string | Positie, dx = 0, dy = 0, filmB = 1080): Positie | null => {
  if (typeof doel !== 'string') return { x: doel.x + dx, y: doel.y + dy }
  if (typeof document === 'undefined') return null
  const root = document.querySelector('[data-film-root]')
  let el: Element | null = null
  if (doel.startsWith('tekst:')) {
    // Zoek de kleinste knop of link met precies deze tekst, in de schermen.
    const gezocht = doel.slice(6).trim()
    let beste: Element | null = null
    for (const kandidaat of Array.from(document.querySelectorAll('[data-scherm] button, [data-scherm] a, [data-scherm] span'))) {
      if ((kandidaat.textContent ?? '').replace(/\s+/g, ' ').trim() !== gezocht) continue
      if (!beste || (kandidaat as HTMLElement).offsetWidth < (beste as HTMLElement).offsetWidth) beste = kandidaat
    }
    el = beste
  } else {
    el = document.querySelector(`[data-doel="${doel}"]`)
  }
  if (!el || !root) return null
  const r = el.getBoundingClientRect()
  const f = root.getBoundingClientRect()
  // Tijdens een verborgen renderpass van Remotion staat de root op breedte 0: dan is er niets te meten.
  if (!(f.width > 0)) return null
  const s = f.width / filmB
  return { x: (r.left + r.width / 2 - f.left) / s + dx, y: (r.top + r.height / 2 - f.top) / s + dy }
}

// Wanneer een stap klaar is met bewegen: na de druk, of bij aankomst.
const klaarOp = (stap: CursorStap) => (stap.klik ? stap.ms + KLIK_NA_MS + DRUK_MS : stap.ms + AANKOMST_MS)

export const Cursor: React.FC<{ t: number; stappen: CursorStap[]; zichtVan?: number; zichtTot?: number }> = ({ t, stappen, zichtVan = 0, zichtTot = Infinity }) => {
  const [pos, setPos] = useState<Positie | null>(null)
  const formaat = useFormaat()
  const hermeet = useHermeet()
  let i = 0
  for (let k = 0; k < stappen.length; k++) if (t >= stappen[k].ms) i = k
  const van = stappen[Math.max(0, i - 1)]
  const naar = stappen[i]
  const aankomst = naar.klik ? naar.ms + KLIK_NA_MS - HOVER_MS : naar.ms + AANKOMST_MS
  useLayoutEffect(() => {
    if (!rootMeetbaar()) { hermeet(); return }
    const a = meet(van.doel, van.dx, van.dy, formaat.b)
    const b = meet(naar.doel, naar.dx, naar.dy, formaat.b)
    if (!b) { setPos((prev) => (prev === null ? prev : null)); return }
    const start = i === 0 ? b : (a ?? b)
    const dxr = b.x - start.x, dyr = b.y - start.y
    const afstand = Math.hypot(dxr, dyr)
    // Reisduur uit de afstand, maar nooit eerder vertrekken dan de vorige stap klaar is.
    const ruimte = i === 0 ? 0 : aankomst - klaarOp(van) - 60
    const duur = Math.max(200, Math.min(ruimte, Math.max(600, Math.min(1000, 600 * Math.sqrt(afstand / 300)))))
    const p = i === 0 ? 1 : vlak(t, aankomst - duur, aankomst, ease.move)
    // Arc-pad: kwadratische bezier, controlepunt loodrecht op de reis, boog omhoog.
    const boog = Math.min(afstand * 0.16, 80)
    let px = afstand > 0 ? -dyr / afstand : 0, py = afstand > 0 ? dxr / afstand : 0
    if (py > 0 || (py === 0 && px < 0)) { px = -px; py = -py }
    const cx = start.x + dxr / 2 + px * boog, cy = start.y + dyr / 2 + py * boog
    const q = 1 - p
    const x = q * q * start.x + 2 * q * p * cx + p * p * b.x
    const y = q * q * start.y + 2 * q * p * cy + p * p * b.y
    // Alleen bijwerken als de positie echt anders is, anders blijft React lussen.
    setPos((prev) => (prev && Math.abs(prev.x - x) < 0.05 && Math.abs(prev.y - y) < 0.05 ? prev : { x, y }))
  })
  const zicht = Math.min(vlak(t, zichtVan, zichtVan + 250), Number.isFinite(zichtTot) ? 1 - vlak(t, zichtTot - 133, zichtTot, ease.exit) : 1)
  if (!pos || zicht <= 0) return null
  const klikOp = naar.klik ? naar.ms + KLIK_NA_MS : -1
  // Hover 1,10 bij aankomst, druk 0,9 gedurende 4 f, dan terug naar 1.
  let schaal = 1
  if (klikOp > 0) {
    const hover = vlak(t, aankomst, aankomst + 100, ease.uiUit)
    const druk = t >= klikOp && t < klikOp + DRUK_MS ? 1 : 0
    const los = vlak(t, klikOp + DRUK_MS, klikOp + DRUK_MS + 167, ease.uiUit)
    schaal = t < klikOp ? lerp(1, 1.1, hover) : druk ? 0.9 : lerp(0.9, 1, los)
  }
  // Dubbele ripple: 10 f van 0,3 naar 1,9, de tweede 2 f later en kleiner.
  const rip1 = klikOp > 0 ? vlak(t, klikOp, klikOp + 333, ease.uiUit) : 1
  const rip2 = klikOp > 0 ? vlak(t, klikOp + 67, klikOp + 400, ease.uiUit) : 1
  const ring = (p: number, basis: number, sterkte: number, dikte: number) => {
    const s = lerp(0.3, 1.9, p) * basis
    return <div style={{ position: 'absolute', left: -s / 2, top: -s / 2, width: s, height: s, borderRadius: '50%', border: `${dikte}px solid ${merk.flame}`, opacity: (1 - p) * sterkte }} />
  }
  return (
    <div style={{ position: 'absolute', left: pos.x, top: pos.y, width: 0, height: 0, zIndex: 80, pointerEvents: 'none', opacity: zicht }}>
      {klikOp > 0 && t >= klikOp && rip1 < 1 && ring(rip1, 56, 1, 4 - rip1 * 2.5)}
      {klikOp > 0 && t >= klikOp + 67 && rip2 < 1 && ring(rip2, 40, 0.6, 2)}
      <svg width={SVG} height={SVG} viewBox="0 0 24 24" style={{ position: 'absolute', left: -TIP.x * SCHAAL, top: -TIP.y * SCHAAL, transform: `scale(${schaal})`, transformOrigin: `${TIP.x * SCHAAL}px ${TIP.y * SCHAAL}px`, filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.28))' }}>
        <path d="M5 3l14 9-6.5 1.4L16 20l-3 1.4-3.5-6.6L5 19z" fill={merk.flame} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  )
}
