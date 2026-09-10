import { AbsoluteFill } from 'remotion'
import { TelefoonInRuimte } from '../schermen/WerkbonTelefoon'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'

// Losse controle van de werkbon op de telefoon, 2,3x gezoomd en gecentreerd.
// Frame 60: de na-foto staat erin. Frame 150: de klant heeft getekend.
export const ProefWerkbon: React.FC = () => {
  const t = useSceneTijd(true)
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: 'scale(2.3)', transformOrigin: 'center' }}>
        <TelefoonInRuimte t={t} stand={{ fotoOp: 1500, tekenOp: 3200 }} />
      </div>
    </AbsoluteFill>
  )
}
