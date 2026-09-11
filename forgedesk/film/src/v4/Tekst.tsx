import { useLayoutEffect, useState } from 'react'
import { useHermeet, rootMeetbaar } from '../v2/Cursor'
import { useFormaat } from '../v2/formaat'
import { veer, vlak } from '../tijd'
import { thema } from './thema'

// Tekstlagen van v4. Alles lowercase met een Flame-punt, geen uitlegregels.

const Punt: React.FC<{ kleur?: string }> = ({ kleur = thema.kleur.flame }) => <span style={{ color: kleur }}>.</span>

// Hoofdstukkaart tijdens de dolly: linksboven "3 / 6", midden één woord,
// eronder wie kijkt. Entree fade + rise + scale, exit sneller.
export const Hoofdstukkaart: React.FC<{ t: number; op: number; uit: number; nummer: number; totaal: number; woord: string; wie: string; extra?: string }> = ({ t, op, uit, nummer, totaal, woord, wie, extra }) => {
  if (t < op || t > uit + 300) return null
  const inP = veer(t, op, { demping: 18, duurMs: 600 })
  const zicht = Math.min(vlak(t, op, op + 250), 1 - vlak(t, uit, uit + 250, thema.ease.exit))
  const uitP = vlak(t, uit, uit + 250, thema.ease.exit)
  if (zicht <= 0) return null
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, pointerEvents: 'none', opacity: zicht, fontFamily: thema.fonts.kop }}>
      <div style={{ position: 'absolute', left: 96, top: 72, fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em', color: thema.kleur.petrol, opacity: 0.7, transform: `translateY(${(1 - inP) * 10}px)` }}>{nummer} / {totaal}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', textAlign: 'center', transform: `translateY(-50%) translateY(${(1 - inP) * 24 - uitP * 10}px) scale(${0.96 + inP * 0.04})` }}>
        <div style={{ fontSize: 168, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.045em', color: thema.kleur.petrol }}>{woord}<Punt /></div>
        <div style={{ marginTop: 22, fontSize: 44, fontWeight: 600, letterSpacing: '-0.015em', color: thema.kleur.petrol, opacity: 0.6, transform: `translateY(${(1 - vlak(t, op + 120, op + 520, thema.ease.enter)) * 10}px)` }}>{wie}</div>
        {extra && <div style={{ marginTop: 10, fontSize: 34, fontWeight: 500, letterSpacing: '-0.01em', color: thema.kleur.petrol, opacity: 0.6 * vlak(t, op + 260, op + 660, thema.ease.enter) }}>{extra}</div>}
      </div>
    </div>
  )
}

// Statuswoord onderin: groot, lowercase; de punt (cursor) landt als laatste
// teken op data-doel="status-punt". Het woord zelf heeft dus geen punt.
export const Statuswoord: React.FC<{ t: number; op: number; uit: number; woord: string; weg?: number }> = ({ t, op, uit, woord, weg }) => {
  if (t < op || t > (weg ?? uit + 300)) return null
  const inP = veer(t, op, { demping: 18, duurMs: 600 })
  const zicht = Math.min(vlak(t, op, op + 220), 1 - vlak(t, uit, uit + 250, thema.ease.exit))
  if (zicht <= 0 && weg === undefined) return null
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 72, zIndex: 66, pointerEvents: 'none', display: 'flex', justifyContent: 'center', opacity: zicht, transform: `translateY(${(1 - inP) * 26}px)`, fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 120, lineHeight: 1, letterSpacing: '-0.045em', color: thema.kleur.petrol }}>
      <span style={{ position: 'relative', display: 'inline-block', padding: '18px 76px 18px 44px', borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(22px) saturate(1.3)', WebkitBackdropFilter: 'blur(22px) saturate(1.3)', boxShadow: '0 30px 70px -30px rgba(26,83,92,0.35), 0 0 0 1px rgba(255,255,255,0.9) inset' }}>
        {woord}
        <span data-doel="status-punt" style={{ position: 'absolute', right: 28, bottom: 30, width: 40, height: 40 }} />
      </span>
    </div>
  )
}

// Rondleiding: labels na elkaar op blokken van de projectpagina. Het blok
// krijgt een 2 px Flame-rand zolang zijn label staat. Posities gemeten in de
// DOM (data-doel), dus ze kloppen bij elke camerastand. `deel` beperkt de
// ring tot de rechterhelft van een blok (de offertekolom in het grid).
export type RondStap = { doel: string; tekst: string; deel?: 'rechts' }
export const Rondleiding4: React.FC<{ t: number; op: number; stap: number; stappen: RondStap[] }> = ({ t, op, stap, stappen }) => {
  const [pos, setPos] = useState<Record<string, { x: number; y: number; b: number; h: number }>>({})
  const formaat = useFormaat()
  const hermeet = useHermeet()
  useLayoutEffect(() => {
    if (!rootMeetbaar()) { hermeet(); return }
    const root = document.querySelector('[data-film-root]')!
    const f = root.getBoundingClientRect(); const s = f.width / formaat.b
    const n: Record<string, { x: number; y: number; b: number; h: number }> = {}
    for (const r of stappen) {
      const el = document.querySelector(`[data-doel="${r.doel}"]`)
      if (!el) continue
      const b = el.getBoundingClientRect()
      n[r.doel] = { x: (b.left - f.left) / s, y: (b.top - f.top) / s, b: b.width / s, h: b.height / s }
    }
    setPos((p) => {
      const ks = Object.keys(n)
      if (ks.length === Object.keys(p).length && ks.every((k) => p[k] && Math.abs(p[k].x - n[k].x) < 0.05 && Math.abs(p[k].y - n[k].y) < 0.05 && Math.abs(p[k].b - n[k].b) < 0.05)) return p
      return n
    })
  })
  const uit = op + stappen.length * stap
  if (t < op || t > uit + 300) return null
  return (
    <>
      {stappen.map((r, i) => {
        const p0 = pos[r.doel]; if (!p0) return null
        const p = r.deel === 'rechts' ? { ...p0, x: p0.x + p0.b / 2 + 8, b: p0.b / 2 - 8 } : p0
        const van = op + i * stap, tot = van + stap
        const inP = veer(t, van, { demping: 16, duurMs: 500 })
        const zicht = Math.min(vlak(t, van, van + 160), 1 - vlak(t, tot - 160, tot, thema.ease.exit))
        if (zicht <= 0) return null
        return (
          <div key={r.doel} style={{ position: 'absolute', left: p.x, top: p.y, width: p.b, height: p.h, zIndex: 58, pointerEvents: 'none', opacity: zicht }}>
            <div style={{ position: 'absolute', inset: -4, borderRadius: 20, border: `2px solid ${thema.kleur.flame}`, boxShadow: `0 0 0 8px ${thema.kleur.flame}14` }} />
            <div style={{ position: 'absolute', left: 16, top: -24, transform: `translateY(${(1 - inP) * 12}px) scale(${0.94 + inP * 0.06})`, transformOrigin: 'left center', padding: '10px 20px', borderRadius: 999, backgroundColor: thema.kleur.petrol, color: thema.kleur.wit, fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 28, letterSpacing: '-0.015em', whiteSpace: 'nowrap', boxShadow: '0 14px 34px -10px rgba(26,83,92,0.55), 0 0 0 2px rgba(255,255,255,0.7)' }}>
              {r.tekst}<Punt />
            </div>
          </div>
        )
      })}
    </>
  )
}
