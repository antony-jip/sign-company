import { AbsoluteFill } from 'remotion'
import type { SceneProps } from '../tijd'
import { useSceneTijd, vlak, pan } from '../tijd'
import { Sfeer } from '../kern/Sfeer'
import { TelefoonFrame } from '../kern/TelefoonFrame'
import { Caption } from '../kern/Caption'
import { MailMelding } from '../schillen/MailScherm'
import { PortaalScherm } from '../schillen/PortaalScherm'
import { OffertePubliekScherm } from '../schillen/OffertePubliekScherm'
import { offerte, portaalBedrijf } from '../mockData'

// 18000-28000. Klant opent het portaal, bekijkt, tekent, bevestigt.
export const S3 = {
  meldingOp: 400, portaalOp: 1300, tikBekijkenOp: 2300, publiekOp: 3000, naamOp: 3300,
  tekenOp: 4300, vinkOp: 6200, tikBevestigOp: 6600, klaarOp: 7100, captionOp: 8000,
}

export const S3Akkoord: React.FC<SceneProps> = ({ play }) => {
  const t = useSceneTijd(play)
  const breedte = 900
  const inPortaal = t >= S3.portaalOp && t < S3.publiekOp
  const inPubliek = t >= S3.publiekOp
  return (
    <AbsoluteFill>
      <Sfeer bestand="sfeer/kantoor-klant.jpg" t={t} waas={0.5} />
      <TelefoonFrame t={t} inMs={0} breedte={breedte} focusY={pan(t, [[0, 300], [S3.portaalOp, 340], [S3.publiekOp, 400], [S3.vinkOp - 300, 520], [S3.klaarOp, 440]])}>
        {!inPortaal && !inPubliek && (
          <div className="absolute inset-0" style={{ backgroundColor: '#0B1E22' }}>
            <div className="absolute inset-x-0 top-[150px] text-center text-white">
              <p className="text-[74px] font-semibold leading-none tracking-tight">9:41</p>
              <p className="text-[17px] mt-2 opacity-80">dinsdag 15 september</p>
            </div>
            {t >= S3.meldingOp && <MailMelding t={t} op={S3.meldingOp} titel={portaalBedrijf.naam} regel={`Nieuwe offerte: ${offerte.titel}`} app="Mail" />}
          </div>
        )}
        {inPortaal && (
          <PortaalScherm t={t} projectStatus="in-review" kaarten={[{ soort: 'offerte', op: S3.portaalOp + 350, status: 'verstuurd', tikOp: S3.tikBekijkenOp }]} scroll={60} />
        )}
        {inPubliek && (
          <OffertePubliekScherm t={t} naamOp={S3.naamOp} tekenOp={S3.tekenOp} vinkOp={S3.vinkOp} tikOp={S3.tikBevestigOp} klaarOp={S3.klaarOp} />
        )}
        <div className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: 0.85 * (inPubliek ? 1 - vlak(t, S3.publiekOp, S3.publiekOp + 140) : inPortaal ? 1 - vlak(t, S3.portaalOp, S3.portaalOp + 140) : 0) }} />
      </TelefoonFrame>
      <Caption t={t} van={S3.captionOp}>Je klant tekent. Zonder gedoe.</Caption>
    </AbsoluteFill>
  )
}
