import { AbsoluteFill } from 'remotion'
import type { SceneProps } from '../tijd'
import { useSceneTijd, vlak, pan } from '../tijd'
import { Sfeer } from '../kern/Sfeer'
import { TelefoonFrame } from '../kern/TelefoonFrame'
import { Caption } from '../kern/Caption'
import { FlameDot } from '../kern/FlameDot'
import { MailScherm, MailMelding, InboxScherm } from '../schillen/MailScherm'
import { ProjectScherm } from '../schillen/ProjectScherm'
import { contact, mail } from '../mockData'

// 0-8000. Mail komt binnen, één knop, klant + contact + project staan.
export const S1 = {
  meldingOp: 1200, readerOp: 2000, kaartOp: 2400, tikOp: 3600, projectOp: 4400, captionOp: 5600,
}

export const S1Aanvraag: React.FC<SceneProps> = ({ play }) => {
  const t = useSceneTijd(play)
  const breedte = 900
  const naProject = t >= S1.projectOp
  return (
    <AbsoluteFill>
      <Sfeer bestand="sfeer/werkplaats.jpg" t={t} waas={0.6} />
      <TelefoonFrame t={t} inMs={0} breedte={breedte} focusY={pan(t, [[0, 330], [S1.readerOp, 470], [S1.projectOp, 300]])}>
        {!naProject ? (
          <>
            {t < S1.readerOp ? <InboxScherm t={t} nieuwOp={S1.meldingOp} /> : <MailScherm t={t} kaartOp={S1.kaartOp} tikOp={S1.tikOp} />}
            {t >= S1.meldingOp && t < S1.readerOp + 300 && (
              <MailMelding t={t} op={S1.meldingOp} titel={contact.naam} regel={mail.onderwerp} />
            )}
          </>
        ) : (
          <ProjectScherm t={t} status="gepland" chipsOp={S1.projectOp + 150} faseOp={S1.projectOp + 900} />
        )}
        {/* Witte flits op de cut naar het project */}
        <div className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: naProject ? 0.85 * (1 - vlak(t, S1.projectOp, S1.projectOp + 140)) : 0 }} />
      </TelefoonFrame>
      <Caption t={t} van={S1.captionOp}>Aanvraag binnen. Project staat<FlameDot /></Caption>
    </AbsoluteFill>
  )
}
