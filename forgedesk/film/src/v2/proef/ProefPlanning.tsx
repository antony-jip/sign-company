import { AbsoluteFill } from 'remotion'
import { Planning } from '../schermen/Planning'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'
import { VENSTER_B } from '../DesktopChrome'

// Losse controle van de planning: rond 2000 ms sleept de kaart, rond 5000 ms is hij geland.
export const ProefPlanning: React.FC = () => {
  const t = useSceneTijd(true)
  const schaal = 1040 / VENSTER_B
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${schaal})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(120,90,50,0.35)' }}>
        <Planning t={t} stand={{ sleepOp: 1200, landOp: 3600 }} />
      </div>
    </AbsoluteFill>
  )
}
