import { Easing } from 'remotion'
import { Mail, FileSpreadsheet, MessageCircle, CalendarDays, ClipboardList, Calculator, Camera, StickyNote, Phone } from 'lucide-react'
import { fonts } from '../fonts'
import { merk } from '../brand'
import { vlak, veer, ease, lerp, WOORD_MS, WOORD_STAP_MS } from '../tijd'
import { Wordmark } from '../kern/Wordmark'
import { useFormaat } from './formaat'
import { B0 } from './beats'

// De opening: de losse tools van een signmaker zweven door het beeld, alsof het
// allemaal aparte apps zijn. Een Flame-punt ontsteekt, trekt ze naar zich toe,
// ze slaan in, en uit de inslag rijst doen. De punt landt als laatste.
type Tool = { label: string; sub: string; Icon: typeof Mail; kleur: string; x: number; y: number; rot: number; fase: number }

// Posities als fractie van het beeld, zodat 4:3 en 9:16 allebei werken.
const TOOLS: Tool[] = [
  { label: 'Mail', sub: '1.204 ongelezen', Icon: Mail, kleur: '#3A6B8C', x: 0.18, y: 0.20, rot: -8, fase: 0.1 },
  { label: 'Offerte', sub: 'offerte_v3_def2.xlsx', Icon: FileSpreadsheet, kleur: '#2D6B48', x: 0.78, y: 0.16, rot: 9, fase: 0.5 },
  { label: 'WhatsApp', sub: 'klant: "en de prijs?"', Icon: MessageCircle, kleur: '#3A7D52', x: 0.50, y: 0.34, rot: 3, fase: 0.8 },
  { label: 'Agenda', sub: 'montage… welke dag?', Icon: CalendarDays, kleur: '#9A5A48', x: 0.14, y: 0.55, rot: 6, fase: 0.3 },
  { label: 'Werkbon', sub: 'papier, in de bus', Icon: ClipboardList, kleur: '#C44830', x: 0.84, y: 0.52, rot: -6, fase: 0.7 },
  { label: 'Boekhouding', sub: 'factuur nog maken', Icon: Calculator, kleur: '#5A5A55', x: 0.30, y: 0.82, rot: -10, fase: 0.2 },
  { label: "Foto's", sub: '312 op de telefoon', Icon: Camera, kleur: '#6A5A8A', x: 0.68, y: 0.80, rot: 8, fase: 0.6 },
  { label: 'Post-its', sub: 'bellen: Van der Berg', Icon: StickyNote, kleur: '#8A7A4A', x: 0.50, y: 0.62, rot: -4, fase: 0.9 },
  { label: 'Telefoon', sub: '3 gemiste oproepen', Icon: Phone, kleur: '#1A535C', x: 0.86, y: 0.86, rot: 5, fase: 0.4 },
]

// Groep van 9: versnellende stagger (MOTION.md), eerste kaart op toolsOp, de
// laatste 1300 ms later, daarna staat alles 15 f stil voor de trek begint.
const STAGGER = [0, 260, 480, 670, 835, 975, 1095, 1205, 1300]
const POP_MS = 400

const lcg = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }
const DEELTJES = (() => {
  const rnd = lcg(97); const kleuren = [merk.petrol, merk.flame, merk.wit, merk.petrol, merk.flame]
  return Array.from({ length: 120 }, (_, i) => { const hoek = rnd() * Math.PI * 2; const v = 500 + rnd() * 900; return { kleur: kleuren[i % kleuren.length], dx: Math.cos(hoek) * v, dy: Math.sin(hoek) * v - 150, r: 6 + rnd() * 14, vertraag: rnd() * 90 } })
})()

export const Opening: React.FC<{ t: number }> = ({ t }) => {
  const F = useFormaat()
  const midden = { x: F.middenX, y: F.middenY }
  const kaartB = F.naam === '4:3' ? 250 : 270
  const ontsteking = vlak(t, B0.ontstekingOp, B0.ontstekingOp + 500, ease.uit)
  // Secundaire laag: de gloed van de punt komt 3 f na de punt zelf.
  const ontstekingGloed = vlak(t, B0.ontstekingOp + 100, B0.ontstekingOp + 600, ease.uit)
  const naInslag = t >= B0.inslagOp
  const puntZicht = vlak(t, B0.puntOp, B0.puntOp + 150)
  const puntP = veer(t, B0.puntOp, { demping: 12, duurMs: 800 })
  const pulse = Math.sin(vlak(t, B0.pulseOp, B0.pulseOp + 600, ease.inUit) * Math.PI)
  // Na de belofte schuift het woord omhoog en vervaagt, het dashboard komt eronder vandaan.
  const wegP = vlak(t, B0.dashboardOp, B0.dashboardOp + 900, ease.inUit)
  const zicht = 1 - vlak(t, B0.dashboardOp + 300, B0.dashboardOp + 900)
  if (t > B0.dashboardOp + 1000) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
      <div style={{ position: 'absolute', left: midden.x - 700, top: midden.y - 700, width: 1400, height: 1400, borderRadius: '50%', background: `radial-gradient(circle, ${merk.petrol}33 0%, ${merk.petrol}10 40%, transparent 68%)`, opacity: 0.5 + ontsteking * 0.5, transform: `scale(${0.6 + ontsteking * 0.4})` }} />

      {!naInslag && TOOLS.map((k, i) => {
        const popOp = B0.toolsOp + STAGGER[i]
        const popP = vlak(t, popOp, popOp + POP_MS, ease.enter)
        // Ambient: zweven op 2,4 tot 3,3 s per cyclus, nooit stil.
        const zweef = Math.sin((t / 1000) * 2.1 + k.fase * Math.PI * 2) * 10
        const zweefX = Math.cos((t / 1000) * 1.6 + k.fase * 5) * 5
        const zweefRot = Math.sin((t / 1000) * 1.9 + k.fase * 7) * 2
        const trekStart = B0.trekVan + k.fase * 800
        const trek = vlak(t, trekStart, B0.inslagOp, Easing.in(Easing.cubic))
        const x = lerp(k.x * F.b + zweefX * (1 - trek), midden.x, trek)
        const y = lerp(k.y * F.h + zweef * (1 - trek) + (1 - popP) * 14, midden.y, trek)
        const rot = lerp(k.rot + zweefRot * (1 - trek), 0, trek)
        const schaal = lerp(1, 0.3, trek) * (0.96 + popP * 0.04)
        return (
          <div key={k.label} style={{
            position: 'absolute', left: x - kaartB / 2, top: y - kaartB * 0.36, width: kaartB, height: kaartB * 0.72,
            opacity: popP, transform: `rotate(${rot}deg) scale(${schaal})`,
            borderRadius: 22, backgroundColor: merk.wit, boxShadow: '0 2px 4px rgba(70,55,40,.04), 0 24px 48px -12px rgba(120,90,50,.22), 0 60px 90px -40px rgba(120,90,50,.28), 0 0 0 1px rgba(255,255,255,.6) inset',
            display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px',
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: `${k.kleur}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <k.Icon size={30} color={k.kleur} strokeWidth={1.9} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: fonts.kop, fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', color: merk.ink }}>{k.label}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 15, color: merk.tekstSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub}</div>
            </div>
          </div>
        )
      })}

      {t >= B0.ontstekingOp && t < B0.puntOp && (
        <>
          <div style={{ position: 'absolute', left: midden.x - 90, top: midden.y - 90, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${merk.flame}AA 0%, ${merk.flame}40 40%, transparent 70%)`, opacity: naInslag ? 1 - vlak(t, B0.inslagOp, B0.inslagOp + 300) : ontstekingGloed, transform: `scale(${0.4 + ontstekingGloed * 0.6 + (naInslag ? 0 : Math.sin(t / 220) * 0.05)})`, filter: 'blur(6px)' }} />
          <div style={{ position: 'absolute', left: midden.x - 22, top: midden.y - 22, width: 44, height: 44, borderRadius: '50%', backgroundColor: merk.flame, opacity: naInslag ? 1 - vlak(t, B0.inslagOp, B0.inslagOp + 300) : ontsteking, transform: `scale(${0.3 + ontsteking * 0.7 + (naInslag ? 0 : Math.sin(t / 140) * 0.06)})` }} />
        </>
      )}

      {naInslag && (
        <>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: merk.wit, opacity: 0.85 * (1 - vlak(t, B0.inslagOp, B0.inslagOp + 160)) }} />
          {DEELTJES.map((d, i) => {
            const p = vlak(t, B0.inslagOp + d.vertraag, B0.inslagOp + d.vertraag + 1100, ease.uit)
            const val = vlak(t, B0.inslagOp + d.vertraag, B0.inslagOp + d.vertraag + 1100, ease.in)
            const dz = 1 - vlak(t, B0.inslagOp + d.vertraag + 500, B0.inslagOp + d.vertraag + 1100)
            return <div key={i} style={{ position: 'absolute', left: midden.x + d.dx * p - d.r, top: midden.y + d.dy * p + 400 * val - d.r, width: d.r * 2, height: d.r * 2, borderRadius: '50%', backgroundColor: d.kleur, opacity: dz }} />
          })}
        </>
      )}

      {t >= B0.lettersOp && (
        <div style={{ position: 'absolute', inset: 0, opacity: zicht, transform: `translateY(${-wegP * 260}px) scale(${1 - wegP * 0.35})`, transformOrigin: `${midden.x}px ${midden.y}px` }}>
          <Wordmark y={midden.y} centrumX={midden.x} size={F.wordmarkSize} kleur={merk.petrol} stand={(i) => {
            if (i === 4) return { op: puntZicht, dy: (1 - puntP) * -260, schaal: 1 + pulse * 0.45 }
            // Letter-reveal met blur: 10 f per letter, 60 procent overlap.
            const p = vlak(t, B0.lettersOp + i * WOORD_STAP_MS, B0.lettersOp + i * WOORD_STAP_MS + WOORD_MS, ease.enter)
            return { op: p, dy: (1 - p) * 24, blur: (1 - p) * 6 }
          }} />
        </div>
      )}
    </div>
  )
}
