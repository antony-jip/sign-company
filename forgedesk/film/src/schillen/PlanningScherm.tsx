import { Check, ClipboardCheck } from 'lucide-react'
import { MobielTop } from '../kern/AppChrome'
import { Tik } from '../kern/TikRing'
import { project, klant, montage, werkbonNummer } from '../mockData'
import { veer, vlak, lerp, ease } from '../tijd'

// Mobiele planning: de "Te plannen"-lijst (MontagePlanningLayout:2779) en de
// dagtijdlijn. De projectkaart sleept zichzelf de dag in en wordt een blok.
type Props = { t: number; sleepOp: number; landOp: number; werkbonTikOp: number; werkbonKlaarOp: number }

const UREN = ['07', '08', '09', '10', '11', '12']
const UUR_H = 56

export const PlanningScherm: React.FC<Props> = ({ t, sleepOp, landOp, werkbonTikOp, werkbonKlaarOp }) => {
  const sleepP = vlak(t, sleepOp, landOp, ease.inUit)
  const geland = t >= landOp
  const landP = veer(t, landOp, { demping: 14, duurMs: 600 })
  const sheetP = veer(t, landOp + 500, { demping: 17, duurMs: 600 })
  const sheetZicht = vlak(t, landOp + 500, landOp + 700)
  const werkbonKlaar = t >= werkbonKlaarOp
  // Kaart: van lijstpositie (x 16, y 146) naar het 08:00-blok (x 62, y 260).
  const kx = lerp(16, 62, sleepP)
  const ky = lerp(146, 268, sleepP)
  const kb = lerp(358, 300, sleepP)
  const lift = Math.sin(sleepP * Math.PI)
  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <MobielTop titel="Planning · week 39" terug />
      <div className="px-4 pt-2 flex items-center gap-2">
        <h2 className="text-[11px] font-bold text-flame uppercase tracking-wider">Te plannen</h2>
        <span className="text-[11px] font-bold flex items-center justify-center rounded-full bg-[#FDE8E2] text-flame" style={{ minWidth: 22, height: 22, padding: '0 7px' }}>{geland ? 0 : 1}</span>
      </div>
      {/* Lege lijstplek */}
      <div className="mx-4 mt-1 rounded-lg" style={{ height: 52 }}>
        {sleepP > 0.5 && (
          <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-muted-foreground/80" style={{ opacity: vlak(t, sleepOp + 300, sleepOp + 600) }}>
            <Check className="h-3.5 w-3.5" /><span>Niets te plannen</span>
          </div>
        )}
      </div>

      {/* Dagstrip */}
      <div className="mt-2 px-4 flex items-center justify-between">
        {[['ma', 21], ['di', 22], ['wo', 23], ['do', 24], ['vr', 25]].map(([d, n]) => (
          <div key={d} className="flex flex-col items-center gap-1" style={{ width: 52 }}>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{d}</span>
            <span className={`text-[15px] font-bold w-8 h-8 rounded-full flex items-center justify-center ${n === 24 ? 'bg-petrol text-white' : 'text-foreground'}`}>{n}</span>
          </div>
        ))}
      </div>

      {/* Uurraster donderdag */}
      <div className="relative mx-4 mt-3" style={{ height: UUR_H * UREN.length }}>
        {UREN.map((u, i) => (
          <div key={u} className="absolute inset-x-0 flex items-start gap-2" style={{ top: i * UUR_H }}>
            <span className="w-8 text-[11px] font-mono text-muted-foreground -mt-1.5">{u}:00</span>
            <div className="flex-1 border-t border-border" />
          </div>
        ))}
        {/* Landingsblok, 08:00-12:00 */}
        {geland && (
          <div className="absolute rounded-lg text-white px-3 py-2 overflow-hidden" style={{ left: 46, right: 0, top: UUR_H + 2, height: UUR_H * 4 - 4, backgroundColor: '#9A5A48', boxShadow: '0 8px 20px -8px rgba(154,90,72,0.6)', transform: `scale(${0.96 + landP * 0.04})`, opacity: vlak(t, landOp, landOp + 120) }}>
            <p className="text-[13px] font-semibold leading-tight">{montage.titel}</p>
            <p className="text-[11px] opacity-85 mt-0.5">{klant.bedrijfsnaam} · {montage.locatie}</p>
            <p className="text-[11px] font-mono opacity-90 mt-2">{montage.start_tijd} – {montage.eind_tijd} · Kees</p>
          </div>
        )}
      </div>

      {/* Slepende projectkaart (MontagePlanningLayout:2799) */}
      {!geland && (
        <div className="absolute rounded-lg bg-card border-l-2 border-l-transparent" style={{
          left: kx, top: ky, width: kb, padding: '8px 10px 8px 12px',
          boxShadow: sleepP > 0 ? `0 ${8 + lift * 18}px ${24 + lift * 24}px rgba(0,0,0,${0.12 + lift * 0.12})` : 'inset 0 1px 0 hsl(var(--border)/0.55)',
          transform: `scale(${1 + lift * 0.04}) rotate(${lift * -2}deg)`, opacity: vlak(t, 0, 200),
        }}>
          <div className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-[9px] items-start">
            <span className="mt-[3px] w-[10px] h-[10px] rounded-full" style={{ backgroundColor: '#9A5A48' }} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-petrol">{project.naam}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{klant.bedrijfsnaam} · <span className="font-mono">1d</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Kaart na landen: montage staat, werkbon maken */}
      <div className="mx-4 mt-3 rounded-xl doen-panel px-4 py-3" style={{ opacity: sheetZicht, transform: `translateY(${(1 - sheetP) * 30}px)` }}>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Montage ingepland<span className="text-flame">.</span></p>
        <p className="text-[15px] font-bold text-foreground mt-1">do 24 sep · 08:00 – 12:00 · Kees</p>
        {werkbonKlaar ? (
          <div className="mt-4 h-12 rounded-xl bg-[#E8F2EC] flex items-center justify-center gap-2 text-[15px] font-semibold" style={{ color: '#3A7D52' }}>
            <Check className="h-4 w-4" /> Werkbon {werkbonNummer} aangemaakt
          </div>
        ) : (
          <Tik t={t} op={werkbonTikOp} className="mt-4">
            <div className="h-12 rounded-xl bg-flame text-white flex items-center justify-center gap-2 text-[15px] font-semibold" style={{ transform: t >= werkbonTikOp && t < werkbonTikOp + 200 ? 'scale(0.97)' : undefined }}>
              <ClipboardCheck className="h-4 w-4" /> Werkbon maken (3)
            </div>
          </Tik>
        )}
      </div>
    </div>
  )
}
