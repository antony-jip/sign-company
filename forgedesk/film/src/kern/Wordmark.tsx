import { fonts } from '../fonts'
import { merk } from '../brand'

// Het woord doen. als losse letters, zodat de slotgraphic ze één voor één kan
// laten opkomen en de punt apart kan laten landen. Gecentreerd op (540, y).
export const LETTERS = ['d', 'o', 'e', 'n'] as const
export const WORD_SIZE = 330
// Gemeten breedtes van Instrument Sans 700 per letter, als fractie van de fontgrootte.
const BREEDTE: Record<string, number> = { d: 0.60, o: 0.60, e: 0.57, n: 0.58, '.': 0.27 }

export const letterPosities = (size = WORD_SIZE, centrumX = 540) => {
  const totaal = LETTERS.reduce((s, l) => s + BREEDTE[l], 0) + BREEDTE['.']
  let x = centrumX - (totaal * size) / 2
  const posities: { teken: string; x: number; b: number }[] = []
  for (const l of [...LETTERS, '.']) {
    posities.push({ teken: l, x, b: BREEDTE[l] * size })
    x += BREEDTE[l] * size
  }
  return posities
}

type Props = {
  y: number
  centrumX?: number
  size?: number
  kleur?: string
  // Per letter: opacity + translateY (+ blur voor de reveal). Index 4 = de punt.
  stand: (i: number) => { op: number; dy: number; schaal?: number; blur?: number }
}

export const Wordmark: React.FC<Props> = ({ y, centrumX = 540, size = WORD_SIZE, kleur = merk.wit, stand }) => {
  const posities = letterPosities(size, centrumX)
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y - size * 0.55, height: size * 1.1, pointerEvents: 'none' }}>
      {posities.map((p, i) => {
        const s = stand(i)
        const isPunt = p.teken === '.'
        return (
          <span
            key={p.teken}
            style={{
              position: 'absolute', left: p.x, top: 0, width: p.b, textAlign: 'center',
              fontFamily: fonts.kop, fontWeight: 700, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.04em',
              color: isPunt ? merk.flame : kleur,
              opacity: s.op, transform: `translateY(${s.dy}px) scale(${s.schaal ?? 1})`, transformOrigin: isPunt ? '50% 78%' : '50% 60%',
              filter: s.blur ? `blur(${s.blur}px)` : undefined,
            }}
          >
            {p.teken}
          </span>
        )
      })}
    </div>
  )
}
