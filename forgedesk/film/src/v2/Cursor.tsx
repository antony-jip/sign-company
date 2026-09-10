import { useLayoutEffect, useState } from 'react'
import { merk } from '../brand'
import { ease, vlak, lerp } from '../tijd'
import { useFormaat } from './formaat'

// De grote Flame-pijl. Doelen zijn data-doel-attributen in de schermen: de
// cursor meet ze elke frame in de DOM, inclusief cameratransform, dus de
// positie klopt altijd, ook tijdens een pan. Beweging: premium ease, 8% overshoot.
export type CursorStap = { ms: number; doel: string | { x: number; y: number }; klik?: boolean; dx?: number; dy?: number }

type Positie = { x: number; y: number }

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
  const s = f.width / filmB
  return { x: (r.left + r.width / 2 - f.left) / s + dx, y: (r.top + r.height / 2 - f.top) / s + dy }
}

export const Cursor: React.FC<{ t: number; stappen: CursorStap[]; zichtVan?: number; zichtTot?: number }> = ({ t, stappen, zichtVan = 0, zichtTot = Infinity }) => {
  const [pos, setPos] = useState<Positie | null>(null)
  const formaat = useFormaat()
  // Welke twee stappen zijn relevant
  let i = 0
  for (let k = 0; k < stappen.length; k++) if (t >= stappen[k].ms) i = k
  const van = stappen[Math.max(0, i - 1)]
  const naar = stappen[i]
  const reisDuur = 700
  const p = i === 0 ? 1 : vlak(t, naar.ms, naar.ms + reisDuur, ease.uit)
  useLayoutEffect(() => {
    const a = meet(van.doel, van.dx, van.dy, formaat.b)
    const b = meet(naar.doel, naar.dx, naar.dy, formaat.b)
    if (!b) { setPos((prev) => (prev === null ? prev : null)); return }
    const start = a ?? b
    // Lichte boog en 8% overshoot in de richting van de reis.
    const over = Math.sin(Math.min(1, p) * Math.PI) * (p > 0.6 ? 0.08 : 0)
    const x = lerp(start.x, b.x, p) + (b.x - start.x) * over
    const y = lerp(start.y, b.y, p) + (b.y - start.y) * over - Math.sin(p * Math.PI) * 30
    // Alleen bijwerken als de positie echt anders is, anders blijft React lussen.
    setPos((prev) => (prev && Math.abs(prev.x - x) < 0.05 && Math.abs(prev.y - y) < 0.05 ? prev : { x, y }))
  })
  const zicht = Math.min(vlak(t, zichtVan, zichtVan + 250), Number.isFinite(zichtTot) ? 1 - vlak(t, zichtTot - 250, zichtTot) : 1)
  if (!pos || zicht <= 0) return null
  const klikOp = naar.klik ? naar.ms + reisDuur + 80 : -1
  const klikP = klikOp > 0 ? vlak(t, klikOp, klikOp + 500, ease.uit) : 1
  const drukt = klikOp > 0 && t >= klikOp && t < klikOp + 140
  return (
    <div style={{ position: 'absolute', left: pos.x, top: pos.y, width: 0, height: 0, zIndex: 80, pointerEvents: 'none', opacity: zicht }}>
      {klikOp > 0 && t >= klikOp && klikP < 1 && (
        <>
          <div style={{ position: 'absolute', left: -(10 + klikP * 70), top: -(10 + klikP * 70), width: 20 + klikP * 140, height: 20 + klikP * 140, borderRadius: '50%', border: `${4 - klikP * 3}px solid ${merk.flame}`, opacity: 1 - klikP }} />
          <div style={{ position: 'absolute', left: -(6 + klikP * 40), top: -(6 + klikP * 40), width: 12 + klikP * 80, height: 12 + klikP * 80, borderRadius: '50%', border: `2px solid ${merk.flame}`, opacity: (1 - klikP) * 0.6 }} />
        </>
      )}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: 'absolute', left: -6, top: -4, transform: `scale(${drukt ? 0.88 : 1})`, transformOrigin: '6px 4px', filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.28))' }}>
        <path d="M5 3l14 9-6.5 1.4L16 20l-3 1.4-3.5-6.6L5 19z" fill={merk.flame} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  )
}
