import { AbsoluteFill, Sequence } from 'remotion'
import type { SceneProps } from './tijd'
import { msNaarFrames, useSceneTijd } from './tijd'
import { merk, grond } from './brand'
import { fonts } from './fonts'
import { PovLabel, type Pov } from './kern/PovLabel'
import { FaseBalkFilm } from './kern/FaseBalkFilm'
import { S1Aanvraag } from './scenes/S1Aanvraag'
import { S2Offerte } from './scenes/S2Offerte'
import { S3Akkoord } from './scenes/S3Akkoord'
import { S4Ingepland } from './scenes/S4Ingepland'
import { S5Fotos } from './scenes/S5Fotos'
import { S6Betaald } from './scenes/S6Betaald'
import { S7Slot } from './scenes/S7Slot'
import { S8EindKaart } from './scenes/S8EindKaart'

type SceneDef = {
  id: string
  component: React.FC<SceneProps>
  vanMs: number
  duurMs: number
  pov: Pov | null
  // Wissel van camera midden in de scene (ms sinds scenestart).
  povWissel?: { ms: number; pov: Pov }
  fase: number | null
}

// De montage. Elke scene krijgt play + durationMs en rekent intern in ms.
export const SCENES: SceneDef[] = [
  { id: 'S1Aanvraag', component: S1Aanvraag, vanMs: 0, duurMs: 8000, pov: 'jij', fase: 0 },
  { id: 'S2Offerte', component: S2Offerte, vanMs: 8000, duurMs: 10000, pov: 'jij', fase: 1 },
  { id: 'S3Akkoord', component: S3Akkoord, vanMs: 18000, duurMs: 10000, pov: 'klant', fase: 1 },
  { id: 'S4Ingepland', component: S4Ingepland, vanMs: 28000, duurMs: 8000, pov: 'jij', fase: 2 },
  { id: 'S5Fotos', component: S5Fotos, vanMs: 36000, duurMs: 8000, pov: 'jij', povWissel: { ms: 2600, pov: 'klant' }, fase: 4 },
  { id: 'S6Betaald', component: S6Betaald, vanMs: 44000, duurMs: 8000, pov: 'jij', fase: 5 },
  { id: 'S7Slot', component: S7Slot, vanMs: 52000, duurMs: 16000, pov: null, fase: null },
  { id: 'S8EindKaart', component: S8EindKaart, vanMs: 68000, duurMs: 7000, pov: null, fase: null },
]

export const FILM_DUUR_MS = 75000

// Fase-sprongen op absolute filmtijd: S4 0-1200 in review, dan akkoord klant.
const FASE_MOMENTEN: { ms: number; fase: number }[] = [
  { ms: 0, fase: 0 }, { ms: 8000 + 5100, fase: 1 }, { ms: 28000 + 1200, fase: 2 },
  { ms: 28000 + 3600, fase: 4 }, { ms: 44000, fase: 5 },
]

const huidigeFase = (t: number) => {
  let r = FASE_MOMENTEN[0]
  for (const f of FASE_MOMENTEN) if (t >= f.ms) r = f
  return r
}

const huidigePov = (t: number) => {
  let r: { pov: Pov; ms: number } = { pov: 'jij', ms: 0 }
  for (const s of SCENES) {
    if (s.pov && t >= s.vanMs && s.pov !== r.pov) r = { pov: s.pov, ms: s.vanMs }
    if (s.povWissel && t >= s.vanMs + s.povWissel.ms && s.povWissel.pov !== r.pov) r = { pov: s.povWissel.pov, ms: s.vanMs + s.povWissel.ms }
  }
  return r
}

export const Film: React.FC = () => {
  const t = useSceneTijd(true)
  const fase = huidigeFase(t)
  const pov = huidigePov(t)
  const inFlow = t < 52000
  return (
    <AbsoluteFill className="film-root" style={{ backgroundColor: grond.diep, fontFamily: fonts.body, color: merk.ink }}>
      {SCENES.map((s) => (
        <Sequence key={s.id} from={msNaarFrames(s.vanMs)} durationInFrames={msNaarFrames(s.duurMs)} name={s.id}>
          <s.component play durationMs={s.duurMs} />
        </Sequence>
      ))}
      {inFlow && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 800, background: `linear-gradient(180deg, transparent 0%, ${grond.diep}66 22%, ${grond.diep}D9 40%, ${grond.diep} 62%, ${grond.diep} 100%)`, zIndex: 10 }} />}
      {inFlow && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: `linear-gradient(180deg, ${grond.diep} 0%, ${grond.diep}CC 40%, transparent 100%)`, zIndex: 10 }} />}
      {inFlow && <PovLabel pov={pov.pov} sindsWissel={t - pov.ms} />}
      {inFlow && <FaseBalkFilm fase={fase.fase} sindsWissel={t - fase.ms} />}
    </AbsoluteFill>
  )
}
