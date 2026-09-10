import { AbsoluteFill } from 'remotion'
import type { SceneProps } from '../tijd'
import { useSceneTijd, vlak, pan } from '../tijd'
import { Sfeer } from '../kern/Sfeer'
import { TelefoonFrame } from '../kern/TelefoonFrame'
import { Caption } from '../kern/Caption'
import { WerkbonScherm } from '../schillen/WerkbonScherm'
import { PortaalScherm } from '../schillen/PortaalScherm'

// 36000-44000. Monteur tikt "Na foto", klant ziet de foto en de status.
export const S5 = {
  fotoTikOp: 900, fotoOp: 1300, wisselOp: 2600, portaalOp: 2600, fotoKaartOp: 2900, statusOp: 4300, captionOp: 5500,
}

export const S5Fotos: React.FC<SceneProps> = ({ play }) => {
  const t = useSceneTijd(play)
  const breedte = 900
  const bijKlant = t >= S5.portaalOp
  return (
    <AbsoluteFill>
      {!bijKlant
        ? <Sfeer bestand="sfeer/bus-rijdt.mp4" t={t} waas={0.5} zoom={0} />
        : <Sfeer bestand="sfeer/gevel-licht-aan.mp4" t={t - S5.portaalOp} waas={0.5} zoom={0} />}
      <TelefoonFrame t={t + 2000} breedte={breedte} focusY={pan(t, [[0, 420], [S5.fotoOp, 480], [S5.portaalOp, 600]])}>
        {bijKlant ? (
          <PortaalScherm t={t} projectStatus={t >= S5.statusOp ? 'afgerond' : 'ingepland'} kaarten={[{ soort: 'offerte', status: 'geaccepteerd' }, { soort: 'foto', op: S5.fotoKaartOp }]} scroll={60} />
        ) : (
          <WerkbonScherm t={t} fotoOp={S5.fotoOp} tikOp={S5.fotoTikOp} />
        )}
        <div className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: bijKlant ? 0.85 * (1 - vlak(t, S5.portaalOp, S5.portaalOp + 140)) : 0 }} />
      </TelefoonFrame>
      <Caption t={t} van={S5.captionOp}>Je klant ziet alles. Belt niet meer.</Caption>
    </AbsoluteFill>
  )
}
