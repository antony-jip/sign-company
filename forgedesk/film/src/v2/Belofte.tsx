import { fonts } from '../fonts'
import { merk } from '../brand'
import { FlameDot } from '../kern/FlameDot'
import { ease, vlak, woordStijl, WOORD_MS, WOORD_STAP_MS } from '../tijd'
import { useFormaat } from './formaat'

// Eén regel per beat, groot, petrol op de lichte grond. Woord-voor-woord reveal
// (10 f per woord, 60 procent overlap). Het kernwoord krijgt een stippellijn-
// selectie die van links naar rechts tekent; 5 f na de landing daarvan kleurt
// het Flame. De uitleg-regel komt 8 f na het laatste woord. Exit 70 procent.
type Props = { t: number; op: number; uit: number; tekst: string; kernwoord: string; selectOp?: number; positie?: 'boven' | 'onder'; punt?: boolean; uitleg?: string; licht?: boolean }

type Woord = { tekst: string; kern: boolean; punt: boolean }

const woorden = (tekst: string, kernwoord: string, punt: boolean): Woord[] => {
  const [voor, naRuw = ''] = tekst.split(kernwoord)
  const kernPunt = naRuw.startsWith('.')
  const na = kernPunt ? naRuw.slice(1) : naRuw
  const splits = (s: string) => s.split(' ').filter((w) => w.length > 0)
  const lijst: Woord[] = [
    ...splits(voor).map((w) => ({ tekst: w, kern: false, punt: false })),
    ...splits(kernwoord).map((w, i, arr) => ({ tekst: w, kern: true, punt: kernPunt && i === arr.length - 1 })),
    ...splits(na).map((w) => ({ tekst: w, kern: false, punt: false })),
  ]
  if (punt && na.trim() === '' && !kernPunt && lijst.length > 0) lijst[lijst.length - 1].punt = true
  return lijst
}

const SEL_MS = 450
const UIT_MS = Math.round(WOORD_MS * 0.7)

export const Belofte: React.FC<Props> = ({ t, op, uit, tekst, kernwoord, selectOp, positie = 'boven', punt = true, uitleg, licht = false }) => {
  const grond = licht ? merk.wit : merk.petrol
  const f = useFormaat()
  if (t < op || t > uit) return null
  const lijst = woorden(tekst, kernwoord, punt)
  const laatsteLanding = op + (lijst.length - 1) * WOORD_STAP_MS + WOORD_MS
  const eersteKern = lijst.findIndex((w) => w.kern)
  const laatsteKern = lijst.length - 1 - [...lijst].reverse().findIndex((w) => w.kern)
  // De selectie tekent pas als het kernwoord geland is, ook als de beat eerder valt.
  const kernLanding = op + laatsteKern * WOORD_STAP_MS + WOORD_MS
  const selVan = Math.max(selectOp ?? laatsteLanding + 100, kernLanding + 67)
  const sel = vlak(t, selVan, selVan + SEL_MS, ease.uit)
  const gekleurd = t >= selVan + SEL_MS + 167
  const uitlegOp = laatsteLanding + 267
  const uitP = vlak(t, uit - UIT_MS, uit, ease.exit)
  const lang = tekst.length > 34
  const size = lang ? f.belofteSize[1] : f.belofteSize[0]
  const woordP = (i: number) => vlak(t, op + i * WOORD_STAP_MS, op + i * WOORD_STAP_MS + WOORD_MS, ease.enter)
  const woordje = (w: Woord, i: number, laatste: boolean) => (
    <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', ...woordStijl(woordP(i)) }}>
      {w.tekst}{w.punt ? <FlameDot /> : null}{laatste ? '' : ' '}
    </span>
  )
  return (
    <div style={{ position: 'absolute', left: f.belofteZijkant, right: f.belofteZijkant, ...(positie === 'boven' ? { top: f.belofteBoven } : { bottom: f.belofteOnder }), zIndex: 40, opacity: 1 - uitP, transform: `translateY(${-uitP * 10}px)`, filter: uitP > 0 ? `blur(${uitP * 3}px)` : undefined, fontFamily: fonts.kop, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: '-0.035em', color: grond, textShadow: licht ? '0 4px 24px rgba(0,0,0,0.35)' : undefined, textWrap: 'balance' as never }}>
      {lijst.slice(0, eersteKern).map((w, i) => woordje(w, i, false))}
      <span style={{ position: 'relative', display: 'inline', whiteSpace: 'nowrap', color: gekleurd ? merk.flame : grond, padding: '0 0.06em' }}>
        {lijst.slice(eersteKern, laatsteKern + 1).map((w, k) => woordje(w, eersteKern + k, eersteKern + k === laatsteKern))}
        <span style={{ position: 'absolute', left: '-0.04em', top: '-0.02em', bottom: '-0.02em', width: `${sel * 108}%`, border: `2.5px dashed ${merk.flame}`, borderRadius: 8, opacity: sel > 0 ? 0.85 : 0, boxSizing: 'border-box' }} />
        {sel > 0 && sel < 1 && <span style={{ position: 'absolute', left: `${sel * 108 - 4}%`, top: '-0.02em', bottom: '-0.02em', width: 3, backgroundColor: merk.flame }} />}
      </span>
      {laatsteKern < lijst.length - 1 ? ' ' : null}
      {lijst.slice(laatsteKern + 1).map((w, k) => woordje(w, laatsteKern + 1 + k, laatsteKern + 1 + k === lijst.length - 1))}
      {uitleg && (
        <div style={{ marginTop: size * 0.22, fontFamily: fonts.body, fontWeight: 500, fontSize: size * 0.36, lineHeight: 1.3, letterSpacing: '-0.005em', color: licht ? 'rgba(255,255,255,0.85)' : merk.tekstSec, ...woordStijl(vlak(t, uitlegOp, uitlegOp + 400, ease.enter), 10, 3) }}>{uitleg}</div>
      )}
    </div>
  )
}
