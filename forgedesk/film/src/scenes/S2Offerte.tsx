import { AbsoluteFill } from 'remotion'
import type { SceneProps } from '../tijd'
import { useSceneTijd, vlak, veer, pan } from '../tijd'
import { Sfeer } from '../kern/Sfeer'
import { TelefoonFrame } from '../kern/TelefoonFrame'
import { Caption } from '../kern/Caption'
import { SplitFlap } from '../kern/SplitFlap'
import { ProjectScherm } from '../schillen/ProjectScherm'
import { OfferteScherm } from '../schillen/OfferteScherm'
import { merk } from '../brand'

// 8000-18000. Offerte rolt uit het project, regels, prijs, versturen.
export const S2 = {
  tikOffertemakenOp: 600, editorOp: 1000, regelsOp: 1300, verstuurTikOp: 3700, keuzeOp: 4100,
  tikPortaalOp: 4700, flapOp: 5100, captionOp: 5900, busOp: 8000,
}

export const S2Offerte: React.FC<SceneProps> = ({ play }) => {
  const t = useSceneTijd(play)
  const breedte = 900
  const inEditor = t >= S2.editorOp
  const naarBus = t >= S2.busOp
  const busP = veer(t, S2.busOp, { demping: 18, duurMs: 800 })
  return (
    <AbsoluteFill>
      <Sfeer bestand={naarBus ? 'sfeer/hand-telefoon-bus.jpg' : 'sfeer/werkplaats.jpg'} t={naarBus ? t - S2.busOp : t + 8000} waas={naarBus ? 0.35 : 0.6} inMs={0} />
      {!naarBus && (
        <TelefoonFrame t={t + 2000} breedte={breedte} focusY={pan(t, [[0, 420], [S2.editorOp, 380], [S2.verstuurTikOp - 500, 640], [S2.flapOp - 100, 200]])}>
          {inEditor ? (
            <OfferteScherm t={t} regelsOp={S2.regelsOp} verstuurTikOp={S2.verstuurTikOp} keuzeOp={S2.keuzeOp} keuzeTikOp={S2.tikPortaalOp} flapOp={S2.flapOp} />
          ) : (
            <ProjectScherm t={t + 5000} status="gepland" actie="offerte" actieTikOp={S2.tikOffertemakenOp} />
          )}
          <div className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: inEditor ? 0.85 * (1 - vlak(t, S2.editorOp, S2.editorOp + 140)) : 0 }} />
        </TelefoonFrame>
      )}
      {naarBus && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center', opacity: vlak(t, S2.busOp, S2.busOp + 300), transform: `translateY(${(1 - busP) * 60}px)` }}>
          <div style={{ padding: '28px 44px', borderRadius: 32, backgroundColor: merk.wit, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.5)' }}>
            <SplitFlap t={t} op={S2.busOp + 600} van="concept" naar="verstuurd" kleurVan={merk.tekstSec} kleurNaar={merk.petrol} hoogte={150} fontSize={112} />
          </div>
        </div>
      )}
      <Caption t={t} van={S2.captionOp}>Offerte de deur uit. Vanaf je telefoon.</Caption>
    </AbsoluteFill>
  )
}
