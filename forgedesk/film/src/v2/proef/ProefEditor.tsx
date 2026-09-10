import { AbsoluteFill } from 'remotion'
import { OfferteEditor } from '../schermen/OfferteEditor'
import { useSceneTijd } from '../../tijd'
import { merk } from '../../brand'
import { VENSTER_B } from '../DesktopChrome'

// Losse controle van de offerte-editor met calculatie en interne check, geschaald
// naar de filmbreedte. De proef is 300 frames (10 s), dus de check zit vóór het
// versturen: menu 5500, dialoog 6000, aanvraag 7300, akkoord 8100, verstuurd 9300.
export const ProefEditor: React.FC = () => {
  const t = useSceneTijd(true)
  const schaal = 1040 / VENSTER_B
  return (
    <AbsoluteFill style={{ backgroundColor: merk.warm, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${schaal})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(120,90,50,0.35)' }}>
        <OfferteEditor t={t} stand={{ regelsOp: 300, calculatieOp: 3200, calculatieDichtOp: 5200, menuOp: 5500, checkOp: 6000, checkVraagOp: 7300, checkAkkoordOp: 8100, verstuurTikOp: 8500, keuzeOp: 8700, keuzeTikOp: 9100, flapOp: 9300 }} />
      </div>
    </AbsoluteFill>
  )
}
