import { AbsoluteFill } from 'remotion'
import type { SceneProps } from '../tijd'
import { useSceneTijd, vlak, pan } from '../tijd'
import { Sfeer } from '../kern/Sfeer'
import { TelefoonFrame } from '../kern/TelefoonFrame'
import { Caption } from '../kern/Caption'
import { Toast } from '../kern/Toast'
import { FlameDot } from '../kern/FlameDot'
import { ProjectScherm } from '../schillen/ProjectScherm'
import { PlanningScherm } from '../schillen/PlanningScherm'
import { notificatieAkkoord } from '../mockData'

// 28000-36000. Akkoord komt binnen, project de planning in, werkbon staat.
export const S4 = {
  toastOp: 200, akkoordOp: 1200, planningOp: 2200, sleepOp: 2700, landOp: 3600,
  werkbonTikOp: 4600, werkbonKlaarOp: 5000, captionOp: 5800,
}

export const S4Ingepland: React.FC<SceneProps> = ({ play }) => {
  const t = useSceneTijd(play)
  const breedte = 900
  const inPlanning = t >= S4.planningOp
  const akkoord = t >= S4.akkoordOp
  return (
    <AbsoluteFill>
      <Sfeer bestand="sfeer/werkplaats.jpg" t={t + 3000} waas={0.6} />
      <TelefoonFrame t={t + 2000} breedte={breedte} focusY={pan(t, [[0, 330], [S4.planningOp, 400], [S4.landOp + 300, 500]])}>
        {inPlanning ? (
          <PlanningScherm t={t} sleepOp={S4.sleepOp} landOp={S4.landOp} werkbonTikOp={S4.werkbonTikOp} werkbonKlaarOp={S4.werkbonKlaarOp} />
        ) : (
          <>
            <ProjectScherm t={t + 5000} status={akkoord ? 'akkoord-klant' : 'in-review'} offerteStatus={akkoord ? 'goedgekeurd' : 'verzonden'} />
            <Toast t={t} op={S4.toastOp} notificatie={notificatieAkkoord} />
          </>
        )}
        <div className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: inPlanning ? 0.85 * (1 - vlak(t, S4.planningOp, S4.planningOp + 140)) : 0 }} />
      </TelefoonFrame>
      <Caption t={t} van={S4.captionOp}>Ja gezegd. Werk ingepland<FlameDot /></Caption>
    </AbsoluteFill>
  )
}
