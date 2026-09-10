import { merk } from '../brand'

// Het echte doen.-logo uit public/logos/doen-logo.svg, als losse paden zodat de
// letters één voor één kunnen opkomen en de punt apart kan landen en pulseren.
// viewBox 82 188 390 135; de punt is een cirkel op (444.97, 294.08) r 18.03.
export const LOGO_VIEWBOX = { x: 82, y: 188, b: 390, h: 135 }
export const LOGO_PUNT = { x: 444.97, y: 294.08, r: 18.03 }
const LETTERS = ["M170.03,198.76v90.76c0,7.28,0,14.65.15,21.97h-21.28c-.44-2.4-.87-6.53-1.01-8.35-3.86,6.29-10.74,10.2-22.68,10.2-20.21,0-33.07-16.23-33.07-41.17s13.67-42.48,36.31-42.48c11.5,0,17.68,4.06,19.45,7.64v-38.58h22.13ZM114.87,271.6c0,15.58,6.07,24.02,16.9,24.02,15.22,0,16.97-12.69,16.97-24.18,0-13.67-1.93-24.01-16.4-24.01-11.62,0-17.48,9.07-17.48,24.17Z", "M256.16,271.37c0,24.19-14.47,41.98-39.8,41.98s-39.26-17.69-39.26-41.55,14.92-42.09,40.3-42.09c23.53,0,38.75,16.6,38.75,41.67ZM199.56,271.52c0,15.39,6.62,24.5,17.28,24.5s16.85-9.12,16.85-24.37c0-16.73-6.14-24.64-17.16-24.64-10.26,0-16.97,7.6-16.97,24.5Z", "M282.01,276.26c.02,10,5.03,19.77,16.05,19.77,9.21,0,11.85-3.7,13.95-8.53h22.15c-2.84,9.78-11.56,25.85-36.68,25.85s-37.75-19.69-37.75-40.66c0-25.07,12.87-42.98,38.54-42.98,27.45,0,36.79,19.86,36.79,39.81,0,2.71,0,4.46-.29,6.74h-52.75ZM312.88,262.66c-.15-9.31-3.87-17.14-14.66-17.14s-14.87,7.31-15.75,17.14h30.41Z", "M342.84,251.69c0-6.79,0-14.23-.15-20.14h21.43c.44,2.06.74,7.61.85,10.18,2.72-5.02,9.19-12.04,23.19-12.04,16.06,0,26.49,10.85,26.49,30.94v50.85h-22.13v-48.39c0-8.99-3-15.5-12.76-15.5s-14.78,5.23-14.78,19.34v44.55h-22.13v-59.8Z"]

export type LogoStand = { op: number; dy: number; schaal?: number; blur?: number }
type Props = { breedte: number; x: number; y: number; kleur?: string; stand: (i: number) => LogoStand }

// x/y = middelpunt van het logo in filmcoördinaten. stand(0..3) = d o e n, stand(4) = de punt.
export const LogoDoen: React.FC<Props> = ({ breedte, x, y, kleur = merk.petrol, stand }) => {
  const hoogte = breedte * (LOGO_VIEWBOX.h / LOGO_VIEWBOX.b)
  const s = breedte / LOGO_VIEWBOX.b
  const punt = stand(4)
  return (
    <svg viewBox={`${LOGO_VIEWBOX.x} ${LOGO_VIEWBOX.y} ${LOGO_VIEWBOX.b} ${LOGO_VIEWBOX.h}`} style={{ position: 'absolute', left: x - breedte / 2, top: y - hoogte / 2, width: breedte, height: hoogte, overflow: 'visible' }}>
      {LETTERS.map((d, i) => {
        const st = stand(i)
        return <path key={i} d={d} fill={kleur} style={{ opacity: st.op, transform: `translate(0px, ${st.dy / s}px)`, filter: st.blur ? `blur(${st.blur / s}px)` : undefined }} />
      })}
      <circle cx={LOGO_PUNT.x} cy={LOGO_PUNT.y + punt.dy / s} r={LOGO_PUNT.r * (punt.schaal ?? 1)} fill={merk.flame} style={{ opacity: punt.op }} />
    </svg>
  )
}

// Filmpositie van de punt bij een logo van `breedte` gecentreerd op (x, y).
export const logoPuntPositie = (breedte: number, x: number, y: number) => {
  const s = breedte / LOGO_VIEWBOX.b
  return { x: x - breedte / 2 + (LOGO_PUNT.x - LOGO_VIEWBOX.x) * s, y: y - (breedte * (LOGO_VIEWBOX.h / LOGO_VIEWBOX.b)) / 2 + (LOGO_PUNT.y - LOGO_VIEWBOX.y) * s }
}
