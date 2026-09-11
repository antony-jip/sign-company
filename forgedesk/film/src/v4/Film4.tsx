import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FlameDot } from '../kern/FlameDot'
import { merk } from '../brand'
import { vlak } from '../tijd'
import { O } from './beats4'
import { useTexturen } from './texturen'
import { thema } from './thema'
import { Wereld3D } from './Wereld3D'

export const FILM4_DUUR_MS = O.eind

// Lagen (remotion-motion-graphics regel 5), van onder naar boven:
// nacht-grond, 3D-wereld, tekst, kleurgrade, grain plus vignet.
export const Film4: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const t = (frame / fps) * 1000
  const tex = useTexturen()

  const belofteP = Math.min(vlak(t, O.belofteOp, O.belofteOp + 300), 1 - vlak(t, O.belofteUit, O.belofteUit + 300, thema.ease.exit))
  const inslagFlits = t >= O.inslagOp ? 1 - vlak(t, O.inslagOp, O.inslagOp + 200) : 0

  return (
    <AbsoluteFill style={{ backgroundColor: thema.kleur.studio, fontFamily: thema.fonts.body }}>
      {/* Lichte studio: crème grond met zachte kleurvlekken (flame, petrol, zand) die traag ademen */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${thema.kleur.studio} 0%, ${thema.kleur.studioLaag} 100%)` }} />
      <div style={{ position: 'absolute', inset: -300, filter: 'blur(80px) saturate(1.3)' }}>
        <div style={{ position: 'absolute', left: 300 + width * 0.15 - 700 + Math.sin(t / 13000) * 90, top: 300 + height * 0.2 - 700, width: 1400, height: 1400, borderRadius: '50%', background: `radial-gradient(circle, ${thema.kleur.flame}2E 0%, ${thema.kleur.flame}00 66%)` }} />
        <div style={{ position: 'absolute', left: 300 + width * 0.85 - 760 + Math.cos(t / 16000) * 80, top: 300 + height * 0.3 - 760, width: 1520, height: 1520, borderRadius: '50%', background: `radial-gradient(circle, ${thema.kleur.petrol}30 0%, ${thema.kleur.petrol}00 66%)` }} />
        <div style={{ position: 'absolute', left: 300 + width * 0.35 - 700, top: 300 + height * 0.9 - 700 + Math.sin(t / 14500) * 70, width: 1400, height: 1400, borderRadius: '50%', background: `radial-gradient(circle, ${merk.zand}66 0%, ${merk.zand}00 66%)` }} />
        <div style={{ position: 'absolute', left: 300 + width * 0.8 - 720, top: 300 + height * 0.9 - 720, width: 1440, height: 1440, borderRadius: '50%', background: `radial-gradient(circle, ${thema.kleur.petrolLicht}FF 0%, ${thema.kleur.petrolLicht}00 66%)` }} />
      </div>

      {tex && <Wereld3D t={t} tex={tex} width={width} height={height} />}

      {/* Inslag: korte witte flits */}
      <AbsoluteFill style={{ backgroundColor: thema.kleur.wit, opacity: inslagFlits * 0.22, pointerEvents: 'none' }} />

      {/* Belofte: 300 ms in, 2 s hold, weg. Kernwoord in Flame. */}
      {belofteP > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: height * 0.80, textAlign: 'center', opacity: belofteP, transform: `translateY(${(1 - belofteP) * 10}px)`, fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 72, letterSpacing: '-0.03em', color: thema.kleur.petrol }}>
          Van mail tot betaald<FlameDot /> In <span style={{ color: thema.kleur.flame }}>één app</span>
        </div>
      )}

      {/* Kleurgrade: schaduwen licht naar petrol, warme highlights, subtiel op de lichte grond */}
      <AbsoluteFill style={{ backgroundColor: thema.kleur.petrol, mixBlendMode: 'soft-light', opacity: 0.10, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ backgroundColor: '#F5D4A8', mixBlendMode: 'overlay', opacity: 0.06, pointerEvents: 'none' }} />
      {/* Grain 4 procent, verschuift per frame; vignet 15 procent */}
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile('sfeer/ruis.png')})`, backgroundSize: '256px 256px', backgroundPosition: `${(frame * 37) % 256}px ${(frame * 53) % 256}px`, mixBlendMode: 'overlay', opacity: thema.laag.grain, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(26,83,92,${thema.laag.vignet}) 100%)`, pointerEvents: 'none' }} />
    </AbsoluteFill>
  )
}
