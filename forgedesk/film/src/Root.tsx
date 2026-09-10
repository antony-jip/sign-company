import '../../src/index.css'
import './film.css'
import { MotionGlobalConfig } from 'framer-motion'
import { Composition } from 'remotion'
import { Film, FILM_DUUR_MS } from './Film'
import { FPS, msNaarFrames } from './tijd'
import { SCENES } from './Film'
import { FilmV2, FILM2_DUUR_MS } from './v2/FilmV2'
import { ProefPlanning, ProefKanban, ProefWerkbon, ProefFinancieel, ProefComposer, ProefCockpit } from './v2/proef'

// framer-motion in geïmporteerde app-componenten (ProjectFaseBar) loopt op de
// klok; in een frame-render is dat niet deterministisch. Animaties overslaan.
MotionGlobalConfig.skipAnimations = true

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="DoenFilm" component={Film} durationInFrames={msNaarFrames(FILM_DUUR_MS)} fps={FPS} width={1080} height={1920} />
    <Composition id="DoenFilm2" component={FilmV2} durationInFrames={msNaarFrames(FILM2_DUUR_MS)} fps={FPS} width={1080} height={1920} />
    {[['ProefPlanning', ProefPlanning], ['ProefKanban', ProefKanban], ['ProefWerkbon', ProefWerkbon], ['ProefFinancieel', ProefFinancieel], ['ProefComposer', ProefComposer]].map(([id, C]) => (
      <Composition key={id as string} id={id as string} component={C as React.FC} durationInFrames={300} fps={FPS} width={1080} height={1920} />
    ))}
    <Composition id="ProefCockpit" component={ProefCockpit} durationInFrames={150} fps={FPS} width={1080} height={1920} />
    {SCENES.map((s) => (
      <Composition
        key={s.id}
        id={s.id}
        component={s.component}
        durationInFrames={msNaarFrames(s.duurMs)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ play: true, durationMs: s.duurMs }}
      />
    ))}
  </>
)
