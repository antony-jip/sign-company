import { fonts } from '../fonts'
import { merk } from '../brand'
import { FlameDot } from './FlameDot'
import { vlak, ease } from '../tijd'

export type Pov = 'jij' | 'klant'

type Props = {
  pov: Pov
  // ms sinds de laatste POV-wissel, voor de wisselanimatie.
  sindsWissel: number
}

// Label bovenin: "jij" of "je klant". Bij een wissel schuift het oude label
// omhoog weg en het nieuwe eronder vandaan, de Flame-punt blijft staan.
export const PovLabel: React.FC<Props> = ({ pov, sindsWissel }) => {
  const p = vlak(sindsWissel, 0, 450, ease.inUit)
  const tekst = pov === 'jij' ? 'jij' : 'je klant'
  const isJij = pov === 'jij'
  return (
    <div style={{ position: 'absolute', top: 56, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 }}>
      <div
        style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 4,
          padding: '14px 34px 16px', borderRadius: 999,
          backgroundColor: isJij ? merk.petrol : merk.wit,
          color: isJij ? merk.wit : merk.petrol,
          fontFamily: fonts.kop, fontWeight: 700, fontSize: 40, letterSpacing: '-0.02em',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 60}px)`, opacity: p }}>{tekst}</span>
        <FlameDot />
      </div>
    </div>
  )
}
