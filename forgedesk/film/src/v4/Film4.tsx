import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FlameDot } from '../kern/FlameDot'
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
    <AbsoluteFill style={{ backgroundColor: thema.kleur.nacht, fontFamily: thema.fonts.body }}>
      {/* Nacht-grond: diepe petrol met een zwak warm straatlicht onderin */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${thema.kleur.nacht} 0%, ${thema.kleur.nachtLaag} 58%, #0A1D21 100%)` }} />
      <div style={{ position: 'absolute', left: width * 0.5 - 900, top: height * 0.55, width: 1800, height: 1400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,214,176,0.10) 0%, rgba(242,214,176,0) 62%)' }} />

      {tex && <Wereld3D t={t} tex={tex} width={width} height={height} />}

      {/* Inslag: korte witte flits */}
      <AbsoluteFill style={{ backgroundColor: thema.kleur.wit, opacity: inslagFlits * 0.22, pointerEvents: 'none' }} />

      {/* Belofte: 300 ms in, 2 s hold, weg. Kernwoord in Flame. */}
      {belofteP > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: height * 0.80, textAlign: 'center', opacity: belofteP, transform: `translateY(${(1 - belofteP) * 10}px)`, fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 72, letterSpacing: '-0.03em', color: thema.kleur.wit, textShadow: '0 6px 30px rgba(0,0,0,0.45)' }}>
          Van mail tot betaald<FlameDot /> In <span style={{ color: thema.kleur.flame }}>één app</span>
        </div>
      )}

      {/* Kleurgrade: schaduwen naar petrol, warme highlights */}
      <AbsoluteFill style={{ backgroundColor: thema.kleur.petrol, mixBlendMode: 'soft-light', opacity: 0.32, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ backgroundColor: '#F5D4A8', mixBlendMode: 'overlay', opacity: 0.08, pointerEvents: 'none' }} />
      {/* Grain 4 procent, verschuift per frame; vignet 15 procent */}
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile('sfeer/ruis.png')})`, backgroundSize: '256px 256px', backgroundPosition: `${(frame * 37) % 256}px ${(frame * 53) % 256}px`, mixBlendMode: 'overlay', opacity: thema.laag.grain, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,${thema.laag.vignet}) 100%)`, pointerEvents: 'none' }} />
    </AbsoluteFill>
  )
}
