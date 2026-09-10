import { AbsoluteFill } from 'remotion'
import { Kanban } from '../schermen/Kanban'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'
import { VENSTER_B } from '../DesktopChrome'

// Losse controle van het bord: rond 2000 ms schuift onze kaart van In review naar Akkoord klant.
export const ProefKanban: React.FC = () => {
  const t = useSceneTijd(true)
  const schaal = 1040 / VENSTER_B
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${schaal})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(120,90,50,0.35)' }}>
        <Kanban t={t} stand={{ kolom: 'akkoord-klant', wisselOp: 1700 }} />
      </div>
    </AbsoluteFill>
  )
}
