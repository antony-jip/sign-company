import { AbsoluteFill } from 'remotion'
import type { SceneProps } from '../tijd'
import { useSceneTijd, vlak, veer, pan } from '../tijd'
import { Sfeer } from '../kern/Sfeer'
import { TelefoonFrame } from '../kern/TelefoonFrame'
import { Caption } from '../kern/Caption'
import { Toast } from '../kern/Toast'
import { SplitFlap } from '../kern/SplitFlap'
import { FlameDot } from '../kern/FlameDot'
import { ProjectScherm } from '../schillen/ProjectScherm'
import { FactuurScherm } from '../schillen/FactuurScherm'
import { notificatieBetaald } from '../mockData'
import { merk, grond } from '../brand'

// 44000-52000. Factuur uit het project, melding: betaald.
export const S6 = {
  tikFactuurOp: 500, factuurOp: 1000, verstuurTikOp: 1700, verstuurdOp: 2100, toastOp: 2700, betaaldOp: 3600,
  grootOp: 4700, captionOp: 5000, uitOp: 6600,
}

export const S6Betaald: React.FC<SceneProps> = ({ play, durationMs }) => {
  const t = useSceneTijd(play)
  const breedte = 900
  const inFactuur = t >= S6.factuurOp
  const groot = t >= S6.grootOp
  const grootP = veer(t, S6.grootOp, { demping: 18, duurMs: 800 })
  const uit = vlak(t, S6.uitOp, durationMs)
  return (
    <AbsoluteFill>
      <Sfeer bestand={groot ? 'sfeer/bus-gevel.jpg' : 'sfeer/werkplaats.jpg'} t={groot ? t - S6.grootOp : t + 6000} waas={groot ? 0.4 : 0.6} />
      {!groot && (
        <TelefoonFrame t={t + 2000} breedte={breedte} focusY={pan(t, [[0, 330], [S6.factuurOp, 380], [S6.verstuurTikOp - 450, 640], [S6.verstuurdOp + 50, 300]])}>
          {inFactuur ? (
            <>
              <FactuurScherm t={t} verstuurTikOp={S6.verstuurTikOp} verstuurdOp={S6.verstuurdOp} betaaldOp={S6.betaaldOp} />
              <Toast t={t} op={S6.toastOp} notificatie={notificatieBetaald} />
            </>
          ) : (
            <ProjectScherm t={t + 5000} status="te-factureren" actie="factuur" actieTikOp={S6.tikFactuurOp} offerteStatus="goedgekeurd" />
          )}
          <div className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: inFactuur ? 0.85 * (1 - vlak(t, S6.factuurOp, S6.factuurOp + 140)) : 0 }} />
        </TelefoonFrame>
      )}
      {groot && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 700, display: 'flex', justifyContent: 'center', opacity: vlak(t, S6.grootOp, S6.grootOp + 300), transform: `translateY(${(1 - grootP) * 60}px)` }}>
          <div style={{ padding: '28px 44px', borderRadius: 32, backgroundColor: merk.wit, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.5)' }}>
            <SplitFlap t={t} op={S6.grootOp + 700} van="verstuurd" naar="betaald" kleurVan={merk.tekstSec} kleurNaar="#2D6B48" hoogte={150} fontSize={112} />
          </div>
        </div>
      )}
      <Caption t={t} van={S6.captionOp}>Klaar. betaald<FlameDot /></Caption>
      <AbsoluteFill style={{ backgroundColor: grond.diep, opacity: uit, zIndex: 40 }} />
    </AbsoluteFill>
  )
}
