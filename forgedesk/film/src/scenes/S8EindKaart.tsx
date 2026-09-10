import { AbsoluteFill } from 'remotion'
import type { SceneProps } from '../tijd'
import { useSceneTijd, vlak, veer, ease } from '../tijd'
import { fonts } from '../fonts'
import { merk, grond } from '../brand'
import { Wordmark } from '../kern/Wordmark'

// 68000-75000. doen. op Petrol, punt pulseert één keer, belofte, URL.
export const S8 = { grondOp: 0, pulseOp: 800, regelOp: 1800, urlOp: 3000 }

export const S8EindKaart: React.FC<SceneProps> = ({ play }) => {
  const t = useSceneTijd(play)
  const grondP = vlak(t, S8.grondOp, S8.grondOp + 700, ease.inUit)
  const pulse = Math.sin(vlak(t, S8.pulseOp, S8.pulseOp + 600, ease.inUit) * Math.PI)
  const regelP = veer(t, S8.regelOp, { demping: 18, duurMs: 800 })
  const urlP = veer(t, S8.urlOp, { demping: 18, duurMs: 800 })
  return (
    <AbsoluteFill style={{ backgroundColor: grond.diep, fontFamily: fonts.body }}>
      <AbsoluteFill style={{ backgroundColor: merk.petrol, opacity: grondP }} />
      <Wordmark y={900} stand={(i) => (i === 4 ? { op: 1, dy: 0, schaal: 1 + pulse * 0.45 } : { op: 1, dy: 0 })} />
      <div style={{ position: 'absolute', left: 90, right: 90, top: 1150, textAlign: 'center', fontFamily: fonts.kop, fontWeight: 600, fontSize: 52, lineHeight: 1.2, letterSpacing: '-0.02em', color: merk.wit, opacity: vlak(t, S8.regelOp, S8.regelOp + 250), transform: `translateY(${(1 - regelP) * 30}px)`, textWrap: 'balance' as never }}>
        Alles wat een signmaker nodig heeft. In één app.
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1330, textAlign: 'center', fontFamily: fonts.mono, fontSize: 40, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.85)', opacity: vlak(t, S8.urlOp, S8.urlOp + 250), transform: `translateY(${(1 - urlP) * 20}px)` }}>
        app.doen.team
      </div>
    </AbsoluteFill>
  )
}
