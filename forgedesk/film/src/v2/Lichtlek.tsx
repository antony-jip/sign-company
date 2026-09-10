import { merk } from '../brand'
import { ease, vlak } from '../tijd'
import { useFormaat } from './formaat'

// Eigen lichtlek (HIGHEND 10): een Flame-lichtveld op screen-blend dat in
// 700 ms van rechtsboven naar linksonder glijdt. Maximaal drie keer per film,
// alleen op de grote cuts. Geen pakket, alles uit t.
export const Lichtlek: React.FC<{ t: number; op: number; sterkte?: number }> = ({ t, op, sterkte = 0.55 }) => {
  const f = useFormaat()
  const p = vlak(t, op, op + 700, ease.inUit)
  if (p <= 0 || p >= 1) return null
  const zicht = Math.sin(p * Math.PI) * sterkte
  const x = f.b * (1.1 - p * 1.2), y = f.h * (-0.2 + p * 1.1)
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 45, pointerEvents: 'none', overflow: 'hidden', mixBlendMode: 'screen' }}>
      <div style={{ position: 'absolute', left: x - 700, top: y - 700, width: 1400, height: 1400, borderRadius: '50%', opacity: zicht, filter: 'blur(40px)', background: `radial-gradient(circle, ${merk.flame}66 0%, ${merk.zand}33 35%, transparent 70%)` }} />
    </div>
  )
}
