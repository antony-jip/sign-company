import { AbsoluteFill } from 'remotion'
import { FinancieelTab } from '../schermen/FinancieelTab'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'
import { VENSTER_B } from '../DesktopChrome'

// Losse controle van de tab Financieel, geschaald naar de filmbreedte.
// Frame 60: factuur als concept met de knop Verstuur. Frame 150: betaald.
export const ProefFinancieel: React.FC = () => {
  const t = useSceneTijd(true)
  const schaal = 1040 / VENSTER_B
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${schaal})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(120,90,50,0.35)' }}>
        <FinancieelTab t={t} stand={{ factuurOp: 1000, verstuurdOp: 3000, betaaldOp: 4500 }} />
      </div>
    </AbsoluteFill>
  )
}
