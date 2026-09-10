import { fonts } from '../fonts'
import { merk } from '../brand'
import { FlameDot } from './FlameDot'
import { vlak, ease } from '../tijd'

type Props = {
  t: number
  op: number
  van: string
  naar: string
  kleurVan?: string
  kleurNaar?: string
  hoogte?: number
  fontSize?: number
  duurMs?: number
  achtergrond?: string
}

// Statuswoord als stationsbord: de bovenste helft van het oude woord klapt
// naar beneden en onthult het nieuwe woord. De Flame-punt blijft staan.
export const SplitFlap: React.FC<Props> = ({
  t, op, van, naar, kleurVan = merk.tekstSec, kleurNaar = merk.petrol,
  hoogte = 64, fontSize = 44, duurMs = 420, achtergrond = merk.wit,
}) => {
  const p = vlak(t, op, op + duurMs, ease.inUit)
  const hoek = p * -180
  const helft = hoogte / 2
  const woordStijl = (kleur: string): React.CSSProperties => ({
    fontFamily: fonts.kop, fontWeight: 700, fontSize, letterSpacing: '-0.02em', color: kleur,
    lineHeight: `${hoogte}px`, height: hoogte, whiteSpace: 'nowrap', paddingLeft: 2,
  })
  const Helft: React.FC<{ boven: boolean; tekst: string; kleur: string; stijl?: React.CSSProperties }> = ({ boven, tekst, kleur, stijl }) => (
    <div style={{ position: 'absolute', left: 0, right: 0, height: helft, overflow: 'hidden', top: boven ? 0 : helft, backgroundColor: achtergrond, ...stijl }}>
      <div style={{ ...woordStijl(kleur), transform: boven ? undefined : `translateY(-${helft}px)` }}>
        {tekst}<FlameDot />
      </div>
    </div>
  )
  const breedteTekst = Math.max(van.length, naar.length)
  return (
    <div style={{ position: 'relative', height: hoogte, width: `${breedteTekst * fontSize * 0.58 + fontSize}px`, perspective: 900 }}>
      <Helft boven tekst={naar} kleur={kleurNaar} />
      <Helft boven={false} tekst={van} kleur={kleurVan} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: helft, transformOrigin: 'bottom', transform: `rotateX(${hoek}deg)`, transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
          <Helft boven tekst={van} kleur={kleurVan} />
        </div>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>
          <Helft boven={false} tekst={naar} kleur={kleurNaar} stijl={{ top: 0 }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: helft - 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
    </div>
  )
}
