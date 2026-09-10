import { Img, staticFile } from 'remotion'
import { fonts } from '../fonts'
import { merk } from '../brand'
import { vlak, veer, ease } from '../tijd'

// De gevel van de klant hangt achter alle schermen in de ruimte. De letters op
// de gevel volgen de fase van het project: van stippellijn (aanvraag) via omtrek
// (offerte) en gevuld (akkoord) naar gemonteerd (ingepland) en brandend (betaald).
// De software-flow bouwt letterlijk het bord.
export type GevelStand = 'aanvraag' | 'offerte' | 'akkoord' | 'gemonteerd' | 'brandt'

type Props = { t: number; x: number; y: number; stand: GevelStand; standSinds: number; zicht: number; blur: number; breedte?: number }

const TEKST = 'VAN DER BERG'

export const Gevel: React.FC<Props> = ({ t, x, y, stand, standSinds, zicht, blur, breedte = 2600 }) => {
  const hoogte = breedte * (1920 / 1080)
  const p = vlak(t, standSinds, standSinds + 900, ease.uit)
  const veerP = veer(t, standSinds, { demping: 14, duurMs: 900 })
  const gloed = stand === 'brandt' ? p : 0
  const omtrek = stand === 'aanvraag' ? `${merk.wit}99` : merk.wit
  const vulling = stand === 'aanvraag' || stand === 'offerte' ? 'transparent' : stand === 'akkoord' ? `${merk.wit}B0` : merk.wit
  const dash = stand === 'aanvraag' ? '18 14' : undefined
  const schaduw = stand === 'gemonteerd' || stand === 'brandt' ? 0.55 * (stand === 'gemonteerd' ? veerP : 1) : 0
  return (
    <div style={{ position: 'absolute', left: x - breedte / 2, top: y - hoogte / 2, width: breedte, height: hoogte, opacity: zicht, filter: `blur(${blur}px)`, pointerEvents: 'none' }}>
      <Img src={staticFile('sfeer/gevel-avond.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {/* Lichtbak brandt mee */}
      <div style={{ position: 'absolute', left: '17%', right: '17%', top: '42.6%', height: '4.2%', background: `radial-gradient(ellipse at center, ${merk.wit} 0%, ${merk.wit}CC 55%, transparent 100%)`, opacity: 0.25 + gloed * 0.75, filter: `blur(${6 + gloed * 26}px)` }} />
      <svg viewBox="0 0 1080 400" style={{ position: 'absolute', left: 0, width: '100%', top: '22%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <filter id="gevelgloed" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation={18 + gloed * 26} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {gloed > 0 && (
          <text x="540" y="230" textAnchor="middle" fontFamily={fonts.kop} fontWeight={700} fontSize={118} letterSpacing="0.06em" fill={merk.wit} opacity={0.9 * gloed} filter="url(#gevelgloed)">{TEKST}</text>
        )}
        <text
          x="540" y="230" textAnchor="middle" fontFamily={fonts.kop} fontWeight={700} fontSize={118} letterSpacing="0.06em"
          fill={vulling} stroke={omtrek} strokeWidth={stand === 'aanvraag' ? 2 : 3} strokeDasharray={dash}
          style={{ transform: `translateY(${(1 - (stand === 'gemonteerd' ? veerP : 1)) * -40}px)`, filter: schaduw ? `drop-shadow(0 ${14 * schaduw}px ${10 * schaduw}px rgba(0,0,0,${0.45 * schaduw}))` : undefined }}
          opacity={stand === 'aanvraag' ? 0.6 + p * 0.2 : 0.85 + p * 0.15}
        >{TEKST}</text>
      </svg>
    </div>
  )
}
