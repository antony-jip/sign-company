import { AbsoluteFill, Img, staticFile } from 'remotion'
import { Video } from '@remotion/media'
import { grond } from '../brand'
import { lerp, vlak } from '../tijd'

type Props = {
  bestand: string
  t: number
  // Trage push-in over de hele scene (Ken Burns). 1.0 → 1.0 + zoom.
  zoom?: number
  duurMs?: number
  // Petrol-waas erover, 0..1. Houdt de UI leesbaar.
  waas?: number
  vervaag?: number
  inMs?: number
}

export const Sfeer: React.FC<Props> = ({ bestand, t, zoom = 0.06, duurMs = 8000, waas = 0.55, vervaag = 0, inMs = 0 }) => {
  const schaal = lerp(1, 1 + zoom, Math.min(1, Math.max(0, t / duurMs)))
  const op = vlak(t, inMs, inMs + 500)
  const isClip = bestand.endsWith('.mp4')
  const stijl: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover',
    transform: `scale(${schaal})`, filter: vervaag ? `blur(${vervaag}px)` : undefined,
  }
  return (
    <AbsoluteFill style={{ backgroundColor: grond.diep, opacity: op }}>
      {isClip ? <Video src={staticFile(bestand)} muted loop style={stijl} /> : <Img src={staticFile(bestand)} style={stijl} />}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${grond.diep}CC 0%, ${grond.diep}66 45%, ${grond.diep}E6 100%)`, opacity: waas }} />
    </AbsoluteFill>
  )
}
