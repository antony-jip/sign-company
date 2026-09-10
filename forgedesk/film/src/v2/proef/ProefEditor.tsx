import { AbsoluteFill } from 'remotion'
import { OfferteEditor } from '../schermen/OfferteEditor'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'
import { VENSTER_B } from '../DesktopChrome'

// Losse controle van de offerte-editor met calculatie, geschaald naar de filmbreedte.
export const ProefEditor: React.FC = () => {
  const t = useSceneTijd(true)
  const schaal = 1040 / VENSTER_B
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${schaal})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(120,90,50,0.35)' }}>
        <OfferteEditor t={t} stand={{ regelsOp: 300, calculatieOp: 3200, calculatieDichtOp: 5200, keuzeOp: 6000, keuzeTikOp: 6600, verstuurTikOp: 5800, flapOp: 7000 }} />
      </div>
    </AbsoluteFill>
  )
}
