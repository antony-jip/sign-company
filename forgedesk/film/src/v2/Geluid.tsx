import { Sequence, staticFile } from 'remotion'
import { Audio } from '@remotion/media'
import { msNaarFrames } from '../tijd'

// Geluidslaag: muziek onder alles, effecten op de beats. De film werkt ook
// zonder geluid; dit is de laag erbovenop voor wie het aan heeft.
export type Klank = { ms: number; bestand: 'klik' | 'zwiep' | 'flap' | 'ding' | 'typ' | 'pen' | 'inslag' | 'landing'; volume?: number; duurMs?: number }

export const Geluid: React.FC<{ klanken: Klank[]; muziek?: boolean; muziekVolume?: number; totMs: number }> = ({ klanken, muziek = true, muziekVolume = 0.32, totMs }) => (
  <>
    {muziek && (
      <Sequence from={0} durationInFrames={msNaarFrames(totMs)} name="muziek">
        <Audio src={staticFile('audio/muziek-hoofd.mp3')} volume={(f) => {
          // Zacht in, zacht uit aan het eind van de film.
          const tot = msNaarFrames(totMs)
          const inP = Math.min(1, f / 30)
          const uitP = Math.min(1, Math.max(0, (tot - f) / 60))
          return muziekVolume * inP * uitP
        }} />
      </Sequence>
    )}
    {klanken.map((k, i) => (
      <Sequence key={i} from={msNaarFrames(k.ms)} durationInFrames={msNaarFrames(k.duurMs ?? 2500)} name={`sfx-${k.bestand}`}>
        <Audio src={staticFile(`audio/${k.bestand}.mp3`)} volume={k.volume ?? 0.7} />
      </Sequence>
    ))}
  </>
)
