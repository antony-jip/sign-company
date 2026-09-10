import { fonts } from '../fonts'
import { merk } from '../brand'
import { FlameDot } from '../kern/FlameDot'
import { ease, veer, vlak } from '../tijd'
import { useFormaat } from './formaat'

// Eén regel per beat, groot, petrol op de lichte grond. Het kernwoord krijgt
// een stippellijn-selectie die van links naar rechts tekent, dan kleurt het Flame.
type Props = { t: number; op: number; uit: number; tekst: string; kernwoord: string; selectOp?: number; positie?: 'boven' | 'onder'; punt?: boolean }

export const Belofte: React.FC<Props> = ({ t, op, uit, tekst, kernwoord, selectOp, positie = 'boven', punt = true }) => {
  const f = useFormaat()
  if (t < op || t > uit) return null
  const inP = veer(t, op, { demping: 18, duurMs: 700 })
  const zicht = Math.min(vlak(t, op, op + 200), 1 - vlak(t, uit - 220, uit, ease.in))
  const sel = vlak(t, selectOp ?? op + 700, (selectOp ?? op + 700) + 450, ease.uit)
  const gekleurd = t >= (selectOp ?? op + 700) + 380
  const delen = tekst.split(kernwoord)
  const lang = tekst.length > 34
  const size = lang ? f.belofteSize[1] : f.belofteSize[0]
  return (
    <div style={{ position: 'absolute', left: f.belofteZijkant, right: f.belofteZijkant, ...(positie === 'boven' ? { top: f.belofteBoven } : { bottom: f.belofteOnder }), zIndex: 40, opacity: zicht, transform: `translateY(${(1 - inP) * 30}px)`, fontFamily: fonts.kop, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: '-0.035em', color: merk.petrol, textWrap: 'balance' as never }}>
      {delen[0]}
      <span style={{ position: 'relative', display: 'inline', whiteSpace: 'nowrap', color: gekleurd ? merk.flame : merk.petrol, padding: '0 0.06em' }}>
        {kernwoord}{delen[1]?.startsWith('.') ? <FlameDot /> : null}
        <span style={{ position: 'absolute', left: '-0.04em', top: '-0.02em', bottom: '-0.02em', width: `${sel * 108}%`, border: `2.5px dashed ${merk.flame}`, borderRadius: 8, opacity: sel > 0 ? 0.85 : 0, boxSizing: 'border-box' }} />
        {sel > 0 && sel < 1 && <span style={{ position: 'absolute', left: `${sel * 108 - 4}%`, top: '-0.02em', bottom: '-0.02em', width: 3, backgroundColor: merk.flame }} />}
      </span>
      {delen[1]?.startsWith('.') ? delen[1].slice(1) : delen[1]}{punt && (delen[1] ?? '').trim() === '' ? <FlameDot /> : null}
    </div>
  )
}
