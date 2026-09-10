import { Calendar, Eye, CheckCircle2, Hammer, CalendarCheck, Receipt } from 'lucide-react'
import { fonts } from '../fonts'
import { merk } from '../brand'
import { FlameDot } from './FlameDot'
import { vlak, ease } from '../tijd'

// Voortgang van de film, afgeleid van de zes fases van ProjectFaseBar (zelfde
// labels en iconen). Compact, onderin de film, buiten de telefoon.
const FASES = [
  { label: 'Gepland', Icon: Calendar },
  { label: 'In review', Icon: Eye },
  { label: 'Akkoord klant', Icon: CheckCircle2 },
  { label: 'Actief', Icon: Hammer },
  { label: 'Ingepland', Icon: CalendarCheck },
  { label: 'Te factureren', Icon: Receipt },
]

export const FaseBalkFilm: React.FC<{ fase: number; sindsWissel: number; donker?: boolean; zicht?: number; label?: string }> = ({ fase, sindsWissel, donker = true, zicht = 1, label }) => {
  const p = vlak(sindsWissel, 0, 500, ease.uit)
  const voor = donker ? merk.wit : merk.petrol
  const lijn = donker ? 'rgba(255,255,255,0.28)' : merk.petrolBorder
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, bottom: 250, opacity: zicht, zIndex: 20 }}>
      <div style={{ marginBottom: 18, fontFamily: fonts.kop, fontWeight: 700, fontSize: 36, letterSpacing: '-0.02em', color: voor, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
        {label ?? FASES[fase]?.label}<FlameDot />
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {FASES.map((f, i) => {
          const isActief = i === fase
          const isVoorbij = i < fase
          const schaal = isActief ? 0.85 + p * 0.15 : 1
          return (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', flex: i < FASES.length - 1 ? 1 : 'initial' }}>
              <div data-fase={i} style={{
                width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                backgroundColor: isVoorbij ? voor : 'transparent',
                border: `3px solid ${isVoorbij || isActief ? voor : lijn}`,
                boxShadow: isActief ? `0 0 0 ${8 * p}px ${merk.flame}33` : undefined,
                transform: `scale(${schaal})`,
              }}>
                <f.Icon size={26} color={isVoorbij ? (donker ? merk.petrol : merk.wit) : voor} strokeWidth={isActief ? 2.4 : 2} />
              </div>
              {i < FASES.length - 1 && (
                <div style={{ flex: 1, height: 3, margin: '0 8px', backgroundImage: `linear-gradient(90deg, ${lijn} 50%, transparent 50%)`, backgroundSize: '10px 3px', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: voor, transform: `scaleX(${i < fase - 1 ? 1 : i === fase - 1 ? p : 0})`, transformOrigin: 'left' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
