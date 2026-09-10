import type { ReactNode } from 'react'
import { merk } from '../brand'
import { vlak, ease } from '../tijd'

type Props = { t: number; op: number; x: number; y: number; schaal?: number }

// Zichtbare tik zonder geluid: een vingerdot en een Flame-ring die uitdijt.
// x/y in de coördinaten van de dichtstbijzijnde positioned parent. `schaal`
// corrigeert de maat als de ring in het gezoomde telefoonscherm staat.
export const TikRing: React.FC<Props> = ({ t, op, x, y, schaal = 1 }) => {
  const p = vlak(t, op, op + 550, ease.uit)
  if (t < op || p >= 1) return null
  const r = (8 + p * 46) * schaal
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, pointerEvents: 'none', zIndex: 50 }}>
      <div style={{
        position: 'absolute', left: -r, top: -r, width: r * 2, height: r * 2, borderRadius: '50%',
        border: `${(3 - p * 2) * schaal}px solid ${merk.flame}`, opacity: 1 - p,
      }} />
      <div style={{
        position: 'absolute', left: -9 * schaal, top: -9 * schaal, width: 18 * schaal, height: 18 * schaal, borderRadius: '50%',
        backgroundColor: merk.flame, opacity: 1 - Math.max(0, p - 0.6) / 0.4,
        transform: `scale(${1 - p * 0.4})`,
      }} />
    </div>
  )
}

// Wikkelt een knop in het telefoonscherm en tikt in het midden ervan.
export const Tik: React.FC<{ t: number; op: number; children: ReactNode; className?: string; dx?: number; dy?: number }> = ({ t, op, children, className, dx = 0, dy = 0 }) => (
  <div className={className} style={{ position: 'relative' }}>
    {children}
    <div style={{ position: 'absolute', left: `calc(50% + ${dx}px)`, top: `calc(50% + ${dy}px)` }}>
      <TikRing t={t} op={op} x={0} y={0} schaal={1 / 2.3} />
    </div>
  </div>
)
