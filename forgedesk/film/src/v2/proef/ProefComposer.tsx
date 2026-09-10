import { AbsoluteFill } from 'remotion'
import { MailComposer, PANEEL_B } from '../schermen/MailComposer'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'

// Losse controle van het mailpaneel, geschaald naar de filmbreedte.
// Frame 60: de tekst tikt. Frame 150: bijlage erbij, Opvolgen aan, verzonden.
export const ProefComposer: React.FC = () => {
  const t = useSceneTijd(true)
  const schaal = 1040 / PANEEL_B
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${schaal})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(120,90,50,0.35)' }}>
        <MailComposer t={t} stand={{ typOp: 500, bijlageOp: 3800, opvolgenOp: 4200, verzendOp: 4700 }} />
      </div>
    </AbsoluteFill>
  )
}
