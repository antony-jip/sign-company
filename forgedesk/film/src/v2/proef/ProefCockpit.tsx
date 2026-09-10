import { AbsoluteFill } from 'remotion'
import { Cockpit } from '../Cockpit'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'
import { VENSTER_B } from '../DesktopChrome'

// Losse controle van de cockpit als scherm, geschaald naar de filmbreedte.
export const ProefCockpit: React.FC = () => {
  const t = useSceneTijd(true)
  const schaal = 1040 / VENSTER_B
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${schaal})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(120,90,50,0.35)' }}>
        <Cockpit t={t} stand={{ status: 'in-review', offerteStatus: 'verzonden', portaal: ['offerte'], activiteiten: [], ingekloktSinds: 0 }} />
      </div>
    </AbsoluteFill>
  )
}
