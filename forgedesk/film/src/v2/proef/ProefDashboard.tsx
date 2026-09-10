import { AbsoluteFill } from 'remotion'
import { Dashboard } from '../schermen/Dashboard'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'
import { VENSTER_B } from '../DesktopChrome'

// Losse controle van het dashboard als scherm, geschaald naar de filmbreedte.
// Op 1500 ms komt de aanvraag van Pieter binnen (frame 45), frame 60 toont de regel.
export const ProefDashboard: React.FC = () => {
  const t = useSceneTijd(true)
  const schaal = 1040 / VENSTER_B
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${schaal})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(120,90,50,0.35)' }}>
        <Dashboard t={t} stand={{ mailOp: 1500 }} />
      </div>
    </AbsoluteFill>
  )
}
