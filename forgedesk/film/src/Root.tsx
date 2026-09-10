import '../../src/index.css'
import './film.css'
import { MotionGlobalConfig } from 'framer-motion'
import { Composition } from 'remotion'
import { Film, FILM_DUUR_MS } from './Film'
import { FPS, msNaarFrames } from './tijd'
import { SCENES } from './Film'

// framer-motion in geïmporteerde app-componenten (ProjectFaseBar) loopt op de
// klok; in een frame-render is dat niet deterministisch. Animaties overslaan.
MotionGlobalConfig.skipAnimations = true

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="DoenFilm" component={Film} durationInFrames={msNaarFrames(FILM_DUUR_MS)} fps={FPS} width={1080} height={1920} />
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
