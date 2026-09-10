import { AbsoluteFill, Easing } from 'remotion'
import { MessageSquare } from 'lucide-react'
import { ALLE_MODULES } from '@/lib/navigatie'
import type { SceneProps } from '../tijd'
import { useSceneTijd, vlak, veer, ease, lerp } from '../tijd'
import { fonts } from '../fonts'
import { merk, grond } from '../brand'
import { Wordmark, letterPosities } from '../kern/Wordmark'

// 52000-68000. Tien losse tools zweven, worden aangetrokken, slaan in tot één
// stapel, spatten in hun kleuren uiteen en uit de stapel rijst doen. De punt
// landt als laatste.
export const S7 = {
  kaartenOp: 0, zweefTot: 3000, ontstekingOp: 3000, trekVan: 3200, inslagOp: 7000,
  lettersOp: 7300, puntOp: 9500, pulseOp: 10400, namenOp: 11200,
}

const MODULE_LABELS = ['Klanten', 'Offertes', 'Planning', 'Werkbonnen', 'Facturen', 'Portaal', 'Email', 'Maatjes']
type Kaart = { label: string; kleur: string; Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }> | null; x: number; y: number; rot: number; fase: number }

const PLEK: Record<string, { x: number; y: number; rot: number; fase: number }> = {
  Klanten: { x: 205, y: 430, rot: -8, fase: 0.1 },
  Offertes: { x: 830, y: 390, rot: 10, fase: 0.5 },
  Planning: { x: 175, y: 800, rot: 6, fase: 0.9 },
  Werkbonnen: { x: 890, y: 770, rot: -6, fase: 0.3 },
  Portaal: { x: 540, y: 600, rot: 3, fase: 0.7 },
  Facturen: { x: 235, y: 1210, rot: -10, fase: 0.2 },
  Email: { x: 855, y: 1190, rot: 8, fase: 0.6 },
  Maatjes: { x: 330, y: 1540, rot: 5, fase: 0.8 },
  Daan: { x: 760, y: 1520, rot: -7, fase: 0.4 },
}

const KAARTEN: Kaart[] = [
  ...MODULE_LABELS.map((label) => {
    const m = ALLE_MODULES.find((x) => x.label === label)!
    return { label, kleur: m.color, Icon: m.icon as Kaart['Icon'], ...PLEK[label] }
  }),
  { label: 'Daan', kleur: merk.petrol, Icon: null, ...PLEK.Daan },
]

// Deterministische deeltjes voor de spat: per kaart 16, kleur van de kaart.
const lcg = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }
const DEELTJES = KAARTEN.flatMap((k, ki) => {
  const rnd = lcg(97 + ki * 13)
  return Array.from({ length: 16 }, () => {
    const hoek = rnd() * Math.PI * 2
    const snelheid = 520 + rnd() * 900
    return { kleur: k.kleur, dx: Math.cos(hoek) * snelheid, dy: Math.sin(hoek) * snelheid - 120, r: 7 + rnd() * 16, vertraag: rnd() * 90 }
  })
})

const KAART = 270

export const S7Slot: React.FC<SceneProps> = ({ play }) => {
  const t = useSceneTijd(play)
  const midden = { x: 540, y: 960 }
  const ontsteking = vlak(t, S7.ontstekingOp, S7.ontstekingOp + 500, ease.uit)
  const naInslag = t >= S7.inslagOp
  const puntP = veer(t, S7.puntOp, { demping: 12, duurMs: 800 })
  const puntZicht = vlak(t, S7.puntOp, S7.puntOp + 150)
  const pulse = Math.sin(vlak(t, S7.pulseOp, S7.pulseOp + 600, ease.inUit) * Math.PI)
  const puntPos = letterPosities().find((p) => p.teken === '.')!
  const namen = vlak(t, S7.namenOp, S7.namenOp + 600)
  return (
    <AbsoluteFill style={{ backgroundColor: grond.diep, fontFamily: fonts.body, overflow: 'hidden' }}>
      {/* Zachte petrol-gloed in het midden, groeit bij ontsteking */}
      <div style={{ position: 'absolute', left: midden.x - 700, top: midden.y - 700, width: 1400, height: 1400, borderRadius: '50%', background: `radial-gradient(circle, ${merk.petrol}99 0%, ${merk.petrol}22 35%, transparent 65%)`, opacity: 0.4 + ontsteking * 0.5, transform: `scale(${0.6 + ontsteking * 0.4})` }} />

      {/* Kaarten */}
      {!naInslag && KAARTEN.map((k, i) => {
        const popP = veer(t, S7.kaartenOp + i * 90, { demping: 13, duurMs: 700 })
        const popZicht = vlak(t, S7.kaartenOp + i * 90, S7.kaartenOp + i * 90 + 120)
        const zweef = Math.sin((t / 1000) * 1.3 + k.fase * Math.PI * 2) * 14
        const zweefRot = Math.sin((t / 1000) * 0.9 + k.fase * 7) * 2.5
        // Aantrekking: staggered per kaart, ease-in zodat ze versnellen.
        const trekStart = S7.trekVan + k.fase * 900
        const trek = vlak(t, trekStart, S7.inslagOp, Easing.in(Easing.quad))
        const x = lerp(k.x, midden.x, trek)
        const y = lerp(k.y + zweef * (1 - trek), midden.y, trek)
        const rot = lerp(k.rot + zweefRot * (1 - trek), 0, trek)
        const schaal = lerp(1, 0.42, trek) * (0.7 + popP * 0.3)
        // Draai de kaart met zijn voorkant naar het midden zodra de trek begint.
        const richting = Math.atan2(midden.y - k.y, midden.x - k.x) * (180 / Math.PI) + 90
        const kantel = lerp(0, richting * 0.15, Math.sin(trek * Math.PI))
        return (
          <div key={k.label} style={{
            position: 'absolute', left: x - KAART / 2, top: y - KAART / 2, width: KAART, height: KAART,
            opacity: popZicht, transform: `rotate(${rot + kantel}deg) scale(${schaal})`,
            borderRadius: 40, backgroundColor: merk.wit, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.4) inset',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
          }}>
            <div style={{ width: 112, height: 112, borderRadius: k.Icon ? 32 : 30, backgroundColor: k.Icon ? `${k.kleur}1A` : undefined, background: k.Icon ? undefined : 'linear-gradient(135deg, #1A535C 0%, #2A6B75 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {k.Icon ? <k.Icon size={58} color={k.kleur} strokeWidth={1.9} /> : <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 64, color: merk.wit }}>D</span>}
            </div>
            <span style={{ fontFamily: fonts.kop, fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: merk.ink }}>{k.label.toLowerCase()}{k.label === 'Daan' && <span style={{ color: merk.flame }}>.</span>}</span>
          </div>
        )
      })}

      {/* Ontsteking: de punt in het midden, tot aan de inslag */}
      {t >= S7.ontstekingOp && t < S7.puntOp && (
        <div style={{ position: 'absolute', left: midden.x - 22, top: midden.y - 22, width: 44, height: 44, borderRadius: '50%', backgroundColor: merk.flame, opacity: naInslag ? 1 - vlak(t, S7.inslagOp, S7.inslagOp + 300) : ontsteking, transform: `scale(${0.3 + ontsteking * 0.7 + (naInslag ? 0 : Math.sin(t / 140) * 0.06)})`, boxShadow: `0 0 ${40 + ontsteking * 80}px ${merk.flame}AA` }} />
      )}

      {/* Inslag: witte flits + deeltjesspat in modulekleuren */}
      {naInslag && (
        <>
          <AbsoluteFill style={{ backgroundColor: merk.wit, opacity: 0.75 * (1 - vlak(t, S7.inslagOp, S7.inslagOp + 160)) }} />
          {DEELTJES.map((d, i) => {
            const p = vlak(t, S7.inslagOp + d.vertraag, S7.inslagOp + d.vertraag + 1100, ease.uit)
            const valP = vlak(t, S7.inslagOp + d.vertraag, S7.inslagOp + d.vertraag + 1100, ease.in)
            const zicht = 1 - vlak(t, S7.inslagOp + d.vertraag + 500, S7.inslagOp + d.vertraag + 1100)
            return (
              <div key={i} style={{ position: 'absolute', left: midden.x + d.dx * p - d.r, top: midden.y + d.dy * p + 420 * valP - d.r, width: d.r * 2, height: d.r * 2, borderRadius: '50%', backgroundColor: d.kleur, opacity: zicht }} />
            )
          })}
        </>
      )}

      {/* Letters rijzen uit de stapel, één per 300 ms; de punt komt apart */}
      {t >= S7.lettersOp && (
        <Wordmark y={midden.y} stand={(i) => {
          if (i === 4) return { op: puntZicht, dy: (1 - puntP) * -260, schaal: 1 + pulse * 0.45 }
          const p = veer(t, S7.lettersOp + i * 300, { demping: 14, duurMs: 800 })
          return { op: vlak(t, S7.lettersOp + i * 300, S7.lettersOp + i * 300 + 150), dy: (1 - p) * 140 }
        }} />
      )}
      {/* Pulse-ring rond de punt */}
      {t >= S7.pulseOp && pulse > 0 && (
        <div style={{ position: 'absolute', left: puntPos.x + puntPos.b / 2 - 40, top: midden.y + 92 - 40, width: 80, height: 80, borderRadius: '50%', border: `4px solid ${merk.flame}`, opacity: 1 - vlak(t, S7.pulseOp, S7.pulseOp + 700), transform: `scale(${1 + vlak(t, S7.pulseOp, S7.pulseOp + 700, ease.uit) * 3})` }} />
      )}

      {/* De tien namen, één regel, klein */}
      <div style={{ position: 'absolute', left: 60, right: 60, top: midden.y + 250, textAlign: 'center', fontFamily: fonts.body, fontWeight: 500, fontSize: 28, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.72)', opacity: namen, transform: `translateY(${(1 - namen) * 16}px)`, lineHeight: 1.6 }}>
        klanten · offertes · planning · werkbonnen · facturen<br />portaal · email · maatjes · daan
      </div>
    </AbsoluteFill>
  )
}
